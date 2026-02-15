// ===== VR EXPERIENCE LOGIC =====
let GLOBAL_VR_JOBS = [];

async function fetchVRJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs`);
        if (res.ok) {
            GLOBAL_VR_JOBS = await res.json();
            const current = readCurrent();
            if (current && current.recommendations) {
                setGlobalRecommendations(current.recommendations);
            }
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

function renderVRJobs() {
    const jobs = [...GLOBAL_VR_JOBS];
    const container = $('vrGrid');
    if (!container) return;

    const isAdmin = document.body.classList.contains('is-admin');
    const recommendedOrder = GLOBAL_RECOMMENDED_IDS || [];
    jobs.sort((a, b) => {
        const ia = recommendedOrder.indexOf(a.id);
        const ib = recommendedOrder.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    container.innerHTML = jobs.map(job => `
        <div style="background: rgba(15, 31, 58, 0.6); border: 1px solid rgba(30, 42, 68, 0.5); padding: 1.5rem; border-radius: 12px; transition: transform 0.2s; position: relative;" class="vr-card">
          ${recommendedOrder.includes(job.id) ? `
            <div style="position: absolute; top: 10px; left: 10px; background: rgba(34,197,94,0.18); border: 1px solid rgba(34,197,94,0.6); color: #86efac; padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; z-index: 10;">
              Highly Recommended
            </div>
          ` : ''}
          ${isAdmin ? `
            <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 0.5rem; z-index: 10;">
                <button onclick="editVRJob('${job.id}')" style="background: rgba(0,0,0,0.5); border: 1px solid #4d7cff; color: #fff; border-radius: 4px; cursor: pointer; padding: 2px 6px;">✏️</button>
                <button onclick="deleteVRJob('${job.id}')" style="background: rgba(0,0,0,0.5); border: 1px solid #ff4d4f; color: #fff; border-radius: 4px; cursor: pointer; padding: 2px 6px;">🗑️</button>
            </div>
          ` : ''}
          
          <div style="cursor: pointer;" onclick="openVideoModal('${job.videoId}', '${escapeHtml(job.title)}')">
              <div style="font-size: 2.5rem; margin-bottom: 1rem;">${job.icon || '🎬'}</div>
              <h3 style="margin-bottom: 1rem; color: #4d7cff;">${job.title}</h3>
              <div style="font-size: 0.8rem; color: #9fb7ff; margin-bottom: 0.5rem;">RIASEC: ${escapeHtml(job.riasec_code || '---')}</div>
              
              <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; background: #000; margin-bottom: 1rem;">
                <img src="https://img.youtube.com/vi/${job.videoId}/mqdefault.jpg" style="position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0.7;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(26,60,255,0.8); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">▶</div>
              </div>

              <p style="font-size: 0.9rem; color: #9fb7ff;">${job.description}</p>
          </div>
        </div>
    `).join('');

    const controls = $('vrControls');
    if (controls) controls.style.display = 'block';
    // devTools visibility handled by admin-only class and updateAdminUI
}

function openVideoModal(videoId, title) {
    const modal = $('videoModal');
    const iframe = $('videoFrame');
    const titleEl = $('videoTitle');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    titleEl.textContent = title;
    modal.classList.add('active');
}

function closeVideoModal(e) {
    if (e && e.target !== $('videoModal') && !e.target.classList.contains('loading-modal')) return;
    if (e && e.target.closest && e.target.closest('.loading-modal') && e.target !== $('videoModal')) return;
    if (e && e.target !== $('videoModal')) {
        if (e.target.innerText !== '×' && !e.target.closest('button')) return;
    }
    const modal = $('videoModal');
    const iframe = $('videoFrame');
    iframe.src = "";
    modal.classList.remove('active');
}
window.closeVideoModal = () => {
    const modal = $('videoModal');
    const iframe = $('videoFrame');
    iframe.src = "";
    modal.classList.remove('active');
}



function resetVRData() {
    if (confirm('Bạn có chắc chắn muốn Reset dữ liệu VR về mặc định không?')) {
        localStorage.removeItem(VR_JOBS_KEY);
        renderVRJobs();
    }
}

function openDevModal() { $('devJobModal').classList.add('active'); }
function closeDevModal() {
    $('devJobModal').classList.remove('active');
    $('devJobId').value = '';
    $('devJobTitle').value = '';
    $('devJobVideoId').value = '';
    $('devJobRiasec').value = '';
    $('devJobDesc').value = '';
    $('devJobIcon').value = '';
}

function addNewVRJob() {
    $('devJobId').value = 'new';
    $('devJobTitle').value = '';
    $('devJobVideoId').value = '';
    $('devJobRiasec').value = 'RIC';
    $('devJobDesc').value = '';
    $('devJobIcon').value = '🎥';
    openDevModal();
}

function editVRJob(id) {
    const jobs = GLOBAL_VR_JOBS;
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    $('devJobId').value = job.id;
    $('devJobTitle').value = job.title;
    $('devJobVideoId').value = job.videoId;
    $('devJobRiasec').value = job.riasec_code || 'RIC';
    $('devJobDesc').value = job.description;
    $('devJobIcon').value = job.icon;

    openDevModal();
}

function saveDevJob() {
    const id = $('devJobId').value;
    const title = $('devJobTitle').value;
    const videoId = $('devJobVideoId').value;
    const riasec_code = ($('devJobRiasec').value || '').toUpperCase().replace(/[^RIASEC]/g, '');
    const description = $('devJobDesc').value;
    const icon = $('devJobIcon').value;

    if (!title || !videoId || riasec_code.length !== 3) {
        alert("Vui lòng nhập Tiêu đề, Video ID và mã RIASEC hợp lệ (3 ký tự).");
        return;
    }

    const jobs = [...GLOBAL_VR_JOBS];

    if (id === 'new') {
        jobs.push({
            id: 'job_' + Date.now(),
            title, videoId, riasec_code, description, icon
        });
    } else {
        const idx = jobs.findIndex(j => j.id === id);
        if (idx !== -1) {
            jobs[idx] = { ...jobs[idx], title, videoId, riasec_code, description, icon };
        }
    }
    saveVRJobs(jobs);
    closeDevModal();
}

async function downloadVRTemplate() {
    if (!token) {
        alert("Bạn phải đăng nhập Admin để tải mẫu.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs/template`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vr_jobs_template.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Không thể tải mẫu: " + e.message);
    }
}

async function handleImport() {
    if (!token) {
        alert("Bạn phải đăng nhập Admin để import.");
        return;
    }

    const input = $('vrImportFile');
    if (!input || !input.files || !input.files[0]) {
        alert("Vui lòng chọn file .xlsx trước khi tải lên.");
        return;
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);

    try {
        const res = await fetch(`${API_BASE}/api/vr-jobs/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || `HTTP ${res.status}`);
        }
        const msg = `Import thành công: tạo mới ${data.created}, cập nhật ${data.updated}, bỏ qua ${data.skipped}.`;
        alert(msg);
        const errorsEl = $('vrImportErrors');
        if (errorsEl) {
            errorsEl.innerHTML = (data.errors || []).length
                ? (data.errors || []).map(err => `<div style="color:#fca5a5;">• ${escapeHtml(err)}</div>`).join('')
                : '<div style="color:#86efac;">Không có lỗi.</div>';
        }
        input.value = '';
        fetchVRJobs();
    } catch (e) {
        alert("Import thất bại: " + e.message);
    }
}

function deleteVRJob(id) {
    if (!confirm('Xoá nghề này?')) return;
    const jobs = GLOBAL_VR_JOBS.filter(j => j.id !== id);
    saveVRJobs(jobs);
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
    window.scrollTo(0, document.body.scrollHeight);
}

