// ===== UTILS =====
const $ = (id) => document.getElementById(id);
const readDB = () => JSON.parse(localStorage.getItem(DB_KEY) || '[]');
const writeDB = (arr) => localStorage.setItem(DB_KEY, JSON.stringify(arr));
const readCurrent = () => JSON.parse(localStorage.getItem(RIASEC_KEY) || 'null');
const writeCurrent = (obj) => localStorage.setItem(RIASEC_KEY, JSON.stringify(obj));

// ===== PAGE NAVIGATION =====
function goPage(pageId) {
    if (pageId === 'landing') window.location.href = '/';
    else if (pageId === 'health') window.location.href = '/health-page';
    else window.location.href = '/' + pageId;
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

    try {
        if (!current.recommendations && current.scores) {
            current.recommendations = await fetchBackendRecommendations(current.scores);
            writeCurrent(current);
        }

        setGlobalRecommendations(current.recommendations || {});
        renderRecommendationSections(current.recommendations || {});
    } catch (e) {
        console.error("Rec Error:", e);
        const container = $('majorContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="color: #ff4d4f;">Lỗi tải gợi ý nghề nghiệp: ${e.message}</div>`;
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

