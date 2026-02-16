// ===== CHATBOT =====
function setChatInputEnabled(enabled) {
    const input = $('chatInput');
    const sendBtn = $('chatSendBtn');
    if (!input || !sendBtn) return;

    input.disabled = !enabled;
    sendBtn.disabled = !enabled;
    input.placeholder = enabled
        ? 'Hỏi AI về hướng nghiệp của bạn...'
        : 'Nhấn "Yêu cầu tư vấn" để bắt đầu.';
}

function setChatSessionBanner(type, message) {
    const banner = $('chatSessionBanner');
    if (!banner) return;
    banner.classList.remove('status-info', 'status-success', 'status-error');
    banner.classList.add(`status-${type || 'info'}`);
    banner.textContent = message || '';
}

function addChatLoadingMessage(text) {
    const messagesBox = $('messagesBox');
    if (!messagesBox) return null;
    const msg = document.createElement('div');
    msg.className = 'chat-message ai loading';
    msg.innerHTML = `<strong>AI:</strong><div style="margin-top: 0.35rem;">${escapeHtml(text || 'Đang suy nghĩ...')}</div>`;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return msg;
}

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
        ctx.innerHTML = 'Chưa có dữ liệu. Vui lòng <a href="/test" class="nav-link">làm trắc nghiệm</a> trước.';
        setChatInputEnabled(false);
        setChatSessionBanner('info', 'Cần hoàn thành bài trắc nghiệm trước khi bắt đầu phiên tư vấn.');
        $('consultBtn').disabled = false;
        return;
    }

    const hasSession = !!sessionStorage.getItem('conversation_id');
    if (hasSession) {
        $('consultBtn').textContent = "🔄 Bắt đầu lại cuộc hội thoại";
        setChatInputEnabled(true);
        setChatSessionBanner('success', 'Phiên tư vấn đang hoạt động. Bạn có thể tiếp tục đặt câu hỏi.');
    } else {
        $('consultBtn').textContent = "✨ Bắt đầu tư vấn";
        setChatInputEnabled(false);
        setChatSessionBanner('info', 'Chưa bắt đầu phiên tư vấn. Nhấn "Yêu cầu tư vấn" để mở phiên.');
    }

    ctx.innerHTML = `
  <div class="chat-context-grid">
    <div>
      <strong>👤 Học sinh:</strong> ${current.name || 'Ẩn danh'}
    </div>
    <div>
      <strong>📚 Lớp / Trường:</strong> ${current.class || '-'} / ${current.school || '-'}
    </div>
    <div>
      <strong>🎯 RIASEC:</strong> <span class="chat-context-badge">${current.riasec.join('-')}</span>
    </div>
    <div>
      <strong>⏱️ Ngày:</strong> ${(current.time && !isNaN(new Date(current.time))) ? new Date(current.time).toLocaleDateString('vi-VN') : 'Mới nhất'}
    </div>
  </div>
`;
    $('consultBtn').disabled = false;
}

function escapeHtml(text) {
    text = (text ?? '').toString();
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
    msg.className = `chat-message ${sender === 'user' ? 'user' : 'ai'} ${isLoading ? 'loading' : ''}`;

    if (sender === 'user') {
        msg.innerHTML = `<strong>Bạn:</strong> ${escapeHtml(text)}`;
    } else {
        const formattedText = formatMarkdownText(text);
        msg.innerHTML = `<strong>AI:</strong><div style="margin-top: 0.35rem;">${isLoading ? 'Đang suy nghĩ...' : formattedText}</div>`;
    }

    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

async function requestCounsel() {
    const current = readCurrent();
    if (!current) {
        setStatus('chatStatus', 'error', 'Vui lòng làm trắc nghiệm trước khi yêu cầu tư vấn.');
        return;
    }
    setStatus('chatStatus', null, '');

    const $consultBtn = $('consultBtn');
    $consultBtn.disabled = true;
    setChatInputEnabled(false);
    setChatSessionBanner('info', 'Đang khởi tạo phiên tư vấn...');
    const loadingMsg = addChatLoadingMessage('Đang phân tích hồ sơ và khởi tạo phiên...');

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

        if (loadingMsg) loadingMsg.remove();
        $('messagesBox').innerHTML = '';
        addChatMessage('user', "Hãy giới thiệu về các hướng nghiệp phù hợp cho tôi dựa trên kết quả RIASEC của tôi");
        addChatMessage('ai', aiResponse);
        $consultBtn.textContent = "🔄 Bắt đầu lại cuộc hội thoại";
        setStatus('chatStatus', 'success', 'Đã bắt đầu cuộc hội thoại mới.');
        setChatSessionBanner('success', 'Phiên tư vấn đang hoạt động. Bạn có thể tiếp tục đặt câu hỏi.');
        setChatInputEnabled(true);
    } catch (err) {
        console.error('❌ Fetch error:', err);
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', 'Xin lỗi, tôi chưa thể phản hồi lúc này. Vui lòng thử lại sau vài giây.');
        setStatus('chatStatus', 'error', 'Không thể bắt đầu tư vấn. Vui lòng thử lại.');
        setChatSessionBanner('error', 'Không thể mở phiên tư vấn. Vui lòng thử lại.');
        setChatInputEnabled(false);
    } finally {
        $consultBtn.disabled = false;
    }
}

async function sendChatMessage() {
    const input = $('chatInput');
    const text = input.value.trim();
    if (!text) return;

    const conversationId = sessionStorage.getItem('conversation_id');
    if (!conversationId) {
        setStatus('chatStatus', 'info', 'Vui lòng nhấn "Yêu cầu tư vấn" để bắt đầu cuộc trò chuyện.');
        setChatInputEnabled(false);
        return;
    }

    addChatMessage('user', text);
    input.value = '';
    const loadingMsg = addChatLoadingMessage('Đang trả lời...');

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
                throw new Error("Cuộc hội thoại đã hết hạn. Hãy bắt đầu lại.");
            }
            throw new Error(`Máy chủ đang bận (${response.status}).`);
        }

        const data = await response.json();
        const aiResponse = data.ai_response || 'Không có phản hồi từ AI';
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', aiResponse);
        setStatus('chatStatus', null, '');
    } catch (err) {
        console.error('❌ Chat error:', err);
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', 'Xin lỗi, tôi chưa xử lý được câu hỏi này. Bạn thử diễn đạt ngắn hơn hoặc gửi lại.');
        setStatus('chatStatus', 'error', err.message);
    }
}
