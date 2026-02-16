// ===== CONFIG & CONSTANTS =====
const $ = (id) => document.getElementById(id);
const DB_KEY = 'careerVR_records';
const RIASEC_KEY = 'careerVR_current';
const VR_JOBS_KEY = 'careervr_jobs_v1';
const API_BASE = window.location.origin;

const colors = {
    R: '#ef4444',
    I: '#f59e0b',
    A: '#ec4899',
    S: '#10b981',
    E: '#f97316',
    C: '#3b82f6'
};
const names = {
    R: 'Thực tế (R)',
    I: 'Nghiên cứu (I)',
    A: 'Nghệ thuật (A)',
    S: 'Xã hội (S)',
    E: 'Quản lý (E)',
    C: 'Nghiệp vụ (C)'
};

// ===== AUTH STATE =====
const token = localStorage.getItem('access_token');
let currentUser = null;

// ===== AUTH FUNCTIONS =====
async function checkAuth() {
    const navAuth = $('navAuth');

    // If no token, show Login link
    if (!token) {
        if (navAuth) navAuth.innerHTML = '<a href="/login" class="nav-link" style="color: #4d7cff;">Login</a>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            currentUser = await res.json();
            if (navAuth) {
                navAuth.innerHTML = `
                    <span style="color: #9fb7ff; margin-right: 0.5rem; font-size: 0.9rem;">Hi, ${escapeHtml(currentUser.username)}</span>
                    <button onclick="logout()" class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border: 1px solid #4d7cff; color: #4d7cff;">Logout</button>
                `;
            }
            document.body.classList.add('is-logged-in');
            document.body.classList.add('is-logged-in');
            updateAdminUI();

            // Auto-fill logic
            if ($('questionsContainer')) autoFillTest();
            if ($('profileForm')) loadProfile();
            if ($('postsContainer')) updateCommunityProfileLock();
        } else {
            // Token expired or invalid
            logout();
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
}

function logout() {
    localStorage.removeItem('access_token');
    document.body.classList.remove('is-logged-in');
    document.body.classList.remove('is-admin');
    window.location.href = '/login';
}

async function handleLogin() {
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
        const res = await fetch(`${API_BASE}/api/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('access_token', data.access_token);
            window.location.href = '/test';
        } else {
            let msg = "Đăng nhập thất bại. Kiểm tra lại thông tin!";
            try {
                const err = await res.json();
                if (err && err.detail) msg += ` (${err.detail})`;
            } catch (_) { }
            alert(msg);
        }
    } catch (e) {
        alert("Lỗi kết nối server");
    }
}

async function handleRegister() {
    const username = $('regUsername').value.trim();
    const fullname = $('regFullname').value;
    const password = $('regPassword').value;

    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                full_name: fullname
            })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('access_token', data.access_token);
            window.location.href = '/test';
        } else {
            const err = await res.json();
            alert("Đăng ký thất bại: " + (err.detail || "Unknown error"));
        }
    } catch (e) {
        alert("Lỗi kết nối server");
    }
}

async function saveUserData(key, value) {
    if (!token) return;
    try {
        const body = {};
        body[key] = value;

        await fetch(`${API_BASE}/api/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
    } catch (e) { console.error("Save failed", e); }
}

async function loadUserData() {
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
    } catch (e) { console.error("Load failed", e); }
    return null;
}

const RIASEC_QUESTIONS = [
    // R – REALISTIC (1-4)
    { q: "Tôi thích sửa chữa, lắp ráp đồ đạc hoặc thiết bị.", r: "R" },
    { q: "Tôi hứng thú với các công việc cần vận động hoặc làm ngoài trời.", r: "R" },
    { q: "Tôi thích làm việc với công cụ, máy móc hơn là giấy tờ.", r: "R" },
    { q: "Tôi học tốt hơn khi được làm trực tiếp thay vì chỉ nghe giảng.", r: "R" },
    // I – INVESTIGATIVE (5-8)
    { q: "Tôi thích tìm hiểu nguyên nhân – kết quả của một vấn đề.", r: "I" },
    { q: "Tôi thích các môn học cần suy luận như Toán, Lý, Hóa.", r: "I" },
    { q: "Tôi thường đặt câu hỏi \"vì sao\" khi học kiến thức mới.", r: "I" },
    { q: "Tôi thích phân tích dữ liệu, thí nghiệm hoặc nghiên cứu.", r: "I" },
    // A – ARTISTIC (9-12)
    { q: "Tôi thích vẽ, viết, thiết kế hoặc sáng tạo nội dung.", r: "A" },
    { q: "Tôi không thích công việc quá khuôn mẫu, lặp lại.", r: "A" },
    { q: "Tôi thích thể hiện ý tưởng và cảm xúc cá nhân.", r: "A" },
    { q: "Tôi hứng thú với âm nhạc, mỹ thuật hoặc truyền thông.", r: "A" },
    // S – SOCIAL (13-16)
    { q: "Tôi thích giúp đỡ, hướng dẫn hoặc hỗ trợ người khác.", r: "S" },
    { q: "Tôi cảm thấy vui khi làm việc nhóm.", r: "S" },
    { q: "Tôi có xu hướng lắng nghe và chia sẻ với mọi người.", r: "S" },
    { q: "Tôi thích các công việc liên quan đến giáo dục, y tế hoặc xã hội.", r: "S" },
    // E – ENTERPRISING (17-20)
    { q: "Tôi thích lãnh đạo hoặc thuyết phục người khác.", r: "E" },
    { q: "Tôi hứng thú với kinh doanh, bán hàng hoặc tổ chức hoạt động.", r: "E" },
    { q: "Tôi tự tin khi trình bày ý kiến trước đám đông.", r: "E" },
    { q: "Tôi thích đặt mục tiêu và chinh phục kết quả.", r: "E" },
    // C – CONVENTIONAL (21-24)
    { q: "Tôi thích công việc rõ ràng, có quy trình cụ thể.", r: "C" },
    { q: "Tôi cẩn thận với số liệu, hồ sơ và giấy tờ.", r: "C" },
    { q: "Tôi thích làm việc có kế hoạch, thời gian biểu rõ ràng.", r: "C" },
    { q: "Tôi cảm thấy yên tâm khi mọi việc được sắp xếp gọn gàng.", r: "C" },
    // NĂNG LỰC & KỸ NĂNG (25-38)
    { q: "Tôi học tốt hơn khi được thực hành, thao tác trực tiếp.", r: "R" },
    { q: "Tôi học tốt các môn cần tư duy logic và phân tích.", r: "I" },
    { q: "Tôi sử dụng máy tính và phần mềm học tập một cách hiệu quả.", r: "E" },
    { q: "Tôi giao tiếp và trình bày ý kiến khá tự tin.", r: "S" },
    { q: "Tôi làm tốt các công việc cần thao tác tay hoặc kỹ thuật.", r: "R" },
    { q: "Tôi tiếp thu nhanh khi được quan sát và làm thử.", r: "R" },
    { q: "Tôi có khả năng phân tích vấn đề và tìm cách giải quyết.", r: "I" },
    { q: "Tôi thích các nhiệm vụ cần suy luận, tính toán.", r: "I" },
    { q: "Tôi có khả năng sáng tạo ý tưởng mới.", r: "A" },
    { q: "Tôi thường có cách làm riêng, không thích bị bó buộc.", r: "A" },
    { q: "Tôi có khả năng lắng nghe và hỗ trợ người khác.", r: "S" },
    { q: "Tôi cảm thấy thoải mái khi làm việc nhóm.", r: "S" },
    { q: "Tôi tự tin đưa ra ý kiến và dẫn dắt nhóm.", r: "E" },
    { q: "Tôi làm việc hiệu quả khi có kế hoạch rõ ràng.", r: "C" },
    // GIÁ TRỊ NGHỀ NGHIỆP (39-46)
    { q: "Tôi coi trọng việc nghề nghiệp mang lại thu nhập và cơ hội thăng tiến.", r: "E" },
    { q: "Tôi mong muốn công việc ổn định, lâu dài.", r: "C" },
    { q: "Tôi muốn nghề nghiệp có ích cho xã hội và cộng đồng.", r: "S" },
    { q: "Tôi coi trọng sự sáng tạo trong công việc.", r: "A" },
    { q: "Tôi muốn nghề nghiệp giúp tôi phát triển bản thân.", r: "I" },
    { q: "Tôi thích môi trường làm việc linh hoạt, không gò bó.", r: "A" },
    { q: "Tôi coi trọng việc không ngừng học hỏi và nâng cao kiến thức.", r: "C" },
    { q: "Tôi mong muốn công việc phản ánh giá trị cá nhân và có ý nghĩa.", r: "E" },
    // ĐIỀU KIỆN THỰC TẾ (47-50)
    { q: "Tôi sẵn sàng học tập dài hạn để theo đuổi nghề phù hợp.", r: "I" },
    { q: "Điều kiện tài chính gia đình cho phép tôi học tập có kế hoạch.", r: "C" },
    { q: "Gia đình ủng hộ và tôn trọng lựa chọn nghề nghiệp của tôi.", r: "S" },
    { q: "Tôi sẵn sàng lập kế hoạch cụ thể để theo đuổi nghề đã chọn.", r: "E" }
];

const MAJORS_DB = [
    // KỸ THUẬT – CÔNG NGHIỆP – CÔNG NGHỆ
    { name: "Kỹ sư Cơ khí", code: "R-I-C", group: "Kỹ thuật" },
    { name: "Kỹ sư Điện – Điện tử", code: "R-I-C", group: "Kỹ thuật" },
    { name: "Kỹ sư Tự động hóa", code: "R-I-C", group: "Kỹ thuật" },
    { name: "Kỹ sư Xây dựng", code: "R-I-C", group: "Kỹ thuật" },
    { name: "Kỹ sư Giao thông", code: "R-I-C", group: "Kỹ thuật" },
    { name: "Kỹ sư Môi trường", code: "I-R-S", group: "Kỹ thuật" },
    { name: "Kỹ thuật viên Cơ điện", code: "R-C-I", group: "Kỹ thuật" },
    { name: "Công nghệ vật liệu", code: "I-R-C", group: "Kỹ thuật" },
    { name: "Công nghệ ô tô", code: "R-I-C", group: "Kỹ thuật" },
    { name: "Công nghệ kỹ thuật nhiệt", code: "R-I-C", group: "Kỹ thuật" },

    // CNTT – CHUYỂN ĐỔI SỐ
    { name: "Công nghệ thông tin", code: "I-R-C", group: "CNTT" },
    { name: "Khoa học máy tính", code: "I-R-C", group: "CNTT" },
    { name: "Kỹ thuật phần mềm", code: "I-R-C", group: "CNTT" },
    { name: "An toàn thông tin", code: "I-R-C", group: "CNTT" },
    { name: "Trí tuệ nhân tạo", code: "I-R-C", group: "CNTT" },
    { name: "Khoa học dữ liệu", code: "I-R-C", group: "CNTT" },
    { name: "Lập trình viên", code: "I-R-C", group: "CNTT" },
    { name: "Quản trị mạng", code: "R-I-C", group: "CNTT" },
    { name: "Phân tích dữ liệu", code: "I-C-R", group: "CNTT" },
    { name: "Thiết kế UI/UX", code: "A-I-C", group: "CNTT" },

    // KHOA HỌC – Y SINH – MÔI TRƯỜNG
    { name: "Y đa khoa", code: "I-S-R", group: "Y Sinh" },
    { name: "Điều dưỡng", code: "S-I-R", group: "Y Sinh" },
    { name: "Dược học", code: "I-C-R", group: "Y Sinh" },
    { name: "Xét nghiệm y học", code: "I-R-C", group: "Y Sinh" },
    { name: "Công nghệ sinh học", code: "I-R-C", group: "Y Sinh" },
    { name: "Khoa học môi trường", code: "I-R-S", group: "Y Sinh" },
    { name: "Kỹ thuật y sinh", code: "I-R-C", group: "Y Sinh" },
    { name: "Thú y", code: "I-R-S", group: "Y Sinh" },
    { name: "Dinh dưỡng", code: "I-S-C", group: "Y Sinh" },
    { name: "Y tế công cộng", code: "S-I-C", group: "Y Sinh" },

    // GIÁO DỤC – XÃ HỘI
    { name: "Sư phạm Toán", code: "S-I-C", group: "Giáo dục" },
    { name: "Sư phạm Ngữ văn", code: "S-A-C", group: "Giáo dục" },
    { name: "Sư phạm Tiếng Anh", code: "S-A-C", group: "Giáo dục" },
    { name: "Giáo dục mầm non", code: "S-A-C", group: "Giáo dục" },
    { name: "Công tác xã hội", code: "S-I-A", group: "Xã hội" },
    { name: "Tâm lý học", code: "I-S-A", group: "Xã hội" },
    { name: "Xã hội học", code: "I-S-C", group: "Xã hội" },
    { name: "Quản lý giáo dục", code: "S-E-C", group: "Giáo dục" },
    { name: "Giáo dục đặc biệt", code: "S-I-A", group: "Giáo dục" },
    { name: "Hướng nghiệp – tham vấn", code: "S-I-A", group: "Giáo dục" },

    // NGHỆ THUẬT – TRUYỀN THÔNG
    { name: "Thiết kế đồ họa", code: "A-C-I", group: "Nghệ thuật" },
    { name: "Truyền thông đa phương tiện", code: "A-E-S", group: "Truyền thông" },
    { name: "Báo chí", code: "A-S-E", group: "Truyền thông" },
    { name: "Quan hệ công chúng", code: "E-S-A", group: "Truyền thông" },
    { name: "Marketing", code: "E-A-C", group: "Kinh tế" },
    { name: "Quảng cáo", code: "A-E-S", group: "Truyền thông" },
    { name: "Sản xuất phim", code: "A-E-S", group: "Nghệ thuật" },
    { name: "Nhiếp ảnh", code: "A-R-C", group: "Nghệ thuật" },
    { name: "Âm nhạc", code: "A-R-S", group: "Nghệ thuật" },
    { name: "Mỹ thuật ứng dụng", code: "A-C-R", group: "Nghệ thuật" },

    // KINH TẾ – QUẢN LÝ
    { name: "Quản trị kinh doanh", code: "E-C-S", group: "Kinh tế" },
    { name: "Tài chính – Ngân hàng", code: "C-E-I", group: "Kinh tế" },
    { name: "Kế toán", code: "C-I-E", group: "Kinh tế" },
    { name: "Kiểm toán", code: "C-I-E", group: "Kinh tế" },
    { name: "Thương mại điện tử", code: "E-I-C", group: "Kinh tế" },
    { name: "Logistics", code: "E-C-R", group: "Kinh tế" },
    { name: "Quản trị nhân sự", code: "S-E-C", group: "Quản lý" },
    { name: "Kinh doanh quốc tế", code: "E-S-C", group: "Kinh tế" },
    { name: "Quản trị khách sạn", code: "E-S-C", group: "Dịch vụ" },
    { name: "Quản trị du lịch", code: "E-S-A", group: "Dịch vụ" },

    // PHÁP LUẬT – HÀNH CHÍNH
    { name: "Luật", code: "I-E-C", group: "Pháp luật" },
    { name: "Luật kinh tế", code: "I-E-C", group: "Pháp luật" },
    { name: "Hành chính công", code: "C-S-E", group: "Hành chính" },
    { name: "Quản lý nhà nước", code: "E-C-S", group: "Hành chính" },
    { name: "Văn thư – lưu trữ", code: "C-R-S", group: "Hành chính" },
    { name: "Thanh tra", code: "I-E-C", group: "Pháp luật" },
    { name: "Quản lý đất đai", code: "C-R-I", group: "Quản lý" },
    { name: "Quản lý đô thị", code: "E-R-C", group: "Quản lý" },
    { name: "Công an", code: "R-S-E", group: "An ninh" },
    { name: "Quân đội", code: "R-S-E", group: "An ninh" },

    // NÔNG NGHIỆP – KINH TẾ XANH
    { name: "Nông học", code: "R-I-C", group: "Nông nghiệp" },
    { name: "Công nghệ thực phẩm", code: "I-R-C", group: "Công nghệ" },
    { name: "Lâm nghiệp", code: "R-I-C", group: "Nông nghiệp" },
    { name: "Nuôi trồng thủy sản", code: "R-I-C", group: "Nông nghiệp" },
    { name: "Kinh tế nông nghiệp", code: "E-I-C", group: "Kinh tế" },
    { name: "Quản lý tài nguyên", code: "I-R-C", group: "Quản lý" },
    { name: "Nông nghiệp công nghệ cao", code: "I-R-C", group: "Nông nghiệp" },
    { name: "Bảo vệ thực vật", code: "I-R-C", group: "Nông nghiệp" },
    { name: "Chăn nuôi", code: "R-I-C", group: "Nông nghiệp" },
    { name: "Phát triển nông thôn", code: "S-E-I", group: "Xã hội" },

    // ỨNG DỤNG – DỊCH VỤ
    { name: "Kỹ thuật viên điện", code: "R-C-I", group: "Kỹ thuật" },
    { name: "Kỹ thuật viên CNTT", code: "R-I-C", group: "CNTT" },
    { name: "Thiết kế nội thất", code: "A-R-C", group: "Nghệ thuật" },
    { name: "Thiết kế thời trang", code: "A-E-C", group: "Nghệ thuật" },
    { name: "Đầu bếp", code: "R-A-C", group: "Dịch vụ" },
    { name: "Chăm sóc sắc đẹp", code: "A-S-R", group: "Dịch vụ" },
    { name: "Hướng dẫn viên du lịch", code: "S-A-E", group: "Dịch vụ" },
    { name: "Quản lý bán lẻ", code: "E-C-S", group: "Kinh tế" },
    { name: "Sales kỹ thuật", code: "E-R-C", group: "Kinh tế" },
    { name: "Digital marketing", code: "E-A-C", group: "Truyền thông" },

    // NGÀNH MỚI – XU HƯỚNG
    { name: "Trí tuệ nhân tạo ứng dụng", code: "I-R-C", group: "CNTT" },
    { name: "Phân tích kinh doanh", code: "I-E-C", group: "Kinh tế" },
    { name: "Kinh tế số", code: "E-I-C", group: "Kinh tế" },
    { name: "Fintech", code: "I-E-C", group: "Kinh tế" },
    { name: "Edtech", code: "I-S-C", group: "Giáo dục" },
    { name: "Công nghệ giáo dục", code: "I-S-C", group: "Giáo dục" },
    { name: "Quản lý dự án", code: "E-C-S", group: "Quản lý" },
    { name: "Khởi nghiệp đổi mới sáng tạo", code: "E-A-I", group: "Kinh tế" },
    { name: "Kinh tế xanh", code: "I-E-R", group: "Kinh tế" },
    { name: "Phát triển bền vững", code: "I-S-R", group: "Xã hội" }
];

// ===== UTILS =====
const readDB = () => JSON.parse(localStorage.getItem(DB_KEY) || '[]');
const writeDB = (arr) => localStorage.setItem(DB_KEY, JSON.stringify(arr));
const readCurrent = () => JSON.parse(localStorage.getItem(RIASEC_KEY) || 'null');
const writeCurrent = (obj) => localStorage.setItem(RIASEC_KEY, JSON.stringify(obj));

// ===== PAGE NAVIGATION =====
function goPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');

    // Update nav active state if needed (optional)
    // Smooth scroll to top
    window.scrollTo(0, 0);

    // Specific page inits
    if (pageId === 'vr') {
        if (typeof fetchVRJobs === 'function') fetchVRJobs();
    }
}

// ===== VR IMPORT / EXPORT =====
async function downloadVRTemplate() {
    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs/template`);
        if (!res.ok) throw new Error("Download failed");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "vr_jobs_template.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        alert("Lỗi tải mẫu: " + e.message);
    }
}

async function handleVRImport(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Show loading
    const btn = input.previousElementSibling;
    const oldText = btn.innerText;
    btn.innerText = "⏳ Đang tải...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ Nhập thành công! ${data.imported} nghề mới.`);
            getVRJobs(); // Refresh
        } else {
            const err = await res.json();
            alert("❌ Lỗi: " + (err.detail || "Unknown"));
        }
    } catch (e) {
        alert("❌ Lỗi kết nối: " + e.message);
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
        input.value = ''; // Reset
    }
}

// ===== FUZZY MATCHING LOGIC (JS Version) =====
function calculateRelevance(studentCode, jobs) {
    // studentCode: ['R', 'I', 'E']
    if (!studentCode || studentCode.length === 0) return jobs;

    const primary = studentCode[0];
    const fullCode = studentCode.join('');

    return jobs.map(job => {
        let score = 0;
        const jCode = (job.riasec_code || "").replace(/-/g, '');
        const jArr = (job.riasec_code || "").split('-');

        if (!jCode) return { ...job, relevance: 0 };

        // 1. Primary Match (+50)
        if (jCode[0] === primary) score += 50;

        // 2. Full Match (+30)
        if (jCode === fullCode) score += 30;

        // 3. Partial Overlap (+10 per char)
        let overlap = 0;
        studentCode.forEach(c => {
            if (jArr.includes(c)) overlap++;
        });
        score += (overlap * 10);

        return { ...job, relevance: score };
    }).sort((a, b) => b.relevance - a.relevance);
}

// ===== INIT TEST PAGE =====
function initTest() {
    const container = $('questionsContainer');
    if (!container) return;
    container.innerHTML = '';

    RIASEC_QUESTIONS.forEach((q, idx) => {
        const html = `
    <div class="question-item">
      <label>Câu ${idx + 1}. ${q.q}</label>
      <div class="answer-options">
        ${[1, 2, 3, 4, 5].map(v => `
          <div class="answer-option">
            <input type="radio" name="q${idx}" value="${v}" id="q${idx}_${v}" onchange="updateProgress(); updateRealTimeScore()">
            <label for="q${idx}_${v}">${v}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
        container.innerHTML += html;
    });
}

// ===== PROGRESS TRACKING =====
function updateProgress() {
    const answered = document.querySelectorAll('input[type="radio"]:checked').length;
    const total = 50;
    const percent = (answered / total) * 100;

    $('progressFill').style.width = percent + '%';
    $('progressText').textContent = `${answered} / ${total} câu`;

    if (answered === total) {
        $('estimatedTime').textContent = '✅ Sẵn sàng nộp';
    }
}

// ===== REAL-TIME SCORE UPDATE =====
function updateRealTimeScore() {
    const scores = calculateSimpleScores();

    // Render Temp Score
    let tempEl = $('tempScoreDisplay');
    if (!tempEl) {
        tempEl = document.createElement('div');
        tempEl.id = 'tempScoreDisplay';
        tempEl.className = 'score-temp';
        document.body.appendChild(tempEl);
    }

    const hasScore = Object.values(scores).some(v => v > 0);
    if (hasScore) tempEl.classList.add('active');

    const scoreHtml = Object.entries(scores)
        .filter(([k, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `<div>${k}: ${v}</div>`).join('');

    tempEl.innerHTML = `<div style="margin-bottom:0.5rem; color:#ffd700;">📊 Điểm tạm thời</div>` + scoreHtml;
}

// Helper to sum scores without validation
function calculateSimpleScores() {
    const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    for (let i = 0; i < 50; i++) {
        const val = parseInt(document.querySelector(`input[name="q${i}"]:checked`)?.value) || 0;
        if (val === 0) continue;

        let type = '';
        if (i < 24) {
            if (i < 4) type = 'R';
            else if (i < 8) type = 'I';
            else if (i < 12) type = 'A';
            else if (i < 16) type = 'S';
            else if (i < 20) type = 'E';
            else type = 'C';
        }
        else {
            type = RIASEC_QUESTIONS[i].type || RIASEC_QUESTIONS[i].r; // Use 'r' which is what I defined
        }

        if (type && scores[type] !== undefined) {
            scores[type] += val;
        }
    }
    return scores;
}

// ===== CALCULATE RIASEC (FINAL) =====
function calculateRIASEC() {
    const answered = document.querySelectorAll('input[type="radio"]:checked').length;
    if (answered < 50) {
        alert(`Vui lòng trả lời hết 50 câu! (Mới xong ${answered}/50)`);
        return null;
    }

    const scores = calculateSimpleScores();
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3).map(x => x[0]);

    const answers = [];
    for (let i = 0; i < 50; i++) answers.push(parseInt(document.querySelector(`input[name="q${i}"]:checked`)?.value) || 0);

    return { scores, top3, answered: 50, raw_answers: answers };
}

// ===== SHOW RESULTS =====
async function showResults() {
    let current = readCurrent();

    // Sync from server if logged in
    if (!current && token) {
        const userData = await loadUserData();
        if (userData && userData.last_riasec_result) {
            current = userData.last_riasec_result;
            writeCurrent(current); // Sync to local
        }
    }

    console.log("DEBUG: showResults current=", current);

    const $content = $('resultsContent');
    const $empty = $('resultsEmpty');

    if (!current) {
        if ($content) $content.style.display = 'none';
        if ($empty) $empty.style.display = 'block';
        return;
    }

    if ($content) $content.style.display = 'block';
    if ($empty) $empty.style.display = 'none';

    $('riasecDisplay').textContent = (current.riasec || []).join('-');
    const dateStr = (current.time || current.date);
    const safeDate = (dateStr && !isNaN(new Date(dateStr))) ? new Date(dateStr).toLocaleDateString('vi-VN') : 'Mới nhất';
    $('resultTime').textContent = `Ngày: ${safeDate}`;

    // Render Scores
    if (current.scores) {
        console.log("DEBUG: Scores found", current.scores);
        const DETAILS_EL = $('scoreDetails');
        if (DETAILS_EL) {
            DETAILS_EL.style.display = 'grid'; // Ensure visible
            DETAILS_EL.style.gap = '1rem';
            DETAILS_EL.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
        }

        const scoreHtml = Object.entries(current.scores)
            .sort((a, b) => b[1] - a[1])
            .map(([type, score]) => {
                const percent = Math.min((score / 45) * 100, 100);
                return `
        <div style="background: rgba(15, 31, 58, 0.6); border: 1px solid rgba(30, 42, 68, 0.5); padding: 0.75rem; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
            <span style="font-weight: 600; color: ${colors[type]};">${names[type]}</span>
            <span style="color: #fff;">${score} điểm</span>
          </div>
          <div style="height: 6px; background: rgba(30, 42, 68, 0.5); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${percent}%; background: ${colors[type]}; transition: width 0.5s;"></div>
          </div>
        </div>
        `;
            }).join('');

        if (DETAILS_EL) DETAILS_EL.innerHTML = scoreHtml;

        // --- CHART GENERATION ---
        const ctx = document.getElementById('riasecChart');
        if (ctx) {
            // Destroy existing if any to avoid overlap/memory leak
            if (window.myRiasecChart) {
                window.myRiasecChart.destroy();
            }

            const dataValues = [
                current.scores.R || 0,
                current.scores.I || 0,
                current.scores.A || 0,
                current.scores.S || 0,
                current.scores.E || 0,
                current.scores.C || 0
            ];

            console.log("DEBUG: Chart Data", dataValues);

            window.myRiasecChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['R - Thực tế', 'I - Nghiên cứu', 'A - Nghệ thuật', 'S - Xã hội', 'E - Quản lý', 'C - Nghiệp vụ'],
                    datasets: [{
                        label: 'Hồ sơ RIASEC',
                        data: dataValues,
                        fill: true,
                        backgroundColor: 'rgba(77, 124, 255, 0.2)',
                        borderColor: '#4d7cff',
                        pointBackgroundColor: '#4d7cff',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#4d7cff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            pointLabels: {
                                color: '#e2e8f0',
                                font: { size: 12, family: "'Outfit', sans-serif" }
                            },
                            ticks: { display: false, backdropColor: 'transparent' },
                            suggestedMin: 0,
                            suggestedMax: 40
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    } else {
        console.error("DEBUG: No scores in current object!");
    }

    // RECOMMENDATION LOGIC
    try {
        let userCodes = current.riasec;
        console.log("DEBUG: Raw user codes", userCodes);
        // Normalize userCodes
        if (typeof userCodes === 'string') {
            userCodes = userCodes.includes('-') ? userCodes.split('-') : userCodes.split('');
        }
        if (!Array.isArray(userCodes)) userCodes = []; // Fallback

        let recommendations = MAJORS_DB.map(job => {
            const jobCodes = job.code.split('-');
            const intersection = jobCodes.filter(c => userCodes.includes(c));
            const matchCount = intersection.length;
            let score = matchCount * 10;
            if (matchCount === 3) score += 20;
            if (jobCodes[0] === userCodes[0]) score += 5;
            return { ...job, matchCount, score };
        });

        recommendations = recommendations.filter(r => r.matchCount >= 2);
        recommendations.sort((a, b) => b.score - a.score);
        const finalRecs = recommendations.slice(0, 4);

        const container = $('majorContainer');
        if (!container) return;

        if (finalRecs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Chưa tìm thấy ngành phù hợp "Khớp"</h3>
                    <p>Mã hồ sơ: <strong style="color: #4d7cff;">${userCodes.join('-')}</strong></p>
                    <p>Hệ thống không tìm thấy ngành nào khớp >= 2 tiêu chí trong ${MAJORS_DB.length} ngành.</p>
                    <p>Gợi ý: Hãy thử tham khảo nhóm nghề của chữ cái đầu tiên (<strong>${userCodes[0]}</strong>).</p>
                </div>`;
            return;
        }

        const html = finalRecs.map((m, idx) => `
      <div class="major-card rank-${idx + 1}" style="${idx === 3 ? 'opacity: 0.8; border: 1px dashed rgba(30,42,68,0.5);' : ''}">
        <div class="major-badge" style="${idx === 3 ? 'background: rgba(100,100,100,0.2); border-color: #aaa; color: #aaa;' : ''}">
          ${idx < 3 ? `Gợi ý #${idx + 1}` : 'Dự phòng'}
        </div>
        <h3>${m.name}</h3>
        <div class="major-code">Mã: <strong>${m.code}</strong> <span style="font-size: 0.8rem; color: #666;">(${m.group})</span></div>
        <p>Phù hợp: ${m.code.split('-').map(c => userCodes.includes(c) ? `<b style="color: #4d7cff;">${c}</b>` : c).join('-')}</p>
      </div>
    `).join('');

        container.innerHTML = html;
    } catch (e) {
        console.error("Rec Error:", e);
        const container = $('majorContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">Lỗi tính toán: ${e.message}</div>`;
        }
    }
}

// ===== SHOW DASHBOARD =====
async function showDashboard() {
    const $content = $('dashboardContent');
    if (!$content) return;
    $content.innerHTML = '<div style="color: #9fb7ff; text-align: center;">⏳ Đang tải dữ liệu...</div>';

    try {
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}/api/submissions`, { headers });

        if (res.status === 401 || res.status === 403) {
            $content.innerHTML = `
                <div class="empty-state" style="color: #ff4d4f; padding: 2rem;">
                    <h3 style="margin-bottom: 1rem;">⛔ Quyền truy cập bị từ chối</h3>
                    <p>Trang này chỉ dành cho Quản trị viên (Admin).</p>
                    <button onclick="goPage('landing')" class="btn btn-primary" style="margin-top: 1.5rem;">Về trang chủ</button>
                </div>
            `;
            return;
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to load submissions (Status: ${res.status} - ${res.statusText}). Server says: ${errText.substring(0, 100)}`);
        }

        const db = await res.json();

        if (!db.length) {
            $content.innerHTML = '<div class="empty-state">Chưa có dữ liệu. Hãy làm trắc nghiệm trước.</div>';
            return;
        }

        // --- CHART LOGIC START ---
        // 1. RIASEC Distribution
        const riasecCounts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
        db.forEach(sub => {
            if (sub.riasec && Array.isArray(sub.riasec)) {
                sub.riasec.forEach(code => {
                    if (riasecCounts[code] !== undefined) riasecCounts[code]++;
                });
            }
        });

        const ctxRiasec = document.getElementById('dashboardRiasecChart');
        if (ctxRiasec) {
            if (window.dashRiasecChart) window.dashRiasecChart.destroy();
            window.dashRiasecChart = new Chart(ctxRiasec, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(riasecCounts),
                    datasets: [{
                        data: Object.values(riasecCounts),
                        backgroundColor: ['#ff4d4f', '#ffa940', '#ffec3d', '#73d13d', '#4096ff', '#9254de'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#e2e8f0', font: { family: "'Outfit', sans-serif" } } }
                    }
                }
            });
        }

        // 2. Trend (Last 7 Days)
        const days = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            days[d.toISOString().split('T')[0]] = 0;
        }

        db.forEach(sub => {
            if (sub.time) {
                const dateKey = sub.time.split('T')[0];
                if (days[dateKey] !== undefined) days[dateKey]++;
            }
        });

        const ctxTrend = document.getElementById('dashboardTrendChart');
        if (ctxTrend) {
            if (window.dashTrendChart) window.dashTrendChart.destroy();
            window.dashTrendChart = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: Object.keys(days).map(d => d.split('-').slice(1).join('/')),
                    datasets: [{
                        label: 'Bài nộp',
                        data: Object.values(days),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // 3. Average RIASEC Profile (Radar Chart)
        const totalScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
        let scoreCount = 0;

        db.forEach(sub => {
            if (sub.scores) {
                Object.keys(totalScores).forEach(key => {
                    if (sub.scores[key] !== undefined) {
                        totalScores[key] += sub.scores[key];
                    }
                });
                scoreCount++;
            }
        });

        const avgScores = scoreCount > 0
            ? Object.keys(totalScores).map(k => (totalScores[k] / scoreCount).toFixed(1))
            : [0, 0, 0, 0, 0, 0];

        const ctxRadar = document.getElementById('dashboardRadarChart');
        if (ctxRadar) {
            new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: ['R (Thực tế)', 'I (Nghiên cứu)', 'A (Nghệ thuật)', 'S (Xã hội)', 'E (Quản lý)', 'C (Nghiệp vụ)'],
                    datasets: [{
                        label: 'Trung bình toàn trường',
                        data: avgScores,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: '#3b82f6',
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#3b82f6',
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: { color: '#e2e8f0', font: { size: 12 } },
                            ticks: { display: false, backdropColor: 'transparent' },
                            suggestedMin: 0,
                            suggestedMax: 40
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 4. Top Recommended Careers (Bar Chart)
        const jobCounts = {};
        db.forEach(sub => {
            // Check both fields for backward compatibility
            const majors = sub.suggestedMajors || "";
            if (majors) {
                // Split by comma and trim
                majors.split(',').forEach(m => {
                    const jobName = m.trim();
                    if (jobName) jobCounts[jobName] = (jobCounts[jobName] || 0) + 1;
                });
            }
        });

        // Sort and take top 10
        const sortedJobs = Object.entries(jobCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const ctxMajor = document.getElementById('dashboardMajorChart');
        if (ctxMajor) {
            new Chart(ctxMajor, {
                type: 'bar',
                data: {
                    labels: sortedJobs.map(i => i[0]),
                    datasets: [{
                        label: 'Số lượt đề xuất',
                        data: sortedJobs.map(i => i[1]),
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y', // Horizontal bar
                    scales: {
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#e2e8f0' }, grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // 5. Personality Combinations (Pie/Doughnut)
        const comboCounts = {};
        db.forEach(sub => {
            if (sub.riasec && sub.riasec.length >= 3) {
                const code = sub.riasec.slice(0, 3).join('-');
                comboCounts[code] = (comboCounts[code] || 0) + 1;
            }
        });

        // Sort and take top 5 + Others
        const sortedCombos = Object.entries(comboCounts).sort((a, b) => b[1] - a[1]);
        let finalCombos = sortedCombos.slice(0, 5);
        const otherCount = sortedCombos.slice(5).reduce((sum, item) => sum + item[1], 0);

        const labels = finalCombos.map(i => i[0]);
        const data = finalCombos.map(i => i[1]);
        if (otherCount > 0) {
            labels.push('Khác');
            data.push(otherCount);
        }

        const ctxCombo = document.getElementById('dashboardComboChart');
        if (ctxCombo) {
            new Chart(ctxCombo, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#64748b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#e2e8f0' } }
                    }
                }
            });
        }


        const rows = [...db].reverse();
        // ... Table HTML generation continues below ...

        const html = `
        <div style="overflow-x: auto; background: rgba(15, 31, 58, 0.8); border: 1px solid rgba(30, 42, 68, 0.5); border-radius: 12px; padding: 1rem;">
        <h3 style="margin-bottom: 1rem; color: #4d7cff;">📋 Danh sách kết quả chi tiết (Toàn hệ thống)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 1000px;">
            <thead style="background: rgba(26, 60, 255, 0.2); color: #fff;">
            <tr>
                <th style="padding: 0.75rem; text-align: left; border: 1px solid rgba(30, 42, 68, 0.5);">STT</th>
                <th style="padding: 0.75rem; text-align: left; border: 1px solid rgba(30, 42, 68, 0.5);">Ngày</th>
                <th style="padding: 0.75rem; text-align: left; border: 1px solid rgba(30, 42, 68, 0.5);">Họ tên</th>
                <th style="padding: 0.75rem; text-align: center; border: 1px solid rgba(30, 42, 68, 0.5);">RIASEC</th>
                <th style="padding: 0.75rem; text-align: left; border: 1px solid rgba(30, 42, 68, 0.5); width: 25%;">Các ngành gợi ý</th>
                <th style="padding: 0.75rem; text-align: left; border: 1px solid rgba(30, 42, 68, 0.5);">Tổ hợp xét tuyển</th>
            </tr>
            </thead>
            <tbody>
            ${rows.map((row, index) => {
            const s = row.scores || {};
            return `
                <tr style="border-bottom: 1px solid rgba(30, 42, 68, 0.3);">
                <td style="padding: 0.75rem; border: 1px solid rgba(30, 42, 68, 0.5); text-align: center;">${index + 1}</td>
                <td style="padding: 0.75rem; border: 1px solid rgba(30, 42, 68, 0.5);">
                    ${(row.time && !isNaN(new Date(row.time))) ? new Date(row.time).toLocaleDateString('vi-VN') : 'Mới nhất'}
                </td>
                <td style="padding: 0.75rem; border: 1px solid rgba(30, 42, 68, 0.5); font-weight: 500;">
                    ${row.name || 'Ẩn danh'}<br>
                    <span style="font-size: 0.8rem; color: #9fb7ff;">${row.class || '-'}</span>
                </td>
                
                <td style="padding: 0.75rem; border: 1px solid rgba(30, 42, 68, 0.5); text-align: center;">
                    <span class="badge" style="background: rgba(26, 60, 255, 0.1); border-color: rgba(77, 124, 255, 0.5);">
                    ${(row.riasec || []).join('-')}
                    </span>
                </td>
                
                <td style="padding: 0.75rem; border: 1px solid rgba(30, 42, 68, 0.5); font-size: 0.85rem;">
                    ${row.suggestedMajors || '<i style="color: #666">Chưa có dữ liệu</i>'}
                </td>
                
                <td style="padding: 0.75rem; border: 1px solid rgba(30, 42, 68, 0.5); font-size: 0.85rem;">
                    ${row.combinations || '<i style="color: #666">-</i>'}
                </td>
                </tr>
                `;
        }).join('')}
            </tbody>
        </table>
        <div style="margin-top: 1rem; text-align: right;">
            <span style="font-size: 0.85rem; color: #9fb7ff;">Tổng số bản ghi: <strong>${db.length}</strong></span>
        </div>
        </div>
    `;
        $content.innerHTML = html;

    } catch (e) {
        $content.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

// ===== RESET TEST =====
function resetTest() {
    if (!confirm('Xoá hết dữ liệu nhập liệu?')) return;
    document.getElementById('testForm').reset();
    $('progressFill').style.width = '0%';
    $('progressText').textContent = '0 / 50 câu';
    $('estimatedTime').textContent = '~10 phút';

    localStorage.removeItem(RIASEC_KEY); // Removes 'current'
    sessionStorage.removeItem('conversation_id');
    const msgBox = $('messagesBox');
    if (msgBox) msgBox.innerHTML = '<div style="color: #9fb7ff; font-size: 0.9rem;"><strong>🤖 AI:</strong> Xin chào! Tôi sẵn sàng tư vấn cho bạn dựa trên kết quả RIASEC. Nhấn nút "Bắt đầu tư vấn" bên dưới để bắt đầu.</div>';

    const tempEl = $('tempScoreDisplay');
    if (tempEl) {
        tempEl.remove();
    }
    alert("Đã làm mới dữ liệu cục bộ! (Dữ liệu trên Server vẫn được giữ)");
}

function clearAllData() {
    alert("Dữ liệu hiện được lưu trữ tập trung trên Server nên không thể xoá sạch từ đây.");
}

const GROUP_COMBINATIONS = {
    "CNTT": "A00, A01, D01",
    "Y Sinh": "B00, A00, D07",
    "Giáo dục": "C00, D01, A00",
    "Xã hội": "C00, D01, D14",
    "Nghệ thuật": "H00, V00, H01",
    "Truyền thông": "C00, D01, A01",
    "Kinh tế": "A00, A01, D01",
    "Quản lý": "A00, A01, D01",
    "Dịch vụ": "C00, D01, A00",
    "Pháp luật": "A00, A01, C00",
    "Hành chính": "C00, D01, A01",
    "An ninh": "A00, C03, D01",
    "Nông nghiệp": "B00, A00, D01",
    "Công nghệ": "A00, A01, B00",
    "Kỹ thuật": "A00, A01, D01"
};

function getRecommendations(userCodes) {
    let recommendations = MAJORS_DB.map(job => {
        const jobCodes = job.code.split('-');
        const intersection = jobCodes.filter(c => userCodes.includes(c));
        const matchCount = intersection.length;

        let score = matchCount * 10;
        if (matchCount === 3) score += 20;
        if (jobCodes[0] === userCodes[0]) score += 5;

        return { ...job, matchCount, score };
    });

    recommendations = recommendations.filter(r => r.matchCount >= 2);
    recommendations.sort((a, b) => b.score - a.score);
    const top4 = recommendations.slice(0, 4);

    return top4.map(major => ({
        name: major.name,
        combinations: GROUP_COMBINATIONS[major.group] || "A00, A01"
    }));
}

// ===== SUBMIT TEST =====
async function submitTest() {
    try {
        if (!confirm('Bạn có chắc chắn muốn nộp bài?')) return;

        const result = calculateRIASEC();
        if (!result) return;

        const { scores, top3, raw_answers } = result;
        const recs = getRecommendations(top3);
        const majorNames = recs.map(r => r.name).join(', ');
        const uniqueCombs = [...new Set(recs.map(r => r.combinations))].join(' | ');

        const resultObj = {
            scores,
            riasec: top3,
            date: new Date().toISOString(),
            name: $('name').value,
            class: $('class').value,
            school: $('school').value
        };
        writeCurrent(resultObj);

        // Persist to user account if logged in
        saveUserData('last_riasec_result', resultObj);

        const payload = {
            name: $('name').value || "Ẩn danh",
            class: $('class').value || "-",
            school: $('school').value || "-",
            riasec: top3,
            scores: scores,
            answers: raw_answers,
            time: new Date().toISOString(),
            suggestedMajors: majorNames,
            combinations: uniqueCombs
        };

        try {
            const res = await fetch(`${API_BASE}/api/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) console.log("✅ Saved to backend");
            else console.error("❌ Failed to save backend", await res.text());
        } catch (e) {
            console.error("❌ Network error saving backend", e);
        }

        goPage('results');

    } catch (err) {
        alert('Lỗi hệ thống: ' + err.message);
        console.error(err);
    }
}

// ===== CHATBOT =====
async function updateChatContext() {
    let current = readCurrent();

    // Sync from server if logged in
    if (!current && token) {
        const userData = await loadUserData();
        if (userData && userData.last_riasec_result) {
            current = userData.last_riasec_result;
            writeCurrent(current);
        }
    }

    const ctx = $('chatContext');
    if (!ctx) return;

    if (!current) {
        ctx.innerHTML = '❌ Chưa có dữ liệu. Vui lòng <strong onclick="goPage(\'test\')">làm trắc nghiệm</strong> trước.';
        return;
    }

    if (sessionStorage.getItem('conversation_id')) {
        $('consultBtn').textContent = "🔄 Bắt đầu lại cuộc hội thoại";
    } else {
        $('consultBtn').textContent = "✨ Bắt đầu tư vấn";
    }

    ctx.innerHTML = `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
    <div>
      <strong>👤 Học sinh:</strong> ${current.name || 'Ẩn danh'}
    </div>
    <div>
      <strong>📚 Lớp / Trường:</strong> ${current.class || '-'} / ${current.school || '-'}
    </div>
    <div>
      <strong>🎯 RIASEC:</strong> <span style="background: rgba(26, 60, 255, 0.3); padding: 0.25rem 0.5rem; border-radius: 4px;">${current.riasec.join('-')}</span>
    </div>
    <div>
      <strong>⏱️ Ngày:</strong> ${(current.time && !isNaN(new Date(current.time))) ? new Date(current.time).toLocaleDateString('vi-VN') : 'Mới nhất'}
    </div>
  </div>
`;
    $('consultBtn').disabled = false;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMarkdownText(text) {
    let safeText = escapeHtml(text);
    let html = safeText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^(I+\..*?)$/gm, '<h4 style="margin: 1rem 0 0.5rem 0; color: #cfe0ff; font-size: 1rem;">$1</h4>')
        .replace(/^(\d+\.\s)(.*)$/gm, '<div style="margin-left: 1rem; margin-bottom: 0.5rem;">$1$2</div>')
        .replace(/^- /gm, '&nbsp;&nbsp;• ')
        .replace(/\n/g, '<br>');
    return html;
}

function addChatMessage(sender, text, isLoading = false) {
    const messagesBox = $('messagesBox');
    const msg = document.createElement('div');
    msg.style.cssText = 'color: #9fb7ff; font-size: 0.95rem; line-height: 1.8; margin-bottom: 1rem; white-space: pre-wrap; word-wrap: break-word;';

    if (sender === 'user') {
        msg.innerHTML = `<strong style="color: #cfe0ff;">👤 Bạn:</strong> ${escapeHtml(text)}`;
    } else {
        const formattedText = formatMarkdownText(text);
        msg.innerHTML = `<div style="color: #4d7cff;"><strong>🤖 AI:</strong></div><div style="margin-top: 0.5rem; color: #9fb7ff;">${isLoading ? '<em>Đang suy nghĩ...</em>' : formattedText}</div>`;
    }

    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

async function requestCounsel() {
    const current = readCurrent();
    if (!current) {
        alert('Vui lòng làm trắc nghiệm trước');
        return;
    }

    const $consultBtn = $('consultBtn');
    const $loadingOverlay = $('loadingOverlay');

    $consultBtn.disabled = true;
    $loadingOverlay.classList.add('active');

    try {
        let answerArray = current.answers;

        if (!answerArray || answerArray.length !== 50) {
            console.warn("Missing raw answers in storage, attempting partial reconstruction");
            answerArray = [];
            const scores = current.scores;
            const letters = ['R', 'I', 'A', 'S', 'E', 'C'];
            for (let i = 0; i < 50; i++) {
                const letterIdx = i % 6;
                const letter = letters[letterIdx];
                const baseScore = Math.round(scores[letter] / 6);
                answerArray.push(Math.max(1, Math.min(5, baseScore)));
            }
        }

        let scoreString = "";
        if (current.scores) {
            const sortedItems = Object.entries(current.scores)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            scoreString = sortedItems.map(item => `${item[0]}: ${item[1]}`).join(", ");
        }

        const initialPrompt = `Hãy giới thiệu về các hướng nghiệp phù hợp cho tôi dựa trên kết quả RIASEC của tôi. Hãy theo kết quả này: [${scoreString}]. Hãy trả lời súc tích, ngắn gọn, đảm bảo không bị cắt ngang giữa chừng.`;

        const response = await fetch(`${API_BASE}/start-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: current.name || 'Ẩn danh',
                class: current.class || '-',
                school: current.school || '-',
                answer: answerArray,
                initial_question: initialPrompt
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.ai_response || 'Không có phản hồi từ AI';
        const conversationId = data.conversation_id;

        if (conversationId) sessionStorage.setItem('conversation_id', conversationId);

        $('messagesBox').innerHTML = '';
        addChatMessage('user', "Hãy giới thiệu về các hướng nghiệp phù hợp cho tôi dựa trên kết quả RIASEC của tôi");
        addChatMessage('ai', aiResponse);
        $consultBtn.textContent = "🔄 Bắt đầu lại cuộc hội thoại";
    } catch (err) {
        console.error('❌ Fetch error:', err);
        addChatMessage('ai', `❌ <strong>Lỗi:</strong> ${err.message}`);
    } finally {
        $consultBtn.disabled = false;
        $loadingOverlay.classList.remove('active');
    }
}

async function sendChatMessage() {
    const input = $('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const conversationId = sessionStorage.getItem('conversation_id');
    if (!conversationId) {
        alert('Vui lòng nhấn "Yêu cầu tư vấn" để bắt đầu cuộc trò chuyện');
        return;
    }

    addChatMessage('user', text);
    input.value = '';

    const $loadingOverlay = $('loadingOverlay');
    $loadingOverlay.classList.add('active');

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: conversationId,
                message: text
            })
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Cuộc hội thoại đã hết hạn.");
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.ai_response || 'Không có phản hồi từ AI';
        addChatMessage('ai', aiResponse);
    } catch (err) {
        console.error('❌ Chat error:', err);
        addChatMessage('ai', `❌ <strong>Lỗi:</strong> ${err.message}`);
    } finally {
        $loadingOverlay.classList.remove('active');
    }
}

// ===== VR EXPERIENCE LOGIC =====
let GLOBAL_VR_JOBS = [];

async function fetchVRJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs`);
        if (res.ok) {
            GLOBAL_VR_JOBS = await res.json();
            renderVRJobs();
        }
    } catch (e) {
        console.error("Error fetching VR jobs:", e);
    }
}

async function saveVRJobs(jobs) {
    if (!token) {
        alert("Bạn phải đăng nhập Admin để thực hiện!");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(jobs)
        });
        if (res.ok) {
            GLOBAL_VR_JOBS = jobs;
            renderVRJobs();
        } else {
            alert("Lỗi khi lưu dữ liệu (Admin rights required)!");
        }
    } catch (e) {
        alert("Lỗi kết nối Server: " + e.message);
    }
}

// ============================================
// ===== VR JOBS & EDITOR IMPL (FIXED) =====
// ============================================

function openVideoModal(videoId, title) {
    const modal = $('videoModal');
    const iframe = $('videoFrame');
    const titleEl = $('videoTitle');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    titleEl.textContent = title;
    modal.classList.add('active');
}

function closeVideoModal(e) {
    // Close if click outside or X button, but ignore if clicking inside unless it's close button
    if (e && e.target !== $('videoModal') && !e.target.classList.contains('loading-modal')) {
        if (e.target.innerText !== '×' && !e.target.closest('button')) return;
    }

    const modal = $('videoModal');
    const iframe = $('videoFrame');
    iframe.src = "";
    modal.classList.remove('active');
}

// Expose to window for onclick
window.closeVideoModal = closeVideoModal;
window.openVideoModal = openVideoModal;

async function fetchVRJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs`);
        if (res.ok) {
            window.VR_JOBS = await res.json();
            renderVRJobs();
        }
    } catch (e) { console.error("Fetch Jobs Error:", e); }
}

function renderVRJobs() {
    const grid = $('vrGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let jobs = window.VR_JOBS || [];
    const current = readCurrent(); // Get user RIASEC

    // Fuzzy Sort if user has results
    if (current && current.riasec) {
        let userCode = current.riasec;
        if (typeof userCode === 'string') {
            userCode = userCode.includes('-') ? userCode.split('-') : userCode.split('');
        }
        // Helper from earlier in file or assumed to exist
        if (typeof calculateRelevance === 'function') {
            jobs = calculateRelevance(userCode, jobs);
        }
    }

    jobs.forEach((job, idx) => {
        // Highlight top matches
        const isTopMatch = (idx < 3 && current && current.riasec);
        const borderStyle = isTopMatch ? 'border: 2px solid #4d7cff; box-shadow: 0 0 15px rgba(77, 124, 255, 0.3);' : '';
        const badge = isTopMatch ? `<div style="background: #4d7cff; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; margin-bottom: 0.5rem; display: inline-block;">Gợi ý #${idx + 1}</div>` : '';

        const card = document.createElement('div');
        card.className = 'vr-card';
        card.style = `background: #0b1220; border-radius: 12px; overflow: hidden; transition: transform 0.3s; ${borderStyle} position: relative;`;

        // Admin Edit Button
        const adminBtn = document.body.classList.contains('is-admin') ?
            `<button onclick="openDevJobModal('${job.id}')" style="position: absolute; top: 10px; right: 10px; z-index: 10; background: rgba(0,0,0,0.6); border: 1px solid #ffd700; color: #ffd700; border-radius: 4px; cursor: pointer;">✏️</button>` : '';

        card.innerHTML = `
                ${adminBtn}
                <div style="position: relative; padding-bottom: 56.25%; background: #000; cursor: pointer;" onclick="openVideoModal('${job.videoId}', '${escapeHtml(job.title)}')">
                    <img src="https://img.youtube.com/vi/${job.videoId}/mqdefault.jpg" 
                        style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover; opacity: 0.8;">
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                width: 50px; height: 50px; background: rgba(0,0,0,0.6); border-radius: 50%; 
                                display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">
                    <span style="color: #fff; font-size: 24px;">▶</span>
                    </div>
                </div>
                <div style="padding: 1.5rem;">
                    ${badge}
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0; font-size: 1.25rem;">${job.icon} ${job.title}</h3>
                    </div>
                    <p style="color: #9fb7ff; font-size: 0.9rem; margin-bottom: 1rem;">${job.description || ''}</p>
                    
                    ${job.riasec_code ? `<div style="margin-bottom: 0.5rem; font-size: 0.85rem; color: #fff; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">${job.riasec_code}</div>` : ''}

                    <button onclick="openVideoModal('${job.videoId}', '${escapeHtml(job.title)}')" 
                            class="btn btn-primary" style="width: 100%;">
                    Trải nghiệm ngay
                    </button>
                </div>
            `;
        grid.appendChild(card);
    });
}

// ===== EDITOR FUNCTIONS =====

function openDevJobModal(jobId) {
    const job = (window.VR_JOBS || []).find(j => j.id === jobId);
    if (!job) return;

    $('devJobId').value = job.id;
    $('devJobTitle').value = job.title;
    $('devJobVideoId').value = job.videoId;
    $('devJobDesc').value = job.description;
    $('devJobIcon').value = job.icon;
    $('devJobRIASEC').value = job.riasec_code || "";
    $('devJobMajors').value = (job.related_majors || []).join(', ');

    $('devJobModal').classList.add('active');

    // Show delete button
    const delBtn = $('btnDeleteJob');
    if (delBtn) delBtn.style.display = 'inline-block';
}

function closeDevModal() {
    $('devJobModal').classList.remove('active');
}

async function saveDevJob() {
    const id = $('devJobId').value;
    const title = $('devJobTitle').value;
    const videoId = $('devJobVideoId').value;
    const desc = $('devJobDesc').value;
    const icon = $('devJobIcon').value;
    const riasec = $('devJobRIASEC').value.toUpperCase();
    const majors = $('devJobMajors').value.split(',').map(s => s.trim()).filter(s => s);

    if (!title || !videoId) {
        alert("Vui lòng nhập Tiêu đề và Video ID!");
        return;
    }

    const payload = {
        id: id,
        title: title,
        videoId: videoId,
        description: desc,
        icon: icon,
        riasec_code: riasec,
        related_majors: majors
    };

    const method = (id.startsWith('new_') || id === 'new') ? 'POST' : 'PUT';
    const url = method === 'POST' ? `${API_BASE}/api/vr-jobs` : `${API_BASE}/api/vr-jobs/${id}`;

    // If new, ensure ID is stripped or let backend handle it.
    // Backend handles `job_uuid` generation if ID collision or if logic dictates.
    // For strict API: POST usually doesn't need ID in URL.

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✅ Lưu thành công!");
            closeDevModal();
            fetchVRJobs();
        } else {
            alert("❌ Lỗi lưu dữ liệu: " + res.statusText);
        }
    } catch (e) {
        alert("Lỗi kết nối: " + e.message);
    }
}

async function addNewVRJob() {
    // Prepare Modal for "New"
    $('devJobId').value = `new`; // Flag for save
    $('devJobTitle').value = "";
    $('devJobVideoId').value = "";
    $('devJobDesc').value = "";
    $('devJobIcon').value = "🆕";
    $('devJobRIASEC').value = "";
    $('devJobMajors').value = "";

    $('devJobModal').classList.add('active');
    const delBtn = $('btnDeleteJob');
    if (delBtn) delBtn.style.display = 'none';
}

async function deleteVRJob() {
    const id = $('devJobId').value;
    if (!confirm('Xoá nghề này? (Không thể hoàn tác)')) return;

    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert("✅ Đã xoá!");
            closeDevModal();
            fetchVRJobs();
        } else {
            alert("❌ Lỗi xoá!");
        }
    } catch (e) { console.error(e); }
}

function resetVRData() {
    if (confirm('Khôi phục dữ liệu mẫu?')) {
        // Not implemented on backend yet for reset
        alert("Chức năng này cần backend hỗ trợ.");
    }
}

function devAutoFill() {
    if (!$('name').value) $('name').value = "Dev Tester";
    if (!$('class').value) $('class').value = "12A Dev";
    if (!$('school').value) $('school').value = "THPT Dev Mode";

    for (let i = 0; i < 50; i++) {
        const val = Math.floor(Math.random() * 5) + 1;
        const radio = document.getElementById(`q${i}_${val}`);
        if (radio) radio.checked = true;
    }
    updateProgress();
    // window.scrollTo(0, document.body.scrollHeight);
}

// ===== INIT =====
// ===== COMMUNITY LOGIC =====

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Vừa xong";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

async function loadPosts() {
    const container = $('postsContainer');
    if (!container) return; // Not on community page

    try {
        const res = await fetch(`${API_BASE}/api/community/posts`);
        if (!res.ok) throw new Error("Failed to load posts");
        const posts = await res.json();

        if (posts.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!</div>';
            return;
        }

        container.innerHTML = posts.map(post => {
            const commentsHtml = (post.comments || []).map(c => `
        <div class="comment-item">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.author)}</span>
            <span style="color: #666;">${timeAgo(c.timestamp)}</span>
          </div>
          <div class="comment-content">${escapeHtml(c.content)}</div>
        </div>
      `).join('');

            return `
        <div class="post-card" id="post-${post.id}">
          <div class="post-header">
            <div class="post-author">${escapeHtml(post.author)}</div>
            <div class="post-time">${timeAgo(post.timestamp)}</div>
          </div>
          <div class="post-content">${escapeHtml(post.content)}</div>
          
          <div class="comment-section">
            <div class="comment-list" id="comments-${post.id}">
              ${commentsHtml}
            </div>
            
            <div class="comment-form">
               <input type="text" id="comment-author-${post.id}" placeholder="Tên..." style="width: 25%;" class="community-input" value="${getDefaultName()}">
               <input type="text" id="comment-content-${post.id}" placeholder="Viết bình luận..." style="flex: 1;" class="community-input">
               <button class="btn btn-primary btn-small" onclick="addComment('${post.id}')">Gửi</button>
            </div>
          </div>
        </div>
      `;
        }).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-state" style="color: #f87171;">Không thể tải bài viết.</div>';
    }
    // Lock fields if user is already logged in
    updateCommunityProfileLock();
}

function getDefaultName() {
    if (currentUser && currentUser.full_name) return currentUser.full_name;
    // Try to get from local storage if user took test
    const current = readCurrent();
    return current && current.name ? current.name : "";
}

function updateCommunityProfileLock() {
    if (!currentUser) return;
    const name = currentUser.full_name || currentUser.username;

    // Lock Post Author
    const postAuthor = $('postAuthor');
    if (postAuthor) {
        postAuthor.value = name;
        postAuthor.readOnly = true;
        postAuthor.style.backgroundColor = 'rgba(15, 31, 58, 0.4)';
        postAuthor.style.cursor = 'not-allowed';
        postAuthor.title = 'Chỉnh sửa tên trong Hồ sơ cá nhân';
    }

    // Lock Comment Authors
    document.querySelectorAll('input[id^="comment-author-"]').forEach(el => {
        el.value = name;
        el.readOnly = true;
        el.style.backgroundColor = 'rgba(15, 31, 58, 0.4)';
        el.style.cursor = 'not-allowed';
        el.title = 'Chỉnh sửa tên trong Hồ sơ cá nhân';
    });
}

async function createPost() {
    const authorInput = $('postAuthor');
    const contentInput = $('postContent');
    const author = authorInput.value.trim();
    const content = contentInput.value.trim();

    if (!content) {
        alert("Vui lòng nhập nội dung bài viết!");
        return;
    }

    const $loadingOverlay = $('loadingOverlay');
    if ($loadingOverlay) $loadingOverlay.classList.add('active');

    try {
        const res = await fetch(`${API_BASE}/api/community/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, content })
        });

        if (res.ok) {
            // Clear inputs
            contentInput.value = '';
            // Reload posts
            await loadPosts();
        } else {
            alert("Đăng bài thất bại!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối!");
    } finally {
        if ($loadingOverlay) $loadingOverlay.classList.remove('active');
    }
}

async function addComment(postId) {
    const authorInput = $(`comment-author-${postId}`);
    const contentInput = $(`comment-content-${postId}`);
    const author = authorInput.value.trim();
    const content = contentInput.value.trim();

    if (!content) return; // Do nothing if empty

    try {
        const res = await fetch(`${API_BASE}/api/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, content })
        });

        if (res.ok) {
            contentInput.value = '';
            await loadPosts(); // Simplest way to refresh UI
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối!");
    }
}

// ===== ADMIN UI =====
function updateAdminUI() {
    const role = String(currentUser?.role || '').toLowerCase();
    if (role === 'admin') {
        document.body.classList.add('is-admin');
        // Show Admin elements
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    } else {
        document.body.classList.remove('is-admin');
        // Hide Admin elements
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }

    // Refresh VR Grid if present to show/hide edit buttons
    if (document.querySelector('#vrGrid') && typeof renderVRJobs === 'function') {
        renderVRJobs();
    }
}

// ===== PROFILE FUNCTIONS =====
function autoFillTest() {
    if (!currentUser) return;

    // Lock fields if logged in (edit only in Profile page)
    const lockField = (id, val) => {
        const el = $(id);
        if (el) {
            el.value = val || '';
            el.readOnly = true;
            el.style.backgroundColor = 'rgba(15, 31, 58, 0.4)';
            el.style.cursor = 'not-allowed';
            el.title = 'Vui lòng chỉnh sửa trong trang Hồ sơ';
        }
    };

    lockField('name', currentUser.full_name);
    lockField('class', currentUser.class || currentUser.class_name);
    lockField('school', currentUser.school);
}

function loadProfile() {
    if (!currentUser) return;
    if ($('profileName')) $('profileName').value = currentUser.full_name || '';
    if ($('profileClass')) $('profileClass').value = currentUser.class || currentUser.class_name || '';
    if ($('profileSchool')) $('profileSchool').value = currentUser.school || '';
}

async function saveProfile() {
    const full_name = $('profileName').value;
    const school = $('profileSchool').value;
    const class_name = $('profileClass').value;

    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ full_name, school, class: class_name })
        });

        if (res.ok) {
            alert("✅ Đã lưu hồ sơ thành công!");
            // Refresh currentUser logic
            const updatedUser = await res.json();
            currentUser = updatedUser;
            updateAdminUI(); // Refresh header name if changed
            // Also update header explicitly if needed, but checkAuth handles it generally. 
            // Let's just re-run checkAuth to be safe or manually update nav
            const navAuth = $('navAuth');
            if (navAuth) {
                navAuth.innerHTML = `
                    <span style="color: #9fb7ff; margin-right: 0.5rem; font-size: 0.9rem;">Hi, ${escapeHtml(currentUser.username)}</span>
                    <button onclick="logout()" class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; border: 1px solid #4d7cff; color: #4d7cff;">Logout</button>
                `;
            }
        } else {
            alert("❌ Lỗi khi lưu hồ sơ.");
        }
    } catch (e) { console.error(e); alert("Lỗi kết nối."); }
}


// ===== INIT =====
window.addEventListener('load', () => {
    checkAuth();

    // Page specific inits
    if ($('questionsContainer')) initTest();
    if ($('chatContext')) updateChatContext();
    if ($('majorContainer')) showResults();
    if ($('dashboardContent')) showDashboard();
    if ($('vrGrid')) fetchVRJobs();


    // Community Page Init
    if ($('postsContainer')) {
        const defName = getDefaultName();
        if (defName && $('postAuthor')) $('postAuthor').value = defName;
        loadPosts();
    }
});

$('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});
