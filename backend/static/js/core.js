// ===== CONFIG & CONSTANTS =====
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
let GLOBAL_RECOMMENDATION_JOBS = {};
let GLOBAL_RECOMMENDED_IDS = [];

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
    const username = $('loginUsername').value;
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
            window.location.href = '/dashboard';
        } else {
            alert("Đăng nhập thất bại. Kiểm tra lại thông tin!");
        }
    } catch (e) {
        alert("Lỗi kết nối server");
    }
}

async function handleRegister() {
    const username = $('regUsername').value;
    const fullname = $('regFullname').value;
    const password = $('regPassword').value;
    // Checkbox for admin role (Demo only)
    const isAdmin = document.getElementById('regAdmin')?.checked;
    const role = isAdmin ? 'admin' : 'user';

    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                full_name: fullname,
                role: role
            })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('access_token', data.access_token);
            window.location.href = '/dashboard';
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

async function fetchBackendRecommendations(scores) {
    const res = await fetch(`${API_BASE}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores })
    });
    if (!res.ok) throw new Error(`Recommendation API failed: ${res.status}`);
    const data = await res.json();
    return data.recommendations;
}

function setGlobalRecommendations(recommendations) {
    GLOBAL_RECOMMENDATION_JOBS = {};
    const all = recommendations?.all_sorted_jobs || [];
    all.forEach(job => {
        if (job && job.id) GLOBAL_RECOMMENDATION_JOBS[job.id] = job;
    });
    GLOBAL_RECOMMENDED_IDS = (recommendations?.top_4 || []).map(job => job.id);
}

function openJobFromResults(jobId) {
    const job = GLOBAL_RECOMMENDATION_JOBS[jobId];
    if (!job) return;
    openVideoModal(job.videoId, job.title);
}

function renderRecommendationSections(recommendations) {
    const container = $('majorContainer');
    if (!container) return;

    const priority = recommendations?.priority || [];
    const backup = recommendations?.backup || [];
    const all = [...priority, ...backup];

    if (!all.length) {
        container.innerHTML = '<div class="empty-state">Chưa có gợi ý phù hợp.</div>';
        return;
    }

    const renderCard = (job, label, borderColor) => `
      <div class="major-card" style="border: 1px solid ${borderColor}; cursor: pointer;" onclick="openJobFromResults('${job.id}')">
        <div class="major-badge" style="background: rgba(15,31,58,0.35); border-color: ${borderColor}; color: ${borderColor};">
          ${label}
        </div>
        <h3>${escapeHtml(job.title || '')}</h3>
        <div class="major-code">RIASEC: <strong>${escapeHtml(job.riasec_code || '---')}</strong></div>
        <p style="color: #9fb7ff;">${escapeHtml(job.description || 'Nhấn để xem video mô phỏng nghề nghiệp.')}</p>
      </div>
    `;

    const priorityHtml = priority.map((job, idx) => renderCard(job, `Ưu tiên #${idx + 1}`, '#22c55e')).join('');
    const backupHtml = backup.map(job => renderCard(job, 'Dự phòng', '#f59e0b')).join('');

    container.innerHTML = `
      <div style="grid-column: 1 / -1; margin-bottom: 0.5rem;"><h3 style="color:#22c55e;">Nhóm ưu tiên</h3></div>
      ${priorityHtml || '<div class="empty-state">Chưa có nghề ưu tiên.</div>'}
      <div style="grid-column: 1 / -1; margin: 1.5rem 0 0.5rem;"><h3 style="color:#f59e0b;">Nhóm dự phòng</h3></div>
      ${backupHtml || '<div class="empty-state">Chưa có nghề dự phòng.</div>'}
    `;
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

