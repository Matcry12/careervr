// ===== COMMUNITY LOGIC =====
let COMMUNITY_SORT = 'newest';
let COMMUNITY_SEARCH = '';
let COMMUNITY_CATEGORY_FILTER = 'all';
let COMMUNITY_EXPLORE_MODE = 'discover';
let COMMUNITY_REPORT_TARGET = null;
let COMMUNITY_DRAFT_RELATED_TIMER = null;
let COMMUNITY_COMPOSER_LAST_FOCUSED = null;
let COMMUNITY_POST_CACHE = [];
let COMMUNITY_DETAIL_TARGET_POST_ID = null;
const COMMUNITY_DELETE_STATES = {
    IDLE: 'idle',
    ARMED: 'armed',
    DELETING: 'deleting',
};
let COMMUNITY_DELETE_STATE = COMMUNITY_DELETE_STATES.IDLE;
let COMMUNITY_DELETE_TARGET_POST_ID = null;
let COMMUNITY_PENDING_DELETE_TIMER = null;
let COMMUNITY_DELETE_DEBUG = false;
const COMMUNITY_POST_DELETE_STATUS = {};
const COMMUNITY_PAGE_SIZE = 12;
let COMMUNITY_PAGE_OFFSET = 0;
let COMMUNITY_HAS_MORE = false;
let COMMUNITY_PAGE_COUNT = 0;
let COMMUNITY_PAGE_BUSY = false;
const COMMUNITY_ACTOR_KEY = 'careervr_community_actor_v1';
const COMMUNITY_CATEGORY_LABELS = {
    major: 'Ngành học',
    skills: 'Kỹ năng',
    admissions: 'Tuyển sinh',
    study: 'Kinh nghiệm học tập',
    mindset: 'Tâm lý',
    general: 'Chung'
};
const COMMUNITY_ROLE_LABELS = {
    admin: 'Admin',
    mentor: 'Mentor'
};
const COMMUNITY_DRAFT_KEY = 'careervr_community_post_draft_v1';
const PROFILE_LAST_SAVED_KEY = 'careervr_profile_last_saved_v1';
let PROFILE_INITIAL_STATE = null;
let PROFILE_DIRTY_BOUND = false;
let COMMUNITY_BINDINGS_BOUND = false;

function getCommunityActorId() {
    if (currentUser?.username) return `user:${currentUser.username}`;
    let id = localStorage.getItem(COMMUNITY_ACTOR_KEY);
    if (!id) {
        id = `guest:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(COMMUNITY_ACTOR_KEY, id);
    }
    return id;
}

function getCommunityWriteHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

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

function changeCommunitySort(value) {
    COMMUNITY_SORT = value || 'newest';
    loadPosts({ resetPagination: true });
}

function changeCommunitySearch(value) {
    COMMUNITY_SEARCH = value || '';
    loadPosts({ resetPagination: true });
}

function changeCommunityCategoryFilter(value) {
    COMMUNITY_CATEGORY_FILTER = value || 'all';
    loadPosts({ resetPagination: true });
}

function resetCommunityFilters() {
    COMMUNITY_SEARCH = '';
    COMMUNITY_CATEGORY_FILTER = 'all';
    COMMUNITY_SORT = 'newest';
    const search = $('communitySearch');
    const category = $('communityCategoryFilter');
    const sort = $('communitySort');
    if (search) search.value = '';
    if (category) category.value = 'all';
    if (sort) sort.value = 'newest';
    loadPosts({ resetPagination: true });
}

function setCommunityExploreMode(mode) {
    const nextMode = mode === 'rag' ? 'rag' : 'discover';
    COMMUNITY_EXPLORE_MODE = nextMode;
    const discoverPanel = $('communityDiscoverModePanel');
    const ragPanel = $('communityRagModePanel');
    document.querySelectorAll('[data-community-mode]').forEach((btn) => {
        const btnMode = String(btn.getAttribute('data-community-mode') || '').toLowerCase();
        const active = btnMode === nextMode;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (discoverPanel) discoverPanel.hidden = nextMode !== 'discover';
    if (ragPanel) ragPanel.hidden = nextMode !== 'rag';
}

function scrollToCommunitySection(sectionId) {
    const target = $(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCommunityFeedSummary(total, visible) {
    const summary = $('communityFeedSummary');
    if (!summary) return;
    const safeVisible = Number(visible || total || 0);
    const isFiltered = !!(COMMUNITY_SEARCH || '').trim() || COMMUNITY_CATEGORY_FILTER !== 'all';
    if (!safeVisible) {
        summary.textContent = 'Hiện chưa có bài viết nào. Bạn có thể là người mở đầu thảo luận.';
        return;
    }
    const currentPage = Math.floor(COMMUNITY_PAGE_OFFSET / COMMUNITY_PAGE_SIZE) + 1;
    if (isFiltered) {
        summary.textContent = `Đang hiển thị ${safeVisible} bài viết theo bộ lọc hiện tại (trang ${currentPage}).`;
        return;
    }
    summary.textContent = `Đang hiển thị ${safeVisible} bài viết trong trang ${currentPage}.`;
}

function renderCommunityPaginationSummary() {
    const summary = $('communityPaginationSummary');
    const prevBtn = $('communityPrevPageBtn');
    const nextBtn = $('communityNextPageBtn');
    if (!summary || !prevBtn || !nextBtn) return;
    const currentPage = Math.floor(COMMUNITY_PAGE_OFFSET / COMMUNITY_PAGE_SIZE) + 1;
    if (!COMMUNITY_PAGE_COUNT) {
        summary.textContent = 'Không có dữ liệu để phân trang.';
    } else {
        const start = COMMUNITY_PAGE_OFFSET + 1;
        const end = COMMUNITY_PAGE_OFFSET + COMMUNITY_PAGE_COUNT;
        summary.textContent = `Trang ${currentPage}: hiển thị bài ${start}-${end}.`;
    }
    prevBtn.disabled = COMMUNITY_PAGE_BUSY || COMMUNITY_PAGE_OFFSET <= 0;
    nextBtn.disabled = COMMUNITY_PAGE_BUSY || !COMMUNITY_HAS_MORE;
}

function goCommunityPrevPage() {
    if (COMMUNITY_PAGE_BUSY) return;
    if (COMMUNITY_PAGE_OFFSET <= 0) return;
    COMMUNITY_PAGE_OFFSET = Math.max(0, COMMUNITY_PAGE_OFFSET - COMMUNITY_PAGE_SIZE);
    loadPosts();
}

function goCommunityNextPage() {
    if (COMMUNITY_PAGE_BUSY) return;
    if (!COMMUNITY_HAS_MORE) return;
    COMMUNITY_PAGE_OFFSET += COMMUNITY_PAGE_SIZE;
    loadPosts();
}

function renderPendingDeleteButtons() {
    const isDeleting = COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.DELETING;
    document.querySelectorAll('.post-delete-btn[data-post-id]').forEach((btn) => {
        const id = String(btn.getAttribute('data-post-id') || '').trim();
        const isTarget = !!id && id === COMMUNITY_DELETE_TARGET_POST_ID;
        const isConfirm = isTarget && COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.ARMED;
        const isTargetDeleting = isTarget && isDeleting;
        btn.textContent = isTargetDeleting ? 'Đang xoá...' : (isConfirm ? 'Xác nhận xoá' : 'Xoá');
        btn.classList.toggle('confirm', isConfirm || isTargetDeleting);
        btn.disabled = isDeleting;
    });
}

function clearPendingDeleteState() {
    if (COMMUNITY_PENDING_DELETE_TIMER) {
        clearTimeout(COMMUNITY_PENDING_DELETE_TIMER);
        COMMUNITY_PENDING_DELETE_TIMER = null;
    }
    COMMUNITY_DELETE_TARGET_POST_ID = null;
    COMMUNITY_DELETE_STATE = COMMUNITY_DELETE_STATES.IDLE;
    logCommunityDeleteDebug('state_change', { state: COMMUNITY_DELETE_STATE, target: null });
    renderPendingDeleteButtons();
}

function setPostDeleteStatus(postId, type = null, message = '') {
    const id = String(postId || '').trim();
    if (!id) return;
    if (!type || !message) {
        delete COMMUNITY_POST_DELETE_STATUS[id];
    } else {
        COMMUNITY_POST_DELETE_STATUS[id] = { type: String(type), message: String(message) };
    }
    const status = COMMUNITY_POST_DELETE_STATUS[id];
    document.querySelectorAll(`.post-delete-status[data-post-id="${id}"]`).forEach((el) => {
        if (!status) {
            el.className = 'status post-delete-status';
            el.textContent = '';
            return;
        }
        el.className = `status post-delete-status status-${status.type}`;
        el.textContent = status.message;
    });
}

function renderPostDeleteStatusSlot(postId) {
    const id = String(postId || '').trim();
    const status = COMMUNITY_POST_DELETE_STATUS[id];
    const cls = status ? `status post-delete-status status-${status.type}` : 'status post-delete-status';
    const message = status ? escapeHtml(status.message) : '';
    return `<div class="${cls}" data-post-id="${escapeHtml(id)}">${message}</div>`;
}

function logCommunityDeleteDebug(event, payload = {}) {
    if (!COMMUNITY_DELETE_DEBUG) return;
    try {
        console.debug(`[community-delete] ${event}`, payload);
    } catch (_) { }
}
window.setCommunityDeleteDebug = function setCommunityDeleteDebug(enabled) {
    COMMUNITY_DELETE_DEBUG = !!enabled;
    console.info(`community delete debug: ${COMMUNITY_DELETE_DEBUG ? 'on' : 'off'}`);
};

function armPendingDeleteState(postId) {
    const previousTarget = COMMUNITY_DELETE_TARGET_POST_ID;
    COMMUNITY_DELETE_TARGET_POST_ID = String(postId || '').trim();
    COMMUNITY_DELETE_STATE = COMMUNITY_DELETE_STATES.ARMED;
    if (previousTarget && previousTarget !== COMMUNITY_DELETE_TARGET_POST_ID) {
        setPostDeleteStatus(previousTarget, null, '');
    }
    setPostDeleteStatus(COMMUNITY_DELETE_TARGET_POST_ID, 'info', 'Bấm lại để xác nhận xoá.');
    logCommunityDeleteDebug('state_change', { state: COMMUNITY_DELETE_STATE, target: COMMUNITY_DELETE_TARGET_POST_ID });
    renderPendingDeleteButtons();
    if (COMMUNITY_PENDING_DELETE_TIMER) clearTimeout(COMMUNITY_PENDING_DELETE_TIMER);
    COMMUNITY_PENDING_DELETE_TIMER = setTimeout(() => {
        clearPendingDeleteState();
        setStatus('communityStatus', null, '');
    }, 5000);
}

function setDeletingDeleteState(postId) {
    if (COMMUNITY_PENDING_DELETE_TIMER) {
        clearTimeout(COMMUNITY_PENDING_DELETE_TIMER);
        COMMUNITY_PENDING_DELETE_TIMER = null;
    }
    COMMUNITY_DELETE_TARGET_POST_ID = String(postId || '').trim();
    COMMUNITY_DELETE_STATE = COMMUNITY_DELETE_STATES.DELETING;
    logCommunityDeleteDebug('state_change', { state: COMMUNITY_DELETE_STATE, target: COMMUNITY_DELETE_TARGET_POST_ID });
    renderPendingDeleteButtons();
}

function renderAuthorBadge(role) {
    const key = String(role || '').toLowerCase();
    const label = COMMUNITY_ROLE_LABELS[key];
    if (!label) return '';
    return `<span class="community-role-badge ${key}">${escapeHtml(label)}</span>`;
}

function truncateCommunityText(text, maxLen = 180) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= maxLen) return raw;
    return `${raw.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function getCommunityPostById(postId) {
    const id = String(postId || '').trim();
    if (!id) return null;
    return (COMMUNITY_POST_CACHE || []).find(p => String(p.id || '') === id) || null;
}

function renderRelatedPostCards(items, emptyText = 'Chưa có bài viết liên quan.') {
    const safe = Array.isArray(items) ? items : [];
    if (!safe.length) return `<div class="muted">${escapeHtml(emptyText)}</div>`;
    return safe.map(item => `
        <a class="community-suggest-card" href="/community#post-${encodeURIComponent(item.id || '')}">
            <div class="community-suggest-title-row">
                <span class="community-category-badge">${escapeHtml(item.category || 'general')}</span>
            </div>
            <div class="community-suggest-title">${escapeHtml(item.title || 'Bài viết cộng đồng')}</div>
            <div class="community-suggest-meta">
                <span>${escapeHtml(item.author || 'Ẩn danh')}</span>
                <span>${timeAgo(item.timestamp)}</span>
            </div>
            <div class="community-suggest-stats">
                👍 ${Number(item.likes_count || 0)} · 💬 ${Number(item.comments_count || 0)}
            </div>
        </a>
    `).join('');
}

function renderRagCitationCards(items) {
    const safe = Array.isArray(items) ? items : [];
    if (!safe.length) return '<div class="muted">Không có nguồn trích dẫn phù hợp.</div>';
    return safe.map(item => `
        <a class="community-suggest-card" href="${escapeHtml(item.url || '/community')}" target="_self">
            <div class="community-suggest-title-row">
                <span class="community-category-badge">${escapeHtml(item.category || 'general')}</span>
                <span class="community-rag-score">độ liên quan ${Number(item.score || 0).toFixed(2)}</span>
            </div>
            <div class="community-suggest-title">${escapeHtml(item.title || 'Bài viết cộng đồng')}</div>
            <div class="community-rag-snippet">${escapeHtml(item.snippet || '')}</div>
        </a>
    `).join('');
}

async function askCommunityRag() {
    const input = $('communityRagQuestion');
    const answer = $('communityRagAnswer');
    const cites = $('communityRagCitations');
    if (!input || !answer || !cites) return;
    const question = (input.value || '').trim();
    if (question.length < 4) {
        setStatus('communityRagStatus', 'error', 'Câu hỏi quá ngắn.');
        return;
    }

    const current = readCurrent();
    const riasec = Array.isArray(current?.riasec) ? current.riasec.join('') : '';
    try {
        setStatus('communityRagStatus', 'info', 'Đang truy xuất tri thức cộng đồng...');
        const res = await fetch(`${API_BASE}/api/community/rag/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, top_k: 3, riasec })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        answer.textContent = data.answer || 'Không có câu trả lời.';
        cites.innerHTML = renderRagCitationCards(data.citations || []);
        setStatus('communityRagStatus', 'success', 'Đã trả lời với trích dẫn nguồn cộng đồng.');
    } catch (e) {
        setStatus('communityRagStatus', 'error', 'Không thể truy xuất câu trả lời.');
        answer.textContent = 'Không thể xử lý câu hỏi lúc này.';
        cites.innerHTML = '<div class="muted">Vui lòng thử lại sau.</div>';
    }
}

async function loadDraftRelatedPosts() {
    const box = $('communityDraftRelated');
    if (!box) return;
    const title = ($('postTitle')?.value || '').trim();
    const content = ($('postContent')?.value || '').trim();
    const category = ($('postCategory')?.value || 'general').trim();
    const text = `${title} ${content}`.trim();
    if (text.length < 8) {
        box.innerHTML = '<div class="muted">Nhập tiêu đề hoặc nội dung để xem gợi ý liên quan.</div>';
        return;
    }
    try {
        const params = new URLSearchParams();
        params.set('text', text);
        params.set('category', category);
        params.set('limit', '4');
        const res = await fetch(`${API_BASE}/api/community/related?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();
        box.innerHTML = renderRelatedPostCards(items, 'Chưa có bài viết tương tự.');
    } catch (_) {
        box.innerHTML = '<div class="status status-error">Không tải được bài viết liên quan.</div>';
    }
}

function queueDraftRelatedRefresh() {
    if (COMMUNITY_DRAFT_RELATED_TIMER) clearTimeout(COMMUNITY_DRAFT_RELATED_TIMER);
    COMMUNITY_DRAFT_RELATED_TIMER = setTimeout(loadDraftRelatedPosts, 280);
}

function setCommunityDraftSaveStatus(message) {
    const el = $('communityDraftSaveStatus');
    if (!el) return;
    el.textContent = message || 'Nháp bài viết chưa được lưu.';
}

function openCommunityComposerModal() {
    const modal = $('communityComposerModal');
    if (!modal) return;
    COMMUNITY_COMPOSER_LAST_FOCUSED = document.activeElement;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    const title = $('postTitle');
    if (title) title.focus();
}

function closeCommunityComposerModal() {
    const modal = $('communityComposerModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (COMMUNITY_COMPOSER_LAST_FOCUSED && typeof COMMUNITY_COMPOSER_LAST_FOCUSED.focus === 'function') {
        COMMUNITY_COMPOSER_LAST_FOCUSED.focus();
    }
}

function saveCommunityComposerDraft() {
    const title = ($('postTitle')?.value || '').trim();
    const category = ($('postCategory')?.value || 'general').trim();
    const author = ($('postAuthor')?.value || '').trim();
    const content = ($('postContent')?.value || '').trim();

    if (!title && !content) {
        localStorage.removeItem(COMMUNITY_DRAFT_KEY);
        setCommunityDraftSaveStatus('Nháp bài viết chưa được lưu.');
        return;
    }

    const payload = {
        title,
        category: category || 'general',
        author,
        content,
        at: new Date().toISOString()
    };
    localStorage.setItem(COMMUNITY_DRAFT_KEY, JSON.stringify(payload));
    setCommunityDraftSaveStatus(`Đã lưu nháp lúc ${new Date(payload.at).toLocaleTimeString('vi-VN')}`);
}

function restoreCommunityComposerDraft() {
    const raw = localStorage.getItem(COMMUNITY_DRAFT_KEY);
    if (!raw) {
        setCommunityDraftSaveStatus('Nháp bài viết chưa được lưu.');
        return;
    }

    try {
        const draft = JSON.parse(raw);
        if ($('postTitle') && !($('postTitle').value || '').trim()) $('postTitle').value = draft.title || '';
        if ($('postContent') && !($('postContent').value || '').trim()) $('postContent').value = draft.content || '';
        if ($('postCategory') && draft.category) $('postCategory').value = draft.category;
        if (!currentUser && $('postAuthor') && draft.author && !($('postAuthor').value || '').trim()) {
            $('postAuthor').value = draft.author;
        }
        const when = draft?.at ? new Date(draft.at).toLocaleString('vi-VN') : 'không rõ thời gian';
        setCommunityDraftSaveStatus(`Đã khôi phục nháp (${when}).`);
    } catch (_) {
        setCommunityDraftSaveStatus('Không thể đọc nháp bài viết.');
    }
}

function clearCommunityComposerDraft() {
    localStorage.removeItem(COMMUNITY_DRAFT_KEY);
    setCommunityDraftSaveStatus('Nháp đã được xoá sau khi đăng bài thành công.');
}

function initCommunityPageBindings() {
    if (COMMUNITY_BINDINGS_BOUND) return;
    COMMUNITY_BINDINGS_BOUND = true;

    ['postTitle', 'postContent', 'postCategory', 'postAuthor'].forEach((id) => {
        const el = $(id);
        if (!el) return;
        const onChange = () => {
            if (id === 'postTitle' || id === 'postContent' || id === 'postCategory') {
                queueDraftRelatedRefresh();
            }
            saveCommunityComposerDraft();
        };
        el.addEventListener('input', onChange);
        el.addEventListener('change', onChange);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && $('communityReportModal')?.classList.contains('active')) {
            closeCommunityReportModal();
            return;
        }
        if (e.key === 'Escape' && $('communityPostDetailModal')?.classList.contains('active')) {
            closeCommunityPostDetailModal();
            return;
        }
        if (e.key === 'Escape' && COMMUNITY_DELETE_STATE !== COMMUNITY_DELETE_STATES.IDLE) {
            clearPendingDeleteState();
            return;
        }
        if (e.key === 'Escape' && $('communityComposerModal')?.classList.contains('active')) {
            closeCommunityComposerModal();
        }
    });

    $('communityReportModal')?.addEventListener('click', (e) => {
        if (e.target === $('communityReportModal')) closeCommunityReportModal();
    });
    $('communityPostDetailModal')?.addEventListener('click', (e) => {
        if (e.target === $('communityPostDetailModal')) closeCommunityPostDetailModal();
    });
    $('communityComposerModal')?.addEventListener('click', (e) => {
        if (e.target === $('communityComposerModal')) closeCommunityComposerModal();
    });

    $('communityRagQuestion')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            askCommunityRag();
        }
    });

    restoreCommunityComposerDraft();
    queueDraftRelatedRefresh();
    setCommunityExploreMode(COMMUNITY_EXPLORE_MODE);
}

async function loadViewingRelatedPosts(postId) {
    const box = $('communityViewingRelated');
    const hint = $('communityViewingRelatedHint');
    if (!box) return;
    try {
        if (hint) hint.textContent = 'Đang xem liên quan cho bài viết đã chọn.';
        const params = new URLSearchParams();
        params.set('post_id', postId);
        params.set('limit', '5');
        const res = await fetch(`${API_BASE}/api/community/related?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();
        box.innerHTML = renderRelatedPostCards(items, 'Không tìm thấy bài liên quan cho nội dung này.');
    } catch (_) {
        box.innerHTML = '<div class="status status-error">Không tải được bài viết liên quan.</div>';
    }
}

async function loadCommunityMetrics() {
    const grid = $('communityMetricsGrid');
    if (!grid) return;
    try {
        const res = await fetch(`${API_BASE}/api/community/metrics`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const m = await res.json();
        const cards = [
            { label: 'Tổng bài viết', value: Number(m.total_posts || 0) },
            { label: 'Tổng bình luận', value: Number(m.total_comments || 0) },
            { label: 'Tổng lượt hữu ích', value: Number(m.total_likes || 0) },
            { label: 'Tương tác / bài', value: Number(m.engagement_per_post || 0).toFixed(2) },
            { label: 'Người dùng hoạt động 30 ngày', value: Number(m.active_authors_30d || 0) },
            { label: 'Bài mới 7 ngày', value: Number(m.posts_7d || 0) },
            { label: 'Bình luận mới 7 ngày', value: Number(m.comments_7d || 0) },
            { label: 'Bài được ghim', value: Number(m.pinned_posts || 0) },
        ];
        grid.innerHTML = cards.map(card => `
            <div class="community-metric-card">
                <div class="community-metric-label">${escapeHtml(card.label)}</div>
                <div class="community-metric-value">${escapeHtml(String(card.value))}</div>
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<div class="status status-error">Không thể tải chỉ số cộng đồng.</div>';
    }
}

function openCommunityReportModal(type, postId, commentId = null) {
    COMMUNITY_REPORT_TARGET = { type, postId, commentId };
    const modal = $('communityReportModal');
    const target = $('communityReportTarget');
    const reason = $('communityReportReason');
    const detail = $('communityReportDetail');
    if (!modal || !target || !reason || !detail) return;
    reason.value = 'spam';
    detail.value = '';
    setStatus('communityReportStatus', null, '');
    target.textContent = type === 'comment'
        ? 'Bạn đang báo cáo một bình luận.'
        : 'Bạn đang báo cáo một bài viết.';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeCommunityReportModal() {
    const modal = $('communityReportModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    COMMUNITY_REPORT_TARGET = null;
    setStatus('communityReportStatus', null, '');
}

function renderCommunityPostDetail(post) {
    if (!post) {
        return '<div class="empty-state">Không tìm thấy bài viết. Vui lòng tải lại bảng tin.</div>';
    }
    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
    const category = String(post.category || 'general').toLowerCase();
    const categoryLabel = COMMUNITY_CATEGORY_LABELS[category] || COMMUNITY_CATEGORY_LABELS.general;
    const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
    const canDelete = Boolean(post.can_delete) || isAdmin || (String(post.owner_actor || '') === getCommunityActorId());
    const commentsHtml = (post.comments || []).map(c => `
        <div class="comment-item">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.author)} ${renderAuthorBadge(c.author_role)}</span>
            <div class="comment-meta-right">
              <span class="comment-time">${timeAgo(c.timestamp)}</span>
              ${post.can_mark_helpful ? `
                <button class="comment-helpful-btn ${c.helpful ? 'active' : ''}"
                  onclick="markCommentHelpful('${post.id}', '${c.id}', ${c.helpful ? 'true' : 'false'})">
                  ${c.helpful ? 'Bỏ đánh dấu' : 'Đánh dấu hữu ích'}
                </button>
              ` : ''}
              <button class="comment-report-btn"
                  onclick="openCommunityReportModal('comment', '${post.id}', '${c.id}')">
                  Báo cáo
              </button>
            </div>
          </div>
          ${c.helpful ? '<div class="comment-helpful-badge">Phản hồi hữu ích</div>' : ''}
          <div class="comment-content">${escapeHtml(c.content)}</div>
        </div>
      `).join('');

    return `
      <div class="post-card post-card-detail" id="post-detail-${post.id}">
        <div class="post-header">
          <div>
            <div class="post-title">${escapeHtml(post.title || 'Bài viết cộng đồng')}</div>
            <div class="post-author">${escapeHtml(post.author)} ${renderAuthorBadge(post.author_role)}</div>
          </div>
          <div class="post-time">${timeAgo(post.timestamp)}</div>
        </div>
        <div class="post-meta-row">
          <div class="post-badges">
            ${post.is_pinned ? '<span class="community-pinned-badge">Ghim</span>' : ''}
            <span class="community-category-badge">${escapeHtml(categoryLabel)}</span>
          </div>
          <div class="post-actions-right">
            <div class="post-action-group">
              ${isAdmin ? `
                <button class="post-pin-btn ${post.is_pinned ? 'active' : ''}"
                  onclick="togglePostPin('${post.id}', ${post.is_pinned ? 'true' : 'false'})">
                  ${post.is_pinned ? 'Bỏ ghim' : 'Ghim'}
                </button>
              ` : ''}
              <button class="post-like-btn ${post.liked_by_me ? 'active' : ''}"
                onclick="togglePostLike('${post.id}', ${post.liked_by_me ? 'true' : 'false'})">
                👍 Hữu ích (${Number(post.likes_count || 0)})
              </button>
            </div>
            <div class="post-action-group">
              <button class="post-related-btn"
                onclick="loadViewingRelatedPosts('${post.id}')">
                Liên quan
              </button>
              <button class="post-report-btn"
                onclick="openCommunityReportModal('post', '${post.id}')">
                Báo cáo
              </button>
              ${canDelete ? `
                <button class="post-delete-btn"
                  data-post-id="${post.id}"
                  ${COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.DELETING ? 'disabled' : ''}
                  onclick="requestDeletePost('${post.id}')">
                  ${COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.ARMED && COMMUNITY_DELETE_TARGET_POST_ID === String(post.id) ? 'Xác nhận xoá' : 'Xoá'}
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        ${canDelete ? renderPostDeleteStatusSlot(post.id) : ''}
        <div class="post-engagement-row">
          <span class="post-engagement-item">💬 ${commentsCount} bình luận</span>
          <span class="post-engagement-item">👍 ${Number(post.likes_count || 0)} hữu ích</span>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        <div class="comment-section">
          <div class="comment-list" id="comments-${post.id}">
            ${commentsHtml || '<div class="muted">Chưa có bình luận nào.</div>'}
          </div>
          <div class="comment-form">
             <input type="text" id="comment-author-${post.id}" placeholder="Tên..." class="community-input comment-author-input" value="${getDefaultName()}">
             <input type="text" id="comment-content-${post.id}" placeholder="Viết bình luận..." class="community-input comment-content-input">
             <button class="btn btn-primary btn-small" onclick="addComment('${post.id}')">Gửi</button>
          </div>
        </div>
      </div>
    `;
}

function openCommunityPostDetailModal(postId) {
    COMMUNITY_DETAIL_TARGET_POST_ID = String(postId || '').trim();
    const modal = $('communityPostDetailModal');
    const body = $('communityPostDetailBody');
    if (!modal || !body || !COMMUNITY_DETAIL_TARGET_POST_ID) return;
    body.innerHTML = renderCommunityPostDetail(getCommunityPostById(COMMUNITY_DETAIL_TARGET_POST_ID));
    setStatus('communityPostDetailStatus', null, '');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    updateCommunityProfileLock();
}

function closeCommunityPostDetailModal() {
    const modal = $('communityPostDetailModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    COMMUNITY_DETAIL_TARGET_POST_ID = null;
    setStatus('communityPostDetailStatus', null, '');
}

async function executeDeletePost(postId) {
    const targetPostId = String(postId || '').trim();
    if (!targetPostId) return;
    if (COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.DELETING) return;
    setDeletingDeleteState(targetPostId);
    try {
        logCommunityDeleteDebug('execute_start', {
            postId: targetPostId,
            actorId: getCommunityActorId(),
            role: String(currentUser?.role || 'guest')
        });
        setStatus('communityStatus', 'info', 'Đang xoá bài viết...');
        setPostDeleteStatus(targetPostId, 'info', 'Đang xoá bài viết...');
        const res = await fetch(`${API_BASE}/api/community/posts/${encodeURIComponent(targetPostId)}`, {
            method: 'DELETE',
            headers: getCommunityWriteHeaders(),
            body: JSON.stringify({ actor_id: getCommunityActorId() })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            logCommunityDeleteDebug('execute_error', { postId: targetPostId, status: res.status, detail: err.detail || '' });
            throw new Error(err.detail || 'Không thể xoá bài viết.');
        }
        logCommunityDeleteDebug('execute_success', { postId: targetPostId, status: res.status });
        clearPendingDeleteState();
        setPostDeleteStatus(targetPostId, 'success', 'Đã xoá bài viết.');
        setStatus('communityStatus', 'success', 'Đã xoá bài viết.');
        setStatus('communityComposerQuickStatus', 'success', 'Đã xoá bài viết.');
        if (COMMUNITY_DETAIL_TARGET_POST_ID === targetPostId) {
            closeCommunityPostDetailModal();
        }
        await loadPosts();
        if (String(currentUser?.role || '').toLowerCase() === 'admin') {
            await loadCommunityReportsForAdmin();
        }
    } catch (e) {
        logCommunityDeleteDebug('execute_exception', { postId: targetPostId, message: e?.message || 'unknown_error' });
        setPostDeleteStatus(targetPostId, 'error', e.message || 'Xoá bài viết thất bại.');
        setStatus('communityStatus', 'error', e.message || 'Xoá bài viết thất bại.');
        if (COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.DELETING) {
            COMMUNITY_DELETE_STATE = COMMUNITY_DELETE_STATES.IDLE;
            renderPendingDeleteButtons();
        }
    }
}

function requestDeletePost(postId) {
    const targetPostId = String(postId || '').trim();
    if (!targetPostId) return;
    if (COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.DELETING) return;
    logCommunityDeleteDebug('request_click', {
        postId: targetPostId,
        pendingPostId: COMMUNITY_DELETE_TARGET_POST_ID || null,
        state: COMMUNITY_DELETE_STATE
    });
    if (COMMUNITY_DELETE_STATE !== COMMUNITY_DELETE_STATES.ARMED || COMMUNITY_DELETE_TARGET_POST_ID !== targetPostId) {
        armPendingDeleteState(targetPostId);
        setStatus('communityStatus', 'info', 'Bấm lại nút "Xác nhận xoá" để hoàn tất.');
        return;
    }
    executeDeletePost(targetPostId);
}

async function submitCommunityReport() {
    if (!COMMUNITY_REPORT_TARGET) return;
    const reason = $('communityReportReason')?.value || 'other';
    const detail = ($('communityReportDetail')?.value || '').trim();
    const { type, postId, commentId } = COMMUNITY_REPORT_TARGET;
    const endpoint = type === 'comment'
        ? `${API_BASE}/api/community/posts/${postId}/comments/${commentId}/report`
        : `${API_BASE}/api/community/posts/${postId}/report`;

    try {
        setStatus('communityReportStatus', 'info', 'Đang gửi báo cáo...');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: getCommunityWriteHeaders(),
            body: JSON.stringify({
                actor_id: getCommunityActorId(),
                reason,
                detail
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Không thể gửi báo cáo');
        }
        setStatus('communityStatus', 'success', 'Đã gửi báo cáo. Cảm ơn bạn đã phản hồi.');
        closeCommunityReportModal();
        await loadPosts();
        if (String(currentUser?.role || '').toLowerCase() === 'admin') {
            await loadCommunityReportsForAdmin();
        }
    } catch (e) {
        setStatus('communityReportStatus', 'error', e.message || 'Gửi báo cáo thất bại.');
    }
}

async function loadCommunityReportsForAdmin() {
    const role = String(currentUser?.role || '').toLowerCase();
    const listEl = $('communityAdminReportsList');
    if (!listEl) return;
    if (role !== 'admin') {
        listEl.innerHTML = 'Chỉ Admin mới xem được danh sách báo cáo.';
        return;
    }
    try {
        setStatus('communityAdminReportsStatus', 'info', 'Đang tải báo cáo...');
        const res = await fetch(`${API_BASE}/api/community/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const reports = Array.isArray(data.reports) ? data.reports : [];
        if (!reports.length) {
            listEl.innerHTML = 'Chưa có báo cáo nào.';
            setStatus('communityAdminReportsStatus', 'success', 'Không có báo cáo mở.');
            return;
        }
        listEl.innerHTML = reports.slice(0, 30).map((r, idx) => `
            <div class="community-report-item">
                <div class="community-report-head">
                    <strong>#${idx + 1} ${r.type === 'comment' ? 'Bình luận' : 'Bài viết'}</strong>
                    <span class="muted">${timeAgo(r.timestamp)}</span>
                </div>
                <div class="community-report-line">Tiêu đề: ${escapeHtml(r.post_title || 'Không có tiêu đề')}</div>
                <div class="community-report-line">Tác giả nội dung: ${escapeHtml(r.target_author || 'Ẩn danh')}</div>
                <div class="community-report-line">Lý do: ${escapeHtml(r.reason || 'other')}</div>
                <div class="community-report-line">Chi tiết: ${escapeHtml(r.detail || '-')}</div>
            </div>
        `).join('');
        setStatus('communityAdminReportsStatus', 'success', `Đã tải ${reports.length} báo cáo.`);
    } catch (e) {
        setStatus('communityAdminReportsStatus', 'error', 'Không thể tải danh sách báo cáo.');
    }
}

async function loadPosts(options = {}) {
    const container = $('postsContainer');
    if (!container) return; // Not on community page
    const resetPagination = !!options?.resetPagination;
    if (resetPagination) {
        COMMUNITY_PAGE_OFFSET = 0;
    }
    if (COMMUNITY_PAGE_BUSY) return;
    COMMUNITY_PAGE_BUSY = true;
    renderCommunityPaginationSummary();
    initCommunityPageBindings();
    container.setAttribute('aria-busy', 'true');
    const loadingTimer = setTimeout(() => {
        container.innerHTML = Array.from({ length: 3 }).map(() => `
            <div class="post-card">
                <div class="skeleton skeleton-line" style="width: 42%;"></div>
                <div class="skeleton skeleton-line" style="width: 26%; margin-top: 0.4rem;"></div>
                <div class="skeleton skeleton-line" style="width: 95%; margin-top: 0.8rem;"></div>
                <div class="skeleton skeleton-line" style="width: 88%;"></div>
                <div class="skeleton skeleton-line" style="width: 64%;"></div>
            </div>
        `).join('');
    }, 400);

    try {
        const params = new URLSearchParams();
        params.set('sort', COMMUNITY_SORT || 'newest');
        params.set('category', COMMUNITY_CATEGORY_FILTER || 'all');
        if ((COMMUNITY_SEARCH || '').trim()) params.set('search', COMMUNITY_SEARCH.trim());
        params.set('actor_id', getCommunityActorId());
        params.set('limit', String(COMMUNITY_PAGE_SIZE + 1));
        params.set('offset', String(COMMUNITY_PAGE_OFFSET));

        const res = await fetch(`${API_BASE}/api/community/posts?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load posts");
        const posts = await res.json();
        const allFetched = Array.isArray(posts) ? posts : [];
        COMMUNITY_HAS_MORE = allFetched.length > COMMUNITY_PAGE_SIZE;
        COMMUNITY_POST_CACHE = allFetched.slice(0, COMMUNITY_PAGE_SIZE);
        COMMUNITY_PAGE_COUNT = COMMUNITY_POST_CACHE.length;
        updateCommunityFeedSummary(COMMUNITY_POST_CACHE.length, COMMUNITY_POST_CACHE.length);

        if (COMMUNITY_POST_CACHE.length === 0) {
            if (COMMUNITY_PAGE_OFFSET > 0) {
                COMMUNITY_PAGE_OFFSET = Math.max(0, COMMUNITY_PAGE_OFFSET - COMMUNITY_PAGE_SIZE);
                COMMUNITY_PAGE_BUSY = false;
                return loadPosts();
            }
            const hasFilter = !!(COMMUNITY_SEARCH || '').trim() || COMMUNITY_CATEGORY_FILTER !== 'all';
            container.innerHTML = `
                <div class="empty-state">
                    ${hasFilter
                    ? 'Không tìm thấy bài viết phù hợp với bộ lọc hiện tại.'
                    : 'Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!'}
                    ${hasFilter ? `
                        <div class="center-actions">
                            <button class="btn btn-secondary" onclick="resetCommunityFilters()">Xóa bộ lọc</button>
                            <button class="btn btn-secondary" onclick="scrollToCommunitySection('communityCreateSection')">Viết bài mới</button>
                        </div>
                    ` : `
                        <div class="center-actions">
                            <button class="btn btn-primary" onclick="scrollToCommunitySection('communityCreateSection')">Tạo bài viết đầu tiên</button>
                        </div>
                    `}
                </div>
            `;
            closeCommunityPostDetailModal();
            return;
        }

        container.innerHTML = COMMUNITY_POST_CACHE.map(post => {
            const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
            const category = String(post.category || 'general').toLowerCase();
            const categoryLabel = COMMUNITY_CATEGORY_LABELS[category] || COMMUNITY_CATEGORY_LABELS.general;
            const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
            const excerpt = truncateCommunityText(post.content, 200);
            const canDelete = Boolean(post.can_delete) || isAdmin || (String(post.owner_actor || '') === getCommunityActorId());
            const isDeleteConfirm = COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.ARMED
                && COMMUNITY_DELETE_TARGET_POST_ID === String(post.id);

            return `
        <div class="post-card post-card-summary" id="post-${post.id}">
          <div class="post-header">
            <div>
              <div class="post-title">${escapeHtml(post.title || 'Bài viết cộng đồng')}</div>
              <div class="post-author">${escapeHtml(post.author)} ${renderAuthorBadge(post.author_role)}</div>
            </div>
            <div class="post-time">${timeAgo(post.timestamp)}</div>
          </div>
          <div class="post-meta-row">
            <div class="post-badges">
              ${post.is_pinned ? '<span class="community-pinned-badge">Ghim</span>' : ''}
            <span class="community-category-badge">${escapeHtml(categoryLabel)}</span>
          </div>
            <div class="post-actions-right post-summary-actions">
              <button class="btn btn-secondary btn-small"
                onclick="loadViewingRelatedPosts('${post.id}')">
                Liên quan
              </button>
              ${canDelete ? `
                <button class="post-delete-btn ${isDeleteConfirm ? 'confirm' : ''}"
                  data-post-id="${post.id}"
                  ${COMMUNITY_DELETE_STATE === COMMUNITY_DELETE_STATES.DELETING ? 'disabled' : ''}
                  onclick="requestDeletePost('${post.id}')">
                  ${isDeleteConfirm ? 'Xác nhận xoá' : 'Xoá'}
                </button>
              ` : ''}
              <button class="btn btn-primary btn-small"
                onclick="openCommunityPostDetailModal('${post.id}')">
                Xem chi tiết
              </button>
            </div>
          </div>
          ${canDelete ? renderPostDeleteStatusSlot(post.id) : ''}
          <div class="post-engagement-row">
            <span class="post-engagement-item">💬 ${commentsCount} bình luận</span>
            <span class="post-engagement-item">👍 ${Number(post.likes_count || 0)} hữu ích</span>
          </div>
          <div class="post-summary-excerpt">${escapeHtml(excerpt || 'Chưa có nội dung.')}</div>
        </div>
      `;
        }).join('');
        renderPendingDeleteButtons();

        if (COMMUNITY_DETAIL_TARGET_POST_ID) {
            const current = getCommunityPostById(COMMUNITY_DETAIL_TARGET_POST_ID);
            if (current) {
                const body = $('communityPostDetailBody');
                if (body) body.innerHTML = renderCommunityPostDetail(current);
                renderPendingDeleteButtons();
                updateCommunityProfileLock();
            } else {
                closeCommunityPostDetailModal();
            }
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="status status-error">Không thể tải bài viết.</div>';
        updateCommunityFeedSummary(0, 0);
        COMMUNITY_HAS_MORE = false;
        COMMUNITY_PAGE_COUNT = 0;
    } finally {
        clearTimeout(loadingTimer);
        container.setAttribute('aria-busy', 'false');
        COMMUNITY_PAGE_BUSY = false;
        renderCommunityPaginationSummary();
    }
    // Lock fields if user is already logged in
    updateCommunityProfileLock();
    if (String(currentUser?.role || '').toLowerCase() === 'admin') {
        loadCommunityReportsForAdmin();
    }
    loadCommunityMetrics();
}

function getDefaultName() {
    if (currentUser && currentUser.full_name) return currentUser.full_name;
    // Try to get from local storage if user took test
    const current = readCurrent();
    return current && current.name ? current.name : "";
}

function updateCommunityProfileLock() {
    const postAuthorHelp = $('postAuthorHelp');
    if (!currentUser) {
        if (postAuthorHelp) postAuthorHelp.textContent = 'Bạn có thể nhập tên hiển thị hoặc đăng nhập để dùng tên từ hồ sơ.';
        return;
    }
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
    if (postAuthorHelp) {
        postAuthorHelp.textContent = 'Tên đang lấy từ Hồ sơ cá nhân. Muốn đổi tên, hãy cập nhật ở trang Hồ sơ.';
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
    const titleInput = $('postTitle');
    const categoryInput = $('postCategory');
    const contentInput = $('postContent');
    const author = authorInput.value.trim();
    const title = titleInput.value.trim();
    const category = categoryInput?.value || 'general';
    const content = contentInput.value.trim();

    if (!title) {
        setStatus('communityStatus', 'error', 'Vui lòng nhập tiêu đề bài viết.');
        setStatus('communityComposerQuickStatus', null, '');
        return;
    }
    if (!content) {
        setStatus('communityStatus', 'error', 'Vui lòng nhập nội dung bài viết.');
        setStatus('communityComposerQuickStatus', null, '');
        return;
    }
    setStatus('communityStatus', 'info', 'Đang đăng bài...');
    setStatus('communityComposerQuickStatus', null, '');

    const $loadingOverlay = $('loadingOverlay');
    if ($loadingOverlay) {
        $loadingOverlay.classList.add('active');
        $loadingOverlay.setAttribute('aria-busy', 'true');
    }

    try {
        const res = await fetch(`${API_BASE}/api/community/posts`, {
            method: 'POST',
            headers: getCommunityWriteHeaders(),
            body: JSON.stringify({ author, title, category, content, actor_id: getCommunityActorId() })
        });

        if (res.ok) {
            // Clear inputs
            titleInput.value = '';
            contentInput.value = '';
            clearCommunityComposerDraft();
            loadDraftRelatedPosts();
            // Reload posts
            await loadPosts({ resetPagination: true });
            setStatus('communityStatus', 'success', 'Đăng bài thành công.');
            setStatus('communityComposerQuickStatus', 'success', 'Đăng bài thành công.');
            closeCommunityComposerModal();
        } else {
            const msg = await getApiErrorMessage(res, 'Đăng bài thất bại. Vui lòng thử lại.');
            setStatus('communityStatus', 'error', msg);
            setStatus('communityComposerQuickStatus', null, '');
        }
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', getExceptionMessage(e, 'Lỗi kết nối máy chủ.'));
        setStatus('communityComposerQuickStatus', null, '');
    } finally {
        if ($loadingOverlay) {
            $loadingOverlay.classList.remove('active');
            $loadingOverlay.setAttribute('aria-busy', 'false');
        }
    }
}

async function togglePostLike(postId, currentlyLiked) {
    try {
        const res = await fetch(`${API_BASE}/api/community/posts/${postId}/like`, {
            method: 'POST',
            headers: getCommunityWriteHeaders(),
            body: JSON.stringify({
                actor_id: getCommunityActorId(),
                liked: !currentlyLiked
            })
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Không thể cập nhật lượt hữu ích.'));
        await loadPosts();
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', getExceptionMessage(e, 'Không thể cập nhật lượt hữu ích. Vui lòng thử lại.'));
    }
}

async function togglePostPin(postId, currentlyPinned) {
    if (String(currentUser?.role || '').toLowerCase() !== 'admin') {
        setStatus('communityStatus', 'error', 'Chỉ Admin mới có quyền ghim bài.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/community/posts/${postId}/pin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pinned: !currentlyPinned })
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Không thể cập nhật trạng thái ghim.'));
        await loadPosts();
        setStatus('communityStatus', 'success', currentlyPinned ? 'Đã bỏ ghim bài viết.' : 'Đã ghim bài viết.');
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', getExceptionMessage(e, 'Không thể cập nhật trạng thái ghim.'));
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
            headers: getCommunityWriteHeaders(),
            body: JSON.stringify({ author, content, actor_id: getCommunityActorId() })
        });

        if (res.ok) {
            contentInput.value = '';
            await loadPosts(); // Simplest way to refresh UI
            setStatus('communityStatus', 'success', 'Đã thêm bình luận.');
        } else {
            setStatus('communityStatus', 'error', await getApiErrorMessage(res, 'Không thể gửi bình luận.'));
        }
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', getExceptionMessage(e, 'Không thể gửi bình luận. Vui lòng thử lại.'));
    }
}

async function markCommentHelpful(postId, commentId, currentlyHelpful) {
    if (!token) {
        setStatus('communityStatus', 'error', 'Bạn cần đăng nhập để đánh dấu phản hồi hữu ích.');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/community/posts/${postId}/comments/${commentId}/helpful`, {
            method: 'POST',
            headers: getCommunityWriteHeaders(),
            body: JSON.stringify({
                actor_id: getCommunityActorId(),
                helpful: !currentlyHelpful
            })
        });
        if (!res.ok) {
            let detail = 'Không thể đánh dấu bình luận hữu ích.';
            try {
                const err = await res.json();
                if (err?.detail) detail = String(err.detail);
            } catch (_) { }
            throw new Error(detail);
        }
        await loadPosts();
        setStatus('communityStatus', 'success', currentlyHelpful
            ? 'Đã bỏ đánh dấu phản hồi hữu ích.'
            : 'Đã đánh dấu phản hồi hữu ích.');
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', e.message || 'Không thể cập nhật phản hồi hữu ích.');
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
    PROFILE_INITIAL_STATE = getProfileFormState();
    initProfileDirtyTracking();
    updateProfileDirtyUI();
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
            const now = new Date();
            setStatus('profileStatus', 'success', `Đã lưu hồ sơ thành công lúc ${now.toLocaleTimeString('vi-VN')}.`);
            // Refresh currentUser logic
            const updatedUser = await res.json();
            currentUser = updatedUser;
            PROFILE_INITIAL_STATE = getProfileFormState();
            localStorage.setItem(PROFILE_LAST_SAVED_KEY, now.toISOString());
            updateProfileDirtyUI();
            updateAdminUI(); // Refresh header name if changed
            // Also update header explicitly if needed, but checkAuth handles it generally. 
            // Let's just re-run checkAuth to be safe or manually update nav
            const navAuth = $('navAuth');
            if (navAuth) {
                navAuth.innerHTML = `
                    <span class="nav-user">Xin chào, ${escapeHtml(currentUser.username)}</span>
                    <button onclick="logout()" class="btn btn-secondary nav-logout-btn">Đăng xuất</button>
                `;
            }
        } else {
            setStatus('profileStatus', 'error', 'Lưu hồ sơ thất bại.');
        }
    } catch (e) {
        console.error(e);
        setStatus('profileStatus', 'error', 'Lỗi kết nối. Vui lòng thử lại.');
    }
}

function getProfileFormState() {
    return {
        name: ($('profileName')?.value || '').trim(),
        class_name: ($('profileClass')?.value || '').trim(),
        school: ($('profileSchool')?.value || '').trim()
    };
}

function hasUnsavedProfileChanges() {
    if (!$('profileForm') || !PROFILE_INITIAL_STATE) return false;
    const now = getProfileFormState();
    return now.name !== PROFILE_INITIAL_STATE.name
        || now.class_name !== PROFILE_INITIAL_STATE.class_name
        || now.school !== PROFILE_INITIAL_STATE.school;
}
window.hasUnsavedProfileChanges = hasUnsavedProfileChanges;

function updateProfileDirtyUI() {
    const hint = $('profileDirtyHint');
    const lastSaved = $('profileLastSaved');
    if (hint) {
        hint.textContent = hasUnsavedProfileChanges()
            ? 'Bạn có thay đổi chưa lưu. Hãy bấm "Lưu thay đổi" trước khi rời trang.'
            : 'Tất cả thay đổi đã được lưu.';
    }
    if (lastSaved) {
        const raw = localStorage.getItem(PROFILE_LAST_SAVED_KEY);
        if (!raw) {
            lastSaved.textContent = '';
            return;
        }
        const when = new Date(raw);
        lastSaved.textContent = `Lưu gần nhất: ${isNaN(when) ? '-' : when.toLocaleString('vi-VN')}`;
    }
}

function initProfileDirtyTracking() {
    const form = $('profileForm');
    if (!form || PROFILE_DIRTY_BOUND) return;
    PROFILE_DIRTY_BOUND = true;

    ['profileName', 'profileClass', 'profileSchool'].forEach(id => {
        const el = $(id);
        if (el) {
            el.addEventListener('input', () => {
                updateProfileDirtyUI();
                if (hasUnsavedProfileChanges()) {
                    setStatus('profileStatus', 'info', 'Bạn có thay đổi chưa lưu.');
                }
            });
        }
    });

    window.addEventListener('beforeunload', (e) => {
        if (!hasUnsavedProfileChanges()) return;
        e.preventDefault();
        e.returnValue = '';
    });

document.addEventListener('click', (e) => {
        if (!hasUnsavedProfileChanges()) return;
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        if (!href || href.startsWith('#') || link.target === '_blank') return;
        if (window.confirm('Bạn có thay đổi chưa lưu ở hồ sơ. Rời trang mà không lưu?')) return;
        e.preventDefault();
}, true);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('communityReportModal')?.classList.contains('active')) {
        closeCommunityReportModal();
    }
});

$('communityReportModal')?.addEventListener('click', (e) => {
    if (e.target === $('communityReportModal')) closeCommunityReportModal();
});

['postTitle', 'postContent', 'postCategory'].forEach((id) => {
    const el = $(id);
    if (el) {
        el.addEventListener('input', queueDraftRelatedRefresh);
        el.addEventListener('change', queueDraftRelatedRefresh);
    }
});

$('communityRagQuestion')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        askCommunityRag();
    }
});
}
