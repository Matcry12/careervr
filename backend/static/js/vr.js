// ===== VR EXPERIENCE LOGIC =====
let GLOBAL_VR_JOBS = [];
let LAST_FOCUSED_ELEMENT = null;
const VR_LAST_IMPORT_KEY = 'careervr_last_import_result_v1';

function renderLastImportSummary() {
    const box = $('vrLastImport');
    if (!box) return;

    const raw = localStorage.getItem(VR_LAST_IMPORT_KEY);
    if (!raw) {
        box.textContent = 'Chưa có lịch sử import gần đây.';
        return;
    }

    try {
        const data = JSON.parse(raw);
        const when = data?.at ? new Date(data.at).toLocaleString('vi-VN') : 'Không rõ thời gian';
        const created = Number(data?.created || 0);
        const updated = Number(data?.updated || 0);
        const skipped = Number(data?.skipped || 0);
        box.textContent = `Lần import gần nhất (${when}): Tạo mới ${created}, Cập nhật ${updated}, Bỏ qua ${skipped}.`;
    } catch (_) {
        box.textContent = 'Không đọc được lịch sử import gần đây.';
    }
}

function updateVRImportSelectionState() {
    const input = $('vrImportFile');
    const fileLabel = $('vrSelectedFile');
    const importBtn = $('btnVrImport');
    if (!input || !fileLabel || !importBtn) return;

    const file = input.files && input.files[0] ? input.files[0] : null;
    const isValid = !!file && /\.xlsx$/i.test(file.name || '');
    importBtn.disabled = !isValid;

    if (!file) {
        fileLabel.textContent = 'Chưa chọn file import.';
        return;
    }

    if (!isValid) {
        fileLabel.textContent = `File không hợp lệ: ${file.name}. Vui lòng chọn file .xlsx`;
        return;
    }

    fileLabel.textContent = `Đã chọn: ${file.name}`;
}

function initVRImportUI() {
    const input = $('vrImportFile');
    if (!input) return;
    input.addEventListener('change', updateVRImportSelectionState);
    updateVRImportSelectionState();
    renderLastImportSummary();
}

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
        setStatus('vrImportStatus', 'error', 'Bạn cần đăng nhập Admin để thực hiện thao tác này.');
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
            setStatus('vrImportStatus', 'success', 'Đã lưu danh sách nghề thành công.');
        } else {
            setStatus('vrImportStatus', 'error', 'Không thể lưu dữ liệu. Vui lòng kiểm tra quyền Admin.');
        }
    } catch (e) {
        setStatus('vrImportStatus', 'error', "Lỗi kết nối: " + e.message);
    }
}

function renderVRJobs() {
    const jobs = [...GLOBAL_VR_JOBS];
    const container = $('vrGrid');
    if (!container) return;

    const isAdmin = document.body.classList.contains('is-admin');
    if (!jobs.length) {
        container.innerHTML = `
            <div class="vr-empty-state">
                <h3>Chưa có video nghề nghiệp</h3>
                <p class="muted">Danh sách nghề hiện đang trống. ${isAdmin ? 'Bạn có thể thêm nghề mới hoặc import từ file Excel.' : 'Vui lòng quay lại sau hoặc liên hệ quản trị viên để cập nhật nội dung.'}</p>
                ${isAdmin ? '<div class="vr-empty-actions"><button class="btn btn-primary" onclick="addNewVRJob()">Thêm nghề mới</button></div>' : ''}
            </div>
        `;
        const controls = $('vrControls');
        if (controls) controls.style.display = 'block';
        return;
    }

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
        <div class="vr-card">
          ${recommendedOrder.includes(job.id) ? `
            <div class="vr-recommended">
              Gợi ý ưu tiên
            </div>
          ` : ''}
          ${isAdmin ? `
            <div class="vr-admin-actions-float">
                <button onclick="editVRJob('${job.id}')" class="vr-admin-btn" aria-label="Sửa nghề">✏️</button>
                <button onclick="deleteVRJob('${job.id}')" class="vr-admin-btn delete" aria-label="Xóa nghề">🗑️</button>
            </div>
          ` : ''}
          
          <div class="vr-card-main" role="button" tabindex="0"
            onclick="openVideoModal('${job.videoId}', '${escapeHtml(job.title)}')"
            onkeydown="if(event.key==='Enter' || event.key===' '){event.preventDefault();openVideoModal('${job.videoId}', '${escapeHtml(job.title)}')}">
              <div class="vr-icon">${job.icon || '🎬'}</div>
              <h3 class="vr-title">${escapeHtml(job.title)}</h3>
              <div class="muted vr-riasec">RIASEC: ${escapeHtml(job.riasec_code || '---')}</div>
              
              <div class="vr-thumb">
                <img src="https://img.youtube.com/vi/${job.videoId}/mqdefault.jpg" alt="Thumbnail ${escapeHtml(job.title)}">
                <div class="vr-play">▶</div>
              </div>

              <p class="muted vr-desc">${escapeHtml(job.description || '')}</p>
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
    LAST_FOCUSED_ELEMENT = document.activeElement;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    titleEl.textContent = title;
    modal.classList.add('active');
    const closeBtn = modal.querySelector('.icon-btn');
    if (closeBtn) closeBtn.focus();
}

function closeVideoModal(e) {
    if (e && e.target && e.target !== $('videoModal') && !e.target.closest('button')) return;
    const modal = $('videoModal');
    const iframe = $('videoFrame');
    iframe.src = "";
    modal.classList.remove('active');
    if (LAST_FOCUSED_ELEMENT && typeof LAST_FOCUSED_ELEMENT.focus === 'function') {
        LAST_FOCUSED_ELEMENT.focus();
    }
}
window.closeVideoModal = () => {
    const modal = $('videoModal');
    const iframe = $('videoFrame');
    iframe.src = "";
    modal.classList.remove('active');
    if (LAST_FOCUSED_ELEMENT && typeof LAST_FOCUSED_ELEMENT.focus === 'function') {
        LAST_FOCUSED_ELEMENT.focus();
    }
}



function resetVRData() {
    if (confirm('Bạn có chắc chắn muốn Reset dữ liệu VR về mặc định không?')) {
        localStorage.removeItem(VR_JOBS_KEY);
        renderVRJobs();
        setStatus('vrImportStatus', 'info', 'Đã reset dữ liệu cục bộ.');
    }
}

function openDevModal() {
    LAST_FOCUSED_ELEMENT = document.activeElement;
    $('devJobModal').classList.add('active');
    const firstField = $('devJobTitle');
    if (firstField) firstField.focus();
}
function closeDevModal() {
    $('devJobModal').classList.remove('active');
    $('devJobId').value = '';
    $('devJobTitle').value = '';
    $('devJobVideoId').value = '';
    $('devJobRiasec').value = '';
    $('devJobDesc').value = '';
    $('devJobIcon').value = '';
    setStatus('vrModalStatus', null, '');
    if (LAST_FOCUSED_ELEMENT && typeof LAST_FOCUSED_ELEMENT.focus === 'function') {
        LAST_FOCUSED_ELEMENT.focus();
    }
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
        setStatus('vrModalStatus', 'error', 'Vui lòng nhập Tiêu đề, Video ID và mã RIASEC hợp lệ (3 ký tự).');
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
        setStatus('vrImportStatus', 'error', 'Bạn cần đăng nhập Admin để tải mẫu.');
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
        setStatus('vrImportStatus', 'success', 'Đã tải file mẫu thành công.');
    } catch (e) {
        setStatus('vrImportStatus', 'error', "Không thể tải mẫu: " + e.message);
    }
}

async function handleImport() {
    if (!token) {
        setStatus('vrImportStatus', 'error', 'Bạn cần đăng nhập Admin để import.');
        return;
    }

    const input = $('vrImportFile');
    const importBtn = $('btnVrImport');
    if (!input || !input.files || !input.files[0]) {
        setStatus('vrImportStatus', 'error', 'Vui lòng chọn file .xlsx trước khi tải lên.');
        updateVRImportSelectionState();
        return;
    }
    if (!/\.xlsx$/i.test(input.files[0].name || '')) {
        setStatus('vrImportStatus', 'error', 'File không hợp lệ. Vui lòng chọn file .xlsx');
        updateVRImportSelectionState();
        return;
    }

    if (importBtn) importBtn.disabled = true;
    setStatus('vrImportStatus', 'info', 'Đang import dữ liệu...');
    setStatus('vrImportErrors', null, '');

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
        setStatus('vrImportStatus', 'success', msg);
        localStorage.setItem(VR_LAST_IMPORT_KEY, JSON.stringify({
            at: new Date().toISOString(),
            created: Number(data.created || 0),
            updated: Number(data.updated || 0),
            skipped: Number(data.skipped || 0)
        }));
        renderLastImportSummary();
        const errorsEl = $('vrImportErrors');
        if (errorsEl) {
            errorsEl.innerHTML = (data.errors || []).length
                ? (data.errors || []).map(err => `<div>• ${escapeHtml(err)}</div>`).join('')
                : '';
        }
        input.value = '';
        updateVRImportSelectionState();
        fetchVRJobs();
    } catch (e) {
        setStatus('vrImportStatus', 'error', "Import thất bại: " + e.message);
    } finally {
        updateVRImportSelectionState();
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

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('videoModal')?.classList.contains('active')) {
        closeVideoModal();
    }
    if ($('devJobModal')?.classList.contains('active')) {
        closeDevModal();
    }
});
