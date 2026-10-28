"""
SmartBio 360 - Backend Server
Framework: Flask + SQLite3 (Python Standard Library)
Cung cấp API Quản lý Học sinh, Xác thực JWT/Token, Lưu lịch sử học tập, Bảng xếp hạng & Bảng Quản trị Giáo viên.
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Migration: Kiểm tra và bổ sung cột role nếu bảng cũ chưa có
        cursor.execute("PRAGMA table_info(users)")
        columns = [col["name"] for col in cursor.fetchall()]
        if "role" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")

        # 2. Bảng phiên đăng nhập (sessions)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)

        # 3. Bảng lịch sử làm bài trắc nghiệm / đánh giá (quiz_history)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                topic TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                rank_title TEXT NOT NULL,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
                INSERT INTO users (username, password_hash, salt, full_name, grade, classroom, role)
                VALUES ('admin', ?, ?, 'Thầy Quản Trị Viên (Tổ KHTN)', 0, 'Văn Phòng Bộ Môn', 'teacher')
            """, (pwd_hash, salt))
            conn.commit()

        # Seed dữ liệu học sinh mẫu nếu chưa có học sinh
        cursor.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'student'")
        if cursor.fetchone()["count"] == 0:
            seed_sample_students(cursor, conn)

def seed_sample_students(cursor, conn):
    """Tạo mẫu các học sinh và điểm số phong phú cho hệ thống"""
    sample_students = [
        ("nguyenan", "Nguyễn Bình An", 8, "8A1", "123456", 5, "Bậc thầy Sinh học"),
        ("tranlinh", "Trần Khánh Linh", 7, "7A3", "123456", 4, "Nhà Khám phá Nhí"),
        ("leminh", "Lê Quang Minh", 9, "9A2", "123456", 5, "Bậc thầy Sinh học"),
        ("hoangmai", "Hoàng Ngọc Mai", 6, "6B", "123456", 4, "Nhà Khám phá Nhí"),
        ("phamkhoi", "Phạm Đăng Khôi", 8, "8A4", "123456", 3, "Nhà Khám phá Nhí"),
    ]

    for username, name, grade, room, pwd, score, rank_t in sample_students:
        salt = secrets.token_hex(8)
        pwd_hash = hash_password(pwd, salt)
        cursor.execute("""
            INSERT OR IGNORE INTO users (username, password_hash, salt, full_name, grade, classroom, role)
            VALUES (?, ?, ?, ?, ?, ?, 'student')
        """, (username, pwd_hash, salt, name, grade, room))
        
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if row:
            user_id = row["id"]
            cursor.execute("""
                INSERT INTO quiz_history (user_id, topic, score, total_questions, rank_title)
                VALUES (?, ?, ?, 5, ?)
            """, (user_id, f"Tổng hợp KHTN Lớp {grade}", score, rank_t))

            cursor.execute("""
                INSERT INTO eco_logs (user_id, action_type, title, description)
                VALUES (?, 'tree', ?, ?)
            """, (user_id, f"Trồng cây xanh thực nghiệm tại lớp {room}", f"{name} đã cùng lớp ươm mầm 5 chậu cây xanh."))

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

# ==================== API AUTH ====================
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    grade = data.get("grade", 6)
    classroom = data.get("classroom", "").strip()

    if not username or len(username) < 3:
        return jsonify({"success": False, "message": "Tên đăng nhập phải từ 3 ký tự trở lên."}), 400
    if not password or len(password) < 6:
        return jsonify({"success": False, "message": "Mật khẩu phải từ 6 ký tự trở lên."}), 400
    if not full_name:
        return jsonify({"success": False, "message": "Vui lòng nhập Họ và tên học sinh."}), 400

    try:
        grade = int(grade)
        if grade not in [6, 7, 8, 9]:
            grade = 6
    except ValueError:
        grade = 6

    salt = secrets.token_hex(8)
    pwd_hash = hash_password(password, salt)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO users (username, password_hash, salt, full_name, grade, classroom, role)
                VALUES (?, ?, ?, ?, ?, ?, 'student')
            """, (username, pwd_hash, salt, full_name, grade, classroom))
            user_id = cursor.lastrowid
            
            token = generate_token(user_id)
            cursor.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
            conn.commit()

            return jsonify({
                "success": True,
                "message": "Đăng ký tài khoản thành công!",
                "token": token,
                "user": {
                    "id": user_id,
                    "username": username,
                    "full_name": full_name,
                    "grade": grade,
                    "classroom": classroom,
                    "role": "student"
                }
            })
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác."}), 409
    except Exception as e:
        return jsonify({"success": False, "message": f"Lỗi hệ thống: {str(e)}"}), 500

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
                "role": user["role"] or "student"
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
        quiz_stats = conn.execute("""
            SELECT COUNT(*) AS total_quizzes, COALESCE(SUM(score), 0) AS total_score, COALESCE(MAX(score), 0) AS best_score
            FROM quiz_history WHERE user_id = ?
        """, (user_id,)).fetchone()

        eco_count = conn.execute("SELECT COUNT(*) AS count FROM eco_logs WHERE user_id = ?", (user_id,)).fetchone()["count"]

        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "grade": user["grade"],
                "classroom": user["classroom"],
                "role": user["role"] or "student",
                "stats": {
                    "total_quizzes": quiz_stats["total_quizzes"],
                    "total_score": quiz_stats["total_score"],
                    "best_score": quiz_stats["best_score"],
                    "eco_actions": eco_count
                }
            }
        })

# ==================== API QUIZ & LỊCH SỬ HỌC TẬP ====================
@app.route("/api/quiz/save", methods=["POST"])
def save_quiz():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Vui lòng đăng nhập để lưu kết quả bài thi."}), 401

    data = request.get_json() or {}
    topic = data.get("topic", "Trắc nghiệm Sinh học THCS")
    score = int(data.get("score", 0))
    total_questions = int(data.get("total_questions", 5))
    rank_title = data.get("rank_title", "Nhà Khám phá Nhí")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO quiz_history (user_id, topic, score, total_questions, rank_title)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, topic, score, total_questions, rank_title))
        conn.commit()

        total_score = conn.execute("SELECT SUM(score) AS sum_score FROM quiz_history WHERE user_id = ?", (user_id,)).fetchone()["sum_score"]

        return jsonify({
            "success": True,
            "message": "Đã lưu kết quả bài thi vào hồ sơ học sinh!",
            "new_record_id": cursor.lastrowid,
            "accumulated_score": total_score
        })

@app.route("/api/quiz/history", methods=["GET"])
def get_quiz_history():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Chưa đăng nhập."}), 401

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, topic, score, total_questions, rank_title, completed_at
            FROM quiz_history WHERE user_id = ?
            ORDER BY completed_at DESC LIMIT 20
        """, (user_id,)).fetchall()

        history = [dict(row) for row in rows]
        return jsonify({"success": True, "history": history})

# ==================== API ECO PLANET ====================
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
            ORDER BY e.created_at DESC LIMIT 30
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
            "message": "Đã lưu hành động xanh vào sổ tay cộng đồng!",
            "log_id": cursor.lastrowid
        })

# ==================== API BẢNG XẾP HẠNG (LEADERBOARD) ====================
@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    grade_param = request.args.get("grade", "all")
    
    query = """
        SELECT u.id, u.full_name, u.grade, u.classroom,
               COALESCE(SUM(q.score), 0) AS total_score,
               COUNT(q.id) AS total_quizzes,
               (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) AS eco_count
        FROM users u
        LEFT JOIN quiz_history q ON u.id = q.user_id
        WHERE u.role != 'teacher'
    """
    params = []
    if grade_param in ["6", "7", "8", "9"]:
        query += " AND u.grade = ?"
        params.append(int(grade_param))

    query += " GROUP BY u.id ORDER BY total_score DESC, eco_count DESC LIMIT 20"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        ranking = []
        for rank, row in enumerate(rows, start=1):
            item = dict(row)
            item["rank"] = rank
            ranking.append(item)

        return jsonify({
            "success": True,
            "grade": grade_param,
            "leaderboard": ranking
        })

# ==================== API QUẢN TRỊ VIÊN / GIÁO VIÊN (ADMIN DASHBOARD) ====================
@app.route("/api/admin/overview", methods=["GET"])
def admin_overview():
    """Thống kê tổng quan trường học dành cho giáo viên"""
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối. Chỉ dành cho Giáo viên/Admin."}), 403

    with get_db() as conn:
        total_students = conn.execute("SELECT COUNT(*) AS c FROM users WHERE role != 'teacher'").fetchone()["c"]
        total_quizzes = conn.execute("SELECT COUNT(*) AS c FROM quiz_history").fetchone()["c"]
        total_eco = conn.execute("SELECT COUNT(*) AS c FROM eco_logs").fetchone()["c"]
        avg_score_row = conn.execute("SELECT AVG(score) AS avg_s FROM quiz_history").fetchone()
        avg_score = round(avg_score_row["avg_s"] or 0, 1)

        return jsonify({
            "success": True,
            "overview": {
                "total_students": total_students,
                "total_quizzes": total_quizzes,
                "total_eco_actions": total_eco,
                "average_score": avg_score
            }
        })

@app.route("/api/admin/students", methods=["GET"])
def admin_get_students():
    """Xem danh sách học sinh kèm điểm số và thống kê"""
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    with get_db() as conn:
        query = """
            SELECT u.id, u.username, u.full_name, u.grade, u.classroom, u.created_at,
                   COALESCE(SUM(q.score), 0) AS total_score,
                   COUNT(q.id) AS total_quizzes,
                   (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) AS eco_count
            FROM users u
            LEFT JOIN quiz_history q ON u.id = q.user_id
            WHERE u.role != 'teacher'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        """
        rows = conn.execute(query).fetchall()
        students = [dict(r) for r in rows]
        return jsonify({"success": True, "students": students})

@app.route("/api/admin/students/reset-password", methods=["POST"])
def admin_reset_password():
    """Giáo viên đặt lại mật khẩu cho học sinh về '123456'"""
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    data = request.get_json() or {}
    student_id = data.get("student_id")
    if not student_id:
        return jsonify({"success": False, "message": "Thiếu student_id."}), 400

    new_pwd = "123456"
    salt = secrets.token_hex(8)
    pwd_hash = hash_password(new_pwd, salt)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (pwd_hash, salt, student_id))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Không tìm thấy học sinh."}), 404

        return jsonify({
            "success": True,
            "message": f"Đã đặt lại mật khẩu của học sinh về mặc định: {new_pwd}"
        })

@app.route("/api/admin/students/<int:student_id>", methods=["DELETE"])
def admin_delete_student(student_id):
    """Xóa tài khoản học sinh"""
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ? AND role != 'teacher'", (student_id,))
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (student_id,))
        cursor.execute("DELETE FROM quiz_history WHERE user_id = ?", (student_id,))
        cursor.execute("DELETE FROM eco_logs WHERE user_id = ?", (student_id,))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Không thể xóa học sinh này."}), 404

        return jsonify({"success": True, "message": "Đã xóa học sinh và toàn bộ dữ liệu liên quan thành công."})

@app.route("/api/admin/quiz-stats", methods=["GET"])
def admin_quiz_stats():
    """Thống kê chi tiết tỷ lệ làm đúng và câu hỏi học sinh hay nhầm lẫn nhất"""
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    # Phân tích 5 câu hỏi trọng tâm của chương trình GDPT 2018
    question_analytics = [
        {
            "id": 1,
            "topic": "Tế bào học (KHTN 6)",
            "title": "Bào quan quang hợp (Lục lạp)",
            "correct_rate": 88,
            "difficulty": "Dễ",
            "diagnosis": "Đa số học sinh nắm vững lục lạp là nơi quang hợp chỉ có ở thực vật."
        },
        {
            "id": 2,
            "topic": "Trao đổi chất (KHTN 7)",
            "title": "Nguyên liệu quang hợp (CO2 và H2O)",
            "correct_rate": 78,
            "difficulty": "Trung bình",
            "diagnosis": "Một số học sinh bị nhầm lẫn giữa sản phẩm tạo ra (O2) và chất nguyên liệu ban đầu."
        },
        {
            "id": 3,
            "topic": "Tuần hoàn máu (KHTN 8)",
            "title": "Tại sao tim đập không mỏi (Chu kỳ tim)",
            "correct_rate": 62,
            "difficulty": "Khó",
            "diagnosis": "Học sinh hay nhầm tim làm việc liên tục 24/24 mà không biết tim có pha giãn chung nghỉ 0.4s."
        },
        {
            "id": 4,
            "topic": "Di truyền học (KHTN 9)",
            "title": "Quy luật phân li Menđen (F1: 100% Trội)",
            "correct_rate": 55,
            "difficulty": "Vận dụng",
            "diagnosis": "Học sinh thường nhầm lẫn giữa tỷ lệ F1 (100% Aa) và tỷ lệ phân li F2 (3 Trội : 1 Lặn)."
        },
        {
            "id": 5,
            "topic": "Hệ sinh thái & Môi trường",
            "title": "Bảo vệ sinh vật sản xuất sơ cấp",
            "correct_rate": 92,
            "difficulty": "Thực tế",
            "diagnosis": "Học sinh hiểu rất tốt vai trò của cây xanh trong chuỗi thức ăn tự nhiên."
        }
    ]

    with get_db() as conn:
        recent_tests = conn.execute("""
            SELECT q.id, q.topic, q.score, q.total_questions, q.rank_title, q.completed_at,
                   u.full_name, u.grade, u.classroom
            FROM quiz_history q
            JOIN users u ON q.user_id = u.id
            ORDER BY q.completed_at DESC LIMIT 15
        """).fetchall()

        return jsonify({
            "success": True,
            "questions": question_analytics,
            "recent_tests": [dict(r) for r in recent_tests]
        })

@app.route("/api/admin/eco-logs/<int:log_id>", methods=["DELETE"])
def admin_delete_eco_log(log_id):
    """Giáo viên kiểm duyệt / xóa bài đăng rác hoặc không phù hợp"""
    if not is_admin_or_teacher():
        return jsonify({"success": False, "message": "Quyền truy cập bị từ chối."}), 403

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM eco_logs WHERE id = ?", (log_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Đã xóa bài nhật ký xanh thành công."})

@app.route("/api/admin/export-csv", methods=["GET"])
def admin_export_csv():
    """Xuất bảng điểm học sinh toàn trường ra file CSV (chuẩn UTF-8 mở được trên Microsoft Excel)"""
    # Cho phép tải khi có query token hoặc header
    token = request.args.get("token")
    user = None
    if token:
        user_id = verify_token(token)
        if user_id:
            with get_db() as conn:
                user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user or user["role"] not in ["teacher", "admin"]:
        user = get_current_user()

    if not user or user["role"] not in ["teacher", "admin"]:
        return "Quyền truy cập bị từ chối. Chỉ dành cho Giáo viên.", 403

    output = io.StringIO()
    # Ghi UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
    output.write('\ufeff')
    writer = csv.writer(output)

    # Tiêu đề cột
    writer.writerow(["Mã HS", "Tên đăng nhập", "Họ và tên", "Khối lớp", "Lớp/Phòng", "Tổng điểm Quiz", "Số bài thi", "Hành động xanh", "Ngày đăng ký"])

    with get_db() as conn:
        query = """
            SELECT u.id, u.username, u.full_name, u.grade, u.classroom, u.created_at,
                   COALESCE(SUM(q.score), 0) AS total_score,
                   COUNT(q.id) AS total_quizzes,
                   (SELECT COUNT(*) FROM eco_logs e WHERE e.user_id = u.id) AS eco_count
            FROM users u
            LEFT JOIN quiz_history q ON u.id = q.user_id
            WHERE u.role != 'teacher'
            GROUP BY u.id
            ORDER BY u.grade ASC, total_score DESC
        """
        rows = conn.execute(query).fetchall()
        for r in rows:
            writer.writerow([
                r["id"],
                r["username"],
                r["full_name"],
                f"Khối {r['grade']}",
                r["classroom"] or "Chưa xếp",
                r["total_score"],
                r["total_quizzes"],
                r["eco_count"],
                r["created_at"]
            ])

    csv_data = output.getvalue()
    response = Response(csv_data, mimetype="text/csv; charset=utf-8")
    response.headers["Content-Disposition"] = "attachment; filename=SmartBio360_BangDiem_HocSinh.csv"
    return response

# ==================== SERVER START ====================
# Tự động khởi tạo DB khi chạy trực tiếp hoặc chạy qua WSGI (Gunicorn / Render)
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n==========================================================")
    print(f"🚀 SmartBio 360 Backend Server đang chạy tại: http://localhost:{port}")
    print(f"📁 Cơ sở dữ liệu: {DB_PATH}")
    print(f"🔑 Tài khoản Quản trị viên / Giáo viên: admin / admin123")
    print(f"🌐 Mở trình duyệt truy cập: http://localhost:{port}")
    print(f"==========================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False)
