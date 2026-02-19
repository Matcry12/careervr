// ===== CHATBOT =====
let CHAT_SESSION_STATE = 'idle';

function updateChatSessionState(state, hintText = '') {
    CHAT_SESSION_STATE = state || 'idle';
    const pill = $('chatStatePill');
    const hint = $('chatSessionHint');
    const consultBtn = $('consultBtn');
    const input = $('chatInput');
    const sendBtn = $('chatSendBtn');
    const prompts = $('chatStarterPrompts');

    if (pill) {
        pill.classList.remove('idle', 'starting', 'active', 'sending', 'error');
        let label = 'Chưa bắt đầu';
        if (CHAT_SESSION_STATE === 'starting') label = 'Đang khởi tạo';
        if (CHAT_SESSION_STATE === 'active') label = 'Đang hoạt động';
        if (CHAT_SESSION_STATE === 'sending') label = 'Đang trả lời';
        if (CHAT_SESSION_STATE === 'error') label = 'Có lỗi';
        if (CHAT_SESSION_STATE === 'no_data') label = 'Thiếu dữ liệu';
        pill.textContent = label;
        if (CHAT_SESSION_STATE !== 'no_data') pill.classList.add(CHAT_SESSION_STATE);
    }

    if (hint && hintText) hint.textContent = hintText;
    if (prompts) prompts.classList.toggle('disabled', CHAT_SESSION_STATE === 'starting' || CHAT_SESSION_STATE === 'sending');
    if (consultBtn) consultBtn.disabled = CHAT_SESSION_STATE === 'starting' || CHAT_SESSION_STATE === 'sending';
    if (input) input.readOnly = CHAT_SESSION_STATE === 'sending';
    if (sendBtn) sendBtn.disabled = input?.disabled || CHAT_SESSION_STATE === 'starting' || CHAT_SESSION_STATE === 'sending';
}

function setChatInputEnabled(enabled) {
    const input = $('chatInput');
    const sendBtn = $('chatSendBtn');
    if (!input || !sendBtn) return;

    input.disabled = !enabled;
    sendBtn.disabled = !enabled;
    input.placeholder = enabled
        ? 'Hỏi AI về hướng nghiệp của bạn...'
        : 'Nhấn "Yêu cầu tư vấn" để bắt đầu.';
    if (CHAT_SESSION_STATE === 'sending') {
        input.readOnly = true;
        sendBtn.disabled = true;
    }
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

function getRiasecPromptTemplates(riasec = []) {
    const lead = String((riasec || [])[0] || '').toUpperCase();
    const map = {
        R: [
            'Em hợp nghề thực hành nào và cần chuẩn bị công cụ/kỹ năng gì?',
            'Lộ trình 3 tháng để phát triển kỹ năng kỹ thuật cho em là gì?'
        ],
        I: [
            'Em hợp các ngành phân tích nào và môn học nào nên ưu tiên?',
            'Em nên bắt đầu dự án học tập nào để tăng tư duy nghiên cứu?'
        ],
        A: [
            'Những ngành sáng tạo nào phù hợp với hồ sơ của em?',
            'Em nên xây portfolio thế nào để thể hiện điểm mạnh sáng tạo?'
        ],
        S: [
            'Em phù hợp công việc hỗ trợ con người nào và vì sao?',
            'Kế hoạch luyện kỹ năng giao tiếp/tư vấn trong 4 tuần nên làm gì?'
        ],
        E: [
            'Ngành kinh doanh/quản trị nào phù hợp nhất với em?',
            'Em nên phát triển kỹ năng lãnh đạo và thuyết phục từ đâu?'
        ],
        C: [
            'Em hợp các vai trò tổ chức/quy trình nào?',
            'Em nên học công cụ nào để làm việc dữ liệu - vận hành tốt hơn?'
        ]
    };
    return map[lead] || [
        'Ngành nào phù hợp nhất với hồ sơ RIASEC của em?',
        'Em nên bắt đầu học kỹ năng gì trong 30 ngày tới?'
    ];
}

function renderChatStarterPrompts(current) {
    const wrap = $('chatStarterPrompts');
    if (!wrap) return;
    const riasec = Array.isArray(current?.riasec) ? current.riasec : [];
    const prompts = getRiasecPromptTemplates(riasec);
    wrap.innerHTML = prompts.map(prompt => `
        <button class="chat-prompt-btn" type="button"
            onclick="applyChatStarterPrompt(this.dataset.prompt)"
            data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>
    `).join('');
}

function applyChatStarterPrompt(prompt) {
    const input = $('chatInput');
    if (!input) return;
    const text = String(prompt || '').trim();
    if (!text) return;
    input.value = text;
    input.focus();
    if (CHAT_SESSION_STATE === 'active') {
        sendChatMessage();
    } else {
        setStatus('chatStatus', 'info', 'Đã điền gợi ý vào ô chat. Nhấn "Yêu cầu tư vấn" để bắt đầu phiên.');
    }
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
        const suggest = $('chatCommunitySuggestions');
        if (suggest) suggest.innerHTML = '<div class="muted">Chưa có dữ liệu để gợi ý thảo luận.</div>';
        renderChatStarterPrompts(null);
        setChatInputEnabled(false);
        setChatSessionBanner('info', 'Cần hoàn thành bài trắc nghiệm trước khi bắt đầu phiên tư vấn.');
        updateChatSessionState('no_data', 'Bạn cần hoàn thành bài trắc nghiệm trước khi mở phiên tư vấn.');
        return;
    }

    renderChatStarterPrompts(current);
    const hasSession = !!sessionStorage.getItem('conversation_id');
    if (hasSession) {
        $('consultBtn').textContent = "🔄 Bắt đầu lại cuộc hội thoại";
        setChatInputEnabled(true);
        setChatSessionBanner('success', 'Phiên tư vấn đang hoạt động. Bạn có thể tiếp tục đặt câu hỏi.');
        updateChatSessionState('active', 'Phiên đang hoạt động. Bạn có thể gửi câu hỏi hoặc chọn gợi ý.');
    } else {
        $('consultBtn').textContent = "✨ Bắt đầu tư vấn";
        setChatInputEnabled(false);
        setChatSessionBanner('info', 'Chưa bắt đầu phiên tư vấn. Nhấn "Yêu cầu tư vấn" để mở phiên.');
        updateChatSessionState('idle', 'Bắt đầu phiên để gửi câu hỏi. Bạn có thể chọn sẵn một gợi ý bên dưới.');
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
    await loadCommunitySuggestions('chatCommunitySuggestions', (current.riasec || []).join(''));
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
    setChatInputEnabled(false);
    setChatSessionBanner('info', 'Đang khởi tạo phiên tư vấn...');
    updateChatSessionState('starting', 'Đang phân tích hồ sơ để tạo phiên tư vấn mới...');
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
            throw new Error(await getApiErrorMessage(response, 'Không thể khởi tạo phiên tư vấn.'));
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
        updateChatSessionState('active', 'Phiên đã sẵn sàng. Hãy hỏi sâu hơn về ngành học, kỹ năng hoặc lộ trình.');
    } catch (err) {
        console.error('❌ Fetch error:', err);
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', 'Xin lỗi, tôi chưa thể phản hồi lúc này. Vui lòng thử lại sau vài giây.');
        setStatus('chatStatus', 'error', getExceptionMessage(err, 'Không thể bắt đầu tư vấn. Vui lòng thử lại.'));
        setChatSessionBanner('error', 'Không thể mở phiên tư vấn. Vui lòng thử lại.');
        setChatInputEnabled(false);
        updateChatSessionState('error', 'Khởi tạo phiên thất bại. Bạn có thể thử lại sau vài giây.');
    } finally {
        if (CHAT_SESSION_STATE !== 'active') {
            updateChatSessionState(CHAT_SESSION_STATE, $('chatSessionHint')?.textContent || '');
        }
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
    updateChatSessionState('sending', 'AI đang xử lý câu hỏi. Vui lòng chờ phản hồi...');
    setChatSessionBanner('info', 'Đang gửi câu hỏi tới AI...');
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
            throw new Error(await getApiErrorMessage(response, 'Máy chủ đang bận. Vui lòng thử lại sau.'));
        }

        const data = await response.json();
        const aiResponse = data.ai_response || 'Không có phản hồi từ AI';
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', aiResponse);
        setStatus('chatStatus', null, '');
        setChatSessionBanner('success', 'Đã nhận phản hồi. Bạn có thể tiếp tục đặt câu hỏi.');
        updateChatSessionState('active', 'Phiên vẫn đang hoạt động. Tiếp tục hỏi để đào sâu kế hoạch.');
    } catch (err) {
        console.error('❌ Chat error:', err);
        if (loadingMsg) loadingMsg.remove();
        addChatMessage('ai', 'Xin lỗi, tôi chưa xử lý được câu hỏi này. Bạn thử diễn đạt ngắn hơn hoặc gửi lại.');
        setStatus('chatStatus', 'error', getExceptionMessage(err, 'Không thể gửi câu hỏi. Vui lòng thử lại.'));
        setChatSessionBanner('error', 'Gửi câu hỏi thất bại. Bạn có thể thử lại ngay.');
        updateChatSessionState('error', 'Không gửi được câu hỏi. Kiểm tra kết nối hoặc thử lại.');
    }
}
