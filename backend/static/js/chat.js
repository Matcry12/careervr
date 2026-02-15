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

