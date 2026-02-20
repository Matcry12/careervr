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

// ===== UI HELPERS =====
function clearFieldError(fieldId) {
    const err = document.getElementById(`${fieldId}Error`);
    if (err) err.textContent = '';
}

function setFieldError(fieldId, message) {
    const err = document.getElementById(`${fieldId}Error`);
    if (err) err.textContent = message || '';
}

function setStatus(id, type, message) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('status-info', 'status-success', 'status-warning', 'status-error');
    if (type) el.classList.add(`status-${type}`);
    el.textContent = message || '';
}

function normalizeErrorMessage(rawMessage, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') {
    const text = String(rawMessage || '').trim();
    if (!text) return fallback;
    if (/^HTTP\s+\d+/i.test(text)) return 'Máy chủ đang bận. Vui lòng thử lại sau.';
    return text;
}

async function getApiErrorMessage(response, fallback = 'Yêu cầu không thành công. Vui lòng thử lại.') {
    try {
        const payload = await response.json();
        const detail = payload?.detail || payload?.message;
        if (typeof detail === 'string' && detail.trim()) {
            return normalizeErrorMessage(detail, fallback);
        }
        if (Array.isArray(detail) && detail.length) {
            const first = detail[0];
            if (typeof first === 'string') return normalizeErrorMessage(first, fallback);
            if (first?.msg) return normalizeErrorMessage(first.msg, fallback);
        }
        if (Array.isArray(payload?.errors) && payload.errors.length) {
            return normalizeErrorMessage(String(payload.errors[0]), fallback);
        }
    } catch (_) { }
    return normalizeErrorMessage(`HTTP ${response.status}`, fallback);
}

function getExceptionMessage(error, fallback = 'Không thể kết nối máy chủ. Vui lòng thử lại.') {
    return normalizeErrorMessage(error?.message || '', fallback);
}

window.getApiErrorMessage = getApiErrorMessage;
window.getExceptionMessage = getExceptionMessage;

function togglePasswordVisibility(inputId, buttonId) {
    const input = $(inputId);
    const btn = $(buttonId);
    if (!input || !btn) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Hiện' : 'Ẩn';
}

function updateLandingCTA() {
    const btn = $('landingSecondaryBtn');
    const hint = $('landingCtaHint');
    if (!btn || !hint) return;

    if (token) {
        btn.textContent = 'Xem thống kê';
        btn.onclick = () => goPage('dashboard');
        hint.textContent = 'Mở nhanh trang thống kê tổng quan.';
        return;
    }

    btn.textContent = 'Đăng nhập để bắt đầu';
    btn.onclick = () => goPage('login');
    hint.textContent = 'Đăng nhập để lưu kết quả và mở đầy đủ tính năng.';
}

function formatTimeAgoVi(timestamp) {
    const d = new Date(timestamp || '');
    if (isNaN(d)) return 'Mới đây';
    const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (diffSec < 60) return 'Vừa xong';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

function normalizeRoleForBadge(role) {
    const r = String(role || '').toLowerCase();
    if (r === 'admin' || r === 'mentor') return r;
    return '';
}

async function loadCommunitySuggestions(targetId, riasecCode) {
    const container = $(targetId);
    if (!container) return;
    container.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-line"></div>
        </div>
    `).join('');

    try {
        const params = new URLSearchParams();
        if ((riasecCode || '').trim()) params.set('riasec', riasecCode.trim());
        params.set('limit', '4');
        const res = await fetch(`${API_BASE}/api/community/suggestions?${params.toString()}`);
        if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Không tải được gợi ý cộng đồng.'));
        const items = await res.json();
        if (!Array.isArray(items) || !items.length) {
            container.innerHTML = '<div class="muted">Chưa có thảo luận phù hợp.</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const role = normalizeRoleForBadge(item.author_role);
            const roleBadge = role ? `<span class="community-role-badge ${role}">${role === 'admin' ? 'Admin' : 'Mentor'}</span>` : '';
            return `
                <a class="community-suggest-card" href="/community#post-${encodeURIComponent(item.id || '')}">
                    <div class="community-suggest-title-row">
                        ${item.is_pinned ? '<span class="community-pinned-badge">Ghim</span>' : ''}
                        <span class="community-category-badge">${escapeHtml(item.category || 'general')}</span>
                    </div>
                    <div class="community-suggest-title">${escapeHtml(item.title || 'Bài viết cộng đồng')}</div>
                    <div class="community-suggest-meta">
                        <span>${escapeHtml(item.author || 'Ẩn danh')} ${roleBadge}</span>
                        <span>${formatTimeAgoVi(item.timestamp)}</span>
                    </div>
                    <div class="community-suggest-stats">
                        👍 ${Number(item.likes_count || 0)} · 💬 ${Number(item.comments_count || 0)}
                    </div>
                </a>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<div class="status status-error">Không tải được gợi ý cộng đồng.</div>';
    }
}

function initMobileNav() {
    const toggle = $('navToggle');
    const nav = $('mainNav');
    if (!toggle || !nav) return;

    const closeMenu = () => {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        nav.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', nav.classList.contains('nav-open') ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });
}

// ===== AUTH FUNCTIONS =====
async function checkAuth() {
    const navAuth = $('navAuth');

    // If no token, show Login link
    if (!token) {
        if (navAuth) navAuth.innerHTML = '<a href="/login" class="nav-link">Đăng nhập</a>';
        updateLandingCTA();
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
                    <span class="nav-user">Xin chào, ${escapeHtml(currentUser.username)}</span>
                    <button onclick="logout()" class="btn btn-secondary nav-logout-btn">Đăng xuất</button>
                `;
            }
            document.body.classList.add('is-logged-in');
            updateAdminUI();
            updateLandingCTA();

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
        updateLandingCTA();
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
    clearFieldError('loginUsername');
    clearFieldError('loginPassword');
    setStatus('loginStatus', null, '');

    if (!username) {
        setFieldError('loginUsername', 'Vui lòng nhập tên đăng nhập.');
        return;
    }
    if (!password) {
        setFieldError('loginPassword', 'Vui lòng nhập mật khẩu.');
        return;
    }

    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    setStatus('loginStatus', 'info', 'Đang đăng nhập...');

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
            let detail = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            try {
                const err = await res.json();
                if (err?.detail) detail = `${detail} (${err.detail})`;
            } catch (_) { }
            setStatus('loginStatus', 'error', detail);
        }
    } catch (e) {
        setStatus('loginStatus', 'error', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
}

async function handleRegister() {
    const username = $('regUsername').value.trim();
    const fullname = $('regFullname').value.trim();
    const password = $('regPassword').value;

    clearFieldError('regUsername');
    clearFieldError('regFullname');
    clearFieldError('regPassword');
    setStatus('signupStatus', null, '');

    if (!username) {
        setFieldError('regUsername', 'Vui lòng nhập tên đăng nhập.');
        return;
    }
    if (password.length < 6) {
        setFieldError('regPassword', 'Mật khẩu tối thiểu 6 ký tự.');
        return;
    }

    setStatus('signupStatus', 'info', 'Đang tạo tài khoản...');

    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
                full_name: fullname,
                role: 'user'
            })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('access_token', data.access_token);
            window.location.href = '/test';
        } else {
            let msg = "Đăng ký thất bại: Lỗi không xác định";
            try {
                const err = await res.json();
                msg = "Đăng ký thất bại: " + (err.detail || "Lỗi không xác định");
            } catch (_) { }
            setStatus('signupStatus', 'error', msg);
        }
    } catch (e) {
        setStatus('signupStatus', 'error', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
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
    if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Không lấy được gợi ý nghề nghiệp.'));
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

    const renderCard = (job, label, type) => `
      <div class="major-card clickable ${type}" onclick="openJobFromResults('${job.id}')" tabindex="0" role="button"
        onkeydown="if(event.key==='Enter' || event.key===' '){event.preventDefault();openJobFromResults('${job.id}')}">
        <div class="major-badge ${type}">
          ${label}
        </div>
        <h3>${escapeHtml(job.title || '')}</h3>
        <div class="major-code">RIASEC: <strong>${escapeHtml(job.riasec_code || '---')}</strong></div>
        <p class="muted">${escapeHtml(job.description || 'Nhấn để xem video mô phỏng nghề nghiệp.')}</p>
        <div class="major-actions">
          <button class="btn btn-secondary" type="button"
            onclick="event.stopPropagation();openJobFromResults('${job.id}')">Xem mô phỏng nghề</button>
        </div>
      </div>
    `;

    const priorityHtml = priority.map((job, idx) => renderCard(job, `Ưu tiên #${idx + 1}`, 'priority')).join('');
    const backupHtml = backup.map(job => renderCard(job, 'Dự phòng', 'backup')).join('');

    container.innerHTML = `
      <h3 class="major-section-label priority">Nhóm ưu tiên</h3>
      ${priorityHtml || '<div class="empty-state">Chưa có nghề ưu tiên.</div>'}
      <h3 class="major-section-label backup">Nhóm dự phòng</h3>
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
