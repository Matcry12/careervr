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
        setStatus('communityStatus', 'error', 'Vui lòng nhập nội dung bài viết.');
        return;
    }
    setStatus('communityStatus', 'info', 'Đang đăng bài...');

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
            setStatus('communityStatus', 'success', 'Đăng bài thành công.');
        } else {
            setStatus('communityStatus', 'error', 'Đăng bài thất bại. Vui lòng thử lại.');
        }
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', 'Lỗi kết nối máy chủ.');
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
            setStatus('communityStatus', 'success', 'Đã thêm bình luận.');
        }
    } catch (e) {
        console.error(e);
        setStatus('communityStatus', 'error', 'Không thể gửi bình luận. Vui lòng thử lại.');
    }
}

// ===== ADMIN UI =====
function updateAdminUI() {
    if (currentUser && currentUser.role === 'admin') {
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
            setStatus('profileStatus', 'success', 'Đã lưu hồ sơ thành công.');
            // Refresh currentUser logic
            const updatedUser = await res.json();
            currentUser = updatedUser;
            updateAdminUI(); // Refresh header name if changed
            // Also update header explicitly if needed, but checkAuth handles it generally. 
            // Let's just re-run checkAuth to be safe or manually update nav
            const navAuth = $('navAuth');
            if (navAuth) {
                navAuth.innerHTML = `
                    <span class="nav-user">Hi, ${escapeHtml(currentUser.username)}</span>
                    <button onclick="logout()" class="btn btn-secondary nav-logout-btn">Logout</button>
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
