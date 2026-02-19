// ===== UTILS =====
const $ = (id) => document.getElementById(id);
const readDB = () => JSON.parse(localStorage.getItem(DB_KEY) || '[]');
const writeDB = (arr) => localStorage.setItem(DB_KEY, JSON.stringify(arr));
const readCurrent = () => JSON.parse(localStorage.getItem(RIASEC_KEY) || 'null');
const writeCurrent = (obj) => localStorage.setItem(RIASEC_KEY, JSON.stringify(obj));
const TEST_AUTOSAVE_KEY = 'careervr_test_autosave_v1';
const TEST_CHUNK_SIZE = 10;
const TEST_TOTAL = 50;
const TEST_TOTAL_CHUNKS = Math.ceil(TEST_TOTAL / TEST_CHUNK_SIZE);
let CURRENT_TEST_CHUNK = 1;

// ===== PAGE NAVIGATION =====
function goPage(pageId) {
    if (typeof hasUnsavedProfileChanges === 'function' && hasUnsavedProfileChanges()) {
        const ok = window.confirm('Bạn có thay đổi chưa lưu ở hồ sơ. Rời trang mà không lưu?');
        if (!ok) return;
    }

    if (pageId === 'dashboard') {
        const role = String(currentUser?.role || '').toLowerCase();
        if (role !== 'admin') {
            window.location.href = token ? '/test' : '/login';
            return;
        }
    }

    const routes = {
        landing: '/',
        home: '/',
        test: '/test',
        results: '/results',
        chatbot: '/chatbot',
        vr: '/vr-mode',
        'vr-mode': '/vr-mode',
        dashboard: '/dashboard',
        community: '/community',
        profile: '/profile',
        login: '/login',
        signup: '/signup'
    };
    window.location.href = routes[pageId] || '/';
}

// ===== INIT TEST PAGE =====
function initTest() {
    const container = $('questionsContainer');
    if (!container) return;
    container.innerHTML = '';

    RIASEC_QUESTIONS.forEach((q, idx) => {
        const chunk = Math.floor(idx / TEST_CHUNK_SIZE) + 1;
        const html = `
    <div class="question-item" data-chunk="${chunk}">
      <label>Câu ${idx + 1}. ${q.q}</label>
      <div class="answer-options">
        ${[1, 2, 3, 4, 5].map(v => `
          <div class="answer-option">
            <input type="radio" name="q${idx}" value="${v}" id="q${idx}_${v}" onchange="updateProgress(); updateRealTimeScore(); saveTestAutosave()">
            <label for="q${idx}_${v}">${v}</label>
          </div>
        `).join('')}
      </div>
    </div>
  `;
        container.innerHTML += html;
    });

    ['name', 'class', 'school'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('input', saveTestAutosave);
    });

    restoreTestAutosave();
    showTestChunk(getSuggestedChunkFromCurrentAnswers());
    updateProgress();
    updateRealTimeScore();
}

function getSuggestedChunkFromCurrentAnswers() {
    for (let i = 0; i < TEST_TOTAL; i++) {
        const checked = document.querySelector(`input[name="q${i}"]:checked`);
        if (!checked) return Math.floor(i / TEST_CHUNK_SIZE) + 1;
    }
    return 1;
}

function showTestChunk(chunk) {
    const nextChunk = Math.max(1, Math.min(TEST_TOTAL_CHUNKS, Number(chunk) || 1));
    CURRENT_TEST_CHUNK = nextChunk;

    document.querySelectorAll('.question-item').forEach(item => {
        const itemChunk = Number(item.dataset.chunk || 1);
        item.style.display = itemChunk === CURRENT_TEST_CHUNK ? '' : 'none';
    });

    const indicator = $('chunkIndicator');
    if (indicator) indicator.textContent = `Phần ${CURRENT_TEST_CHUNK} / ${TEST_TOTAL_CHUNKS}`;

    const prevBtn = $('btnChunkPrev');
    const nextBtn = $('btnChunkNext');
    if (prevBtn) prevBtn.disabled = CURRENT_TEST_CHUNK <= 1;
    if (nextBtn) {
        nextBtn.disabled = CURRENT_TEST_CHUNK >= TEST_TOTAL_CHUNKS;
        nextBtn.textContent = CURRENT_TEST_CHUNK >= TEST_TOTAL_CHUNKS ? 'Đang ở phần cuối' : 'Phần tiếp theo';
    }
}

function nextTestChunk() {
    showTestChunk(CURRENT_TEST_CHUNK + 1);
}

function prevTestChunk() {
    showTestChunk(CURRENT_TEST_CHUNK - 1);
}

function setAutosaveLabel(text) {
    const el = $('testAutosaveStatus');
    if (el) el.textContent = text;
}

function saveTestAutosave() {
    const answers = [];
    for (let i = 0; i < TEST_TOTAL; i++) {
        const checked = document.querySelector(`input[name="q${i}"]:checked`);
        answers.push(checked ? Number(checked.value) : 0);
    }

    const payload = {
        at: new Date().toISOString(),
        chunk: CURRENT_TEST_CHUNK,
        name: $('name')?.value || '',
        class: $('class')?.value || '',
        school: $('school')?.value || '',
        answers
    };
    localStorage.setItem(TEST_AUTOSAVE_KEY, JSON.stringify(payload));
    setAutosaveLabel(`Đã tự lưu bản nháp lúc ${new Date(payload.at).toLocaleTimeString('vi-VN')}`);
}

function restoreTestAutosave() {
    const raw = localStorage.getItem(TEST_AUTOSAVE_KEY);
    if (!raw) {
        setAutosaveLabel('Chưa có bản nháp tự động.');
        return;
    }

    try {
        const draft = JSON.parse(raw);
        if ($('name') && typeof draft.name === 'string' && !$('name').value) $('name').value = draft.name;
        if ($('class') && typeof draft.class === 'string' && !$('class').value) $('class').value = draft.class;
        if ($('school') && typeof draft.school === 'string' && !$('school').value) $('school').value = draft.school;

        const answers = Array.isArray(draft.answers) ? draft.answers : [];
        answers.forEach((val, idx) => {
            if (!val) return;
            const radio = document.getElementById(`q${idx}_${val}`);
            if (radio) radio.checked = true;
        });

        const when = draft?.at ? new Date(draft.at).toLocaleString('vi-VN') : 'không rõ thời gian';
        setAutosaveLabel(`Đã khôi phục bản nháp (${when}).`);
        if (draft?.chunk) CURRENT_TEST_CHUNK = Number(draft.chunk) || 1;
    } catch (_) {
        setAutosaveLabel('Không đọc được bản nháp tự động.');
    }
}

// ===== PROGRESS TRACKING =====
function updateProgress() {
    const answered = document.querySelectorAll('input[type="radio"]:checked').length;
    const total = TEST_TOTAL;
    const percent = (answered / total) * 100;

    $('progressFill').style.width = percent + '%';
    $('progressText').textContent = `${answered} / ${total} câu`;
    const bar = document.querySelector('.progress-bar[role="progressbar"]');
    if (bar) bar.setAttribute('aria-valuenow', String(answered));

    if (answered === total) {
        $('estimatedTime').textContent = '✅ Sẵn sàng nộp';
    } else {
        const remaining = total - answered;
        $('estimatedTime').textContent = `~${Math.max(1, Math.ceil(remaining / 6))} phút còn lại`;
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

    tempEl.innerHTML = `<div class="muted" style="margin-bottom:0.5rem; color:#ffd700;">Điểm tạm thời</div>` + scoreHtml;
}

// Helper to sum scores without validation
function calculateSimpleScores() {
    const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    for (let i = 0; i < TEST_TOTAL; i++) {
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
    if (answered < TEST_TOTAL) {
        setStatus('testFormStatus', 'error', `Vui lòng trả lời hết ${TEST_TOTAL} câu (hiện tại ${answered}/${TEST_TOTAL}).`);
        return null;
    }
    setStatus('testFormStatus', null, '');

    const scores = calculateSimpleScores();
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3).map(x => x[0]);

    const answers = [];
    for (let i = 0; i < TEST_TOTAL; i++) answers.push(parseInt(document.querySelector(`input[name="q${i}"]:checked`)?.value) || 0);

    return { scores, top3, answered: TEST_TOTAL, raw_answers: answers };
}

const RIASEC_STORY_COPY = {
    R: 'Bạn thiên về trải nghiệm thực tế, thích làm việc trực tiếp và thấy rõ kết quả.',
    I: 'Bạn có xu hướng phân tích, thích tìm hiểu bản chất vấn đề và học theo chiều sâu.',
    A: 'Bạn có năng lực sáng tạo tốt, thích thể hiện ý tưởng và tìm cách làm mới.',
    S: 'Bạn quan tâm tới con người, phù hợp môi trường hợp tác và hỗ trợ cộng đồng.',
    E: 'Bạn có tinh thần chủ động, thích thuyết phục, dẫn dắt và tạo ảnh hưởng.',
    C: 'Bạn làm việc có cấu trúc, chú ý chi tiết và phù hợp quy trình rõ ràng.'
};

function escapeHtmlLocal(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderResultsStory(current, recommendations) {
    const profileEl = $('resultsStoryProfile');
    const whyEl = $('resultsStoryWhyFit');
    const nextEl = $('resultsStoryNextSteps');
    if (!profileEl || !whyEl || !nextEl) return;

    const scoreEntries = Object.entries(current?.scores || {})
        .filter(([_, v]) => typeof v === 'number')
        .sort((a, b) => b[1] - a[1]);
    const primary = scoreEntries[0]?.[0] || (Array.isArray(current?.riasec) ? current.riasec[0] : null);
    const secondary = scoreEntries[1]?.[0] || (Array.isArray(current?.riasec) ? current.riasec[1] : null);

    if (primary) {
        const pName = names[primary] || primary;
        const sName = secondary ? (names[secondary] || secondary) : '';
        const lead = secondary
            ? `Bạn nổi bật ở nhóm ${pName} và ${sName}.`
            : `Bạn nổi bật ở nhóm ${pName}.`;
        profileEl.textContent = `${lead} ${RIASEC_STORY_COPY[primary] || ''}`.trim();
    } else {
        profileEl.textContent = 'Hồ sơ của bạn đang được tổng hợp từ kết quả trắc nghiệm.';
    }

    const topJobs = (recommendations?.priority || []).slice(0, 2);
    if (topJobs.length) {
        whyEl.innerHTML = topJobs.map((job) => {
            const title = escapeHtmlLocal(job?.title || 'Nghề gợi ý');
            const code = escapeHtmlLocal(job?.riasec_code || '');
            return `<li><strong>${title}</strong> được ưu tiên vì khớp cao với hồ sơ ${code || 'RIASEC'} của bạn.</li>`;
        }).join('');
    } else {
        whyEl.innerHTML = `
            <li>Hệ thống đang ưu tiên các nghề có mức độ khớp cao nhất với điểm RIASEC của bạn.</li>
            <li>Bạn nên so sánh nhóm ưu tiên và nhóm dự phòng trước khi quyết định hướng đi.</li>
        `;
    }

    const firstTitle = topJobs[0]?.title ? escapeHtmlLocal(topJobs[0].title) : null;
    nextEl.innerHTML = `
        <li>${firstTitle ? `Mở VR để xem môi trường làm việc của <strong>${firstTitle}</strong>.` : 'Mở VR để xem môi trường công việc thực tế.'}</li>
        <li>Đặt câu hỏi cho AI về lộ trình kỹ năng phù hợp với điểm mạnh của bạn.</li>
        <li>Tham gia Cộng đồng để tham khảo kinh nghiệm từ học sinh có định hướng tương tự.</li>
    `;
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
        const suggest = $('resultsCommunitySuggestions');
        if (suggest) suggest.innerHTML = '<div class="muted">Làm trắc nghiệm để nhận thảo luận phù hợp.</div>';
        return;
    }

    if ($content) $content.style.display = 'block';
    if ($empty) $empty.style.display = 'none';

    $('riasecDisplay').textContent = (current.riasec || []).join('-');
    const dateStr = (current.time || current.date);
    const safeDate = (dateStr && !isNaN(new Date(dateStr))) ? new Date(dateStr).toLocaleDateString('vi-VN') : 'Mới nhất';
    $('resultTime').textContent = `Ngày: ${safeDate}`;
    renderResultsStory(current, current.recommendations || {});

    // Render Scores
    if (current.scores) {
        console.log("DEBUG: Scores found", current.scores);
        const DETAILS_EL = $('scoreDetails');
        if (DETAILS_EL) {
            DETAILS_EL.style.display = 'grid'; // Ensure visible
        }

        const scoreHtml = Object.entries(current.scores)
            .sort((a, b) => b[1] - a[1])
            .map(([type, score]) => {
                const percent = Math.min((score / 45) * 100, 100);
                return `
        <div class="score-card">
          <div class="score-head">
            <span style="font-weight: 600; color: ${colors[type]};">${names[type]}</span>
            <span style="color: #fff;">${score} điểm</span>
          </div>
          <div class="score-bar">
            <div class="score-fill" style="width: ${percent}%; background: ${colors[type]};"></div>
          </div>
        </div>`;
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

    try {
        if (!current.recommendations && current.scores) {
            current.recommendations = await fetchBackendRecommendations(current.scores);
            writeCurrent(current);
        }

        setGlobalRecommendations(current.recommendations || {});
        renderRecommendationSections(current.recommendations || {});
        renderResultsStory(current, current.recommendations || {});
    } catch (e) {
        console.error("Rec Error:", e);
        const container = $('majorContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">Lỗi tải gợi ý nghề nghiệp: ${escapeHtml(e.message)}</div>`;
        }
        renderResultsStory(current, {});
    }

    await loadCommunitySuggestions('resultsCommunitySuggestions', (current.riasec || []).join(''));
}

// ===== SHOW DASHBOARD =====
async function showDashboard() {
    const $content = $('dashboardContent');
    if (!$content) return;
    $content.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';

    try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (!token) {
            $content.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">
                <h3>Bạn chưa đăng nhập</h3>
                <p>Vui lòng đăng nhập với tài khoản Admin để xem thống kê.</p>
                <button onclick="goPage('login')" class="btn btn-primary">Đăng nhập</button>
            </div>`;
            return;
        }
        if (role && role !== 'admin') {
            $content.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">
                <h3>Trang dành cho Admin</h3>
                <p>Tài khoản hiện tại không có quyền xem dữ liệu thống kê.</p>
                <button onclick="goPage('test')" class="btn btn-primary">Đi tới bài trắc nghiệm</button>
            </div>`;
            return;
        }

        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_BASE}/api/submissions`, { headers });

        if (res.status === 401 || res.status === 403) {
            $content.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">
                <h3>Quyền truy cập bị từ chối</h3>
                <p>Trang này chỉ dành cho Quản trị viên (Admin).</p>
                <button onclick="goPage('landing')" class="btn btn-primary">Về trang chủ</button>
            </div>`;
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
        const topRiasec = Object.entries(riasecCounts).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
        const topCombo = finalCombos[0] || ['-', 0];
        const weeklySubmissions = Object.values(days).reduce((sum, n) => sum + n, 0);
        const latestDate = rows[0]?.time ? new Date(rows[0].time).toLocaleDateString('vi-VN') : 'Chưa có';
        // ... Table HTML generation continues below ...

        const html = `
        <div class="dashboard-insight-grid">
            <div class="dashboard-insight-card">
                <div class="dashboard-insight-label">Tổng bài nộp</div>
                <div class="dashboard-insight-value">${db.length}</div>
                <div class="muted">Cập nhật gần nhất: ${latestDate}</div>
            </div>
            <div class="dashboard-insight-card">
                <div class="dashboard-insight-label">RIASEC phổ biến</div>
                <div class="dashboard-insight-value">${escapeHtml(topRiasec[0])}</div>
                <div class="muted">${topRiasec[1]} lượt xuất hiện</div>
            </div>
            <div class="dashboard-insight-card">
                <div class="dashboard-insight-label">Tổ hợp phổ biến</div>
                <div class="dashboard-insight-value">${escapeHtml(topCombo[0])}</div>
                <div class="muted">${topCombo[1]} hồ sơ</div>
            </div>
            <div class="dashboard-insight-card">
                <div class="dashboard-insight-label">Xu hướng 7 ngày</div>
                <div class="dashboard-insight-value">${weeklySubmissions}</div>
                <div class="muted">Bài nộp trong tuần gần nhất</div>
            </div>
        </div>

        <div class="dashboard-table-wrap">
        <h3 style="margin-bottom: 1rem; color: #4d7cff;">Danh sách kết quả chi tiết (Toàn hệ thống)</h3>
        <table class="dashboard-table">
            <thead>
            <tr>
                <th>STT</th>
                <th>Ngày</th>
                <th>Họ tên</th>
                <th>RIASEC</th>
                <th>Các ngành gợi ý</th>
                <th>Tổ hợp xét tuyển</th>
            </tr>
            </thead>
            <tbody>
            ${rows.map((row, index) => `
                <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${(row.time && !isNaN(new Date(row.time))) ? new Date(row.time).toLocaleDateString('vi-VN') : 'Mới nhất'}</td>
                <td>
                    ${escapeHtml(row.name || 'Ẩn danh')}<br>
                    <span class="muted" style="font-size: 0.82rem;">${escapeHtml(row.class || '-')}</span>
                </td>
                <td style="text-align: center;">
                    <span class="badge">${escapeHtml((row.riasec || []).join('-'))}</span>
                </td>
                <td style="font-size: 0.85rem;">
                    ${row.suggestedMajors ? escapeHtml(row.suggestedMajors) : '<span class="muted">Chưa có dữ liệu</span>'}
                </td>
                <td style="font-size: 0.85rem;">
                    ${row.combinations ? escapeHtml(row.combinations) : '<span class="muted">-</span>'}
                </td>
                </tr>
            `).join('')}
            </tbody>
        </table>
        <div class="dashboard-meta">Tổng số bản ghi: <strong>${db.length}</strong></div>
        </div>`;
        $content.innerHTML = html;

    } catch (e) {
        $content.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">Lỗi tải dữ liệu: ${escapeHtml(e.message)}</div>`;
    }
}

// ===== RESET TEST =====
function resetTest() {
    if (!confirm('Xoá hết dữ liệu nhập liệu?')) return;
    document.getElementById('testForm').reset();
    $('progressFill').style.width = '0%';
    $('progressText').textContent = `0 / ${TEST_TOTAL} câu`;
    $('estimatedTime').textContent = '~10 phút';
    CURRENT_TEST_CHUNK = 1;
    showTestChunk(1);
    localStorage.removeItem(TEST_AUTOSAVE_KEY);
    setAutosaveLabel('Đã xóa bản nháp tự động.');

    localStorage.removeItem(RIASEC_KEY); // Removes 'current'
    sessionStorage.removeItem('conversation_id');
    const msgBox = $('messagesBox');
    if (msgBox) msgBox.innerHTML = '<div class="chat-message ai">Xin chào! Tôi sẵn sàng tư vấn cho bạn dựa trên kết quả RIASEC. Nhấn nút "Bắt đầu tư vấn" bên dưới để bắt đầu.</div>';

    const tempEl = $('tempScoreDisplay');
    if (tempEl) {
        tempEl.remove();
    }
    setStatus('testFormStatus', 'success', 'Đã làm mới dữ liệu cục bộ (dữ liệu trên server vẫn giữ nguyên).');
}

function clearAllData() {
    const content = $('dashboardContent');
    if (content) {
        content.insertAdjacentHTML('afterbegin', '<div class="status status-info">Dữ liệu hiện lưu tập trung trên server và không thể xóa toàn bộ từ giao diện này.</div>');
    }
}

function openClearDataModal() {
    const modal = $('clearDataModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    const confirmBtn = modal.querySelector('.btn.btn-primary');
    if (confirmBtn) confirmBtn.focus();
}

function closeClearDataModal(e) {
    const modal = $('clearDataModal');
    if (!modal) return;
    if (e && e.target && e.target !== modal && !e.target.closest('button')) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}
window.closeClearDataModal = closeClearDataModal;

function confirmDashboardClearData() {
    closeClearDataModal();
    clearAllData();
}

function buildCombinationSuggestion(top3 = []) {
    const first = top3[0] || 'R';
    const mapping = {
        R: "A00, A01, D01",
        I: "A00, A01, B00",
        A: "C00, D01, H00",
        S: "C00, D01, D14",
        E: "A01, D01, C00",
        C: "A00, D01, A01"
    };
    return mapping[first] || "A00, A01, D01";
}

// ===== SUBMIT TEST =====
async function submitTest() {
    try {
        if (!confirm('Bạn có chắc chắn muốn nộp bài?')) return;
        setStatus('testFormStatus', 'info', 'Đang xử lý kết quả...');

        const result = calculateRIASEC();
        if (!result) return;

        const { scores, top3, raw_answers } = result;
        let backendRecommendations = null;
        try {
            backendRecommendations = await fetchBackendRecommendations(scores);
        } catch (e) {
            console.warn("Backend recommendations unavailable, using fallback rendering later.", e);
        }
        const majorNames = (backendRecommendations?.top_4 || []).map(r => r.title).join(', ') || "Chưa xác định";
        const uniqueCombs = buildCombinationSuggestion(top3);

        const resultObj = {
            scores,
            riasec: top3,
            answers: raw_answers,
            recommendations: backendRecommendations,
            date: new Date().toISOString(),
            name: $('name').value,
            class: $('class').value,
            school: $('school').value
        };
        writeCurrent(resultObj);
        localStorage.removeItem(TEST_AUTOSAVE_KEY);
        setAutosaveLabel('Đã nộp bài. Bản nháp tự động đã được xóa.');

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
        setStatus('testFormStatus', 'error', 'Lỗi hệ thống: ' + err.message);
        console.error(err);
    }
}
