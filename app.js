/**
 * SmartBio 360 - Frontend Application Logic (Phiên bản Tinh gọn)
 * Phân hệ 1: Phòng Lab 360° (Mô phỏng 3D/SVG, Web Speech API & Phản biện Bắt lỗi AI)
 * Phân hệ 2: Hành tinh Xanh (Eco Tracker, Bảng tin hành động xanh & Bảng xếp hạng vinh danh)
 * Hệ thống Tài khoản Học sinh & Bảng Quản trị Giáo viên
 */

// ==================== STATE MANAGEMENT ====================
const state = {
  activeTab: 'lab360', // Màn hình mặc định khi vào web
  currentLabModel: 'plant-cell',
  currentZoom: 1,
  selectedOrganelle: 'chloroplast',
  isHeartBeating: true,
  detectivePoints: 0,
  
  // Auth & Backend State
  user: (() => {
    try {
      const u = JSON.parse(localStorage.getItem('smartbio_user') || 'null');
      if (u) {
        if (u.username === 'admin') u.role = 'teacher';
        else u.role = u.role === 'teacher' ? 'teacher' : 'student';
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
  ecoLogs: [],
  adminStudents: [],
  adminGradeFilter: 'all'
};

// ==================== CƠ SỞ DỮ LIỆU LAB 360° ====================
const labData = {
  'plant-cell': {
    title: 'Tế bào Thực vật (Plant Cell)',
    grade: 'KHTN Lớp 6',
    organelles: {
      'chloroplast': {
        name: 'Lục lạp (Chloroplast)',
        tag: 'Bào quan Quang hợp',
        role: 'Chứa chất diệp lục hấp thu năng lượng ánh sáng mặt trời, biến đổi nước và CO2 thành glucose (chất hữu cơ) và giải phóng khí oxy.',
        fact: 'Lục lạp có hệ thống túi dẹp thylakoid xếp chồng thành hạt grana giúp tối ưu hóa diện tích tiếp nhận ánh sáng.'
      },
      'cell-wall': {
        name: 'Thành tế bào (Cell Wall)',
        tag: 'Khung bảo vệ vững chắc',
        role: 'Lớp vỏ ngoài cùng cấu tạo từ cellulose bền chắc, bảo vệ tế bào khỏi tác động cơ học và duy trì hình dạng đa giác cố định.',
        fact: 'Thành tế bào có các cầu sinh chất (plasmodesmata) làm kênh thông thương trao đổi chất giữa các tế bào thực vật liền kề.'
      },
      'nucleus': {
        name: 'Nhân tế bào (Nucleus)',
        tag: 'Trung tâm chỉ huy & Di truyền',
        role: 'Chứa chất nhiễm sắc mang phân tử ADN – bản thiết kế di truyền điều khiển mọi hoạt động trao đổi chất và phân chia tế bào.',
        fact: 'Nếu tách nhân ra khỏi tế bào, tế bào sẽ ngừng phân bào và nhanh chóng chết đi.'
      },
      'vacuole': {
        name: 'Không bào trung tâm (Large Vacuole)',
        tag: 'Dự trữ & Áp suất trương',
        role: 'Túi lớn chứa dịch tế bào (nước, ion khoáng, chất dinh dưỡng, sắc tố). Tạo áp suất trương nước giúp thân và lá cây non đứng thẳng.',
        fact: 'Khi cây thiếu nước, không bào xẹp lại khiến cành lá bị héo rũ.'
      },
      'mitochondria': {
        name: 'Ti thể (Mitochondria)',
        tag: 'Nhà máy năng lượng ATP',
        role: 'Thực hiện quá trình hô hấp tế bào: phân giải glucose giải phóng năng lượng ATP cung cấp cho mọi hoạt động sống của cây.',
        fact: 'Cả tế bào thực vật và động vật đều có ti thể để hô hấp!'
      },
      'cytoplasm': {
        name: 'Tế bào chất (Cytoplasm)',
        tag: 'Môi trường sống của bào quan',
        role: 'Chất keo bán lỏng chứa 70-80% nước và khung xương tế bào, là nơi diễn ra hầu hết các phản ứng hóa sinh của tế bào.',
        fact: 'Tế bào chất luôn chuyển động dòng liên tục giúp lưu chuyển các chất và bào quan.'
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
        fact: 'Tế bào động vật không có thành cellulose nên có hình cầu hoặc đa giác mềm dẻo, dễ thay đổi hình dạng.'
      },
      'nucleus': {
        name: 'Nhân tế bào (Nucleus)',
        tag: 'Bộ chỉ huy trung tâm',
        role: 'Bao gồm màng nhân kép, lỗ màng nhân, nhân con và sợi nhiễm sắc chứa gen di truyền ADN.',
        fact: 'Mỗi tế bào người bình thường chứa 46 nhiễm sắc thể (23 cặp).'
      },
      'mitochondria': {
        name: 'Ti thể (Mitochondria)',
        tag: 'Nhà máy năng lượng ATP cực lớn',
        role: 'Số lượng ti thể rất nhiều ở các tế bào hoạt động mạnh như tế bào cơ tim, cơ bắp và tế bào gan.',
        fact: 'Tế bào cơ tim người có thể chứa hàng nghìn ti thể để duy trì nhịp đập không ngừng suốt cuộc đời.'
      },
      'golgi': {
        name: 'Bộ máy Golgi & Lưới nội chất',
        tag: 'Đóng gói & Phân phối protein',
        role: 'Tiếp nhận protein tổng hợp từ ribosome, biến đổi, đóng gói vào các túi tiết và phân phối đến màng sinh chất hoặc ra ngoài tế bào.',
        fact: 'Được ví như bưu điện hoặc trung tâm logistics của tế bào.'
      },
      'cytoplasm': {
        name: 'Tế bào chất (Cytoplasm)',
        tag: 'Chất nền tế bào',
        role: 'Chứa khung xương vi sợi, vi ống giúp nâng đỡ và định vị các bào quan.',
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
        tag: 'Động cơ bơm máu toàn thân',
        role: 'Khoang tim có lớp cơ tim dày nhất (gấp 3 lần thất phải), co bóp tống máu giàu Oxy (đỏ tươi) vào động mạch chủ đi nuôi toàn bộ cơ thể.',
        fact: 'Áp lực bơm máu ở tâm thất trái tạo nên huyết áp tối đa đo được ở cánh tay người.'
      },
      'right-ventricle': {
        name: 'Tâm thất phải (Right Ventricle)',
        tag: 'Bơm máu lên phổi',
        role: 'Khoang tim nhận máu giàu CO2 từ tâm nhĩ phải, co bóp tống máu vào động mạch phổi để thực hiện trao đổi khí tại 2 lá phổi.',
        fact: 'Vì phổi nằm ngay sát tim nên thành cơ của tâm thất phải mỏng hơn nhiều so với tâm thất trái.'
      },
      'atria': {
        name: 'Tâm nhĩ (Tâm nhĩ phải & Tâm nhĩ trái)',
        tag: 'Khoang tiếp nhận máu',
        role: 'Nhĩ phải nhận máu giàu CO2 từ tĩnh mạch chủ; Nhĩ trái nhận máu giàu Oxy từ 4 tĩnh mạch phổi. Cả hai co bóp đẩy máu xuống tâm thất tương ứng.',
        fact: 'Tâm nhĩ có thành cơ mỏng vì chỉ cần đẩy máu một đoạn rất ngắn qua các van tim xuống tâm thất.'
      },
      'aorta': {
        name: 'Cung Động mạch chủ (Aorta)',
        tag: 'Huyết mạch lớn nhất cơ thể',
        role: 'Ống dẫn máu lớn nhất xuất phát từ tâm thất trái, uốn cong thành hình cung và phân nhánh mang máu giàu Oxy đi nuôi đầu, não và toàn thân.',
        fact: 'Đường kính động mạch chủ ở người trưởng thành khoảng 2.5 - 3 cm.'
      },
      'pulmonary-artery': {
        name: 'Động mạch phổi (Pulmonary Artery)',
        tag: 'Đưa máu lên phổi nhận O2',
        role: 'Mạch máu xuất phát từ tâm thất phải, chia làm 2 nhánh trái và phải đưa máu đỏ thẫm giàu CO2 đến mao mạch phế nang của phổi.',
        fact: 'Đây là động mạch duy nhất trong cơ thể người mang máu giàu CO2 (máu đỏ thẫm).'
      },
      'valves': {
        name: 'Hệ thống Van tim (Van 2 lá, 3 lá & Van tổ chim)',
        tag: 'Đảm bảo máu chảy một chiều',
        role: 'Đóng mở nhịp nhàng theo chu kỳ co bóp của tim, đảm bảo máu chỉ chảy theo một chiều nhất định (Nhĩ -> Thất -> Động mạch).',
        fact: 'Tiếng đập "thình thịch" của tim mà ta nghe qua ống nghe chính là âm thanh do các van tim đóng lại tạo ra.'
      }
    }
  }
};

// ==================== CƠ SỞ DỮ LIỆU "THÁM TỬ BẮT LỖI AI" ====================
const detectiveCases = {
  'cell-wall': {
    title: 'Thành tế bào (Cell Wall)',
    aiStatement: '"Thành tế bào có ở tất cả các sinh vật sống gồm cả người, động vật và thực vật; chức năng chính của nó là trực tiếp quang hợp tạo ra khí oxy giúp cây lớn nhanh."',
    options: [
      { text: 'Thành tế bào thực vật cấu tạo từ Cellulose và giúp cố định hình dạng tế bào', isError: false },
      { text: 'Thành tế bào có ở cả cơ thể người và động vật, trực tiếp làm nhiệm vụ quang hợp', isError: true, explanation: 'Vạch trần cực chuẩn! Động vật và người KHÔNG có thành tế bào (chỉ có màng sinh chất mềm dẻo). Ngoài ra, quang hợp là nhiệm vụ của Lục lạp chứ không phải thành tế bào!' },
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
      { text: 'Không bào chứa dịch tế bào gồm nước, muối khoáng, chất dinh dưỡng và sắc tố', isError: false },
      { text: 'Không bào là túi rỗng không chứa gì giúp cây nhẹ đi để bay lơ lửng', isError: true, explanation: 'Chính xác! Không bào trung tâm chứa đầy dịch tế bào tạo áp suất trương nước giúp cành lá cứng cáp, chứ cây thực vật không thể bay lơ lửng!' },
      { text: 'Khi không bào xẹp lại do mất nước, cành lá cây sẽ bị héo rũ', isError: false }
    ]
  },
  'mitochondria': {
    title: 'Ti thể (Mitochondria)',
    aiStatement: '"Ti thể là cơ quan sản xuất khí oxy cho tế bào bằng cách hấp thụ bóng tối và chuyển hóa nước thành đường glucose."',
    options: [
      { text: 'Ti thể phân giải chất hữu cơ giải phóng năng lượng ATP cung cấp cho tế bào', isError: false },
      { text: 'Ti thể sản xuất khí oxy cho tế bào bằng cách hấp thụ bóng tối', isError: true, explanation: 'Chuẩn xác! Ti thể hô hấp tế bào: nó TIÊU THỤ oxy để đốt cháy glucose tạo ATP và thải ra CO2, chứ không phải sản xuất oxy bằng bóng tối!' },
      { text: 'Cả tế bào thực vật và động vật đều có ti thể để hô hấp tạo năng lượng', isError: false }
    ]
  },
  'cytoplasm': {
    title: 'Tế bào chất (Cytoplasm)',
    aiStatement: '"Tế bào chất là một khối đá cứng bất động giữ chặt các bào quan không cho dịch chuyển bất kỳ vị trí nào."',
    options: [
      { text: 'Tế bào chất là chất dịch keo bán lỏng chứa 70-80% nước', isError: false },
      { text: 'Tế bào chất là khối đá cứng bất động giữ chặt các bào quan', isError: true, explanation: 'Đúng rồi! Tế bào chất là chất keo bán lỏng và luôn chuyển động dòng để vận chuyển các chất dinh dưỡng bên trong tế bào!' },
      { text: 'Hầu hết các phản ứng hóa sinh của tế bào diễn ra tại tế bào chất', isError: false }
    ]
  },
  'membrane': {
    title: 'Màng sinh chất (Cell Membrane)',
    aiStatement: '"Màng sinh chất là bức tường bê tông kín mít ngăn cản 100% mọi chất không thể nào đi vào hoặc đi ra khỏi tế bào."',
    options: [
      { text: 'Màng sinh chất có tính bán thấm chọn lọc, kiểm soát các chất ra vào tế bào', isError: false },
      { text: 'Màng sinh chất là bức tường kín mít ngăn cản 100% mọi chất ra vào', isError: true, explanation: 'Vạch trần chính xác! Màng tế bào có tính bán thấm có chọn lọc (cho nước, oxy, chất dinh dưỡng đi qua và đẩy chất cặn bã ra ngoài), chứ không phải tường kín mít!' },
      { text: 'Màng sinh chất có cấu tạo từ lớp kép phospholipid và các phân tử protein', isError: false }
    ]
  },
  'golgi': {
    title: 'Bộ máy Golgi (Golgi Apparatus)',
    aiStatement: '"Bộ máy Golgi có chức năng thu gom rác thải và tự hủy diệt toàn bộ tế bào ngay khi tế bào vừa mới sinh ra."',
    options: [
      { text: 'Bộ máy Golgi tiếp nhận, biến đổi, đóng gói và phân phối protein đến nơi cần thiết', isError: false },
      { text: 'Bộ máy Golgi có chức năng tự hủy diệt toàn bộ tế bào ngay khi vừa sinh ra', isError: true, explanation: 'Rất chính xác! Bộ Golgi được ví như trung tâm bưu điện đóng gói và phân phối protein, không phải cơ quan tự hủy tế bào!' },
      { text: 'Các túi tiết từ bộ máy Golgi có thể dung hợp với màng sinh chất để đưa chất ra ngoài', isError: false }
    ]
  },
  'left-ventricle': {
    title: 'Tâm thất trái (Left Ventricle)',
    aiStatement: '"Tâm thất trái là khoang tim có lớp cơ mỏng nhất, chứa máu đỏ thẫm giàu CO2 để bơm trực tiếp lên hai lá phổi."',
    options: [
      { text: 'Tâm thất trái chứa máu đỏ tươi giàu Oxy (O2) nhận từ tâm nhĩ trái', isError: false },
      { text: 'Tâm thất trái có thành cơ mỏng nhất và chứa máu giàu CO2 bơm lên phổi', isError: true, explanation: 'Bắt lỗi xuất sắc! Tâm thất trái có thành cơ DÀY NHẤT để bơm máu đỏ tươi giàu O2 vào động mạch chủ đi nuôi toàn bộ cơ thể. Thất phải mới là khoang bơm máu lên phổi!' },
      { text: 'Tâm thất trái co bóp tống máu vào cung động mạch chủ với áp lực lớn', isError: false }
    ]
  },
  'right-ventricle': {
    title: 'Tâm thất phải (Right Ventricle)',
    aiStatement: '"Tâm thất phải co bóp tống máu giàu Oxy nuôi dưỡng não bộ và toàn bộ các chi trong cơ thể con người."',
    options: [
      { text: 'Tâm thất phải chứa máu đỏ thẫm giàu CO2 nhận từ tâm nhĩ phải', isError: false },
      { text: 'Tâm thất phải tống máu giàu Oxy nuôi dưỡng não bộ và toàn thân', isError: true, explanation: 'Chính xác! Tâm thất phải chỉ bơm máu giàu CO2 vào động mạch phổi để lên phổi trao đổi khí. Máu nuôi não và toàn thân là do Tâm thất trái phụ trách!' },
      { text: 'Thành cơ tâm thất phải mỏng hơn thành cơ tâm thất trái', isError: false }
    ]
  },
  'atria': {
    title: 'Tâm nhĩ (Atria)',
    aiStatement: '"Tâm nhĩ có lớp cơ tim dày gấp 10 lần tâm thất và là nơi tạo ra áp lực huyết áp cao nhất trong hệ tuần hoàn."',
    options: [
      { text: 'Tâm nhĩ phải nhận máu từ tĩnh mạch chủ, tâm nhĩ trái nhận máu từ tĩnh mạch phổi', isError: false },
      { text: 'Tâm nhĩ có thành cơ tim dày gấp 10 lần tâm thất để tạo huyết áp cao nhất', isError: true, explanation: 'Vạch trần cực chuẩn! Tâm nhĩ có thành cơ MỎNG vì chỉ làm nhiệm vụ tiếp nhận máu và đẩy máu xuống tâm thất ngay bên dưới. Tâm thất mới có cơ dày hơn!' },
      { text: 'Giữa tâm nhĩ và tâm thất có các van nhĩ - thất giúp máu chảy 1 chiều', isError: false }
    ]
  },
  'aorta': {
    title: 'Cung Động mạch chủ (Aorta)',
    aiStatement: '"Cung động mạch chủ xuất phát từ tâm thất phải và chỉ dẫn máu có chứa nhiều chất độc hại ra ngoài môi trường."',
    options: [
      { text: 'Động mạch chủ là mạch máu lớn nhất xuất phát từ tâm thất trái', isError: false },
      { text: 'Động mạch chủ xuất phát từ tâm thất phải và dẫn chất độc ra môi trường', isError: true, explanation: 'Tuyệt vời! Động mạch chủ xuất phát từ TÂM THẤT TRÁI, dẫn máu đỏ tươi giàu dưỡng chất và O2 đi nuôi toàn bộ cơ thể!' },
      { text: 'Gốc động mạch chủ có van tổ chim ngăn máu chảy ngược lại tâm thất', isError: false }
    ]
  },
  'pulmonary-artery': {
    title: 'Động mạch phổi (Pulmonary Artery)',
    aiStatement: '"Động mạch phổi dẫn máu đỏ tươi giàu oxy từ tim đi nuôi các ngón chân và bàn tay con người."',
    options: [
      { text: 'Động mạch phổi xuất phát từ tâm thất phải dẫn máu đến 2 lá phổi', isError: false },
      { text: 'Động mạch phổi dẫn máu đỏ tươi giàu oxy đi nuôi ngón chân và bàn tay', isError: true, explanation: 'Chính xác! Động mạch phổi là động mạch duy nhất dẫn máu ĐỎ THẪM giàu CO2 lên 2 lá phổi để nhả CO2 và nhận O2!' },
      { text: 'Tại mao mạch phổi, máu trao đổi khí để biến thành máu đỏ tươi giàu O2', isError: false }
    ]
  },
  'valves': {
    title: 'Hệ thống Van tim (Heart Valves)',
    aiStatement: '"Các van tim luôn mở toang tự do theo cả hai chiều để máu tùy ý chảy lộn xộn giữa các buồng tim."',
    options: [
      { text: 'Van 3 lá nằm giữa tâm nhĩ phải và tâm thất phải', isError: false },
      { text: 'Các van tim luôn mở toang tự do theo cả hai chiều để máu chảy lộn xộn', isError: true, explanation: 'Quá chuẩn! Van tim hoạt động như van một chiều nghiêm ngặt: chỉ cho máu chảy theo một chiều (Nhĩ -> Thất -> Động mạch) và đóng chặt khi tâm thất co để ngăn máu chảy ngược!' },
      { text: 'Tiếng đập của tim là do các van tim đóng lại tạo nên', isError: false }
    ]
  }
};

let currentDetectiveCaseKey = 'chloroplast';
let currentDetectiveAnswered = false;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo mô hình Lab mặc định
  renderLabCanvas('plant-cell');
  selectOrganelle('chloroplast');
  
  // 2. Kiểm tra phiên đăng nhập và tải dữ liệu từ Backend
  checkAuthAndInitData();
});

// ==================== NAVIGATION TABS (TINH GIẢN CHỈ 2 PHÂN HỆ) ====================
function switchTab(tabId) {
  // Kiểm tra phân quyền: Chỉ Giáo viên/Admin mới được vào Tab Quản Trị
  if (tabId === 'admin') {
    const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');
    if (!isAdmin) {
      console.warn('Truy cập bị từ chối: Bảng Quản trị chỉ dành cho Giáo viên!');
      tabId = 'lab360';
    }
  }

  // Đảm bảo chỉ nhận 3 tab hợp lệ: 'lab360', 'ecoplanet', 'admin'
  if (!['lab360', 'ecoplanet', 'admin'].includes(tabId)) {
    tabId = 'lab360';
  }

  state.activeTab = tabId;
  
  // Ẩn tất cả các tab
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.add('hidden');
  });

  // Hiển thị tab được chọn
  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // Cập nhật trạng thái active cho menu
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Tải dữ liệu tương ứng
  if (tabId === 'ecoplanet') {
    fetchEcoLogs();
    fetchLeaderboard(state.leaderboardGrade);
  }

  if (tabId === 'admin') {
    loadAdminData();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== AUTHENTICATION & HEADER ====================
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

async function checkAuthAndInitData() {
  if (state.user && (state.user.username === 'admin' || state.user.role === 'teacher')) {
    state.user.role = 'teacher';
    localStorage.setItem('smartbio_user', JSON.stringify(state.user));
  }

  updateAuthUI();

  if (state.token) {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          state.user = data.user;
          state.detectivePoints = data.user.detective_score || 0;
          if (state.user.username === 'admin') state.user.role = 'teacher';
          localStorage.setItem('smartbio_user', JSON.stringify(state.user));
        }
      } else {
        handleLogout(false);
      }
    } catch (e) {
      console.warn('Không thể kết nối máy chủ backend để xác thực:', e);
    }
  }

  updateAuthUI();
  updateDetectiveHUD();
  fetchEcoLogs();
  fetchLeaderboard(state.leaderboardGrade);
}

function updateAuthUI() {
  const loggedOutBox = document.getElementById('user-logged-out');
  const loggedInBox = document.getElementById('user-logged-in');
  const navAdmin = document.getElementById('nav-admin');
  const adminTopBanner = document.getElementById('admin-top-banner');
  const userPill = document.getElementById('user-pill-container');
  const avatarInitials = document.getElementById('user-avatar-initials');

  const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');

  if (state.user && state.token) {
    loggedOutBox.classList.add('hidden');
    loggedInBox.classList.remove('hidden');
    loggedInBox.classList.add('flex');

    const initials = getInitials(state.user.full_name || 'GV');
    if (avatarInitials) avatarInitials.textContent = initials;
    document.getElementById('user-display-name').textContent = state.user.full_name || state.user.username;

    if (isAdmin) {
      state.user.role = 'teacher';
      document.getElementById('user-display-grade').innerHTML = '<span class="text-rose-700 font-extrabold flex items-center gap-1"><i class="fa-solid fa-crown text-[10px] text-amber-500"></i> Giáo viên KHTN</span>';
      
      if (navAdmin) {
        navAdmin.classList.remove('hidden');
        navAdmin.classList.add('inline-flex');
      }

      if (adminTopBanner) adminTopBanner.classList.remove('hidden');

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
      if (adminTopBanner) adminTopBanner.classList.add('hidden');

      if (userPill) {
        userPill.className = "flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 transition-all";
      }
      if (avatarInitials) {
        avatarInitials.className = "h-7 w-7 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm ring-2 ring-emerald-200";
      }

      // Khóa tab quản trị đối với học sinh
      const tabAdminEl = document.getElementById('tab-admin');
      if (tabAdminEl) tabAdminEl.classList.add('hidden');
      if (state.activeTab === 'admin') {
        switchTab('lab360');
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
    if (adminTopBanner) adminTopBanner.classList.add('hidden');

    const tabAdminEl = document.getElementById('tab-admin');
    if (tabAdminEl) tabAdminEl.classList.add('hidden');
    if (state.activeTab === 'admin') {
      switchTab('lab360');
    }
    renderProfileBoxGuest();
  }
}

function handleUserPillClick() {
  const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');
  if (isAdmin) {
    switchTab('admin');
  } else {
    switchTab('ecoplanet');
  }
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateDetectiveHUD() {
  const hud = document.getElementById('hud-detective-score');
  if (hud) {
    hud.textContent = `${state.detectivePoints} đ`;
  }
}

function renderProfileBox() {
  const box = document.getElementById('profile-content-box');
  if (!box) return;
  const user = state.user;
  const isAdmin = user.role === 'teacher' || user.role === 'admin' || user.username === 'admin';
  const stats = user.stats || { detective_score: state.detectivePoints, detective_cases: 0, eco_actions: 0, total_green_points: state.detectivePoints };

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
      <div class="grid grid-cols-3 gap-2 pt-2">
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
          <span class="text-lg font-black text-amber-400 block">${stats.detective_score || 0}</span>
          <span class="text-[10px] text-slate-400">Điểm Thám tử</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
          <span class="text-lg font-black text-emerald-400 block">${stats.eco_actions || 0}</span>
          <span class="text-[10px] text-slate-400">Hành động Xanh</span>
        </div>
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
          <span class="text-lg font-black text-teal-300 block">${(stats.detective_score || 0) + (stats.eco_actions || 0) * 10}</span>
          <span class="text-[10px] text-slate-400">Tổng điểm</span>
        </div>
      </div>
    `}
  `;
}

function renderProfileBoxGuest() {
  const box = document.getElementById('profile-content-box');
  if (!box) return;
  box.innerHTML = `
    <div class="p-4 bg-white/5 border border-white/10 rounded-2xl text-center space-y-2">
      <i class="fa-solid fa-lock text-emerald-400 text-2xl"></i>
      <p class="text-xs text-slate-300">Đăng nhập tài khoản để tích lũy điểm Thám tử Lab và lưu bài viết Hành tinh Xanh!</p>
      <button onclick="openAuthModal('login')" class="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all">
        Đăng nhập ngay
      </button>
    </div>
  `;
}

// ==================== AUTH MODAL ACTIONS ====================
function openAuthModal(tab = 'login') {
  setAuthTab(tab);
  document.getElementById('auth-modal').classList.remove('hidden');
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
    btnRegister.className = 'py-2 rounded-xl bg-white text-emerald-800 shadow-sm transition-all';
    btnLogin.className = 'py-2 rounded-xl text-slate-500 hover:text-slate-800 transition-all';
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

function showAuthAlert(message, isSuccess) {
  const alert = document.getElementById('auth-alert');
  alert.className = `p-3 rounded-xl text-xs font-semibold leading-tight ${
    isSuccess ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
  }`;
  alert.innerHTML = message;
  alert.classList.remove('hidden');
}

function hideAuthAlert() {
  const alert = document.getElementById('auth-alert');
  if (alert) alert.classList.add('hidden');
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
      state.detectivePoints = data.user.detective_score || 0;
      const isAdmin = data.user.role === 'teacher' || data.user.role === 'admin' || data.user.username === 'admin';
      if (isAdmin) state.user.role = 'teacher';
      
      localStorage.setItem('smartbio_token', data.token);
      localStorage.setItem('smartbio_user', JSON.stringify(state.user));

      showAuthAlert(isAdmin ? '👑 Đăng nhập thành công với quyền Giáo viên Quản trị!' : '🎉 ' + data.message, true);

      setTimeout(() => {
        closeAuthModal();
        checkAuthAndInitData();
        if (isAdmin) switchTab('admin');
        else switchTab('lab360');
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
      state.detectivePoints = 0;
      localStorage.setItem('smartbio_token', data.token);
      localStorage.setItem('smartbio_user', JSON.stringify(data.user));

      showAuthAlert('🎉 ' + data.message, true);
      setTimeout(() => {
        closeAuthModal();
        checkAuthAndInitData();
        switchTab('lab360');
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
    } catch (e) {}
  }
  state.token = '';
  state.user = null;
  state.detectivePoints = 0;
  localStorage.removeItem('smartbio_token');
  localStorage.removeItem('smartbio_user');

  const tabAdmin = document.getElementById('tab-admin');
  if (tabAdmin) tabAdmin.classList.add('hidden');
  const tbody = document.getElementById('admin-students-tbody');
  if (tbody) tbody.innerHTML = '';

  switchTab('lab360');
  updateAuthUI();
  updateDetectiveHUD();
}

// ==================== PHÂN HỆ 1: PHÒNG LAB 360° & BÓC TÁCH ====================
function setLabModel(modelId) {
  state.currentLabModel = modelId;
  state.currentZoom = 1;

  // Cập nhật nút chọn mô hình
  document.querySelectorAll('.lab-select-btn').forEach(b => {
    b.className = 'lab-select-btn px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
  });

  const activeBtn = document.getElementById(`btn-model-${modelId === 'plant-cell' ? 'plant' : modelId === 'animal-cell' ? 'animal' : 'heart'}`);
  if (activeBtn) {
    activeBtn.className = 'lab-select-btn active px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 bg-emerald-600 text-white border-emerald-600 shadow-sm';
  }

  // Cập nhật tiêu đề canvas
  const data = labData[modelId];
  document.getElementById('canvas-model-title').textContent = data.title;
  document.getElementById('organelle-grade-tag').textContent = data.grade;

  // Cập nhật tiêu đề bảng phân tích
  const inspectorTitle = document.getElementById('inspector-title');
  const heartBtn = document.getElementById('btn-heart-flow');
  if (modelId === 'heart') {
    inspectorTitle.textContent = 'CHI TIẾT CẤU TẠO CƠ QUAN';
    if (heartBtn) heartBtn.classList.remove('hidden');
  } else {
    inspectorTitle.textContent = 'BẢNG PHÂN TÍCH BÀO QUAN';
    if (heartBtn) heartBtn.classList.add('hidden');
  }

  renderLabCanvas(modelId);

  // Chọn bộ phận đầu tiên
  const firstKey = Object.keys(data.organelles)[0];
  selectOrganelle(firstKey);
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
    const beatingClass = state.isHeartBeating ? 'heart-beating-active' : '';
    const particlesDisplay = state.isHeartBeating ? 'inline' : 'none';

    container.innerHTML = `
      <svg id="interactive-lab-svg" viewBox="0 0 540 380" class="w-full h-full max-h-[350px] drop-shadow-2xl ${beatingClass}">
        <defs>
          <linearGradient id="o2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff4d4d"/>
            <stop offset="60%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>
          <linearGradient id="co2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="60%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
          <linearGradient id="paGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#60a5fa"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
        </defs>

        <!-- 1. Tĩnh mạch chủ -->
        <g id="svg-vena-cava" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <path d="M 150,30 L 150,130" stroke="#0284c7" stroke-width="26" stroke-linecap="round" fill="none"/>
          <text x="100" y="45" fill="#7dd3fc" font-size="10" font-weight="bold">TM Chủ trên</text>
          <path d="M 175,270 L 175,340" stroke="#0284c7" stroke-width="24" stroke-linecap="round" fill="none"/>
          <text x="105" y="340" fill="#7dd3fc" font-size="10" font-weight="bold">TM Chủ dưới</text>
        </g>

        <!-- 2. Tĩnh mạch phổi -->
        <g id="svg-pulmonary-veins" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <path d="M 400,135 L 340,145" stroke="#ef4444" stroke-width="16" stroke-linecap="round" fill="none"/>
          <path d="M 410,165 L 350,170" stroke="#ef4444" stroke-width="16" stroke-linecap="round" fill="none"/>
          <text x="415" y="155" fill="#fca5a5" font-size="10" font-weight="bold">TM Phổi</text>
        </g>

        <!-- 3. Cung Động mạch chủ -->
        <g id="svg-aorta" class="organelle-interactive" onclick="selectOrganelle('aorta')">
          <path d="M 270,180 C 270,80 340,35 375,85 L 385,150" stroke="url(#o2Grad)" stroke-width="28" stroke-linecap="round" fill="none"/>
          <path d="M 315,50 L 315,22" stroke="#ef4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <path d="M 335,46 L 342,18" stroke="#ef4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <path d="M 355,54 L 370,22" stroke="#ef4444" stroke-width="8" stroke-linecap="round" fill="none"/>
          <text x="310" y="15" fill="#fecaca" font-size="10" font-weight="bold">Cung ĐM Chủ</text>
        </g>

        <!-- 4. Động mạch phổi -->
        <g id="svg-pulmonary-artery" class="organelle-interactive" onclick="selectOrganelle('pulmonary-artery')">
          <path d="M 240,190 C 240,140 230,105 220,90" stroke="url(#paGrad)" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M 220,90 C 180,85 140,90 120,95" stroke="url(#paGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>
          <path d="M 225,90 C 270,85 305,92 320,100" stroke="url(#paGrad)" stroke-width="18" stroke-linecap="round" fill="none"/>
          <text x="110" y="80" fill="#93c5fd" font-size="10" font-weight="bold">ĐM Phổi</text>
        </g>

        <!-- 5. Khối cơ tim -->
        <path d="M 140,140 C 110,210 130,290 200,340 C 235,365 290,360 325,320 C 390,250 400,180 360,135 Z"
          fill="#4c0519" stroke="#9f1239" stroke-width="4"/>

        <!-- 6. Tâm nhĩ phải -->
        <g id="svg-atria-right" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <ellipse cx="170" cy="155" rx="38" ry="32" fill="url(#co2Grad)" stroke="#0369a1" stroke-width="2"/>
          <text x="140" y="158" fill="#ffffff" font-size="10" font-weight="bold">Tâm nhĩ phải</text>
        </g>

        <!-- 7. Tâm nhĩ trái -->
        <g id="svg-atria-left" class="organelle-interactive" onclick="selectOrganelle('atria')">
          <ellipse cx="325" cy="160" rx="36" ry="30" fill="url(#o2Grad)" stroke="#991b1b" stroke-width="2"/>
          <text x="295" y="163" fill="#ffffff" font-size="10" font-weight="bold">Tâm nhĩ trái</text>
        </g>

        <!-- 8. Vách liên thất -->
        <path d="M 240,195 C 242,240 245,290 250,345" stroke="#be123c" stroke-width="14" stroke-linecap="round" fill="none"/>
        <text x="220" y="360" fill="#fda4af" font-size="9" font-weight="bold">Vách liên thất</text>

        <!-- 9. Tâm thất phải -->
        <path id="svg-right-ventricle" class="organelle-interactive" onclick="selectOrganelle('right-ventricle')"
          d="M 160,195 C 150,235 175,295 230,315 L 230,195 Z"
          fill="url(#co2Grad)" stroke="#0284c7" stroke-width="3"/>
        <text x="165" y="260" fill="#e0f2fe" font-size="11" font-weight="bold">Tâm thất phải</text>
        <text x="175" y="275" fill="#bae6fd" font-size="9">(Thành mỏng)</text>

        <!-- 10. Tâm thất trái -->
        <path id="svg-left-ventricle" class="organelle-interactive" onclick="selectOrganelle('left-ventricle')"
          d="M 252,195 L 252,320 C 310,305 345,245 330,195 Z"
          fill="url(#o2Grad)" stroke="#991b1b" stroke-width="10"/>
        <text x="262" y="255" fill="#fee2e2" font-size="11" font-weight="bold">Tâm thất trái</text>
        <text x="265" y="270" fill="#fecaca" font-size="9">(Cơ tim rất dày)</text>

        <!-- 11. Van tim -->
        <g id="svg-valves" class="organelle-interactive" onclick="selectOrganelle('valves')">
          <line x1="165" y1="190" x2="210" y2="190" stroke="#fef08a" stroke-width="4" stroke-linecap="round"/>
          <text x="170" y="185" fill="#fef08a" font-size="9" font-weight="bold">Van 3 lá</text>
          <line x1="280" y1="190" x2="325" y2="190" stroke="#fef08a" stroke-width="4" stroke-linecap="round"/>
          <text x="285" y="185" fill="#fef08a" font-size="9" font-weight="bold">Van 2 lá</text>
        </g>

        <!-- Đường dẫn dòng chảy máu -->
        <path id="flow-path-o2" d="M 410,150 C 360,155 335,145 325,170 C 315,195 305,235 295,280 C 275,295 260,265 265,225 C 270,185 285,115 315,55 C 345,35 375,80 380,140" fill="none" stroke="transparent"/>
        <path id="flow-path-co2" d="M 150,45 L 160,135 C 165,160 180,175 190,205 C 200,245 195,290 185,290 C 170,290 180,245 205,205 C 225,170 235,130 225,95 L 125,92" fill="none" stroke="transparent"/>

        <!-- Hạt máu chuyển động -->
        <g id="blood-flow-particles" style="display:${particlesDisplay}">
          <circle r="5" fill="#ff4d4d" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="0s">
              <mpath href="#flow-path-o2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#ff4d4d" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="1.4s">
              <mpath href="#flow-path-o2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="3.0s" repeatCount="indefinite" begin="0s">
              <mpath href="#flow-path-co2"/>
            </animateMotion>
          </circle>
          <circle r="5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5">
            <animateMotion dur="3.0s" repeatCount="indefinite" begin="1.5s">
              <mpath href="#flow-path-co2"/>
            </animateMotion>
          </circle>
        </g>
      </svg>
    `;
  }
}

function selectOrganelle(organelleKey) {
  state.selectedOrganelle = organelleKey;
  currentDetectiveCaseKey = organelleKey;

  const currentData = labData[state.currentLabModel];
  if (!currentData || !currentData.organelles[organelleKey]) return;

  const item = currentData.organelles[organelleKey];
  const inspector = document.getElementById('inspector-content');

  // Hủy âm thanh đang phát trước đó
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
  }

  // Highlight SVG element
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
        <p class="font-bold text-slate-900 mb-1">Cấu trúc & Chức năng sinh học:</p>
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

function toggleHeartAnimation() {
  state.isHeartBeating = !state.isHeartBeating;
  const svg = document.getElementById('interactive-lab-svg');
  const particles = document.getElementById('blood-flow-particles');
  const btnText = document.getElementById('btn-heart-flow-text');

  if (svg) {
    if (state.isHeartBeating) svg.classList.add('heart-beating-active');
    else svg.classList.remove('heart-beating-active');
  }

  if (particles) {
    particles.style.display = state.isHeartBeating ? 'inline' : 'none';
  }

  if (btnText) {
    btnText.textContent = state.isHeartBeating ? 'Dòng máu: BẬT' : 'Dòng máu: TẮT';
  }
}

function zoomLab(factor) {
  state.currentZoom = Math.min(Math.max(state.currentZoom * factor, 0.7), 2.2);
  const svg = document.getElementById('interactive-lab-svg');
  if (svg) {
    svg.style.transform = `scale(${state.currentZoom})`;
    svg.style.transition = 'transform 0.25s ease-out';
  }
}

function resetLabView() {
  state.currentZoom = 1;
  const svg = document.getElementById('interactive-lab-svg');
  if (svg) {
    svg.style.transform = 'scale(1)';
  }
}

// ==================== WEB SPEECH API ====================
function speakCurrentOrganelle() {
  const currentData = labData[state.currentLabModel];
  if (!currentData || !state.selectedOrganelle) return;

  const item = currentData.organelles[state.selectedOrganelle];
  if (!('speechSynthesis' in window)) {
    alert('Trình duyệt của bạn chưa hỗ trợ tính năng đọc phát âm tự động.');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
    return;
  }

  const textToRead = `${item.name}. ${item.tag}. Chức năng: ${item.role}. Điều thú vị: ${item.fact}`;
  const utterance = new SpeechSynthesisUtterance(textToRead);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.95;

  utterance.onstart = () => updateSpeechUI(true);
  utterance.onend = () => updateSpeechUI(false);
  utterance.onerror = () => updateSpeechUI(false);

  window.speechSynthesis.speak(utterance);
}

function updateSpeechUI(isSpeaking) {
  const indicator = document.getElementById('speech-wave-indicator');
  const btn = document.getElementById('btn-speech');
  if (!btn) return;

  if (isSpeaking) {
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.classList.add('flex');
    }
    btn.innerHTML = '<i class="fa-solid fa-stop text-xs text-rose-600"></i>';
    btn.className = 'w-8 h-8 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 flex items-center justify-center transition-all shadow-sm';
  } else {
    if (indicator) {
      indicator.classList.add('hidden');
      indicator.classList.remove('flex');
    }
    btn.innerHTML = '<i class="fa-solid fa-volume-high text-xs"></i>';
    btn.className = 'w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-all shadow-sm';
  }
}

// ==================== TÍNH NĂNG TRỌNG TÂM: THÁM TỬ BẮT LỖI AI ====================
function openDetectiveModal(organelleKey) {
  const key = organelleKey || state.selectedOrganelle || 'chloroplast';
  currentDetectiveCaseKey = key;
  currentDetectiveAnswered = false;

  const caseData = detectiveCases[key] || detectiveCases['chloroplast'];

  document.getElementById('detective-modal-title').textContent = `Thám tử bắt lỗi: ${caseData.title}`;
  document.getElementById('detective-ai-statement').textContent = caseData.aiStatement;

  const feedbackBox = document.getElementById('detective-feedback');
  feedbackBox.classList.add('hidden');
  feedbackBox.innerHTML = '';

  const optionsContainer = document.getElementById('detective-options');
  optionsContainer.innerHTML = '';

  caseData.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-xs text-slate-700 transition-all flex items-start gap-2.5';
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
    updateDetectiveHUD();

    btnElement.className = 'w-full text-left p-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-bold text-xs flex items-start gap-2.5';
    btnElement.querySelector('span:first-child').className = 'w-5 h-5 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5';

    feedbackBox.className = 'p-4 rounded-2xl text-xs leading-relaxed space-y-1.5 bg-emerald-50 border border-emerald-200 text-emerald-950 animate-fadeIn';
    feedbackBox.innerHTML = `
      <div class="flex items-center gap-2 text-emerald-800 font-black text-sm">
        <span>🎉 VẠCH TRẦN LỖI SAI AI THÀNH CÔNG!</span>
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">+10 Điểm Thám tử</span>
      </div>
      <p class="mt-1">${selectedOpt.explanation}</p>
    `;

    // Đồng bộ điểm lên Backend nếu đã đăng nhập
    if (state.token) {
      try {
        const res = await fetch('/api/lab/detective/submit', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            organelle_key: currentDetectiveCaseKey,
            case_title: `Bắt lỗi: ${caseData.title}`,
            points: 10
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.detective_score) {
            state.detectivePoints = data.detective_score;
            updateDetectiveHUD();
          }
        }
      } catch (e) {
        console.warn('Lỗi khi đồng bộ điểm thám tử lên máy chủ:', e);
      }
    }
  } else {
    btnElement.className = 'w-full text-left p-3.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5';
    feedbackBox.className = 'p-3 rounded-xl text-xs leading-relaxed bg-amber-50 border border-amber-200 text-amber-900 animate-fadeIn';
    feedbackBox.innerHTML = `
      <strong>⚠️ Nhận định này AI nói ĐÚNG rồi em nhé!</strong>
      <p>Em hãy đọc kỹ lại các nhận định còn lại để tìm xem chi tiết nào chứa lỗi sai ngụy biện sinh học.</p>
    `;
  }
}

// ==================== PHÂN HỆ 2: HÀNH TINH XANH (ECO TRACKER) ====================
async function fetchEcoLogs() {
  const container = document.getElementById('eco-logs-list');
  if (!container) return;

  try {
    const res = await fetch('/api/eco/logs');
    if (res.ok) {
      const data = await res.json();
      state.ecoLogs = data.logs || [];
      renderEcoLogs(state.ecoLogs);
      return;
    }
  } catch (e) {
    console.warn('Lỗi khi fetch eco logs từ backend, dùng dữ liệu mẫu.');
  }

  // Dữ liệu mẫu fallback
  renderEcoLogs([
    { id: 1, action_type: 'tree', title: 'Ươm 5 chậu cây mầm phục vụ bài học Quang hợp', description: 'Chi đội 8A1 đã chuẩn bị các chậu cây trầu bà và dương xỉ để quan sát thoát hơi nước qua khí khổng.', author_name: 'Nguyễn Bình An', author_grade: 8, author_class: '8A1', created_at: '2026-10-28 14:30' },
    { id: 2, action_type: 'clean', title: 'Phân loại rác thải nhựa tại hành lang trường học', description: 'Thu gom được 30 vỏ chai nhựa bỏ vào thùng tái chế của trường.', author_name: 'Lê Quang Minh', author_grade: 9, author_class: '9A2', created_at: '2026-10-28 11:15' },
    { id: 3, action_type: 'nature', title: 'Quan sát đa dạng sinh học vườn trường', description: 'Ghi chép tập tính tìm mật của bướm phượng và ong mật ở bồn hoa mười giờ.', author_name: 'Trần Khánh Linh', author_grade: 7, author_class: '7A3', created_at: '2026-10-28 09:40' }
  ]);
}

function renderEcoLogs(logs) {
  const container = document.getElementById('eco-logs-list');
  if (!container) return;
  container.innerHTML = '';

  if (!logs || logs.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-400 italic py-6 text-center">Chưa có bài nhật ký nào. Hãy là người đầu tiên ghi nhận hành động xanh!</p>';
    return;
  }

  logs.forEach(item => {
    let typeBadge = '🌱 Cây xanh';
    let badgeColor = 'bg-emerald-100 text-emerald-800';
    if (item.action_type === 'clean') { typeBadge = '♻️ Tái chế'; badgeColor = 'bg-teal-100 text-teal-800'; }
    else if (item.action_type === 'energy') { typeBadge = '💡 Tiết kiệm điện/nước'; badgeColor = 'bg-amber-100 text-amber-800'; }
    else if (item.action_type === 'nature') { typeBadge = '🦋 Đa dạng sinh học'; badgeColor = 'bg-indigo-100 text-indigo-800'; }

    const div = document.createElement('div');
    div.className = 'p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 hover:bg-slate-100/70 transition-all';
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="px-2 py-0.5 text-[10px] font-bold rounded-md ${badgeColor}">${typeBadge}</span>
        <span class="text-[10px] text-slate-400">${item.created_at || 'Vừa xong'}</span>
      </div>
      <h4 class="font-bold text-xs sm:text-sm text-slate-800 leading-snug">${escapeHtml(item.title)}</h4>
      <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(item.description)}</p>
      <div class="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60">
        <span class="font-semibold text-emerald-700"><i class="fa-solid fa-user-pen mr-1"></i> ${escapeHtml(item.author_name || 'Học sinh')} (Khối ${item.author_grade} ${item.author_class ? '• ' + escapeHtml(item.author_class) : ''})</span>
        <span class="text-emerald-600 font-bold">+10 Điểm Xanh</span>
      </div>
    `;
    container.appendChild(div);
  });
}

async function addEcoLog() {
  const type = document.getElementById('eco-action-type').value;
  const title = document.getElementById('eco-action-title').value.trim();
  const desc = document.getElementById('eco-action-desc').value.trim();

  if (!title || !desc) {
    alert('Vui lòng nhập đầy đủ tiêu đề và mô tả hành động môi trường của em.');
    return;
  }

  if (state.token) {
    try {
      const res = await fetch('/api/eco/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action_type: type, title, description: desc })
      });
      if (res.ok) {
        document.getElementById('eco-action-title').value = '';
        document.getElementById('eco-action-desc').value = '';
        alert('🎉 Đã ghi nhận hành động xanh vào sổ tay cộng đồng!');
        fetchEcoLogs();
        fetchLeaderboard(state.leaderboardGrade);
        return;
      }
    } catch (e) {
      console.warn('Lỗi khi gửi eco log lên máy chủ:', e);
    }
  }

  // Lưu cục bộ nếu chưa đăng nhập
  const newLog = {
    id: Date.now(),
    action_type: type,
    title,
    description: desc,
    author_name: state.user ? state.user.full_name : 'Học sinh SmartBio',
    author_grade: state.user ? state.user.grade : 7,
    author_class: state.user ? state.user.classroom : '',
    created_at: 'Vừa xong'
  };
  state.ecoLogs.unshift(newLog);
  renderEcoLogs(state.ecoLogs);
  document.getElementById('eco-action-title').value = '';
  document.getElementById('eco-action-desc').value = '';
  alert('🎉 Đã lưu hành động xanh vào sổ tay cộng đồng!');
}

// ==================== BẢNG XẾP HẠNG (LEADERBOARD) ====================
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
    console.warn('Lỗi khi fetch leaderboard từ backend, dùng fallback.');
  }

  renderLeaderboardRows([
    { rank: 1, full_name: 'Nguyễn Bình An', grade: 8, classroom: '8A1', detective_score: 50, eco_count: 5, total_points: 100 },
    { rank: 2, full_name: 'Lê Quang Minh', grade: 9, classroom: '9A2', detective_score: 50, eco_count: 4, total_points: 90 },
    { rank: 3, full_name: 'Trần Khánh Linh', grade: 7, classroom: '7A3', detective_score: 40, eco_count: 4, total_points: 80 },
    { rank: 4, full_name: 'Hoàng Ngọc Mai', grade: 6, classroom: '6B', detective_score: 30, eco_count: 3, total_points: 60 },
    { rank: 5, full_name: 'Phạm Đăng Khôi', grade: 8, classroom: '8A4', detective_score: 30, eco_count: 2, total_points: 50 }
  ]);
}

function renderLeaderboardRows(list) {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 italic">Chưa có dữ liệu xếp hạng của khối này.</td></tr>`;
    return;
  }

  list.forEach(item => {
    let rankBadge = `<span class="font-bold text-slate-500">${item.rank}</span>`;
    if (item.rank === 1) rankBadge = `🥇`;
    else if (item.rank === 2) rankBadge = `🥈`;
    else if (item.rank === 3) rankBadge = `🥉`;

    const isCurrent = state.user && (state.user.id === item.id || state.user.full_name === item.full_name);
    const rowClass = isCurrent ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-slate-50/60';

    const tr = document.createElement('tr');
    tr.className = `transition-colors ${rowClass}`;
    tr.innerHTML = `
      <td class="py-2.5 px-3 text-center">${rankBadge}</td>
      <td class="py-2.5 px-3">
        <span class="font-bold text-slate-800">${escapeHtml(item.full_name)}</span>
        ${isCurrent ? '<span class="ml-1 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">Em</span>' : ''}
      </td>
      <td class="py-2.5 px-3 text-slate-500">Khối ${item.grade} ${item.classroom ? '(' + escapeHtml(item.classroom) + ')' : ''}</td>
      <td class="py-2.5 px-3 text-center font-bold text-amber-600">${item.detective_score || 0} đ</td>
      <td class="py-2.5 px-3 text-center font-bold text-emerald-600">${item.eco_count || 0} bài</td>
      <td class="py-2.5 px-3 text-center font-black text-emerald-800 text-sm">${item.total_points || ((item.detective_score || 0) + (item.eco_count || 0) * 10)} đ</td>
    `;
    tbody.appendChild(tr);
  });
}

function changeLeaderboardGrade(grade, btnElement) {
  document.querySelectorAll('#leaderboard-grade-filter button').forEach(b => {
    b.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900';
  });
  if (btnElement) {
    btnElement.className = 'px-2.5 py-1 text-xs font-bold rounded-lg bg-white shadow-sm text-emerald-700';
  }
  fetchLeaderboard(grade);
}

// ==================== BẢNG QUẢN TRỊ VIÊN / GIÁO VIÊN ====================
async function loadAdminData() {
  const isAdmin = state.user && (state.user.role === 'teacher' || state.user.role === 'admin' || state.user.username === 'admin');
  if (!isAdmin || !state.token) {
    const tabAdmin = document.getElementById('tab-admin');
    if (tabAdmin) tabAdmin.classList.add('hidden');
    switchTab('lab360');
    return;
  }

  try {
    const resOverview = await fetch('/api/admin/overview', { headers: getAuthHeaders() });
    if (resOverview.status === 403 || resOverview.status === 401) {
      switchTab('lab360');
      return;
    }
    if (resOverview.ok) {
      const data = await resOverview.json();
      if (data.success && data.overview) {
        document.getElementById('admin-stat-students').textContent = data.overview.total_students;
        document.getElementById('admin-stat-quizzes').textContent = data.overview.total_detective_challenges;
        document.getElementById('admin-stat-eco').textContent = data.overview.total_eco_actions;
        document.getElementById('admin-stat-avg').textContent = data.overview.average_detective_score.toFixed(1);
      }
    }

    await fetchAdminStudents();
    await fetchAdminEcoLogs();
  } catch (err) {
    console.warn('Lỗi khi tải dữ liệu quản trị viên:', err);
  }
}

function switchAdminSubtab(tabName) {
  const btnStudents = document.getElementById('admin-subtab-btn-students');
  const btnEco = document.getElementById('admin-subtab-btn-eco');
  const viewStudents = document.getElementById('admin-view-students');
  const viewEco = document.getElementById('admin-view-eco');

  [btnStudents, btnEco].forEach(b => {
    b.className = 'px-4 py-2.5 text-xs font-semibold rounded-t-xl text-slate-500 hover:text-slate-800 transition-all flex items-center gap-2';
  });

  [viewStudents, viewEco].forEach(v => v.classList.add('hidden'));

  if (tabName === 'students') {
    btnStudents.className = 'px-4 py-2.5 text-xs font-bold rounded-t-xl bg-white text-rose-700 border-t-2 border-rose-600 shadow-sm transition-all flex items-center gap-2';
    viewStudents.classList.remove('hidden');
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
  tbody.innerHTML = '';

  if (!students || students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-400 italic">Không tìm thấy học sinh nào phù hợp.</td></tr>`;
    return;
  }

  students.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-3 text-slate-400 font-medium">${idx + 1}</td>
      <td class="py-3 px-3">
        <div class="font-bold text-slate-800">${escapeHtml(s.full_name)}</div>
        <div class="text-[10px] text-slate-400 font-mono">@${escapeHtml(s.username)}</div>
      </td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded-md font-semibold text-xs bg-slate-100 text-slate-700">Khối ${s.grade}</span>
      </td>
      <td class="py-3 px-3 text-slate-500 font-mono">${escapeHtml(s.classroom || 'Chưa xếp')}</td>
      <td class="py-3 px-3 text-center font-bold text-amber-600">${s.detective_score || 0} đ</td>
      <td class="py-3 px-3 text-center">
        <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800">${s.eco_count || 0} 🌱</span>
      </td>
      <td class="py-3 px-3 text-slate-400 text-[11px]">${s.created_at ? s.created_at.substring(0, 10) : '2026-10-28'}</td>
      <td class="py-3 px-3 text-right space-x-1">
        <button onclick="resetStudentPassword(${s.id}, '${escapeHtml(s.full_name)}')" class="px-2 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition-all" title="Reset mật khẩu về 123456">
          <i class="fa-solid fa-key"></i> Reset MK
        </button>
        <button onclick="deleteStudent(${s.id}, '${escapeHtml(s.full_name)}')" class="px-2 py-1 text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all" title="Xóa học sinh này">
          <i class="fa-solid fa-trash"></i> Xóa
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterAdminStudents() {
  const q = document.getElementById('admin-search-student').value.trim().toLowerCase();
  const filtered = state.adminStudents.filter(s => {
    const matchGrade = (state.adminGradeFilter === 'all') || (String(s.grade) === String(state.adminGradeFilter));
    const matchText = s.full_name.toLowerCase().includes(q) || s.username.toLowerCase().includes(q);
    return matchGrade && matchText;
  });
  renderAdminStudents(filtered);
}

function setAdminStudentGradeFilter(grade, btn) {
  state.adminGradeFilter = grade;
  document.querySelectorAll('#admin-grade-filter button').forEach(b => {
    b.className = 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900';
  });
  if (btn) {
    btn.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-white shadow-sm text-rose-700';
  }
  filterAdminStudents();
}

async function resetStudentPassword(studentId, studentName) {
  if (!confirm(`Thầy/Cô có chắc chắn muốn đặt lại mật khẩu cho học sinh "${studentName}" về mặc định "123456" không?`)) return;

  try {
    const res = await fetch('/api/admin/students/reset-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: studentId, new_password: '123456' })
    });
    const data = await res.json();
    alert(data.message);
  } catch (e) {
    alert('Lỗi khi kết nối máy chủ reset mật khẩu.');
  }
}

async function deleteStudent(studentId, studentName) {
  if (!confirm(`CẢNH BÁO: Thầy/Cô có chắc chắn muốn xóa tài khoản "${studentName}" khỏi hệ thống không? Dữ liệu bài làm sẽ bị xóa vĩnh viễn.`)) return;

  try {
    const res = await fetch(`/api/admin/students/${studentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message);
    loadAdminData();
  } catch (e) {
    alert('Lỗi khi xóa học sinh.');
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
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">${l.action_type}</span>
          <span class="text-[10px] text-slate-400">${l.created_at || 'Vừa xong'}</span>
        </div>
        <h5 class="font-bold text-xs text-slate-800">${escapeHtml(l.title)}</h5>
        <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(l.description)}</p>
      </div>
      <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
        <span class="text-slate-500 font-semibold">Tác giả: <strong>${escapeHtml(l.author_name || 'Học sinh')}</strong> (Khối ${l.author_grade} ${l.author_class ? '• ' + escapeHtml(l.author_class) : ''})</span>
        <button onclick="deleteAdminEcoLog(${l.id})" class="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1">
          <i class="fa-solid fa-trash-can"></i> Xóa bài
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function deleteAdminEcoLog(logId) {
  if (!confirm('Thầy/Cô có chắc chắn muốn xóa bài viết nhật ký xanh này không?')) return;
  try {
    const res = await fetch(`/api/admin/eco-logs/${logId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    alert(data.message);
    fetchAdminEcoLogs();
    fetchEcoLogs();
  } catch (e) {
    alert('Lỗi khi xóa bài viết.');
  }
}

function exportAdminCsv() {
  const token = state.token;
  if (!token) {
    alert('Vui lòng đăng nhập quyền Giáo viên để tải báo cáo.');
    return;
  }
  window.open('/api/admin/export-csv?token=' + encodeURIComponent(token), '_blank');
}

function escapeHtml(string) {
  if (!string) return '';
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}
