/**
 * SmartBio 360 - Frontend Application Logic & Backend Integration
 * Tích hợp API: Xác thực Học sinh, Lịch sử Làm bài, Bảng xếp hạng & Nhật ký Xanh
 */

// ==================== STATE MANAGEMENT ====================
const state = {
  activeTab: 'dashboard',
  apiKey: localStorage.getItem('smartbio_gemini_key') || '',
  currentLabModel: 'plant-cell',
  currentZoom: 1,
  selectedOrganelle: null,
  activeSampleLens: 'la-bang',
  chatMessages: [],
  isHeartBeating: true,
  detectivePoints: 0,
  
  // Auth & Backend State
  user: (() => {
    try {
      const u = JSON.parse(localStorage.getItem('smartbio_user') || 'null');
      if (u && (u.username === 'admin' || u.role === 'teacher' || u.role === 'admin')) {
        u.role = 'teacher';
        localStorage.setItem('smartbio_user', JSON.stringify(u));
      }
      return u;
    } catch (e) {
      return null;
    }
  })(),
  token: localStorage.getItem('smartbio_token') || '',
  isBackendConnected: false,
  leaderboardGrade: 'all',
  leaderboardData: [],
  userQuizHistory: [],
  adminStudents: [],
  adminGradeFilter: 'all',

  quiz: {
    currentIndex: 0,
    score: 0,
    answered: false,
    questions: [
      {
        topic: 'Tế bào học (KHTN Lớp 6)',
        question: 'Bào quan nào sau đây chỉ có ở tế bào thực vật mà không có ở tế bào động vật, giúp thực vật quang hợp tổng hợp chất hữu cơ?',
        options: [
          'Ti thể (Mitochondria)',
          'Lục lạp (Chloroplast)',
          'Nhân tế bào (Nucleus)',
          'Bộ máy Golgi'
        ],
        correct: 1,
        explanation: 'Chính xác! Lục lạp chứa chất diệp lục giúp hấp thụ ánh sáng mặt trời để thực hiện quá trình quang hợp. Động vật không có lục lạp nên phải dinh dưỡng dị dưỡng.'
      },
      {
        topic: 'Quang hợp & Trao đổi chất (KHTN Lớp 7)',
        question: 'Nguyên liệu chính của quá trình quang hợp ở lá cây gồm những chất nào sau đây?',
        options: [
          'Khí Oxygen (O2) và Nước (H2O)',
          'Khí Carbon dioxide (CO2) và Nước (H2O)',
          'Khí Nitrogen (N2) và Nước (H2O)',
          'Chất hữu cơ Glucose và Khí CO2'
        ],
        correct: 1,
        explanation: 'Đúng rồi! Cây hấp thụ CO2 từ không khí qua khí khổng và hút H2O từ rễ, nhờ năng lượng ánh sáng và diệp lục sẽ tạo ra Glucose và thải khí O2.'
      },
      {
        topic: 'Hệ tuần hoàn người (KHTN Lớp 8)',
        question: 'Tại sao tim người có thể hoạt động đập liên tục suốt cả cuộc đời mà không hề bị mệt mỏi?',
        options: [
          'Vì cơ tim được cấu tạo từ loại protein đặc biệt không cần nghỉ',
          'Vì mỗi chu kỳ tim có thời gian giãn chung (nghỉ) đủ để phục hồi năng lượng',
          'Vì tim được máu giàu oxy nuôi dưỡng liên tục mà không cần nghỉ',
          'Vì tim có van tim tự động đóng mở giảm áp lực hoàn toàn'
        ],
        correct: 1,
        explanation: 'Rất chính xác! Một chu kỳ tim kéo dài khoảng 0.8 giây: tâm nhĩ co 0.1s (nghỉ 0.7s), tâm thất co 0.3s (nghỉ 0.5s), và thời gian tim giãn chung là 0.4s. Do đó thời gian nghỉ ngơi của tim trong một chu kỳ còn nhiều hơn thời gian làm việc.'
      },
      {
        topic: 'Di truyền học Menđen (KHTN Lớp 9)',
        question: 'Khi lai hai cơ thể bố mẹ thuần chủng khác nhau về một cặp tính trạng tương phản (AA x aa), ở thế hệ F1 thu được kết quả như thế nào?',
        options: [
          '100% mang kiểu hình trội (Aa)',
          '50% trội, 50% lặn',
          '75% trội, 25% lặn',
          '100% mang kiểu hình lặn (aa)'
        ],
        correct: 0,
        explanation: 'Chuẩn xác! Theo quy luật đồng tính của Menđen, khi lai P thuần chủng khác nhau về một cặp tính trạng tương phản, thế hệ F1 đồng nhất 100% về kiểu hình của tính trạng trội (kiểu gen Aa).'
      },
      {
        topic: 'Hệ sinh thái & Môi trường (KHTN THCS)',
        question: 'Hành động nào sau đây của học sinh trực tiếp bảo vệ mắt xích sản xuất trong chuỗi thức ăn tự nhiên?',
        options: [
          'Phân loại và thu gom túi nilon, rác thải nhựa',
          'Trồng và chăm sóc cây xanh, bồn hoa sân trường',
          'Tắt đèn và quạt khi ra khỏi phòng học',
          'Nuôi thêm cá cảnh trong hồ sinh thái'
        ],
        correct: 1,
        explanation: 'Chính xác! Thực vật xanh là sinh vật sản xuất sơ cấp trong chuỗi thức ăn, cung cấp thức ăn và oxy cho toàn bộ sinh vật tiêu thụ trong hệ sinh thái.'
      }
    ]
  },
  ecoLogs: []
};

// ==================== LAB 360 DATA ====================
const labData = {
  'plant-cell': {
    title: 'Tế bào Thực vật (Plant Cell)',
    grade: 'KHTN Lớp 6',
    organelles: {
      'cell-wall': {
        name: 'Thành tế bào (Cell Wall)',
        tag: 'Bảo vệ & Tạo hình',
        role: 'Lớp vỏ cứng cấu tạo từ Cellulose bao bọc bên ngoài màng sinh chất. Giữ hình dạng tế bào thực vật luôn cố định, bảo vệ tế bào khỏi tác động cơ học và áp suất thẩm thấu.',
        fact: 'Động vật không có thành tế bào nên hình dạng tế bào mềm dẻo hơn, giúp động vật có thể vận động linh hoạt.'
      },
      'chloroplast': {
        name: 'Lục lạp (Chloroplast)',
        tag: 'Quang hợp năng lượng',
        role: 'Bào quan chứa chất diệp lục (Chlorophyll), hấp thụ năng lượng mặt trời để biến đổi CO2 và H2O thành Glucose và O2 trong quá trình quang hợp.',
        fact: 'Nhờ có lục lạp mà thực vật là sinh vật tự dưỡng, đóng vai trò sinh vật sản xuất cơ bản cho toàn Trái Đất.'
      },
      'nucleus': {
        name: 'Nhân tế bào (Nucleus)',
        tag: 'Trung tâm điều khiển',
        role: 'Chứa chất nhiễm sắc (vật chất di truyền ADN). Điều khiển mọi hoạt động sống, sinh trưởng và phân chia của tế bào.',
        fact: 'Nếu tách nhân ra khỏi tế bào, tế bào sẽ ngừng phân chia và nhanh chóng chết đi.'
      },
      'vacuole': {
        name: 'Không bào trung tâm (Large Vacuole)',
        tag: 'Dự trữ & Áp suất trương',
        role: 'Túi lớn chứa đầy dịch tế bào (nước, muối khoáng, chất dinh dưỡng, sắc tố). Tạo áp suất trương nước giúp thân và lá cây non đứng vững.',
        fact: 'Khi cây thiếu nước, không bào xẹp lại khiến cành lá bị héo rũ.'
      },
      'mitochondria': {
        name: 'Ti thể (Mitochondria)',
        tag: 'Nhà máy năng lượng ATP',
        role: 'Bào quan hình hạt hoặc que, thực hiện hô hấp tế bào: phân giải chất hữu cơ giải phóng năng lượng ATP cung cấp cho mọi hoạt động sống.',
        fact: 'Cả tế bào thực vật và động vật đều có ti thể để hô hấp!'
      },
      'cytoplasm': {
        name: 'Tế bào chất (Cytoplasm)',
        tag: 'Môi trường sống của bào quan',
        role: 'Chất dịch keo bán lỏng chứa 70-80% nước, là nơi diễn ra hầu hết các phản ứng hóa sinh của tế bào.',
        fact: 'Tế bào chất luôn chuyển động dòng giúp vận chuyển các chất bên trong tế bào.'
      }
    }
  },
  'animal-cell': {
    title: 'Tế bào Động vật (Animal Cell)',
    grade: 'KHTN Lớp 6 & 8',
    organelles: {
      'membrane': {
        name: 'Màng sinh chất (Cell Membrane)',
        tag: 'Ranh giới & Trao đổi chất',
        role: 'Lớp màng kép phospholipid có tính bán thấm chọn lọc, kiểm soát các chất ra vào tế bào.',
        fact: 'Tế bào động vật không có thành cellulose nên có hình cầu hoặc đa giác mềm dẻo.'
      },
      'nucleus': {
        name: 'Nhân tế bào (Nucleus)',
        tag: 'Bộ chỉ huy trung tâm',
        role: 'Bao gồm màng nhân kép, lỗ màng nhân, nhân con và sợi nhiễm sắc chứa gen di truyền.',
        fact: 'Mỗi tế bào người bình thường chứa 46 nhiễm sắc thể (23 cặp).'
      },
      'mitochondria': {
        name: 'Ti thể (Mitochondria)',
        tag: 'Nhà máy năng lượng cực lớn',
        role: 'Số lượng ti thể rất nhiều ở các tế bào hoạt động mạnh như tế bào cơ tim, cơ bắp và gan.',
        fact: 'Tế bào cơ tim có thể chứa hàng nghìn ti thể để duy trì nhịp đập không ngừng.'
      },
      'golgi': {
        name: 'Bộ máy Golgi & Lưới nội chất',
        tag: 'Đóng gói & Vận chuyển protein',
        role: 'Tiếp nhận protein tổng hợp từ ribosome, biến đổi, đóng gói vào các túi tiết và phân phối đến nơi cần thiết.',
        fact: 'Được ví như bưu điện hoặc trung tâm logistics của tế bào.'
      },
      'cytoplasm': {
        name: 'Tế bào chất (Cytoplasm)',
        tag: 'Chất nền tế bào',
        role: 'Chứa khung xương tế bào (vi sợi, vi ống) giúp nâng đỡ và định vị các bào quan.',
        fact: 'Là nơi diễn ra giai đoạn đường phân đầu tiên trong hô hấp tế bào.'
      }
    }
  },
  'heart': {
    title: 'Cấu tạo Tim người & Hệ tuần hoàn',
    grade: 'KHTN Lớp 8',
    organelles: {
      'left-ventricle': {
        name: 'Tâm thất trái (Left Ventricle)',
        tag: 'Bơm máu động mạch nuôi cơ thể',
        role: 'Có thành cơ dày nhất trong 4 ngăn tim (gấp 3 lần thất phải). Co bóp tạo áp lực cực lớn bơm máu đỏ tươi giàu O2 qua cung động mạch chủ đi nuôi toàn bộ cơ thể.',
        fact: 'Thành tâm thất trái dày nhất vì phải thắng sức cản của toàn bộ mạng lưới mao mạch khắp cơ thể từ đỉnh đầu đến ngón chân.'
      },
      'right-ventricle': {
        name: 'Tâm thất phải (Right Ventricle)',
        tag: 'Bơm máu lên phổi',
        role: 'Nhận máu nghèo O2 (đỏ thẫm) từ tâm nhĩ phải và co bóp bơm máu qua động mạch phổi lên hai lá phổi để thực hiện trao đổi khí.',
        fact: 'Ở mao mạch phổi, máu nhả khí CO2 ra phế nang và nhận O2 trở thành máu đỏ tươi giàu oxy trở về tim.'
      },
      'atria': {
        name: 'Tâm nhĩ phải & Tâm nhĩ trái',
        tag: 'Hứng máu trở về tim',
        role: 'Tâm nhĩ phải nhận máu nghèo O2 từ tĩnh mạch chủ; Tâm nhĩ trái nhận máu đỏ tươi giàu O2 từ 4 tĩnh mạch phổi đổ về trước khi co bóp đẩy xuống tâm thất.',
        fact: 'Thời gian co của tâm nhĩ chỉ mất 0.1 giây trong chu kỳ tim, sau đó nghỉ ngơi tới 0.7 giây!'
      },
      'valves': {
        name: 'Hệ thống van tim (Heart Valves)',
        tag: 'Điều hòa dòng máu 1 chiều',
        role: 'Gồm van 3 lá (giữa nhĩ phải - thất phải), van 2 lá (giữa nhĩ trái - thất trái) và các van bán nguyệt tổ chim ở gốc động mạch chủ và động mạch phổi. Đảm bảo máu chỉ chảy theo một chiều duy nhất.',
        fact: 'Tiếng đập "bùm - tặc" khi nghe tim chính là âm thanh cơ học đóng sập lại của các van tim!'
      },
      'aorta': {
        name: 'Cung động mạch chủ (Aorta)',
        tag: 'Động mạch lớn nhất cơ thể',
        role: 'Mạch máu lớn nhất xuất phát từ tâm thất trái, uốn cong tạo thành cung và phân nhánh đưa máu đỏ tươi giàu oxy đến não, các chi và nội tạng.',
        fact: 'Thành động mạch chủ rất dày và giàu sợi đàn hồi giúp chuyển dòng máu ngắt quãng từ tim thành dòng chảy liên tục.'
      },
      'pulmonary-artery': {
        name: 'Động mạch phổi (Pulmonary Trunk)',
        tag: 'Dẫn máu lên phổi',
        role: 'Mạch máu xuất phát từ tâm thất phải, chia làm 2 nhánh trái và phải dẫn máu đỏ thẫm (giàu CO2) đến 2 lá phổi để nhả CO2 và nạp đầy O2.',
        fact: 'Đây là động mạch duy nhất trong cơ thể người mang máu nghèo O2 (đỏ thẫm) thay vì máu đỏ tươi!'
      }
    }
  }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  renderLabCanvas('plant-cell');
  selectOrganelle('chloroplast');
  renderQuiz();
  updateApiBadge();
  
  // Kiểm tra phiên đăng nhập và tải dữ liệu từ Backend
  checkAuthAndInitData();
});

// ==================== NAVIGATION TABS ====================
function switchTab(tabId) {
  // 1. Kiểm tra nghiêm ngặt phân quyền: Chỉ Giáo viên/Admin mới được vào Tab Quản Trị
  if (tabId === 'admin') {
    const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');
    if (!isAdmin) {
      console.warn('Truy cập bị từ chối: Bảng Quản trị chỉ dành cho Giáo viên!');
      tabId = 'dashboard';
    }
  }

  state.activeTab = tabId;
  
  // Ẩn tất cả các tab content
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
  });

  // Hiển thị tab được chọn
  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // Cập nhật trạng thái active cho thanh menu
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Nếu chuyển sang tab Quiz -> tải lại bảng xếp hạng mới nhất
  if (tabId === 'quiz') {
    fetchLeaderboard(state.leaderboardGrade);
    if (state.user) {
      fetchQuizHistory();
    }
  }

  // Nếu chuyển sang tab Eco Planet -> tải lại nhật ký cộng đồng
  if (tabId === 'ecoplanet') {
    fetchEcoLogs();
  }

  // Nếu chuyển sang tab Admin -> tải dữ liệu quản trị
  if (tabId === 'admin') {
    loadAdminData();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== AUTHENTICATION & PROFILE LOGIC ====================
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

async function checkAuthAndInitData() {
  if (state.user && (state.user.username === 'admin' || state.user.role === 'teacher' || state.user.role === 'admin')) {
    state.user.role = 'teacher';
    localStorage.setItem('smartbio_user', JSON.stringify(state.user));
  }

  updateAuthUI();

  // Thử kết nối backend
  try {
    const res = await fetch('/api/leaderboard?grade=all');
    if (res.ok) {
      state.isBackendConnected = true;
    }
  } catch (e) {
    state.isBackendConnected = false;
    console.warn('Backend server chưa chạy. Sử dụng dữ liệu bộ nhớ cục bộ.');
  }

  if (state.token) {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.user) {
        state.user = data.user;
        if (state.user.username === 'admin') {
          state.user.role = 'teacher';
        }
        localStorage.setItem('smartbio_user', JSON.stringify(state.user));
      } else {
        // Token hết hạn
        handleLogout(false);
      }
    } catch (e) {
      console.warn('Không thể xác thực token với máy chủ:', e);
    }
  }

  updateAuthUI();
  fetchLeaderboard(state.leaderboardGrade);
  fetchEcoLogs();
}

function updateAuthUI() {
  const loggedOutBox = document.getElementById('user-logged-out');
  const loggedInBox = document.getElementById('user-logged-in');
  const navAdmin = document.getElementById('nav-admin');
  const adminTopBanner = document.getElementById('admin-top-banner');
  const userPill = document.getElementById('user-pill-container');
  const avatarInitials = document.getElementById('user-avatar-initials');

  if (state.user && state.token) {
    loggedOutBox.classList.add('hidden');
    loggedInBox.classList.remove('hidden');
    loggedInBox.classList.add('flex');

    // Cập nhật thông tin trên header
    const initials = getInitials(state.user.full_name || 'GV');
    if (avatarInitials) avatarInitials.textContent = initials;
    document.getElementById('user-display-name').textContent = state.user.full_name || state.user.username;

    // Phân biệt giao diện Học sinh vs Giáo viên
    const isAdmin = state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin';
    if (isAdmin) {
      state.user.role = 'teacher';
      document.getElementById('user-display-grade').innerHTML = '<span class="text-rose-700 font-extrabold flex items-center gap-1"><i class="fa-solid fa-crown text-[10px] text-amber-500"></i> Giáo viên KHTN</span>';
      
      // Hiển thị nút Tab Quản trị
      if (navAdmin) {
        navAdmin.classList.remove('hidden');
        navAdmin.classList.add('inline-flex');
      }

      // Hiển thị banner đặc quyền giáo viên trên đỉnh trang
      if (adminTopBanner) {
        adminTopBanner.classList.remove('hidden');
      }

      // Đổi màu Pill sang phong cách Quản trị / Giáo viên
      if (userPill) {
        userPill.className = "flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-rose-50 border border-rose-300 cursor-pointer hover:bg-rose-100 transition-all shadow-sm ring-1 ring-rose-200/50";
      }
      if (avatarInitials) {
        avatarInitials.className = "h-7 w-7 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-extrabold flex items-center justify-center text-xs shadow-sm ring-2 ring-rose-200";
      }
    } else {
      document.getElementById('user-display-grade').textContent = `Khối ${state.user.grade || 8}${state.user.classroom ? ' • ' + state.user.classroom : ''}`;
      
      if (navAdmin) {
        navAdmin.classList.add('hidden');
        navAdmin.classList.remove('inline-flex', 'flex');
      }

      if (adminTopBanner) {
        adminTopBanner.classList.add('hidden');
      }

      // Đổi màu Pill sang màu xanh học sinh
      if (userPill) {
        userPill.className = "flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 transition-all";
      }
      if (avatarInitials) {
        avatarInitials.className = "h-7 w-7 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm ring-2 ring-emerald-200";
      }

      // BẢO VỆ PHÂN QUYỀN HỌC SINH: Ẩn ngay Tab Quản trị nếu đang hiển thị
      const tabAdminEl = document.getElementById('tab-admin');
      if (tabAdminEl) tabAdminEl.classList.add('hidden');
      if (state.activeTab === 'admin') {
        switchTab('dashboard');
      }
    }

    renderProfileBox();
  } else {
    loggedOutBox.classList.remove('hidden');
    loggedInBox.classList.add('hidden');
    loggedInBox.classList.remove('flex');
    if (navAdmin) {
      navAdmin.classList.add('hidden');
      navAdmin.classList.remove('inline-flex', 'flex');
    }
    if (adminTopBanner) {
      adminTopBanner.classList.add('hidden');
    }
    const tabAdminEl = document.getElementById('tab-admin');
    if (tabAdminEl) tabAdminEl.classList.add('hidden');
    if (state.activeTab === 'admin') {
      switchTab('dashboard');
    }
    renderProfileBoxGuest();
  }
}

function handleUserPillClick() {
  const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');
  if (isAdmin) {
    switchTab('admin');
  } else {
    switchTab('quiz');
  }
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderProfileBox() {
  const box = document.getElementById('profile-content-box');
  const user = state.user;
  const isAdmin = user.role === 'teacher' || user.role === 'admin' || user.username === 'admin';
  const stats = user.stats || { total_quizzes: 0, total_score: 0, best_score: 0, eco_actions: 0 };

  box.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 rounded-2xl bg-rose-500 text-white font-extrabold flex items-center justify-center text-base shadow-lg shadow-rose-500/30">
        ${getInitials(user.full_name)}
      </div>
      <div>
        <h4 class="font-extrabold text-base text-white">${escapeHtml(user.full_name)}</h4>
        <p class="text-xs text-rose-300 font-semibold">${isAdmin ? '👑 Giáo viên Quản trị • Tổ KHTN' : `Học sinh Khối ${user.grade} ${user.classroom ? '• Lớp ' + escapeHtml(user.classroom) : ''}`}</p>
      </div>
    </div>

    ${isAdmin ? `
      <div class="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-2 text-center mt-2">
        <p class="text-xs text-slate-200">Bạn đang đăng nhập với tư cách <strong>Giáo viên Quản trị</strong>.</p>
        <button onclick="switchTab('admin')" class="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-chalkboard-user"></i> Mở Bảng Quản Trị Hệ Thống
        </button>
      </div>
    ` : `
      <!-- Quick Stats Metric Grid -->
      <div class="grid grid-cols-3 gap-2 pt-2">
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
          <span class="text-lg font-black text-amber-400 block" id="user-stat-total-score">${stats.total_score}</span>
          <span class="text-[10px] text-slate-400">Tổng điểm Quiz</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
          <span class="text-lg font-black text-teal-300 block" id="user-stat-quizzes">${stats.total_quizzes}</span>
          <span class="text-[10px] text-slate-400">Bài đã làm</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
          <span class="text-lg font-black text-emerald-400 block" id="user-stat-eco">${stats.eco_actions}</span>
          <span class="text-[10px] text-slate-400">Hành động xanh</span>
        </div>
      </div>
    `}
  `;
}

function renderProfileBoxGuest() {
  const box = document.getElementById('profile-content-box');
  box.innerHTML = `
    <div class="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
      <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto text-lg">
        <i class="fa-solid fa-user-lock"></i>
      </div>
      <div class="space-y-1">
        <h4 class="font-bold text-sm text-white">Chưa đăng nhập tài khoản</h4>
        <p class="text-xs text-slate-400 leading-relaxed">
          Đăng nhập để tự động lưu kết quả bài thi, tích lũy điểm thưởng và vinh danh trên Bảng Vàng toàn trường.
        </p>
      </div>
      <button onclick="openAuthModal('login')" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Đăng nhập ngay
      </button>
    </div>
  `;

  document.getElementById('profile-quiz-history').innerHTML = `
    <p class="text-slate-400 text-[11px] italic">Vui lòng đăng nhập để xem lịch sử làm bài.</p>
  `;
}

// ==================== AUTH MODAL CONTROLS ====================
function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  setAuthTab(tab);
  hideAuthAlert();
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  hideAuthAlert();
}

function setAuthTab(tab) {
  const btnLogin = document.getElementById('auth-tab-btn-login');
  const btnRegister = document.getElementById('auth-tab-btn-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  hideAuthAlert();

  if (tab === 'login') {
    btnLogin.className = 'py-2 rounded-xl bg-white text-emerald-800 shadow-sm transition-all';
    btnRegister.className = 'py-2 rounded-xl text-slate-500 hover:text-slate-800 transition-all';
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  } else {
    btnRegister.className = 'py-2 rounded-xl bg-white text-teal-800 shadow-sm transition-all';
    btnLogin.className = 'py-2 rounded-xl text-slate-500 hover:text-slate-800 transition-all';
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

function showAuthAlert(msg, isSuccess = false) {
  const alert = document.getElementById('auth-alert');
  alert.classList.remove('hidden');
  if (isSuccess) {
    alert.className = 'p-3 rounded-xl text-xs font-semibold leading-tight bg-emerald-50 text-emerald-800 border border-emerald-200';
  } else {
    alert.className = 'p-3 rounded-xl text-xs font-semibold leading-tight bg-rose-50 text-rose-800 border border-rose-200';
  }
  alert.innerHTML = msg;
}

function hideAuthAlert() {
  const alert = document.getElementById('auth-alert');
  alert.classList.add('hidden');
}

async function submitLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const btn = document.getElementById('btn-submit-login');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = '<span>Đăng nhập ngay</span> <i class="fa-solid fa-arrow-right text-xs"></i>';

    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      const isAdmin = data.user.role === 'teacher' || data.user.role === 'admin' || data.user.username === 'admin';
      if (isAdmin) {
        state.user.role = 'teacher';
      }
      localStorage.setItem('smartbio_token', data.token);
      localStorage.setItem('smartbio_user', JSON.stringify(state.user));

      if (isAdmin) {
        showAuthAlert('👑 Đăng nhập thành công với quyền Giáo viên Quản trị KHTN! Đang mở Bảng Quản trị...', true);
      } else {
        showAuthAlert('🎉 ' + data.message, true);
      }

      setTimeout(() => {
        closeAuthModal();
        checkAuthAndInitData();
        if (isAdmin) {
          switchTab('admin');
        } else {
          // Học sinh đăng nhập: đảm bảo chuyển về tab Khám phá nếu đang ở Tab Admin
          if (state.activeTab === 'admin') {
            switchTab('dashboard');
          }
        }
      }, 700);
    } else {
      showAuthAlert('⚠️ ' + data.message, false);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>Đăng nhập ngay</span> <i class="fa-solid fa-arrow-right text-xs"></i>';
    showAuthAlert('⚠️ Không thể kết nối tới máy chủ Backend. Bạn hãy chắc chắn đã chạy lệnh: <code>python server.py</code> trong terminal.', false);
  }
}

async function submitRegister(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-fullname').value.trim();
  const grade = document.getElementById('reg-grade').value;
  const classroom = document.getElementById('reg-classroom').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const btn = document.getElementById('btn-submit-register');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo tài khoản...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, grade, classroom, username, password })
    });
    const data = await res.json();
    btn.disabled = false;
    btn.innerHTML = '<span>Tạo tài khoản học sinh</span> <i class="fa-solid fa-user-check text-xs"></i>';

    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('smartbio_token', data.token);
      localStorage.setItem('smartbio_user', JSON.stringify(data.user));

      showAuthAlert('🎉 ' + data.message, true);
      setTimeout(() => {
        closeAuthModal();
        checkAuthAndInitData();
      }, 800);
    } else {
      showAuthAlert('⚠️ ' + data.message, false);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>Tạo tài khoản học sinh</span> <i class="fa-solid fa-user-check text-xs"></i>';
    showAuthAlert('⚠️ Lỗi kết nối: Vui lòng khởi động máy chủ bằng lệnh <code>python server.py</code>.', false);
  }
}

async function handleLogout(callApi = true) {
  if (callApi && state.token) {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (e) {
      // Bỏ qua lỗi mạng khi logout
    }
  }
  state.token = '';
  state.user = null;
  state.adminStudents = [];
  localStorage.removeItem('smartbio_token');
  localStorage.removeItem('smartbio_user');

  // Đóng Tab Quản trị và dọn dẹp bảng dữ liệu để tránh lộ cho phiên sau
  const tabAdmin = document.getElementById('tab-admin');
  if (tabAdmin) tabAdmin.classList.add('hidden');
  const tbody = document.getElementById('admin-students-tbody');
  if (tbody) tbody.innerHTML = '';

  // Chuyển về màn hình Khám phá chính
  switchTab('dashboard');
  updateAuthUI();
  fetchLeaderboard(state.leaderboardGrade);
}

// ==================== LEADERBOARD & QUIZ HISTORY BACKEND API ====================
async function fetchLeaderboard(grade = 'all') {
  state.leaderboardGrade = grade;
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`/api/leaderboard?grade=${grade}`);
    if (res.ok) {
      const data = await res.json();
      state.leaderboardData = data.leaderboard || [];
      renderLeaderboardRows(state.leaderboardData);
      return;
    }
  } catch (e) {
    console.warn('Lỗi khi fetch leaderboard từ backend, sử dụng dữ liệu mẫu cục bộ.');
  }

  // Fallback dữ liệu mẫu nếu chưa có server
  renderLeaderboardRows([
    { rank: 1, full_name: 'Nguyễn Bình An', grade: 8, classroom: '8A1', total_score: 25, eco_count: 5 },
    { rank: 2, full_name: 'Lê Quang Minh', grade: 9, classroom: '9A2', total_score: 24, eco_count: 4 },
    { rank: 3, full_name: 'Trần Khánh Linh', grade: 7, classroom: '7A3', total_score: 20, eco_count: 6 },
    { rank: 4, full_name: 'Hoàng Ngọc Mai', grade: 6, classroom: '6B', total_score: 18, eco_count: 3 },
    { rank: 5, full_name: 'Phạm Đăng Khôi', grade: 8, classroom: '8A4', total_score: 15, eco_count: 2 }
  ]);
}

function renderLeaderboardRows(list) {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-400 italic">Chưa có dữ liệu xếp hạng của khối này.</td></tr>`;
    return;
  }

  list.forEach(item => {
    let rankBadge = `<span class="font-bold text-slate-500">${item.rank}</span>`;
    if (item.rank === 1) rankBadge = `<span class="text-base" title="Hạng 1 - Huy chương Vàng">🥇</span>`;
    else if (item.rank === 2) rankBadge = `<span class="text-base" title="Hạng 2 - Huy chương Bạc">🥈</span>`;
    else if (item.rank === 3) rankBadge = `<span class="text-base" title="Hạng 3 - Huy chương Đồng">🥉</span>`;

    const isCurrent = state.user && (state.user.id === item.id || state.user.full_name === item.full_name);
    const rowClass = isCurrent ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-slate-50/60';

    const tr = document.createElement('tr');
    tr.className = `transition-colors ${rowClass}`;
    tr.innerHTML = `
      <td class="py-2.5 px-3 text-center">${rankBadge}</td>
      <td class="py-2.5 px-3">
        <span class="font-bold text-slate-800">${escapeHtml(item.full_name)}</span>
        ${isCurrent ? '<span class="ml-1 px-1.5 py-0.2 text-[9px] bg-emerald-600 text-white rounded">Bạn</span>' : ''}
      </td>
      <td class="py-2.5 px-3 text-slate-500 font-medium">Khối ${item.grade} ${item.classroom ? '(' + escapeHtml(item.classroom) + ')' : ''}</td>
      <td class="py-2.5 px-3 text-center font-black text-amber-600">${item.total_score} đ</td>
      <td class="py-2.5 px-3 text-center font-bold text-emerald-600">${item.eco_count} 🌱</td>
    `;
    tbody.appendChild(tr);
  });
}

function changeLeaderboardGrade(grade, btn) {
  const buttons = document.querySelectorAll('#leaderboard-grade-filter button');
  buttons.forEach(b => {
    b.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900';
  });
  btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-white shadow-sm text-amber-700';
  fetchLeaderboard(grade);
}

async function fetchQuizHistory() {
  const historyContainer = document.getElementById('profile-quiz-history');
  if (!historyContainer || !state.token) return;

  try {
    const res = await fetch('/api/quiz/history', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.history) {
      state.userQuizHistory = data.history;
      if (data.history.length === 0) {
        historyContainer.innerHTML = `<p class="text-slate-400 text-[11px] italic">Em chưa hoàn thành bài Quiz nào. Hãy bắt đầu ngay!</p>`;
        return;
      }
      historyContainer.innerHTML = data.history.slice(0, 5).map(h => `
        <div class="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/5 text-[11px]">
          <span class="truncate max-w-[150px] font-medium text-slate-200">${escapeHtml(h.topic)}</span>
          <span class="font-bold text-amber-400">${h.score}/${h.total_questions} đ</span>
        </div>
      `).join('');
    }
  } catch (e) {
    console.warn('Lỗi khi tải lịch sử quiz:', e);
  }
}

// ==================== DASHBOARD FILTER ====================
function filterGrade(grade, btn) {
  const buttons = document.querySelectorAll('#grade-filter button');
  buttons.forEach(b => {
    b.className = 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900';
  });
  btn.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-white shadow-sm text-emerald-700';

  const cards = document.querySelectorAll('#topic-grid .topic-card');
  cards.forEach(card => {
    if (grade === 'all' || card.getAttribute('data-grade') === grade) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function launchLab(modelId) {
  switchTab('lab360');
  setLabModel(modelId);
}

// ==================== LAB 360 LOGIC & SVG RENDERING ====================
function setLabModel(modelId) {
  state.currentLabModel = modelId;
  state.currentZoom = 1;

  const buttons = document.querySelectorAll('.lab-select-btn');
  buttons.forEach(b => {
    b.className = 'lab-select-btn px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
  });

  const inspectorTitle = document.getElementById('inspector-title');
  const btnHeartFlow = document.getElementById('btn-heart-flow');

  // Hủy âm thanh đọc nếu đang phát dở
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
  }

  if (modelId === 'plant-cell') {
    document.getElementById('btn-model-plant').className = 'lab-select-btn active px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 bg-emerald-600 text-white border-emerald-600 shadow-sm';
    document.getElementById('canvas-model-title').textContent = 'Tế bào Thực vật (Plant Cell)';
    document.getElementById('organelle-grade-tag').textContent = 'KHTN 6';
    if (inspectorTitle) inspectorTitle.textContent = 'BẢNG PHÂN TÍCH BÀO QUAN';
    if (btnHeartFlow) {
      btnHeartFlow.classList.add('hidden');
      btnHeartFlow.classList.remove('flex');
    }
    renderLabCanvas('plant-cell');
    selectOrganelle('chloroplast');
  } else if (modelId === 'animal-cell') {
    document.getElementById('btn-model-animal').className = 'lab-select-btn active px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 bg-teal-600 text-white border-teal-600 shadow-sm';
    document.getElementById('canvas-model-title').textContent = 'Tế bào Động vật (Animal Cell)';
    document.getElementById('organelle-grade-tag').textContent = 'KHTN 6 & 8';
    if (inspectorTitle) inspectorTitle.textContent = 'BẢNG PHÂN TÍCH BÀO QUAN';
    if (btnHeartFlow) {
      btnHeartFlow.classList.add('hidden');
      btnHeartFlow.classList.remove('flex');
    }
    renderLabCanvas('animal-cell');
    selectOrganelle('mitochondria');
  } else if (modelId === 'heart') {
    document.getElementById('btn-model-heart').className = 'lab-select-btn active px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 bg-rose-600 text-white border-rose-600 shadow-sm';
    document.getElementById('canvas-model-title').textContent = 'Cấu tạo Tim người & Hệ tuần hoàn';
    document.getElementById('organelle-grade-tag').textContent = 'KHTN 8';
    // Đổi tiêu đề động theo yêu cầu
    if (inspectorTitle) inspectorTitle.textContent = 'CHI TIẾT CẤU TẠO CƠ QUAN';
    if (btnHeartFlow) {
      btnHeartFlow.classList.remove('hidden');
      btnHeartFlow.classList.add('flex');
    }
    renderLabCanvas('heart');
    selectOrganelle('left-ventricle');
  }
}

function toggleHeartAnimation() {
  state.isHeartBeating = !state.isHeartBeating;
  const btn = document.getElementById('btn-heart-flow');
  const btnText = document.getElementById('btn-heart-flow-text');
  const svg = document.getElementById('interactive-lab-svg');
  const particles = document.getElementById('blood-flow-particles');

  if (state.isHeartBeating) {
    if (btnText) btnText.textContent = 'Dòng máu: BẬT';
    if (btn) {
      btn.className = 'px-2.5 py-1 text-xs font-bold bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-rose-900/50';
    }
    if (svg) svg.classList.add('heart-beating-active');
    if (particles) particles.style.display = 'inline';
  } else {
    if (btnText) btnText.textContent = 'Dòng máu: TẮT';
    if (btn) {
      btn.className = 'px-2.5 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-all flex items-center gap-1.5 border border-slate-600';
    }
    if (svg) svg.classList.remove('heart-beating-active');
    if (particles) particles.style.display = 'none';
  }
}

function zoomLab(scaleChange) {
  state.currentZoom = Math.max(0.7, Math.min(1.8, state.currentZoom * scaleChange));
  const svg = document.getElementById('interactive-lab-svg');
  if (svg) {
    svg.style.transform = `scale(${state.currentZoom})`;
    svg.style.transition = 'transform 0.2s ease-out';
  }
}

function resetLabView() {
  state.currentZoom = 1;
  const svg = document.getElementById('interactive-lab-svg');
  if (svg) {
    svg.style.transform = 'scale(1)';
  }
}

function renderLabCanvas(modelId) {
  const container = document.getElementById('lab-canvas-container');
  
  if (modelId === 'plant-cell') {
    container.innerHTML = `
      <svg id="interactive-lab-svg" viewBox="0 0 500 360" class="w-full h-full max-h-[340px] drop-shadow-2xl">
        <defs>
          <linearGradient id="wallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#047857"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
          <linearGradient id="cytoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d1fae5"/>
            <stop offset="100%" stop-color="#a7f3d0"/>
          </linearGradient>
          <radialGradient id="nucGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#818cf8"/>
            <stop offset="70%" stop-color="#4f46e5"/>
            <stop offset="100%" stop-color="#312e81"/>
          </radialGradient>
          <linearGradient id="vacGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
          <linearGradient id="chloroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4ade80"/>
            <stop offset="100%" stop-color="#15803d"/>
          </linearGradient>
          <linearGradient id="mitoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fb7185"/>
            <stop offset="100%" stop-color="#e11d48"/>
          </linearGradient>
        </defs>

        <polygon id="svg-cell-wall" class="organelle-interactive" onclick="selectOrganelle('cell-wall')"
          points="80,40 420,40 460,180 420,320 80,320 40,180" 
          fill="url(#wallGrad)" stroke="#34d399" stroke-width="8"/>
        
        <polygon id="svg-cytoplasm" class="organelle-interactive" onclick="selectOrganelle('cytoplasm')"
          points="90,52 410,52 445,180 410,308 90,308 55,180" 
          fill="url(#cytoGrad)" stroke="#10b981" stroke-width="3"/>

        <path id="svg-vacuole" class="organelle-interactive" onclick="selectOrganelle('vacuole')"
          d="M 140,110 C 200,90 280,100 290,160 C 300,230 220,260 160,240 C 110,220 100,140 140,110 Z"
          fill="url(#vacGrad)" opacity="0.85" stroke="#0284c7" stroke-width="2"/>
        <text x="180" y="180" fill="#0369a1" font-size="11" font-weight="bold" pointer-events="none">Không bào lớn</text>

        <circle id="svg-nucleus" class="organelle-interactive" onclick="selectOrganelle('nucleus')"
          cx="355" cy="140" r="45" fill="url(#nucGrad)" stroke="#c7d2fe" stroke-width="3"/>
        <circle cx="365" cy="135" r="14" fill="#1e1b4b" opacity="0.7"/>
        <text x="330" y="200" fill="#c7d2fe" font-size="11" font-weight="bold" pointer-events="none">Nhân ADN</text>

        <g id="svg-chloroplast" class="organelle-interactive" onclick="selectOrganelle('chloroplast')">
          <ellipse cx="120" cy="85" rx="25" ry="14" fill="url(#chloroGrad)" transform="rotate(15 120 85)" stroke="#14532d" stroke-width="1.5"/>
          <ellipse cx="280" cy="70" rx="26" ry="15" fill="url(#chloroGrad)" transform="rotate(-10 280 70)" stroke="#14532d" stroke-width="1.5"/>
          <ellipse cx="380" cy="245" rx="27" ry="15" fill="url(#chloroGrad)" transform="rotate(30 380 245)" stroke="#14532d" stroke-width="1.5"/>
          <ellipse cx="110" cy="270" rx="24" ry="14" fill="url(#chloroGrad)" transform="rotate(-20 110 270)" stroke="#14532d" stroke-width="1.5"/>
        </g>

        <g id="svg-mitochondria" class="organelle-interactive" onclick="selectOrganelle('mitochondria')">
          <ellipse cx="240" cy="280" rx="22" ry="12" fill="url(#mitoGrad)" transform="rotate(10 240 280)" stroke="#881337" stroke-width="1.5"/>
          <path d="M 226,280 Q 235,274 245,280 T 254,280" stroke="#ffe4e6" stroke-width="2" fill="none" pointer-events="none"/>
          <ellipse cx="330" cy="75" rx="20" ry="11" fill="url(#mitoGrad)" transform="rotate(-35 330 75)" stroke="#881337" stroke-width="1.5"/>
        </g>
      </svg>
    `;
  } else if (modelId === 'animal-cell') {
    container.innerHTML = `
      <svg id="interactive-lab-svg" viewBox="0 0 500 360" class="w-full h-full max-h-[340px] drop-shadow-2xl">
        <defs>
          <linearGradient id="aniCyto" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fed7aa"/>
            <stop offset="100%" stop-color="#ffedd5"/>
          </linearGradient>
        </defs>

        <path id="svg-membrane" class="organelle-interactive" onclick="selectOrganelle('membrane')"
          d="M 80,180 C 70,80 200,40 320,50 C 440,60 460,180 430,280 C 400,340 180,330 100,290 C 70,260 90,220 80,180 Z"
          fill="url(#aniCyto)" stroke="#f97316" stroke-width="6"/>

        <path id="svg-cytoplasm" class="organelle-interactive" onclick="selectOrganelle('cytoplasm')"
          d="M 90,180 C 85,95 200,55 315,62 C 430,72 445,180 420,270 C 390,325 185,315 110,280 Z"
          fill="#ffedd5" opacity="0.9"/>

        <circle id="svg-nucleus" class="organelle-interactive" onclick="selectOrganelle('nucleus')"
          cx="240" cy="175" r="50" fill="url(#nucGrad)" stroke="#818cf8" stroke-width="4"/>
        <circle cx="250" cy="165" r="16" fill="#1e1b4b" opacity="0.8"/>
        <text x="215" y="240" fill="#c7d2fe" font-size="11" font-weight="bold" pointer-events="none">Nhân tế bào</text>

        <g id="svg-mitochondria" class="organelle-interactive" onclick="selectOrganelle('mitochondria')">
          <ellipse cx="140" cy="110" rx="26" ry="14" fill="url(#mitoGrad)" transform="rotate(25 140 110)" stroke="#be123c" stroke-width="2"/>
          <ellipse cx="370" cy="220" rx="28" ry="15" fill="url(#mitoGrad)" transform="rotate(-40 370 220)" stroke="#be123c" stroke-width="2"/>
          <ellipse cx="160" cy="260" rx="24" ry="13" fill="url(#mitoGrad)" transform="rotate(-15 160 260)" stroke="#be123c" stroke-width="2"/>
        </g>

        <g id="svg-golgi" class="organelle-interactive" onclick="selectOrganelle('golgi')">
          <path d="M 330,110 C 350,115 365,105 385,120 M 325,125 C 350,130 365,120 390,135 M 335,140 C 355,145 370,135 385,150" 
            stroke="#a855f7" stroke-width="5" stroke-linecap="round" fill="none"/>
          <text x="335" y="168" fill="#9333ea" font-size="10" font-weight="bold">Bộ Golgi</text>
        </g>
      </svg>
    `;
  } else if (modelId === 'heart') {
    // SƠ ĐỒ TIM NGƯỜI CHUẨN GIẢI PHẪU KHTN 8 VỚI DÒNG MÁU CHẠY ĐỘNG
    const beatingClass = state.isHeartBeating ? 'heart-beating-active' : '';
    const particlesDisplay = state.isHeartBeating ? 'inline' : 'none';

    container.innerHTML = `
      <svg id="interactive-lab-svg" viewBox="0 0 540 380" class="w-full h-full max-h-[350px] drop-shadow-2xl ${beatingClass}">
        <defs>
          <!-- Gradient Máu giàu Oxy O2 (Đỏ tươi) -->
          <linearGradient id="o2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4d4d"/>
            <stop offset="60%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>
          <!-- Gradient Máu giàu CO2 (Đỏ thẫm / Xanh lam) -->
          <linearGradient id="co2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="60%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
          <!-- Gradient Động mạch phổi (Tím xanh) -->
          <linearGradient id="paGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
          <!-- Gradient Cơ tim (Myocardium) -->
          <linearGradient id="myoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#be123c"/>
            <stop offset="100%" stop-color="#881337"/>
          </linearGradient>
        </defs>

        <!-- 1. TĨNH MẠCH CHỦ TRÊN VÀ DƯỚI (Vena Cava - Máu CO2) -->
        <g id="svg-vena-cava" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <!-- Tĩnh mạch chủ trên -->
          <path d="M 150,30 L 150,130" stroke="#0284c7" stroke-width="26" stroke-linecap="round" fill="none"/>
          <text x="100" y="45" fill="#7dd3fc" font-size="10" font-weight="bold">TM Chủ trên</text>
          <!-- Tĩnh mạch chủ dưới -->
          <path d="M 175,270 L 175,340" stroke="#0284c7" stroke-width="24" stroke-linecap="round" fill="none"/>
          <text x="105" y="340" fill="#7dd3fc" font-size="10" font-weight="bold">TM Chủ dưới</text>
        </g>

        <!-- 2. TĨNH MẠCH PHỔI (4 nhánh đổ máu O2 từ phổi về Nhĩ trái) -->
        <g id="svg-pulmonary-veins" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <path d="M 400,135 L 340,145" stroke="#ef4444" stroke-width="16" stroke-linecap="round" fill="none"/>
          <path d="M 410,165 L 350,170" stroke="#ef4444" stroke-width="16" stroke-linecap="round" fill="none"/>
          <text x="415" y="155" fill="#fca5a5" font-size="10" font-weight="bold">TM Phổi (4)</text>
        </g>

        <!-- 3. CUNG ĐỘNG MẠCH CHỦ (Aorta - Xuất phát từ Thất trái) -->
        <g id="svg-aorta" class="organelle-interactive" onclick="selectOrganelle('aorta')">
          <path d="M 270,180 C 270,80 340,35 375,85 L 385,150" stroke="url(#o2Grad)" stroke-width="28" stroke-linecap="round" fill="none"/>
          <!-- 3 nhánh lớn nuôi đầu cổ và tay -->
          <path d="M 315,50 L 315,22" stroke="#ef4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <path d="M 335,46 L 342,18" stroke="#ef4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <path d="M 355,54 L 370,22" stroke="#ef4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <text x="310" y="15" fill="#fecaca" font-size="10" font-weight="bold">Cung ĐM Chủ</text>
        </g>

        <!-- 4. THÂN & ĐỘNG MẠCH PHỔI (Pulmonary Artery - Xuất phát từ Thất phải) -->
        <g id="svg-pulmonary-artery" class="organelle-interactive" onclick="selectOrganelle('pulmonary-artery')">
          <path d="M 240,190 C 240,140 230,105 220,90" stroke="url(#paGrad)" stroke-width="24" stroke-linecap="round" fill="none"/>
          <!-- Nhánh phổi trái và phổi phải -->
          <path d="M 220,90 C 180,85 140,90 120,95" stroke="url(#paGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>
          <path d="M 225,90 C 270,85 305,92 320,100" stroke="url(#paGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>
          <text x="110" y="80" fill="#93c5fd" font-size="10" font-weight="bold">ĐM Phổi (Lên 2 phổi)</text>
        </g>

        <!-- 5. KHỐI THÀNH CƠ TIM CHÍNH (Myocardium Contour) -->
        <path d="M 140,140 C 110,210 130,290 200,340 C 235,365 290,360 325,320 C 390,250 400,180 360,135 Z"
          fill="#4c0519" stroke="#9f1239" stroke-width="4"/>

        <!-- 6. TÂM NHĨ PHẢI (Máu giàu CO2) -->
        <g id="svg-atria-right" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <ellipse cx="170" cy="155" rx="38" ry="32" fill="url(#co2Grad)" stroke="#0369a1" stroke-width="2"/>
          <text x="140" y="158" fill="#ffffff" font-size="10" font-weight="bold">Tâm nhĩ phải</text>
        </g>

        <!-- 7. TÂM NHĨ TRÁI (Máu giàu O2) -->
        <g id="svg-atria-left" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <ellipse cx="325" cy="160" rx="36" ry="30" fill="url(#o2Grad)" stroke="#991b1b" stroke-width="2"/>
          <text x="295" y="163" fill="#ffffff" font-size="10" font-weight="bold">Tâm nhĩ trái</text>
        </g>

        <!-- 8. VÁCH LIÊN THẤT (Septum - Ngăn cách hoàn toàn 2 nửa tim) -->
        <path d="M 240,195 C 242,240 245,290 250,345" stroke="#be123c" stroke-width="14" stroke-linecap="round" fill="none"/>
        <text x="220" y="360" fill="#fda4af" font-size="9" font-weight="bold">Vách liên thất</text>

        <!-- 9. TÂM THẤT PHẢI (Bơm máu lên phổi) -->
        <path id="svg-right-ventricle" class="organelle-interactive" onclick="selectOrganelle('right-ventricle')"
          d="M 160,195 C 150,235 175,295 230,315 L 230,195 Z"
          fill="url(#co2Grad)" stroke="#0284c7" stroke-width="3"/>
        <text x="165" y="260" fill="#e0f2fe" font-size="11" font-weight="bold">Tâm thất phải</text>
        <text x="175" y="275" fill="#bae6fd" font-size="9">(Thành mỏng)</text>

        <!-- 10. TÂM THẤT TRÁI (Thành cơ rất dày, co bóp bơm đi toàn thân) -->
        <path id="svg-left-ventricle" class="organelle-interactive" onclick="selectOrganelle('left-ventricle')"
          d="M 252,195 L 252,320 C 310,305 345,245 330,195 Z"
          fill="url(#o2Grad)" stroke="#991b1b" stroke-width="10"/>
        <text x="262" y="255" fill="#fee2e2" font-size="11" font-weight="bold">Tâm thất trái</text>
        <text x="265" y="270" fill="#fecaca" font-size="9 font-extrabold">(Cơ tim rất dày)</text>

        <!-- 11. HỆ THỐNG VAN TIM (Van 3 lá, Van 2 lá, Van ĐM) -->
        <g id="svg-valves" class="organelle-interactive" onclick="selectOrganelle('valves')">
          <!-- Van 3 lá (phải) -->
          <line x1="165" y1="190" x2="210" y2="190" stroke="#fef08a" stroke-width="4" stroke-linecap="round"/>
          <text x="170" y="185" fill="#fef08a" font-size="9" font-weight="bold">Van 3 lá</text>

          <!-- Van 2 lá (trái) -->
          <line x1="280" y1="190" x2="325" y2="190" stroke="#fef08a" stroke-width="4" stroke-linecap="round"/>
          <text x="285" y="185" fill="#fef08a" font-size="9" font-weight="bold">Van 2 lá</text>
        </g>

        <!-- 12. CÁC ĐƯỜNG DẪN DÒNG CHẢY ẨN CHO HẠT MÁU (Blood Flow Motion Paths) -->
        <!-- Đường đi máu O2: TM Phổi -> Nhĩ trái -> Thất trái -> ĐM Chủ -> Toàn thân -->
        <path id="flow-path-o2" d="M 410,150 C 360,155 335,145 325,170 C 315,195 305,235 295,280 C 275,295 260,265 265,225 C 270,185 285,115 315,55 C 345,35 375,80 380,140" fill="none" stroke="transparent"/>
        
        <!-- Đường đi máu CO2: TM Chủ -> Nhĩ phải -> Thất phải -> ĐM Phổi -> 2 Phổi -->
        <path id="flow-path-co2" d="M 150,45 L 160,135 C 165,160 180,175 190,205 C 200,245 195,290 185,290 C 170,290 180,245 205,205 C 225,170 235,130 225,95 L 125,92" fill="none" stroke="transparent"/>

        <!-- 13. CÁC HẠT MÁU CHUYỂN ĐỘNG (Blood Flow Particles Animation) -->
        <g id="blood-flow-particles" style="display:${particlesDisplay}">
          <!-- 4 Hạt Máu Đỏ Tươi O2 -->
          <circle r="5" fill="#ff4d4d" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0s">
              <mpath href="#flow-path-o2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#ff4d4d" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.7s">
              <mpath href="#flow-path-o2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#ff4d4d" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="1.4s">
              <mpath href="#flow-path-o2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#ff4d4d" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="2.1s">
              <mpath href="#flow-path-o2"/>
            </animateMotion>
          </circle>

          <!-- 4 Hạt Máu Đỏ Thẫm / Xanh CO2 -->
          <circle r="5" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0s">
              <mpath href="#flow-path-co2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.7s">
              <mpath href="#flow-path-co2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="1.4s">
              <mpath href="#flow-path-co2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#00e5ff" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="2.1s">
              <mpath href="#flow-path-co2"/>
            </animateMotion>
          </circle>
        </g>

        <!-- 14. CHÚ THÍCH DÒNG MÁU GÓC DƯỚI (Legend) -->
        <g transform="translate(15, 335)">
          <circle cx="8" cy="8" r="4" fill="#ff4d4d"/>
          <text x="18" y="11" fill="#fca5a5" font-size="9" font-weight="bold">🔴 Máu đỏ tươi (giàu O2 - Nuôi cơ thể)</text>
          
          <circle cx="8" cy="24" r="4" fill="#00e5ff"/>
          <text x="18" y="27" fill="#7dd3fc" font-size="9" font-weight="bold">🔵 Máu đỏ thẫm/xanh (giàu CO2 - Lên phổi)</text>
        </g>
      </svg>
    `;
  }
}

// ==================== TÍCH HỢP LOA ĐỌC GIỌNG NÓI (WEB SPEECH API) ====================
let currentSpeechUtterance = null;

function speakCurrentOrganelle() {
  const currentData = labData[state.currentLabModel];
  if (!state.selectedOrganelle || !currentData) return;
  const item = currentData.organelles[state.selectedOrganelle];
  if (!item) return;

  if (!('speechSynthesis' in window)) {
    alert('Trình duyệt của bạn chưa hỗ trợ tính năng Web Speech API.');
    return;
  }

  // Nếu đang nói thì dừng lại
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
    return;
  }

  const textToRead = `${item.name}. ${item.tag}. Chức năng và cấu tạo: ${item.role}. Điểm thú vị: ${item.fact}`;
  
  currentSpeechUtterance = new SpeechSynthesisUtterance(textToRead);
  currentSpeechUtterance.lang = 'vi-VN';
  currentSpeechUtterance.rate = 0.95;
  currentSpeechUtterance.pitch = 1.0;

  // Tìm giọng tiếng Việt nếu có
  const voices = window.speechSynthesis.getVoices();
  const viVoice = voices.find(v => v.lang.startsWith('vi') || v.lang === 'vi_VN' || v.lang === 'vi-VN');
  if (viVoice) {
    currentSpeechUtterance.voice = viVoice;
  }

  updateSpeechUI(true);

  currentSpeechUtterance.onend = () => {
    updateSpeechUI(false);
  };

  currentSpeechUtterance.onerror = () => {
    updateSpeechUI(false);
  };

  window.speechSynthesis.speak(currentSpeechUtterance);
}

function updateSpeechUI(isSpeaking) {
  const btn = document.getElementById('btn-speech');
  const wave = document.getElementById('speech-wave-indicator');
  if (!btn) return;

  if (isSpeaking) {
    btn.className = 'w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center transition-all shadow-sm';
    btn.innerHTML = '<i class="fa-solid fa-stop text-xs"></i>';
    btn.title = 'Bấm để dừng đọc';
    if (wave) {
      wave.classList.remove('hidden');
      wave.classList.add('flex');
    }
  } else {
    btn.className = 'w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-all shadow-sm';
    btn.innerHTML = '<i class="fa-solid fa-volume-high text-xs"></i>';
    btn.title = 'Bấm để nghe đọc to nội dung kiến thức';
    if (wave) {
      wave.classList.add('hidden');
      wave.classList.remove('flex');
    }
  }
}

function selectOrganelle(organelleKey) {
  state.selectedOrganelle = organelleKey;
  const currentData = labData[state.currentLabModel];
  if (!currentData || !currentData.organelles[organelleKey]) return;

  const item = currentData.organelles[organelleKey];
  const inspector = document.getElementById('inspector-content');

  // Hủy âm thanh đọc nếu đang đọc bộ phận trước đó
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
  }

  document.querySelectorAll('.organelle-interactive').forEach(el => {
    el.classList.remove('organelle-active', 'pulse-selected');
  });
  const targetSvg = document.getElementById(`svg-${organelleKey}`);
  if (targetSvg) {
    targetSvg.classList.add('organelle-active', 'pulse-selected');
  }

  inspector.innerHTML = `
    <div class="space-y-3 animate-fadeIn">
      <div>
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded-md inline-block mb-1">${item.tag}</span>
          <!-- Nút Loa phát âm thanh Web Speech API -->
          <div class="flex items-center gap-1.5">
            <span id="speech-wave-indicator" class="speaking-wave hidden gap-0.5 items-center h-4">
              <span></span><span></span><span></span>
            </span>
            <button id="btn-speech" onclick="speakCurrentOrganelle()" class="w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-all shadow-sm" title="Bấm để nghe đọc to nội dung kiến thức">
              <i class="fa-solid fa-volume-high text-xs"></i>
            </button>
          </div>
        </div>
        <h3 class="text-base font-extrabold text-slate-800 mt-1">${item.name}</h3>
      </div>

      <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
        <p class="font-bold text-slate-900 mb-1">Chức năng & Đặc điểm:</p>
        <p>${item.role}</p>
      </div>

      <div class="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
        <p class="font-bold mb-1 flex items-center gap-1.5 text-emerald-800">
          <i class="fa-solid fa-lightbulb text-amber-500"></i> Điều thú vị em có biết?
        </p>
        <p>${item.fact}</p>
      </div>
    </div>
  `;
}

// ==================== CƠ SỞ DỮ LIỆU "THÁM TỬ BẮT LỖI AI" ====================
const detectiveCases = {
  'cell-wall': {
    title: 'Thành tế bào (Cell Wall)',
    aiStatement: '"Thành tế bào có ở tất cả các sinh vật sống gồm cả người, động vật và thực vật, chức năng chính của nó là trực tiếp quang hợp tạo ra khí oxy giúp cây lớn nhanh."',
    options: [
      { text: 'Thành tế bào thực vật cấu tạo từ Cellulose và giúp cố định hình dạng tế bào', isError: false },
      { text: 'Thành tế bào có ở cả cơ thể người và động vật, trực tiếp làm nhiệm vụ quang hợp', isError: true, explanation: 'Chính xác! Động vật và người KHÔNG có thành tế bào (chỉ có màng sinh chất mềm dẻo). Ngoài ra, quang hợp là nhiệm vụ của Lục lạp chứ không phải thành tế bào!' },
      { text: 'Thành tế bào bảo vệ tế bào thực vật khỏi các tác động cơ học và áp suất thẩm thấu', isError: false }
    ]
  },
  'chloroplast': {
    title: 'Lục lạp (Chloroplast)',
    aiStatement: '"Lục lạp chứa diệp lục để quang hợp mạnh nhất vào ban đêm trong bóng tối hoàn toàn, và lúc đó cây sẽ thải ra lượng lớn khí oxy nuôi dưỡng môi trường sống."',
    options: [
      { text: 'Lục lạp chỉ có ở tế bào thực vật và một số sinh vật tự dưỡng (như trùng roi)', isError: false },
      { text: 'Lục lạp quang hợp mạnh nhất vào ban đêm trong bóng tối và thải ra nhiều khí oxy', isError: true, explanation: 'Xuất sắc! Quá trình quang hợp bắt buộc phải có NĂNG LƯỢNG ÁNH SÁNG mặt trời. Ban đêm không có ánh sáng nên cây không thể quang hợp tạo oxy được!' },
      { text: 'Diệp lục hấp thụ ánh sáng đỏ và xanh lam, phản chiếu tia xanh lục vào mắt chúng ta', isError: false }
    ]
  },
  'nucleus': {
    title: 'Nhân tế bào (Nucleus)',
    aiStatement: '"Nhân tế bào chứa vật chất di truyền ADN, nếu tách nhân ra khỏi tế bào thì tế bào đó sẽ sinh trưởng nhanh gấp đôi và phân chia vô hạn."',
    options: [
      { text: 'Nhân điều khiển mọi hoạt động sống và quá trình trao đổi chất của tế bào', isError: false },
      { text: 'Tách nhân ra khỏi tế bào sẽ giúp tế bào lớn nhanh gấp đôi và sống bất tử', isError: true, explanation: 'Bắt lỗi quá chuẩn! Nhân là trung tâm điều khiển sự sống. Nếu tách nhân ra, tế bào sẽ mất bộ máy chỉ huy tổng hợp protein và nhanh chóng chết đi trong thời gian ngắn!' },
      { text: 'Nhân được bao bọc bởi màng nhân kép có các lỗ nhỏ trao đổi chất', isError: false }
    ]
  },
  'vacuole': {
    title: 'Không bào trung tâm (Vacuole)',
    aiStatement: '"Không bào trung tâm ở tế bào thực vật là túi rỗng không chứa gì bên trong, mục đích là làm cho tế bào nhẹ đi để cây bay lơ lửng."',
    options: [
      { text: 'Không bào chứa dịch tế bào gồm nước, muối khoáng và chất dinh dưỡng', isError: false },
      { text: 'Không bào là túi hoàn toàn rỗng giúp cây nhẹ đi để bay lơ lửng', isError: true, explanation: 'Bắt lỗi chính xác! Không bào lớn chứa đầy dịch tế bào tạo áp suất trương nước giúp thân lá căng mọng và đứng vững. Khi cây thiếu nước, không bào xẹp lại làm cây héo!' },
      { text: 'Không bào ở tế bào động vật thường rất nhỏ hoặc không có', isError: false }
    ]
  },
  'mitochondria': {
    title: 'Ti thể (Mitochondria)',
    aiStatement: '"Ti thể là nhà máy năng lượng nhưng chỉ có ở động vật. Thực vật không hề có ti thể vì toàn bộ năng lượng của cây đều do lục lạp tạo ra mà không cần hô hấp."',
    options: [
      { text: 'Ti thể phân giải chất hữu cơ để tổng hợp năng lượng ATP', isError: false },
      { text: 'Thực vật không có ti thể vì chỉ cần lục lạp tạo năng lượng', isError: true, explanation: 'Tuyệt vời! Cả tế bào động vật và tế bào thực vật ĐỀU CÓ ti thể! Thực vật tạo chất hữu cơ bằng lục lạp nhưng vẫn phải dùng ti thể để hô hấp giải phóng năng lượng ATP cho các hoạt động sống.' },
      { text: 'Tế bào cơ tim hoạt động nhiều nên chứa rất nhiều ti thể', isError: false }
    ]
  },
  'cytoplasm': {
    title: 'Tế bào chất (Cytoplasm)',
    aiStatement: '"Tế bào chất là một khối chất rắn như đá hoa cương, đứng yên tuyệt đối không chuyển động."',
    options: [
      { text: 'Tế bào chất là chất dịch keo bán lỏng chứa 70-80% nước', isError: false },
      { text: 'Tế bào chất là khối chất rắn như đá hoa cương và đứng yên tuyệt đối', isError: true, explanation: 'Chính xác! Tế bào chất là dịch keo bán lỏng và luôn có sự chuyển động dòng (dòng tế bào chất) giúp luân chuyển các bào quan và chất dinh dưỡng.' },
      { text: 'Là nơi diễn ra hầu hết các phản ứng hóa sinh của tế bào', isError: false }
    ]
  },
  'membrane': {
    title: 'Màng sinh chất (Cell Membrane)',
    aiStatement: '"Màng sinh chất ở động vật là một bức tường sắt ngăn cách tuyệt đối, không cho bất kỳ phân tử nào đi qua dù là nước hay oxy."',
    options: [
      { text: 'Màng sinh chất có cấu tạo phospholipid kép với tính bán thấm chọn lọc', isError: false },
      { text: 'Màng sinh chất là bức tường sắt ngăn cách tuyệt đối, cấm mọi chất đi qua', isError: true, explanation: 'Bắt lỗi rất tốt! Màng sinh chất có tính BÁN THẤM CHỌN LỌC: cho nước, oxy, chất dinh dưỡng đi vào và cho chất cặn bã đi ra.' },
      { text: 'Màng sinh chất mềm dẻo giúp tế bào động vật có hình dạng linh hoạt', isError: false }
    ]
  },
  'golgi': {
    title: 'Bộ máy Golgi',
    aiStatement: '"Bộ máy Golgi là nơi trực tiếp quang hợp tạo ra tinh bột và lưu trữ chất độc giết chết tế bào."',
    options: [
      { text: 'Bộ máy Golgi tiếp nhận protein, sửa đổi, đóng gói và phân phối đến nơi cần thiết', isError: false },
      { text: 'Bộ máy Golgi trực tiếp quang hợp tạo ra tinh bột và tạo chất độc', isError: true, explanation: 'Chuẩn thám tử! Quang hợp là của Lục lạp. Bộ máy Golgi đóng vai trò như trung tâm đóng gói và bưu điện vận chuyển protein trong tế bào!' },
      { text: 'Gồm hệ thống các túi dẹt xếp chồng lên nhau', isError: false }
    ]
  },
  'left-ventricle': {
    title: 'Tâm thất trái (Left Ventricle)',
    aiStatement: '"Tâm thất trái có thành cơ mỏng nhất trong tim vì nhiệm vụ của nó rất nhẹ: chỉ cần bơm máu nghèo oxy lên hai lá phổi ngay bên cạnh."',
    options: [
      { text: 'Tâm thất trái chứa máu đỏ tươi giàu O2 nhận từ tâm nhĩ trái', isError: false },
      { text: 'Tâm thất trái có thành cơ mỏng nhất vì chỉ bơm máu lên hai lá phổi gần tim', isError: true, explanation: 'Bắt lỗi siêu đẳng! Tâm thất trái có thành cơ DÀY NHẤT trong 4 ngăn tim vì phải tạo lực co bóp cực mạnh để đẩy máu qua động mạch chủ đi nuôi TOÀN BỘ cơ thể (từ đỉnh đầu đến ngón chân)!' },
      { text: 'Máu từ tâm thất trái được đẩy vào cung động mạch chủ qua van bán nguyệt', isError: false }
    ]
  },
  'right-ventricle': {
    title: 'Tâm thất phải (Right Ventricle)',
    aiStatement: '"Tâm thất phải chứa máu đỏ tươi giàu oxy và sẽ bơm trực tiếp vào động mạch chủ để nuôi não bộ."',
    options: [
      { text: 'Tâm thất phải bơm máu vào động mạch phổi để lên phổi trao đổi khí', isError: false },
      { text: 'Tâm thất phải chứa máu đỏ tươi giàu oxy và bơm vào động mạch chủ nuôi não', isError: true, explanation: 'Chính xác! Tâm thất phải chứa máu ĐỎ THẪM (giàu CO2, nghèo O2) từ tĩnh mạch chủ dồn về, và nó bơm máu lên PHỔI để nhả CO2 và lấy O2 chứ không nuôi não!' },
      { text: 'Giữa tâm nhĩ phải và tâm thất phải có van 3 lá ngăn máu chảy ngược', isError: false }
    ]
  },
  'atria': {
    title: 'Tâm nhĩ (Atria)',
    aiStatement: '"Tâm nhĩ phải nhận máu giàu oxy từ phổi, còn tâm nhĩ trái nhận máu nghèo oxy từ toàn thân đổ về."',
    options: [
      { text: 'Tâm nhĩ có thời gian co rất ngắn chỉ 0.1 giây trong chu kỳ tim', isError: false },
      { text: 'Tâm nhĩ phải nhận máu giàu oxy từ phổi, còn tâm nhĩ trái nhận máu nghèo oxy từ toàn thân', isError: true, explanation: 'Rất tinh mắt! Bị ngược hoàn toàn: Nửa phải của tim (tâm nhĩ phải) chứa máu NGHÈO O2 từ toàn thân về; Nửa trái của tim (tâm nhĩ trái) mới đón máu GIÀU O2 từ phổi về!' },
      { text: 'Tâm nhĩ nằm ở nửa trên của quả tim, thành cơ mỏng hơn tâm thất', isError: false }
    ]
  },
  'valves': {
    title: 'Van tim (Heart Valves)',
    aiStatement: '"Van tim mở cả hai chiều tự do để máu thích chảy theo hướng nào cũng được, giúp tim không bao giờ bị nghẽn."',
    options: [
      { text: 'Van tim đảm bảo máu chỉ chảy theo MỘT CHIỀU duy nhất', isError: false },
      { text: 'Van tim mở hai chiều tự do để máu chảy xuôi hay ngược đều được', isError: true, explanation: 'Bắt lỗi chuẩn xác! Van tim hoạt động như van 1 chiều: van nhĩ - thất chỉ cho máu từ nhĩ xuống thất; van động mạch chỉ cho máu từ thất ra động mạch, tuyệt đối KHÔNG cho chảy ngược lại!' },
      { text: 'Tiếng đập nghe được của tim chính là âm thanh đóng lại của các van tim', isError: false }
    ]
  },
  'aorta': {
    title: 'Cung động mạch chủ (Aorta)',
    aiStatement: '"Động mạch chủ xuất phát từ tâm nhĩ phải và dẫn máu nghèo oxy về gan."',
    options: [
      { text: 'Động mạch chủ dẫn máu đỏ tươi giàu O2 đi nuôi toàn bộ cơ thể', isError: false },
      { text: 'Động mạch chủ xuất phát từ tâm nhĩ phải và dẫn máu nghèo oxy về gan', isError: true, explanation: 'Tuyệt vời! Động mạch chủ là mạch máu lớn nhất cơ thể, xuất phát từ TÂM THẤT TRÁI và dẫn máu giàu O2 đi khắp các cơ quan!' },
      { text: 'Thành động mạch chủ dày, có tính đàn hồi cao chịu được áp lực máu rất lớn', isError: false }
    ]
  },
  'pulmonary-artery': {
    title: 'Động mạch phổi (Pulmonary Artery)',
    aiStatement: '"Động mạch phổi dẫn máu giàu oxy đi nuôi cơ tim hoạt động suốt ngày đêm."',
    options: [
      { text: 'Động mạch phổi xuất phát từ tâm thất phải dẫn máu nghèo O2 lên 2 lá phổi', isError: false },
      { text: 'Động mạch phổi dẫn máu giàu oxy đi nuôi cơ tim hoạt động', isError: true, explanation: 'Chính xác! Động mạch phổi là một trong số ít động mạch mang máu NGHÈO O2 (đỏ thẫm) để đưa lên phổi trao đổi khí. Mạch máu nuôi cơ tim là động mạch vành!' },
      { text: 'Ở phổi, máu nhả khí CO2 và nhận khí O2 trở thành máu đỏ tươi', isError: false }
    ]
  }
};

// ==================== HÀM QUẢN LÝ MODAL THÁM TỬ BẮT LỖI AI ====================
let currentDetectiveAnswered = false;

function openDetectiveModal() {
  const organelleKey = state.selectedOrganelle || 'chloroplast';
  const caseData = detectiveCases[organelleKey] || detectiveCases['chloroplast'];

  currentDetectiveAnswered = false;

  document.getElementById('detective-modal-title').textContent = `Thám tử bắt lỗi AI: ${caseData.title}`;
  document.getElementById('detective-ai-statement').textContent = caseData.aiStatement;

  const optionsContainer = document.getElementById('detective-options');
  const feedbackBox = document.getElementById('detective-feedback');

  feedbackBox.classList.add('hidden');
  feedbackBox.innerHTML = '';
  optionsContainer.innerHTML = '';

  caseData.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-xs text-slate-700 transition-all flex items-start gap-2.5';
    btn.innerHTML = `
      <span class="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">${String.fromCharCode(65 + idx)}</span>
      <span class="flex-1 leading-relaxed">${escapeHtml(opt.text)}</span>
    `;
    btn.onclick = () => handleDetectiveChoice(opt, btn, caseData);
    optionsContainer.appendChild(btn);
  });

  document.getElementById('detective-modal').classList.remove('hidden');
}

function closeDetectiveModal() {
  document.getElementById('detective-modal').classList.add('hidden');
}

async function handleDetectiveChoice(selectedOpt, btnElement, caseData) {
  if (currentDetectiveAnswered) return;
  const feedbackBox = document.getElementById('detective-feedback');
  feedbackBox.classList.remove('hidden');

  if (selectedOpt.isError) {
    currentDetectiveAnswered = true;
    state.detectivePoints += 10;

    btnElement.className = 'w-full text-left p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-bold text-xs flex items-start gap-2.5';
    btnElement.querySelector('span:first-child').className = 'w-5 h-5 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5';

    feedbackBox.className = 'p-4 rounded-2xl text-xs leading-relaxed space-y-1.5 bg-emerald-50 border border-emerald-200 text-emerald-950 animate-fadeIn';
    feedbackBox.innerHTML = `
      <div class="flex items-center gap-2 text-emerald-800 font-black text-sm">
        <span>🎉 VẠCH TRẦN ẢO GIÁC AI THÀNH CÔNG!</span>
        <span class="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px]">+10 Điểm Thám tử</span>
      </div>
      <p>${selectedOpt.explanation}</p>
    `;

    // Đồng bộ điểm thám tử lên máy chủ nếu học sinh đã đăng nhập
    if (state.token) {
      try {
        await fetch('/api/quiz/save', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            topic: `Thám tử bắt lỗi: ${caseData.title}`,
            score: 10,
            total_questions: 10,
            rank_title: 'Thám tử Sinh học Xuất sắc'
          })
        });
        checkAuthAndInitData();
      } catch (e) {
        console.warn('Lỗi khi lưu điểm thám tử:', e);
      }
    }
  } else {
    btnElement.className = 'w-full text-left p-3 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5';
    
    feedbackBox.className = 'p-3 rounded-xl text-xs leading-relaxed bg-amber-50 border border-amber-200 text-amber-900 animate-fadeIn';
    feedbackBox.innerHTML = `
      <strong>⚠️ Nhận định này AI nói ĐÚNG rồi!</strong>
      <p>Em hãy đọc kỹ lại 2 nhận định còn lại để tìm xem chi tiết nào bị ngộ nhận, phi thực tế nhé.</p>
    `;
  }
}

function switchToChatFromDetective() {
  const organelleKey = state.selectedOrganelle || 'chloroplast';
  const caseData = detectiveCases[organelleKey] || detectiveCases['chloroplast'];

  closeDetectiveModal();
  switchTab('biotutor');
  sendQuickPrompt(`Thầy ơi, hãy phân tích chuyên sâu cho em về cấu tạo và vai trò sinh học của "${caseData.title}" trong chương trình KHTN nhé!`);
}

function askAIAboutOrganelle() {
  const currentData = labData[state.currentLabModel];
  if (!state.selectedOrganelle || !currentData) return;
  const item = currentData.organelles[state.selectedOrganelle];

  switchTab('biotutor');
  sendQuickPrompt(`Giải thích chi tiết và liên hệ thực tế cho học sinh THCS về bộ phận: ${item.name} (${item.tag}).`);
}

// ==================== TRỢ LÝ BIO-AI CHATBOT ====================
function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;

  input.value = '';
  addUserMessage(query);
  processAIResponse(query);
}

function sendQuickPrompt(promptText) {
  switchTab('biotutor');
  addUserMessage(promptText);
  processAIResponse(promptText);
}

function askAIAbout(topic) {
  switchTab('biotutor');
  addUserMessage(topic);
  processAIResponse(topic);
}

function addUserMessage(text) {
  const chatMessages = document.getElementById('chat-messages');
  const userHtml = `
    <div class="flex items-start justify-end gap-3">
      <div class="bg-emerald-600 text-white rounded-2xl rounded-tr-sm p-4 text-xs max-w-xl leading-relaxed shadow-sm">
        ${escapeHtml(text)}
      </div>
      <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs flex-shrink-0 font-bold">
        ${state.user ? getInitials(state.user.full_name) : 'HS'}
      </div>
    </div>
  `;
  chatMessages.insertAdjacentHTML('beforeend', userHtml);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addAIMessage(htmlContent) {
  const chatMessages = document.getElementById('chat-messages');
  const aiHtml = `
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-slate-100 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-800 max-w-xl leading-relaxed space-y-2.5">
        ${htmlContent}
      </div>
    </div>
  `;
  chatMessages.insertAdjacentHTML('beforeend', aiHtml);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  const typingHtml = `
    <div id="typing-indicator" class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center text-xs flex-shrink-0">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
        <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 0.2s"></span>
        <span class="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style="animation-delay: 0.4s"></span>
      </div>
    </div>
  `;
  chatMessages.insertAdjacentHTML('beforeend', typingHtml);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function processAIResponse(query) {
  addTypingIndicator();

  if (state.apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Bạn là Gia sư Bio-AI của trang web giáo dục "SmartBio 360", chuyên dạy môn Khoa học tự nhiên & Sinh học cho học sinh THCS Việt Nam (lớp 6, 7, 8, 9 theo chương trình GDPT 2018).
Quy tắc sư phạm:
1. Xưng hô thân thiện "Thầy - Em".
2. Giải thích dễ hiểu, trực quan, dùng ví dụ đời sống.
3. Sử dụng gạch đầu dòng rõ ràng, định dạng sinh động.
4. Cuối câu trả lời, hãy đặt 1 câu hỏi gợi mở ngắn hoặc thử thách nhỏ để kích thích học sinh tư duy tiếp.
Câu hỏi của học sinh: ${query}`
            }]
          }]
        })
      });

      const data = await response.json();
      removeTypingIndicator();

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        let text = data.candidates[0].content.parts[0].text;
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\n\n/g, '<br><br>');
        text = text.replace(/\n- /g, '<br>• ');
        addAIMessage(text);
        return;
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local curriculum engine:', err);
    }
  }

  setTimeout(() => {
    removeTypingIndicator();
    const reply = generateSmartBioResponse(query);
    addAIMessage(reply);
  }, 750);
}

function generateSmartBioResponse(query) {
  const lower = query.toLowerCase();

  if (lower.includes('quang hợp') || lower.includes('màu xanh') || lower.includes('lá cây')) {
    return `
      <p><strong>Thầy chào em! Đây là một câu hỏi rất thú vị về thực vật học (KHTN Lớp 7): 🍃</strong></p>
      <p>Lá cây có màu xanh lục vì trong tế bào lá chứa các bào quan là <strong>Lục lạp</strong>, bên trong có sắc tố <strong>Diệp lục (Chlorophyll)</strong>. Sắc tố này hấp thụ ánh sáng đỏ và xanh lam để quang hợp, nhưng lại phản chiếu tia sáng xanh lục vào mắt chúng ta!</p>
      <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 my-1">
        <p class="font-bold text-emerald-800">Phương trình quang hợp đơn giản:</p>
        <p class="font-mono text-xs">Nước (H2O) + Khí Carbonic (CO2) ➔ Glucose + Khí Oxygen (O2) ↑</p>
      </div>
      <p><strong>Thử thách nhỏ cho em:</strong> Nếu đem một cây xanh đặt trong phòng kín hoàn toàn không có ánh sáng suốt 1 tuần thì màu sắc của lá cây sẽ biến đổi như thế nào? Em hãy thử đoán nhé!</p>
    `;
  }

  if (lower.includes('tim') || lower.includes('mỏi') || lower.includes('tuần hoàn')) {
    return `
      <p><strong>Chào em! Bí mật đằng sau trái tim không biết mệt mỏi (KHTN Lớp 8) nằm ở "quy luật nghỉ ngơi": ❤️</strong></p>
      <p>Nhiều bạn nghĩ tim đập liên tục 24/24 không ngừng nghỉ, nhưng thực ra tim là "bậc thầy quản lý thời gian":</p>
      <ul class="list-disc pl-4 space-y-1">
        <li>Mỗi chu kỳ tim người kéo dài khoảng <strong>0.8 giây</strong>.</li>
        <li>Tâm nhĩ co <strong>0.1s</strong> rồi nghỉ tận <strong>0.7s</strong>.</li>
        <li>Tâm thất co <strong>0.3s</strong> rồi nghỉ <strong>0.5s</strong>.</li>
        <li>Thời gian cả tim cùng giãn chung để nghỉ ngơi là <strong>0.4s</strong>.</li>
      </ul>
      <p>Như vậy, trong một ngày, tổng thời gian tim "nghỉ ngơi" thực tế còn nhiều hơn thời gian tim làm việc! Kết hợp với hệ mạch vành cung cấp dưỡng chất liên tục nên cơ tim không bị tích tụ axit lactic gây mỏi như cơ bắp tay chân.</p>
      <p><strong>Câu hỏi gợi mở:</strong> Khi em chạy bộ thật nhanh, nhịp tim sẽ tăng lên. Khi đó thời gian nghỉ của tim sẽ tăng hay giảm nhỉ?</p>
    `;
  }

  if (lower.includes('so sánh') || (lower.includes('thực vật') && lower.includes('động vật'))) {
    return `
      <p><strong>Thầy tổng hợp bảng so sánh chuẩn kiến thức KHTN Lớp 6 cho em nhé: 🔬</strong></p>
      <div class="overflow-x-auto my-1">
        <table class="w-full border-collapse border border-slate-200 text-left text-[11px]">
          <thead>
            <tr class="bg-slate-200 text-slate-800">
              <th class="p-1.5 border border-slate-300">Đặc điểm</th>
              <th class="p-1.5 border border-slate-300">Tế bào Thực vật</th>
              <th class="p-1.5 border border-slate-300">Tế bào Động vật</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-1.5 border border-slate-200 font-semibold">Thành tế bào</td>
              <td class="p-1.5 border border-slate-200 text-emerald-700">Có (Cellulose cứng)</td>
              <td class="p-1.5 border border-slate-200 text-rose-600">Không có</td>
            </tr>
            <tr>
              <td class="p-1.5 border border-slate-200 font-semibold">Lục lạp</td>
              <td class="p-1.5 border border-slate-200 text-emerald-700">Có (Quang hợp tự dưỡng)</td>
              <td class="p-1.5 border border-slate-200 text-rose-600">Không có (Dị dưỡng)</td>
            </tr>
            <tr>
              <td class="p-1.5 border border-slate-200 font-semibold">Không bào</td>
              <td class="p-1.5 border border-slate-200 text-emerald-700">1 không bào trung tâm rất lớn</td>
              <td class="p-1.5 border border-slate-200 text-slate-600">Nhỏ hoặc không có</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>Em có thể mở sang tab <strong>Phòng Lab 360°</strong> trên trang web để trực tiếp bấm và bóc tách hai mô hình tế bào này xem trực quan hơn nữa nhé!</p>
    `;
  }

  if (lower.includes('menđen') || lower.includes('di truyền') || lower.includes('adn')) {
    return `
      <p><strong>Chào nhà khoa học nhí! Định luật Menđen (KHTN Lớp 9) rất hấp dẫn: 🧬</strong></p>
      <p>Menđen đã phát hiện ra các quy luật di truyền nhờ nghiên cứu trên cây <strong>Đậu Hà Lan</strong> (loài tự thụ phấn nghiêm ngặt và có các cặp tính trạng tương phản rõ rệt).</p>
      <p><strong>Nội dung Định luật phân li:</strong> Mỗi tính trạng do một cặp nhân tố di truyền (sau này gọi là gen hay alen) quy định. Trong quá trình giảm phân tạo giao tử, mỗi nhân tố trong cặp sẽ phân li đồng đều về một giao tử, giúp giao tử chỉ chứa 1 chiếc trong cặp.</p>
      <p>Ví dụ: Bố mẹ thuần chủng Hoa đỏ (AA) lai với Hoa trắng (aa) ➔ F1 thu được 100% Hoa đỏ (Aa). Khi cho F1 tự thụ phấn (Aa x Aa) ➔ F2 sẽ phân li theo tỉ lệ kiểu hình: <strong>3 Đỏ : 1 Trắng</strong>.</p>
    `;
  }

  return `
    <p><strong>Thầy đã ghi nhận câu hỏi của em! 💡</strong></p>
    <p>Đối với chủ đề: "<em>${escapeHtml(query)}</em>", trong chương trình Sinh học THCS, đây là phần kiến thức gắn liền chặt chẽ giữa lý thuyết cấu tạo và thực tiễn đời sống.</p>
    <p>Em có thể tìm hiểu thêm thông qua 2 gợi ý học tập sau:</p>
    <ul class="list-disc pl-4 space-y-1">
      <li>Dùng <strong>Phòng Lab 360°</strong> để quan sát cấu trúc không gian ba chiều của cơ quan sinh học liên quan.</li>
      <li>Vào tab <strong>Đấu trường Quiz</strong> làm thử 5 câu trắc nghiệm để củng cố lại bài học.</li>
    </ul>
    <p>Em muốn thầy phân tích sâu hơn về mặt cấu tạo giải phẫu hay vai trò sinh thái của vấn đề này?</p>
  `;
}

function clearChat() {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="bg-slate-100 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-800 max-w-xl leading-relaxed space-y-2">
        <p><strong>Lịch sử trò chuyện đã được làm mới. 🌿</strong></p>
        <p>Thầy sẵn sàng hỗ trợ em bất cứ câu hỏi nào về Sinh học cấp 2!</p>
      </div>
    </div>
  `;
}

// ==================== BIOLENS (AI VISION SCANNER) ====================
const lensSampleData = {
  'la-bang': {
    name: 'Lá Bàng (Terminalia catappa)',
    taxonomy: 'Ngành Hạt kín • Lớp Hai lá mầm • Họ Trâm bầu',
    accuracy: '98.6%',
    emoji: '🍃',
    details: [
      { title: 'Dạng gân lá', val: 'Gân hình mạng nổi rõ ở mặt dưới, giúp dẫn nước và muối khoáng hiệu quả.' },
      { title: 'Tế bào khí khổng', val: 'Phân bố nhiều ở mặt dưới lá, có 2 tế bào hình hạt đậu kiểm soát thoát hơi nước.' },
      { title: 'Vai trò sinh thái', val: 'Cây che bóng mát sân trường, hấp thụ bụi mịn và nhả khí O2 điều hòa vi khí hậu.' }
    ],
    ecoTip: 'Vào mùa thu đông, lá bàng chuyển sang màu đỏ tím do chất diệp lục bị phân giải, để lộ sắc tố Anthocyanin bảo vệ lá trước khi rụng!'
  },
  'te-bao-hanh': {
    name: 'Tiêu bản Tế bào Biểu bì Vảy hành',
    taxonomy: 'Mẫu hiển vi tế bào thực vật (Thực hành KHTN 6)',
    accuracy: '99.2%',
    emoji: '🔬',
    details: [
      { title: 'Hình dạng', val: 'Các tế bào hình đa giác xếp sát khít nhau như bức tường gạch bảo vệ vảy hành.' },
      { title: 'Thành phần nhìn thấy', val: 'Thành tế bào cellulose rõ rệt, nhân tế bào bắt màu vàng cam khi nhuộm Lugol (Iod).' },
      { title: 'Ý nghĩa bài học', val: 'Minh chứng trực quan nhất cho bài học: "Tế bào là đơn vị cơ sở cấu tạo nên sinh vật".' }
    ],
    ecoTip: 'Củ hành tây thực chất là phần thân ngầm biến dạng thành các lớp lá mọng nước chứa chất dinh dưỡng dự trữ.'
  },
  'trung-roi': {
    name: 'Trùng Roi Xanh (Euglena viridis)',
    taxonomy: 'Giới Nguyên sinh • Động vật nguyên sinh có roi',
    accuracy: '97.5%',
    emoji: '🦠',
    details: [
      { title: 'Cấu tạo cơ thể', val: 'Cơ thể đơn bào hình thoi, đầu tù đuôi nhọn, có 1 roi bơi dài ở đầu giúp xoay tròn di chuyển.' },
      { title: 'Dinh dưỡng đặc biệt', val: 'Tự dưỡng khi có ánh sáng nhờ chứa hạt diệp lục; Dị dưỡng khi ở trong bóng tối lâu ngày.' },
      { title: 'Điểm mắt đỏ', val: 'Giúp trùng roi nhận biết hướng có ánh sáng để bơi lại gần.' }
    ],
    ecoTip: 'Trùng roi xanh là mắt xích thức ăn quan trọng cho cá bột và giáp xác nhỏ trong ao hồ tự nhiên.'
  }
};

function selectSampleLens(sampleId) {
  state.activeSampleLens = sampleId;
  const sample = lensSampleData[sampleId];
  if (!sample) return;

  const emptyPrompt = document.getElementById('lens-empty-prompt');
  const previewImg = document.getElementById('lens-preview-img');

  emptyPrompt.classList.add('hidden');
  previewImg.classList.remove('hidden');
  
  if (sampleId === 'la-bang') {
    previewImg.src = 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400&auto=format&fit=crop&q=80';
  } else if (sampleId === 'te-bao-hanh') {
    previewImg.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&auto=format&fit=crop&q=80';
  } else if (sampleId === 'trung-roi') {
    previewImg.src = 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400&auto=format&fit=crop&q=80';
  }
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const emptyPrompt = document.getElementById('lens-empty-prompt');
    const previewImg = document.getElementById('lens-preview-img');
    emptyPrompt.classList.add('hidden');
    previewImg.classList.remove('hidden');
    previewImg.src = event.target.result;
    state.activeSampleLens = 'la-bang';
  };
  reader.readAsDataURL(file);
}

function runAIScan() {
  const laser = document.getElementById('scanner-laser');
  const btn = document.getElementById('btn-scan-ai');
  laser.classList.remove('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang quét qua mạng nơ-ron AI...';

  setTimeout(() => {
    laser.classList.add('hidden');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Bắt đầu AI quét & phân tích';
    renderLensResult(state.activeSampleLens);
  }, 1600);
}

function renderLensResult(sampleId) {
  const data = lensSampleData[sampleId] || lensSampleData['la-bang'];
  document.getElementById('lens-result-empty').classList.add('hidden');
  const card = document.getElementById('lens-result-card');
  const footer = document.getElementById('lens-result-footer');

  card.classList.remove('hidden');
  footer.classList.remove('hidden');

  let detailsHtml = '';
  data.details.forEach(item => {
    detailsHtml += `
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <span class="text-[11px] font-bold text-slate-700 block">${item.title}:</span>
        <span class="text-xs text-slate-600">${item.val}</span>
      </div>
    `;
  });

  card.innerHTML = `
    <div class="space-y-4 animate-fadeIn">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${data.emoji}</span>
          <div>
            <h4 class="font-extrabold text-slate-800 text-sm sm:text-base">${data.name}</h4>
            <p class="text-[11px] text-slate-400">${data.taxonomy}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="px-2.5 py-1 text-xs font-bold bg-cyan-100 text-cyan-800 rounded-lg">Độ tin cậy: ${data.accuracy}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        ${detailsHtml}
      </div>

      <div class="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
        <p class="font-bold mb-1 flex items-center gap-1.5 text-emerald-800">
          <i class="fa-solid fa-seedling text-emerald-600"></i> Bài học môi trường & Đa dạng sinh học:
        </p>
        <p>${data.ecoTip}</p>
      </div>
    </div>
  `;
}

async function saveToEcoLog() {
  const data = lensSampleData[state.activeSampleLens] || lensSampleData['la-bang'];
  const title = `Nhận diện BioLens: ${data.name}`;
  const description = `Mẫu vật đã được quét với độ tin cậy ${data.accuracy}. Đặc điểm: ${data.taxonomy}`;

  if (state.token) {
    try {
      await fetch('/api/eco/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action_type: 'nature', title, description })
      });
      fetchEcoLogs();
      fetchLeaderboard(state.leaderboardGrade);
      alert(`Đã lưu "${data.name}" vào Sổ tay sinh thái của em trên hệ thống máy chủ!`);
      return;
    } catch (e) {
      console.warn('Lỗi khi lưu eco log:', e);
    }
  }

  alert(`Đã lưu "${data.name}" vào Sổ tay sinh thái tạm thời! Hãy đăng nhập để lưu trữ vĩnh viễn.`);
}

// ==================== ADAPTIVE QUIZ & BACKEND SCORE SYNC ====================
function renderQuiz() {
  const current = state.quiz.questions[state.quiz.currentIndex];
  state.quiz.answered = false;

  document.getElementById('quiz-question-counter').textContent = `Câu hỏi ${state.quiz.currentIndex + 1} / ${state.quiz.questions.length}`;
  document.getElementById('quiz-topic-tag').textContent = current.topic;
  document.getElementById('quiz-question-text').textContent = current.question;
  document.getElementById('quiz-progress-fill').style.width = `${((state.quiz.currentIndex + 1) / state.quiz.questions.length) * 100}%`;

  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';

  const explanationBox = document.getElementById('quiz-explanation-box');
  explanationBox.classList.add('hidden');
  explanationBox.innerHTML = '';

  document.getElementById('btn-next-quiz').classList.add('hidden');

  current.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-xs sm:text-sm font-medium text-slate-700 transition-all flex items-center gap-3';
    btn.innerHTML = `
      <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs flex-shrink-0">${String.fromCharCode(65 + idx)}</span>
      <span class="flex-1">${opt}</span>
    `;
    btn.onclick = () => handleAnswer(idx);
    container.appendChild(btn);
  });
}

function handleAnswer(selectedIndex) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;

  const current = state.quiz.questions[state.quiz.currentIndex];
  const buttons = document.querySelectorAll('#quiz-options-container button');
  const isCorrect = selectedIndex === current.correct;

  if (isCorrect) {
    state.quiz.score++;
  }

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === current.correct) {
      btn.className = 'w-full text-left p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-bold text-xs sm:text-sm flex items-center gap-3';
      btn.querySelector('span:first-child').className = 'w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0';
    } else if (idx === selectedIndex && !isCorrect) {
      btn.className = 'w-full text-left p-3.5 rounded-2xl border-2 border-rose-400 bg-rose-50 text-rose-900 font-bold text-xs sm:text-sm flex items-center gap-3';
      btn.querySelector('span:first-child').className = 'w-6 h-6 rounded-lg bg-rose-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0';
    } else {
      btn.className = 'w-full text-left p-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 text-xs sm:text-sm flex items-center gap-3 opacity-60';
    }
  });

  const expBox = document.getElementById('quiz-explanation-box');
  expBox.classList.remove('hidden');
  if (isCorrect) {
    expBox.className = 'p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-1 bg-emerald-50 border border-emerald-200 text-emerald-900';
    expBox.innerHTML = `<strong>🎉 Hoan hô! Đáp án hoàn toàn chính xác!</strong><p>${current.explanation}</p>`;
  } else {
    expBox.className = 'p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-1 bg-amber-50 border border-amber-200 text-amber-900';
    expBox.innerHTML = `<strong>⚠️ Tiếc quá, câu trả lời chưa đúng rồi!</strong><p>${current.explanation}</p>`;
  }

  document.getElementById('quiz-score-display').textContent = `${state.quiz.score} / ${state.quiz.questions.length}`;
  updateRank();

  const nextBtn = document.getElementById('btn-next-quiz');
  nextBtn.classList.remove('hidden');
  if (state.quiz.currentIndex === state.quiz.questions.length - 1) {
    nextBtn.innerHTML = 'Nộp bài & Lưu kết quả <i class="fa-solid fa-cloud-arrow-up ml-1"></i>';
  } else {
    nextBtn.innerHTML = 'Câu tiếp theo <i class="fa-solid fa-arrow-right ml-1"></i>';
  }
}

async function nextQuestion() {
  if (state.quiz.currentIndex < state.quiz.questions.length - 1) {
    state.quiz.currentIndex++;
    renderQuiz();
  } else {
    // Hoàn thành toàn bộ quiz -> Đồng bộ lên máy chủ Backend
    await finishAndSyncQuiz();
  }
}

async function finishAndSyncQuiz() {
  const score = state.quiz.score;
  const total = state.quiz.questions.length;
  const rankTitle = document.getElementById('quiz-rank-display').textContent;

  if (state.token) {
    try {
      const res = await fetch('/api/quiz/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          topic: 'Kiểm tra Năng lực Sinh học THCS',
          score,
          total_questions: total,
          rank_title: rankTitle
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 Chúc mừng em đã hoàn thành bài thi với kết quả: ${score}/${total} điểm!\n\nKết quả đã được tự động lưu vào cơ sở dữ liệu học sinh trên máy chủ. Tổng điểm tích lũy của em hiện tại: ${data.accumulated_score} điểm.`);
        
        // Cập nhật lại stats
        checkAuthAndInitData();
        resetQuiz();
        return;
      }
    } catch (e) {
      console.warn('Không thể đồng bộ quiz tới backend:', e);
    }
  }

  alert(`Chúc mừng em đạt ${score}/${total} điểm! Hãy đăng nhập để lưu kết quả vào Bảng Vàng toàn trường.`);
  resetQuiz();
}

function resetQuiz() {
  state.quiz.currentIndex = 0;
  state.quiz.score = 0;
  document.getElementById('quiz-score-display').textContent = `0 / ${state.quiz.questions.length}`;
  updateRank();
  renderQuiz();
}

function updateRank() {
  const display = document.getElementById('quiz-rank-display');
  const score = state.quiz.score;
  if (score >= 4) {
    display.textContent = 'Bậc thầy Sinh học';
    display.className = 'text-xs font-bold text-amber-600';
  } else if (score >= 2) {
    display.textContent = 'Nhà Khám phá Nhí';
    display.className = 'text-xs font-bold text-teal-600';
  } else {
    display.textContent = 'Mầm non Sinh học';
    display.className = 'text-xs font-bold text-emerald-700';
  }
}

// ==================== ECO PLANET ACTIONS & BACKEND LOGS ====================
async function fetchEcoLogs() {
  const list = document.getElementById('eco-logs-list');
  if (!list) return;

  try {
    const res = await fetch('/api/eco/logs');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.logs) {
        renderEcoLogItems(data.logs);
        return;
      }
    }
  } catch (e) {
    console.warn('Lỗi khi fetch eco logs từ backend, dùng fallback:');
  }

  // Fallback logs nếu không có server
  renderEcoLogItems([
    {
      action_type: 'tree',
      title: 'Tưới nước và chăm sóc vườn thực nghiệm Sinh học',
      description: 'Nhóm học sinh lớp 7B đã nhổ cỏ và bón phân hữu cơ cho 15 bồn cây thuốc nam trong sân trường.',
      author_name: 'Nguyễn Bình An',
      author_class: '8A1',
      created_at: 'Hôm nay'
    },
    {
      action_type: 'clean',
      title: 'Phân loại 42 vỏ lon và chai nhựa sau giờ ra chơi',
      description: 'Quyên góp vào quỹ Kế hoạch nhỏ và tái sử dụng chai nhựa làm chậu ươm mầm hạt đỗ.',
      author_name: 'Trần Khánh Linh',
      author_class: '7A3',
      created_at: 'Hôm qua'
    }
  ]);
}

function renderEcoLogItems(logs) {
  const list = document.getElementById('eco-logs-list');
  list.innerHTML = '';

  if (!logs || logs.length === 0) {
    list.innerHTML = '<p class="text-slate-400 text-xs italic text-center py-6">Chưa có hành động xanh nào được ghi lại.</p>';
    return;
  }

  logs.forEach(log => {
    let icon = 'fa-leaf';
    let color = 'emerald';
    if (log.action_type === 'tree') { icon = 'fa-tree'; color = 'emerald'; }
    else if (log.action_type === 'clean') { icon = 'fa-recycle'; color = 'teal'; }
    else if (log.action_type === 'nature') { icon = 'fa-binoculars'; color = 'cyan'; }
    else { icon = 'fa-lightbulb'; color = 'amber'; }

    const item = document.createElement('div');
    item.className = 'p-3.5 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 transition-all flex items-start gap-3';
    item.innerHTML = `
      <div class="w-9 h-9 rounded-xl bg-${color}-100 text-${color}-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="flex-1 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-800">${escapeHtml(log.title)}</span>
          <span class="text-[10px] text-slate-400">${log.created_at || 'Vừa xong'}</span>
        </div>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(log.description)}</p>
        <div class="text-[10px] text-emerald-700 font-semibold pt-0.5">
          👤 ${escapeHtml(log.author_name || 'Học sinh')} ${log.author_class ? '• Lớp ' + escapeHtml(log.author_class) : ''}
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

async function addEcoLog() {
  const typeSelect = document.getElementById('eco-action-type');
  const titleInput = document.getElementById('eco-action-title');
  const descInput = document.getElementById('eco-action-desc');

  const action_type = typeSelect.value;
  const title = titleInput.value.trim();
  const description = descInput.value.trim();

  if (!title || !description) {
    alert('Vui lòng nhập đầy đủ tiêu đề và mô tả hành động xanh của em nhé!');
    return;
  }

  if (state.token) {
    try {
      const res = await fetch('/api/eco/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action_type, title, description })
      });
      const data = await res.json();
      if (data.success) {
        titleInput.value = '';
        descInput.value = '';
        fetchEcoLogs();
        checkAuthAndInitData();
        alert('🎉 Đã ghi nhận hành động xanh vào máy chủ trường học!');
        return;
      }
    } catch (e) {
      console.warn('Lỗi khi gửi eco log lên backend:', e);
    }
  }

  // Fallback nếu chưa đăng nhập
  titleInput.value = '';
  descInput.value = '';
  alert('Đã lưu hành động xanh tạm thời! Hãy đăng nhập để cộng điểm vào thành tích cá nhân của em.');
}

// ==================== API KEY MODAL ====================
function openApiKeyModal() {
  document.getElementById('api-modal').classList.remove('hidden');
  document.getElementById('api-key-input').value = state.apiKey;
}

function closeApiKeyModal() {
  document.getElementById('api-modal').classList.add('hidden');
}

function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  state.apiKey = key;
  if (key) {
    localStorage.setItem('smartbio_gemini_key', key);
  } else {
    localStorage.removeItem('smartbio_gemini_key');
  }
  closeApiKeyModal();
  updateApiBadge();
}

function updateApiBadge() {
  const badge = document.getElementById('api-status-badge');
  if (state.apiKey) {
    badge.textContent = 'Gemini Live: Bật';
    badge.parentElement.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-700');
  } else {
    badge.textContent = 'AI Nội bộ (GDPT 2018)';
  }
}

// ==================== UTILS ====================
function escapeHtml(string) {
  if (!string) return '';
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}

// ==================== BẢNG QUẢN TRỊ VIÊN / GIÁO VIÊN (ADMIN DASHBOARD) ====================
async function loadAdminData() {
  const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');
  if (!isAdmin || !state.token) {
    const tabAdmin = document.getElementById('tab-admin');
    if (tabAdmin) tabAdmin.classList.add('hidden');
    switchTab('dashboard');
    return;
  }

  try {
    // 1. Tải tổng quan trường học
    const resOverview = await fetch('/api/admin/overview', { headers: getAuthHeaders() });
    if (resOverview.status === 403 || resOverview.status === 401) {
      console.warn('API từ chối quyền quản trị.');
      switchTab('dashboard');
      return;
    }
    if (resOverview.ok) {
      const data = await resOverview.json();
      if (data.success && data.overview) {
        document.getElementById('admin-stat-students').textContent = data.overview.total_students;
        document.getElementById('admin-stat-quizzes').textContent = data.overview.total_quizzes;
        document.getElementById('admin-stat-eco').textContent = data.overview.total_eco_actions;
        document.getElementById('admin-stat-avg').textContent = data.overview.average_score.toFixed(1);
      }
    }

    // 2. Tải danh sách học sinh
    await fetchAdminStudents();

    // 3. Tải phân tích bài thi
    await fetchAdminQuizStats();

    // 4. Tải danh sách bài nhật ký xanh
    await fetchAdminEcoLogs();

  } catch (err) {
    console.warn('Lỗi khi tải dữ liệu quản trị viên:', err);
  }
}

function switchAdminSubtab(tabName) {
  const btnStudents = document.getElementById('admin-subtab-btn-students');
  const btnQuiz = document.getElementById('admin-subtab-btn-quiz');
  const btnEco = document.getElementById('admin-subtab-btn-eco');

  const viewStudents = document.getElementById('admin-view-students');
  const viewQuiz = document.getElementById('admin-view-quiz');
  const viewEco = document.getElementById('admin-view-eco');

  // Reset classes
  [btnStudents, btnQuiz, btnEco].forEach(b => {
    b.className = 'px-4 py-2.5 text-xs font-semibold rounded-t-xl text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2';
  });

  [viewStudents, viewQuiz, viewEco].forEach(v => v.classList.add('hidden'));

  if (tabName === 'students') {
    btnStudents.className = 'px-4 py-2.5 text-xs font-bold rounded-t-xl bg-white text-rose-700 border-t-2 border-rose-600 shadow-sm transition-all flex items-center gap-2';
    viewStudents.classList.remove('hidden');
  } else if (tabName === 'quiz') {
    btnQuiz.className = 'px-4 py-2.5 text-xs font-bold rounded-t-xl bg-white text-rose-700 border-t-2 border-rose-600 shadow-sm transition-all flex items-center gap-2';
    viewQuiz.classList.remove('hidden');
  } else if (tabName === 'eco') {
    btnEco.className = 'px-4 py-2.5 text-xs font-bold rounded-t-xl bg-white text-rose-700 border-t-2 border-rose-600 shadow-sm transition-all flex items-center gap-2';
    viewEco.classList.remove('hidden');
  }
}

async function fetchAdminStudents() {
  try {
    const res = await fetch('/api/admin/students', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.students) {
        state.adminStudents = data.students;
        renderAdminStudents(state.adminStudents);
      }
    }
  } catch (e) {
    console.warn('Lỗi khi fetch học sinh quản trị:', e);
  }
}

function renderAdminStudents(students) {
  const tbody = document.getElementById('admin-students-tbody');
  if (!tbody) return;

  const keyword = (document.getElementById('admin-search-student')?.value || '').toLowerCase().trim();
  const gradeFilter = state.adminGradeFilter || 'all';

  const filtered = students.filter(s => {
    const matchGrade = (gradeFilter === 'all') || (String(s.grade) === gradeFilter);
    const matchSearch = (!keyword) || 
      (s.full_name && s.full_name.toLowerCase().includes(keyword)) || 
      (s.username && s.username.toLowerCase().includes(keyword));
    return matchGrade && matchSearch;
  });

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400 italic">Không tìm thấy học sinh nào phù hợp.</td></tr>`;
    return;
  }

  filtered.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/70 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-3 text-slate-400 font-bold">${idx + 1}</td>
      <td class="py-3 px-3">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-extrabold flex items-center justify-center text-[10px]">
            ${getInitials(s.full_name)}
          </div>
          <div>
            <div class="font-bold text-slate-800">${escapeHtml(s.full_name)}</div>
            <div class="text-[10px] text-slate-400 font-mono">@${escapeHtml(s.username)}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-3 text-slate-600 font-semibold">Khối ${s.grade}</td>
      <td class="py-3 px-3 text-slate-600">${escapeHtml(s.classroom || 'Chưa xếp')}</td>
      <td class="py-3 px-3 text-center font-black text-amber-600">${s.total_score} đ</td>
      <td class="py-3 px-3 text-center font-bold text-emerald-600">${s.eco_count} 🌱</td>
      <td class="py-3 px-3 text-slate-400 text-[11px]">${s.created_at ? s.created_at.split(' ')[0] : 'N/A'}</td>
      <td class="py-3 px-3 text-right space-x-1 whitespace-nowrap">
        <button onclick="resetStudentPassword(${s.id}, '${escapeHtml(s.full_name)}')" class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition-all" title="Đặt lại mật khẩu về 123456">
          <i class="fa-solid fa-key text-[10px]"></i> Reset MK
        </button>
        <button onclick="deleteStudent(${s.id}, '${escapeHtml(s.full_name)}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition-all" title="Xóa học sinh">
          <i class="fa-solid fa-trash text-[10px]"></i> Xóa
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterAdminStudents() {
  renderAdminStudents(state.adminStudents);
}

function setAdminStudentGradeFilter(grade, btn) {
  state.adminGradeFilter = grade;
  const buttons = document.querySelectorAll('#admin-grade-filter button');
  buttons.forEach(b => {
    b.className = 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900';
  });
  btn.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-white shadow-sm text-rose-700';
  renderAdminStudents(state.adminStudents);
}

async function resetStudentPassword(studentId, studentName) {
  if (!confirm(`Thầy/Cô có chắc chắn muốn đặt lại mật khẩu cho học sinh "${studentName}" về mặc định "123456" không?`)) {
    return;
  }

  try {
    const res = await fetch('/api/admin/students/reset-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ student_id: studentId })
    });
    const data = await res.json();
    if (data.success) {
      alert(`🎉 Đã đặt lại mật khẩu thành công!\nHọc sinh "${studentName}" có thể đăng nhập bằng mật khẩu mới: 123456`);
    } else {
      alert('⚠️ ' + data.message);
    }
  } catch (err) {
    alert('Lỗi khi gửi yêu cầu đặt lại mật khẩu.');
  }
}

async function deleteStudent(studentId, studentName) {
  if (!confirm(`⚠️ CẢNH BÁO GIÁO VIÊN:\nBạn có chắc muốn xóa tài khoản học sinh "${studentName}"?\nThao tác này sẽ xóa vĩnh viễn toàn bộ bài làm và điểm số tích lũy.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/students/${studentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      alert(`Đã xóa học sinh "${studentName}" thành công.`);
      loadAdminData();
    } else {
      alert('⚠️ ' + data.message);
    }
  } catch (err) {
    alert('Lỗi khi thực hiện xóa học sinh.');
  }
}

async function fetchAdminQuizStats() {
  try {
    const res = await fetch('/api/admin/quiz-stats', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        renderAdminQuizStats(data);
      }
    }
  } catch (e) {
    console.warn('Lỗi khi fetch quiz stats:', e);
  }
}

function renderAdminQuizStats(data) {
  const questionsContainer = document.getElementById('admin-questions-analytics');
  const recentTestsTbody = document.getElementById('admin-recent-tests-tbody');

  if (questionsContainer && data.questions) {
    questionsContainer.innerHTML = data.questions.map(q => {
      let badgeColor = 'emerald';
      let barColor = 'bg-emerald-500';
      if (q.correct_rate < 60) { badgeColor = 'rose'; barColor = 'bg-rose-500'; }
      else if (q.correct_rate < 75) { badgeColor = 'amber'; barColor = 'bg-amber-500'; }

      return `
        <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">${escapeHtml(q.topic)}</span>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-${badgeColor}-100 text-${badgeColor}-800">
              Độ khó: ${escapeHtml(q.difficulty)}
            </span>
          </div>
          <h4 class="font-bold text-xs sm:text-sm text-slate-800">${escapeHtml(q.title)}</h4>
          <div>
            <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
              <span>Tỷ lệ làm đúng:</span>
              <span class="font-extrabold text-${badgeColor}-700">${q.correct_rate}%</span>
            </div>
            <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full ${barColor}" style="width: ${q.correct_rate}%"></div>
            </div>
          </div>
          <div class="p-2.5 bg-white rounded-xl border border-slate-200/60 text-[11px] text-slate-600 leading-relaxed">
            <strong class="text-slate-800">💡 Chẩn đoán sư phạm:</strong> ${escapeHtml(q.diagnosis)}
          </div>
        </div>
      `;
    }).join('');
  }

  if (recentTestsTbody && data.recent_tests) {
    recentTestsTbody.innerHTML = '';
    if (data.recent_tests.length === 0) {
      recentTestsTbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-400 italic">Chưa có lượt nộp bài nào.</td></tr>`;
      return;
    }

    data.recent_tests.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-bold text-slate-800">${escapeHtml(t.full_name)}</td>
        <td class="py-2.5 px-3 text-slate-500">Khối ${t.grade} ${t.classroom ? '(' + escapeHtml(t.classroom) + ')' : ''}</td>
        <td class="py-2.5 px-3 text-slate-600">${escapeHtml(t.topic)}</td>
        <td class="py-2.5 px-3 text-center font-black text-amber-600">${t.score}/${t.total_questions} đ</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 rounded-md">${escapeHtml(t.rank_title)}</span></td>
        <td class="py-2.5 px-3 text-slate-400 text-[11px]">${t.completed_at || 'Vừa xong'}</td>
      `;
      recentTestsTbody.appendChild(tr);
    });
  }
}

async function fetchAdminEcoLogs() {
  try {
    const res = await fetch('/api/eco/logs');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.logs) {
        renderAdminEcoLogs(data.logs);
      }
    }
  } catch (e) {
    console.warn('Lỗi khi fetch eco logs cho admin:', e);
  }
}

function renderAdminEcoLogs(logs) {
  const container = document.getElementById('admin-eco-grid');
  if (!container) return;

  container.innerHTML = '';
  if (!logs || logs.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-xs italic py-6 col-span-2 text-center">Chưa có bài nhật ký xanh nào.</p>';
    return;
  }

  logs.forEach(l => {
    const card = document.createElement('div');
    card.className = 'p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between space-y-3';
    card.innerHTML = `
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
            ${l.action_type === 'tree' ? '🌱 Trồng cây' : (l.action_type === 'clean' ? '♻️ Tái chế' : '🦋 Đa dạng')}
          </span>
          <span class="text-[10px] text-slate-400">${l.created_at || 'Mới đây'}</span>
        </div>
        <h4 class="font-bold text-xs sm:text-sm text-slate-800">${escapeHtml(l.title)}</h4>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(l.description)}</p>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-slate-200/60">
        <span class="text-[11px] font-semibold text-emerald-700">
          👤 ${escapeHtml(l.author_name)} ${l.author_class ? '• Lớp ' + escapeHtml(l.author_class) : ''}
        </span>
        <button onclick="deleteAdminEcoLog(${l.id}, '${escapeHtml(l.title)}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
          <i class="fa-solid fa-trash-can text-[10px]"></i> Xóa bài
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function deleteAdminEcoLog(logId, logTitle) {
  if (!confirm(`Thầy/Cô có chắc chắn muốn xóa bài đăng "${logTitle}" này khỏi hệ thống?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/eco-logs/${logId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      alert('Đã xóa bài nhật ký xanh thành công.');
      loadAdminData();
    } else {
      alert('⚠️ ' + data.message);
    }
  } catch (err) {
    alert('Lỗi khi xóa bài đăng.');
  }
}

function exportAdminCsv() {
  if (!state.token) {
    alert('Vui lòng đăng nhập với tài khoản Giáo viên để tải báo cáo.');
    return;
  }
  // Tải file trực tiếp qua URL download
  window.open(`/api/admin/export-csv?token=${encodeURIComponent(state.token)}`, '_blank');
}
