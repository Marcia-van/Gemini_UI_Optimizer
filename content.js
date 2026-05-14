let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

function initService() {
    if (document.getElementById('gemini-index-container')) {
        setupChatBoxToggle();
        return;
    }

    const container = document.createElement('div');
    container.id = 'gemini-index-container';
    container.innerHTML = `
        <div id="index-trigger">INDEX</div>
        <div id="index-list"></div>
    `;
    document.documentElement.appendChild(container);

    const trigger = document.getElementById('index-trigger');
    const list = document.getElementById('index-list');

    // --- 拖拽逻辑 (完全保留) ---
    trigger.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === trigger) isDragging = true;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, container);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.left = (xPos + 20) + "px";
        el.style.top = (yPos + window.innerHeight * 0.3) + "px";
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    // --- 【用户图片精准定位】更新逻辑 ---
    function updateIndexContent() {
        // 1. 获取用户文字标题
        const prompts = document.querySelectorAll('.query-text, .user-query-content, [data-test-id="user-query"]');

        // 2. 【核心修改】只选择“用户侧”容器内的图片
        // Gemini 2026 中，用户发送的图片通常带有 blob 链接，且位于 user-query 相关的容器内
        // 我们排除掉所有 model-response 或 ai-content 里的图片
        const userImages = document.querySelectorAll('.user-query-content img, [data-test-id="user-query"] img, img[src*="blob:"]');

        list.innerHTML = '';

        // 渲染文本条目
        prompts.forEach((p, i) => {
            const div = document.createElement('div');
            div.className = 'index-item';
            div.innerText = `${i + 1}. ${p.innerText.trim().substring(0, 16)}`;
            div.onclick = (e) => { e.stopPropagation(); p.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
            list.appendChild(div);
        });

        // 渲染用户图片条目 (Picture 1, 2...)
        let userPicCount = 0;
        userImages.forEach((img) => {
            // 过滤干扰：确保不是头像 (头像通常在 .user-avatar-image 等类名下)
            // 且宽度必须有一定规模
            const isAvatar = img.closest('.user-avatar-image, .avatar');
            if (!isAvatar && (img.offsetWidth > 60 || img.naturalWidth > 60)) {
                userPicCount++;
                const div = document.createElement('div');
                div.className = 'index-item pic-item';
                div.innerHTML = `🖼️ Picture ${userPicCount}`;

                if (!img.id) img.id = 'user-pic-' + userPicCount;
                div.onclick = (e) => {
                    e.stopPropagation();
                    img.scrollIntoView({ behavior: 'smooth', block: 'center' });
                };
                list.appendChild(div);
            }
        });

        if (prompts.length === 0 && userPicCount === 0) {
            list.innerHTML = '<div class="index-item" style="cursor:default">暂无内容</div>';
        }
    }

    // 监听 DOM 变化实现秒更新
    const observer = new MutationObserver(() => updateIndexContent());
    const chatTarget = document.querySelector('main, [role="main"]');
    if (chatTarget) {
        observer.observe(chatTarget, { childList: true, subtree: true });
    }

    updateIndexContent();
    setupChatBoxToggle();
}

// --- 对话框逻辑 (完全保留) ---
function setupChatBoxToggle() {
    const inputArea = document.querySelector('.input-area-container, [class*="input-area"], section[role="region"]');
    if (!inputArea || inputArea.hasAttribute('data-optimized')) return;
    inputArea.setAttribute('data-optimized', 'true');
    inputArea.classList.add('minimized-chat-box');
    inputArea.addEventListener('click', (e) => {
        if (inputArea.classList.contains('minimized-chat-box')) {
            inputArea.classList.remove('minimized-chat-box');
            const textarea = inputArea.querySelector('textarea, [contenteditable="true"]');
            if (textarea) textarea.focus();
            e.stopPropagation();
        }
    }, true);
    document.addEventListener('click', (e) => {
        if (!inputArea.contains(e.target) && !inputArea.classList.contains('minimized-chat-box')) {
            const textarea = inputArea.querySelector('textarea, [contenteditable="true"]');
            const hasText = textarea ? (textarea.value || textarea.innerText).trim().length > 0 : false;
            if (!hasText) inputArea.classList.add('minimized-chat-box');
        }
    });
}

setInterval(initService, 2000);