"""
SmartBio 360 - Backend Server (Phiên bản Tinh gọn: Lab 360° & Hành tinh Xanh)
Framework: Flask + SQLite3
Cung cấp API Quản lý Học sinh, Xác thực Token, Lưu điểm Thám tử Lab 360°, Nhật ký Xanh & Bảng Quản trị Giáo viên.
"""

import os
import sqlite3
import hashlib
import hmac
import secrets
import json
import time
import io
import csv
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

# Cấu hình đường dẫn
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "smartbio.db")
SECRET_KEY = os.environ.get("SMARTBIO_SECRET", "smartbio-360-edu-ai-secret-key-2026")

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app)

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# ==================== DATABASE INITIALIZATION ====================
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Bảng học sinh & giáo viên (users)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                full_name TEXT NOT NULL,
                grade INTEGER NOT NULL,
                classroom TEXT DEFAULT '',
                role TEXT DEFAULT 'student',
                detective_score INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration: Bổ sung các cột nếu bảng cũ chưa có
        cursor.execute("PRAGMA table_info(users)")
        columns = [col["name"] for col in cursor.fetchall()]
        if "role" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")
        if "detective_score" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN detective_score INTEGER DEFAULT 0")

        # 2. Bảng phiên đăng nhập (sessions)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # 3. Bảng lịch sử thử thách Thám tử bắt lỗi AI tại Lab 360° (detective_logs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS detective_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                organelle_key TEXT NOT NULL,
                case_title TEXT NOT NULL,
                points INTEGER DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # 4. Bảng nhật ký hành động xanh (eco_logs)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS eco_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        """)

        conn.commit()

        # Đảm bảo tài khoản ADMIN / GIÁO VIÊN luôn tồn tại
        cursor.execute("SELECT id FROM users WHERE username = 'admin'")
        if not cursor.fetchone():
            salt = secrets.token_hex(8)
            pwd_hash = hash_password("admin123", salt)
            cursor.execute("""
                INSERT INTO users (username, password_hash, salt, full_name, grade, classroom, role, detective_score)
                VALUES ('admin', ?, ?, 'Thầy Quản Trị Viên (Tổ KHTN)', 0, 'Văn Phòng Bộ Môn', 'teacher', 0)
            """, (pwd_hash, salt))
            conn.commit()

        # Seed dữ liệu học sinh mẫu nếu chưa có học sinh
        cursor.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'student'")
        if cursor.fetchone()["count"] == 0:
            seed_sample_students(cursor, conn)

def seed_sample_students(cursor, conn):
    """Tạo mẫu các học sinh có điểm Thám tử Lab và Nhật ký Xanh"""
    sample_students = [
        ("nguyenan", "Nguyễn Bình An", 8, "8A1", "123456", 50, "cell-wall", "Bắt lỗi thành tế bào"),
        ("tranlinh", "Trần Khánh Linh", 7, "7A3", "123456", 40, "chloroplast", "Bắt lỗi lục lạp ban đêm"),
        ("leminh", "Lê Quang Minh", 9, "9A2", "123456", 50, "left-ventricle", "Bắt lỗi tâm thất trái"),
        ("hoangmai", "Hoàng Ngọc Mai", 6, "6B", "123456", 30, "vacuole", "Bắt lỗi không bào trung tâm"),
        ("phamkhoi", "Phạm Đăng Khôi", 8, "8A4", "123456", 30, "mitochondria", "Bắt lỗi ti thể"),
    ]

    for username, name, grade, room, pwd, score, organelle, title in sample_students:
        salt = secrets.token_hex(8)
        pwd_hash = hash_password(pwd, salt)
        cursor.execute("""
            INSERT OR IGNORE INTO users (username, password_hash, salt, full_name, grade, classroom, role, detective_score)
            VALUES (?, ?, ?, ?, ?, ?, 'student', ?)
        """, (username, pwd_hash, salt, name, grade, room, score))
        
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if row:
            user_id = row["id"]
            cursor.execute("""
                INSERT INTO detective_logs (user_id, organelle_key, case_title, points)
                VALUES (?, ?, ?, ?)
            """, (user_id, organelle, title, score))

            cursor.execute("""
                INSERT INTO eco_logs (user_id, action_type, title, description)
                VALUES (?, 'tree', ?, ?)
            """, (user_id, f"Trồng và chăm sóc cây xanh thực nghiệm lớp {room}", f"{name} đã cùng chi đội ươm mầm các chậu cây phục vụ bài học Quang hợp."))

    conn.commit()

# ==================== SECURITY & TOKEN HELPERS ====================
def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()

def generate_token(user_id: int) -> str:
    raw = f"{user_id}:{time.time()}:{secrets.token_hex(16)}"
    sig = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}:{sig}"

def verify_token(token: str):
    if not token or ":" not in token:
        return None
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return None
        user_id_str, timestamp_str, nonce, sig = parts
        raw = f"{user_id_str}:{timestamp_str}:{nonce}"
        expected_sig = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        return int(user_id_str)
    except Exception:
        return None

def get_current_user():
    """Lấy user hiện tại từ Bearer Token trong headers"""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        user_id = verify_token(token)
        if user_id:
            with get_db() as conn:
                user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                if user:
                    return user
    return None

def get_current_user_id():
    user = get_current_user()
    return user["id"] if user else None

def is_admin_or_teacher():
    user = get_current_user()
    return user and user["role"] in ["teacher", "admin"]

# ==================== STATIC FRONTEND SERVING ====================
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory(BASE_DIR, path)

# ==================== API AUTHENTICATION ====================
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    grade = data.get("grade", 6)
    classroom = data.get("classroom", "").strip()

    if not username or not password or not full_name:
        return jsonify({"success": False, "message": "Vui lòng điền đầy đủ họ tên, tên đăng nhập và mật khẩu."}), 400

    try:
        grade = int(grade)
        if grade not in [6, 7, 8, 9]:
            grade = 6
    except ValueError:
        grade = 6

    salt = secrets.token_hex(8)
    password_hash = hash_password(password, salt)

    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                INSERT INTO users (username, password_hash, salt, full_name, grade, classroom, role, detective_score)
                VALUES (?, ?, ?, ?, ?, ?, 'student', 0)
            """, (username, password_hash, salt, full_name, grade, classroom))
            conn.commit()
            user_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            return jsonify({"success": False, "message": "Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác."}), 409

    token = generate_token(user_id)
    with get_db() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
        conn.commit()

    return jsonify({
        "success": True,
        "message": "Đăng ký tài khoản học sinh thành công!",
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "full_name": full_name,
            "grade": grade,
            "classroom": classroom,
            "role": "student",
            "detective_score": 0
        }
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Vui lòng nhập tên đăng nhập và mật khẩu."}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        user = cursor.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            return jsonify({"success": False, "message": "Tên đăng nhập hoặc mật khẩu không chính xác."}), 401

        computed_hash = hash_password(password, user["salt"])
        if not hmac.compare_digest(computed_hash, user["password_hash"]):
            return jsonify({"success": False, "message": "Tên đăng nhập hoặc mật khẩu không chính xác."}), 401

        token = generate_token(user["id"])
        cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Đăng nhập thành công!",
            "token": token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "grade": user["grade"],
                "classroom": user["classroom"],
                "role": user["role"] or "student",
                "detective_score": user["detective_score"] or 0
            }
        })

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()
    return jsonify({"success": True, "message": "Đã đăng xuất."})

@app.route("/api/auth/me", methods=["GET"])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "message": "Chưa đăng nhập hoặc phiên đã hết hạn."}), 401

    with get_db() as conn:
        user_id = user["id"]
        detective_score = user["detective_score"] or 0
        eco_count = conn.execute("SELECT COUNT(*) AS count FROM eco_logs WHERE user_id = ?", (user_id,)).fetchone()["count"]
        detective_cases_count = conn.execute("SELECT COUNT(*) AS count FROM detective_logs WHERE user_id = ?", (user_id,)).fetchone()["count"]
        total_green_points = detective_score + (eco_count * 10)

        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "grade": user["grade"],
                "classroom": user["classroom"],
                "role": user["role"] or "student",
                "detective_score": detective_score,
                "stats": {
                    "detective_score": detective_score,
                    "detective_cases": detective_cases_count,
                    "eco_actions": eco_count,
                    "total_green_points": total_green_points
                }
            }
        })

# ==================== API LAB 360° THÁM TỬ BẮT LỖI AI ====================
@app.route("/api/lab/detective/submit", methods=["POST"])
def submit_detective():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Vui lòng đăng nhập để lưu điểm Thám tử Sinh học."}), 401

    data = request.get_json() or {}
    organelle_key = data.get("organelle_key", "general")
    case_title = data.get("case_title", "Phát hiện lỗi nhận định AI")
    points = int(data.get("points", 10))

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO detective_logs (user_id, organelle_key, case_title, points)
            VALUES (?, ?, ?, ?)
        """, (user_id, organelle_key, case_title, points))

        cursor.execute("UPDATE users SET detective_score = COALESCE(detective_score, 0) + ? WHERE id = ?", (points, user_id))
        conn.commit()

        updated_user = conn.execute("SELECT detective_score FROM users WHERE id = ?", (user_id,)).fetchone()
        new_score = updated_user["detective_score"] if updated_user else points

        return jsonify({
            "success": True,
            "message": f"🎉 Xuất sắc! Em được cộng +{points} điểm Thám tử Khoa học!",
            "detective_score": new_score
        })

@app.route("/api/lab/detective/history", methods=["GET"])
def get_detective_history():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Chưa đăng nhập."}), 401

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, organelle_key, case_title, points, created_at
            FROM detective_logs WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 20
        """, (user_id,)).fetchall()

        history = [dict(row) for row in rows]
        return jsonify({"success": True, "history": history})

# ==================== API ECO PLANET (HÀNH TINH XANH) ====================
@app.route("/api/eco/logs", methods=["GET"])
def get_eco_logs():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT e.id, e.action_type, e.title, e.description, e.created_at,
                   COALESCE(u.full_name, 'Học sinh SmartBio') AS author_name,
                   COALESCE(u.grade, 7) AS author_grade,
                   COALESCE(u.classroom, '') AS author_class
            FROM eco_logs e
            LEFT JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC LIMIT 40
        """).fetchall()

        logs = [dict(row) for row in rows]
        return jsonify({"success": True, "logs": logs})

@app.route("/api/eco/save", methods=["POST"])
def save_eco_log():
    user_id = get_current_user_id()
    data = request.get_json() or {}
    action_type = data.get("action_type", "tree")
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()

    if not title or not description:
        return jsonify({"success": False, "message": "Vui lòng nhập đầy đủ tiêu đề và mô tả hành động."}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO eco_logs (user_id, action_type, title, description)
            VALUES (?, ?, ?, ?)
        """, (user_id, action_type, title, description))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Đã lưu hành động xanh vào sổ tay cộng đồng Hành tinh Xanh!",
            "log_id": cursor.lastrowid
        })

# ==================== API BẢNG XẾP HẠNG (LEADERBOARD) ====================
@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    grade_param = request.args.get("grade", "all")
    
    query = """
        SELECT u.id, u.full_name, u.grade, u.classroom,
               COALESCE(u.detective_score, 0) AS detective_score,
               (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) AS eco_count,
               (COALESCE(u.detective_score, 0) + (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) * 10) AS total_points
        FROM users u
        WHERE u.role != 'teacher'
    """
    params = []
    if grade_param != "all":
        try:
            grade_int = int(grade_param)
            query += " AND u.grade = ?"
            params.append(grade_int)
        except ValueError:
            pass

    query += " ORDER BY total_points DESC, detective_score DESC LIMIT 25"

    with get_db() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
        leaderboard = []
        for idx, r in enumerate(rows, 1):
            leaderboard.append({
                "rank": idx,
                "id": r["id"],
                "full_name": r["full_name"],
                "grade": r["grade"],
                "classroom": r["classroom"],
                "detective_score": r["detective_score"],
                "eco_count": r["eco_count"],
                "total_points": r["total_points"]
            })
        return jsonify({"success": True, "leaderboard": leaderboard})

# ==================== API BẢNG QUẢN TRỊ VIÊN / GIÁO VIÊN ====================
@app.route("/api/admin/overview", methods=["GET"])
def admin_overview():
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối. Chỉ dành cho Giáo viên/Admin."}), 403

    with get_db() as conn:
        total_students = conn.execute("SELECT COUNT(*) AS c FROM users WHERE role != 'teacher'").fetchone()["c"]
        total_detective = conn.execute("SELECT COUNT(*) AS c FROM detective_logs").fetchone()["c"]
        total_eco = conn.execute("SELECT COUNT(*) AS c FROM eco_logs").fetchone()["c"]
        avg_score_row = conn.execute("SELECT AVG(detective_score) AS avg_s FROM users WHERE role != 'teacher'").fetchone()
        avg_score = round(avg_score_row["avg_s"] or 0, 1)

        return jsonify({
            "success": True,
            "overview": {
                "total_students": total_students,
                "total_detective_challenges": total_detective,
                "total_eco_actions": total_eco,
                "average_detective_score": avg_score
            }
        })

@app.route("/api/admin/students", methods=["GET"])
def admin_get_students():
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    grade_param = request.args.get("grade", "all")
    search_param = request.args.get("q", "").strip()

    query = """
        SELECT u.id, u.username, u.full_name, u.grade, u.classroom, u.created_at,
               COALESCE(u.detective_score, 0) AS detective_score,
               (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) AS eco_count,
               (COALESCE(u.detective_score, 0) + (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) * 10) AS total_points
        FROM users u
        WHERE u.role != 'teacher'
    """
    params = []
    if grade_param != "all":
        query += " AND u.grade = ?"
        params.append(grade_param)

    if search_param:
        query += " AND (u.full_name LIKE ? OR u.username LIKE ?)"
        params.extend([f"%{search_param}%", f"%{search_param}%"])

    query += " ORDER BY u.grade ASC, total_points DESC"

    with get_db() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
        students = [dict(r) for r in rows]
        return jsonify({"success": True, "students": students})

@app.route("/api/admin/students/reset-password", methods=["POST"])
def admin_reset_password():
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    data = request.get_json() or {}
    user_id = data.get("user_id")
    new_password = data.get("new_password", "123456").strip()

    if not user_id:
        return jsonify({"success": False, "message": "Thiếu user_id."}), 400

    new_salt = secrets.token_hex(8)
    new_hash = hash_password(new_password, new_salt)

    with get_db() as conn:
        conn.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (new_hash, new_salt, user_id))
        conn.commit()

    return jsonify({"success": True, "message": f"Đã reset mật khẩu học sinh thành: {new_password}"})

@app.route("/api/admin/students/<int:student_id>", methods=["DELETE"])
def admin_delete_student(student_id):
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE id = ? AND role != 'teacher'", (student_id,))
        conn.commit()

    return jsonify({"success": True, "message": "Đã xóa tài khoản học sinh thành công."})

@app.route("/api/admin/eco-logs/<int:log_id>", methods=["DELETE"])
def admin_delete_eco_log(log_id):
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    with get_db() as conn:
        conn.execute("DELETE FROM eco_logs WHERE id = ?", (log_id,))
        conn.commit()

    return jsonify({"success": True, "message": "Đã xóa nhật ký xanh vi phạm."})

@app.route("/api/admin/export-csv", methods=["GET"])
def admin_export_csv():
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM
    writer = csv.writer(output)

    writer.writerow(["Mã HS", "Tên đăng nhập", "Họ và tên", "Khối lớp", "Lớp/Phòng", "Điểm Thám tử Lab", "Hành động xanh", "Tổng điểm tích lũy", "Ngày đăng ký"])

    with get_db() as conn:
        query = """
            SELECT u.id, u.username, u.full_name, u.grade, u.classroom, u.created_at,
                   COALESCE(u.detective_score, 0) AS detective_score,
                   (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) AS eco_count,
                   (COALESCE(u.detective_score, 0) + (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) * 10) AS total_points
            FROM users u
            WHERE u.role != 'teacher'
            ORDER BY u.grade ASC, total_points DESC
        """
        rows = conn.execute(query).fetchall()
        for r in rows:
            writer.writerow([
                r["id"],
                r["username"],
                r["full_name"],
                f"Khối {r['grade']}",
                r["classroom"] or "Chưa xếp",
                r["detective_score"],
                r["eco_count"],
                r["total_points"],
                r["created_at"]
            ])

    csv_data = output.getvalue()
    response = Response(csv_data, mimetype="text/csv; charset=utf-8")
    response.headers["Content-Disposition"] = "attachment; filename=SmartBio360_BangDiem_HocSinh.csv"
    return response

# ==================== SERVER START ====================
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n==========================================================")
    print(f"🚀 SmartBio 360 Backend Server (Lab 360° & Hành tinh Xanh)")
    print(f"🌐 Đang chạy tại: http://localhost:{port}")
    print(f"📁 Cơ sở dữ liệu: {DB_PATH}")
    print(f"🔑 Tài khoản Quản trị viên / Giáo viên: admin / admin123")
    print(f"==========================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False)
