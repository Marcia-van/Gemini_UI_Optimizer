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

    // --- 拖拽逻辑 ---
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
        const prompts = document.querySelectorAll('.query-text, .user-query-content, [data-test-id="user-query"]');
        const userImages = document.querySelectorAll('.user-query-content img, [data-test-id="user-query"] img, img[src*="blob:"]');

        list.innerHTML = '';

        prompts.forEach((p, i) => {
            const div = document.createElement('div');
            div.className = 'index-item';
            div.innerText = `${i + 1}. ${p.innerText.trim().substring(0, 16)}`;
            div.onclick = (e) => { e.stopPropagation(); p.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
            list.appendChild(div);
        });

        let userPicCount = 0;
        userImages.forEach((img) => {
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

    const observer = new MutationObserver(() => updateIndexContent());
    const chatTarget = document.querySelector('main, [role="main"]');
    if (chatTarget) {
        observer.observe(chatTarget, { childList: true, subtree: true });
    }

    updateIndexContent();
    setupChatBoxToggle();
}

function setupChatBoxToggle() {
    const inputArea = document.querySelector('.input-area-container, [class*="input-area"], section[role="region"]');

    // 如果找不到输入框，直接退出
    if (!inputArea) return;

    // --- 新增判断：没有任何对话内容时，执行“提拉”位置，但不执行“收起”逻辑 ---
    const hasConversations = document.querySelectorAll('.query-text, .user-query-content, [data-test-id="user-query"]').length > 0;

    if (!hasConversations) {
        // 场景：首页。我们把框往上提，避免遮挡下方建议卡片
        inputArea.style.marginTop = '-120px'; // 这个负值越大，向上提得越高
        inputArea.style.transition = 'margin 0.3s ease';
        // 首页状态下移除收起类名，确保它是大的
        inputArea.classList.remove('minimized-chat-box');

        // 重要：首页不标记 data-optimized，不创建📌按钮，直接返回
        return;
    } else {
        // 场景：对话页。重置 margin，准备进入优化逻辑
        if (!inputArea.hasAttribute('data-optimized')) {
            inputArea.style.marginTop = '0px';
        }
    }

    // 如果已经处理过了（即已经发过消息且按钮已创建），则退出
    if (inputArea.hasAttribute('data-optimized')) return;

    // 执行到这里，说明已经有对话了，开始执行优化逻辑
    inputArea.setAttribute('data-optimized', 'true');
    inputArea.classList.add('minimized-chat-box');
    inputArea.style.position = 'relative';

// --- 在左下角添加与 Chat 按钮风格一致的 OK 按钮 ---
    if (!document.getElementById('chat-ok-auto-btn')) {
        const okBtn = document.createElement('div');
        okBtn.id = 'chat-ok-auto-btn';
        okBtn.innerHTML = 'OK';

// 获取右侧 Chat 按钮的背景色（通常是带有透明度的淡绿色）来匹配
okBtn.style = `
    position: fixed; 
    /* 自由调整位置：修改 right 和 bottom 的数值即可 */
    right: 42px;           
    bottom: 130px;          
    width: 50px;           /* 缩小了一点 */
    height: 40px; 
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #FFD95F; 
    color: #C08552;        
    cursor: pointer; 
    font-size: 10px;       /* 配合星星形状，文字调小一点 */
    font-weight: bold;     
    z-index: 10000;        
    backdrop-filter: blur(8px); 
    transition: all 0.2s ease;
    user-select: none;
    /* 星星形状的关键代码 */
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;
        document.body.appendChild(okBtn);

        // 鼠标悬停交互：模拟原生的变色效果
        okBtn.onmouseenter = () => {
            okBtn.style.backgroundColor = '#ffd95f';
            okBtn.style.transform = 'scale(1.05)';
        };
        okBtn.onmouseleave = () => {
            okBtn.style.backgroundColor = '#ffd95f';
            okBtn.style.transform = 'scale(1)';
        };

        // 点击自动发送 OK 的逻辑
okBtn.onclick = (e) => {
            e.stopPropagation();
            // 1. 精准定位当前的输入框
            const textarea = document.querySelector('.input-area-container textarea, [contenteditable="true"], textarea');

            // 2. 改进的选择器：只寻找【输入框容器内部】的那个发送按钮，避开侧边栏和顶部的按钮
            const inputContainer = document.querySelector('.input-area-container, [class*="input-area"]');
            const sendBtn = inputContainer ? inputContainer.querySelector('button[aria-label*="发"], button[aria-label*="Send"], [data-test-id="send-button"]') : null;

            if (textarea) {
                // 填充 OK
                if (textarea.tagName === 'TEXTAREA') {
                    textarea.value = 'OK';
                } else {
                    textarea.innerText = 'OK';
                }

                // 必须触发 input 事件，否则发送按钮是禁用状态
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                setTimeout(() => {
                    // 优先检查这个特定的发送按钮是否可用
                    if (sendBtn && !sendBtn.disabled) {
                        sendBtn.click();
                    } else {
                        // 如果按钮还是点不到，直接对输入框发送“回车”指令，这是最保险的
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            keyCode: 13,
                            code: 'Enter',
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        textarea.dispatchEvent(enterEvent);
                    }
                }, 50);
            }
        };
    }

    // 创建固定切换开关
    let isPinned = false;
    const pinBtn = document.createElement('div');
    pinBtn.id = 'chat-pin-toggle';
    pinBtn.innerHTML = '📌';
    pinBtn.title = '点击切换：固定展开 / 自动收起';
    pinBtn.style = `
        position: absolute; 
        left: 100%; 
        bottom: 0; 
        margin-left: 10px;
        white-space: nowrap;
        background: #F0FFDF; 
        color: white; 
        padding: 2px 8px; 
        border-radius: 4px; 
        cursor: pointer; 
        font-size: 12px;
        z-index: 1001; 
        transition: all 0.2s ease;
        border: 1px solid #F0FFDF;
    `;
    inputArea.style.overflow = 'visible';
    inputArea.appendChild(pinBtn);

    // 按钮点击逻辑
    pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isPinned = !isPinned;
        if (isPinned) {
            pinBtn.innerHTML = '📍';
            pinBtn.style.background = '#bde3c3';
            pinBtn.style.borderColor = '#bde3c3';
            inputArea.classList.remove('minimized-chat-box');
        } else {
            pinBtn.innerHTML = '📌';
            pinBtn.style.background = '#F0FFDF'; // 恢复深色，表示未固定
            pinBtn.style.borderColor = '#F0FFDF';
        }
    });

    // 点击展开逻辑
    inputArea.addEventListener('click', (e) => {
        if (inputArea.classList.contains('minimized-chat-box')) {
            inputArea.classList.remove('minimized-chat-box');
            const textarea = inputArea.querySelector('textarea, [contenteditable="true"]');
            if (textarea) textarea.focus();
            e.stopPropagation();
        }
    }, true);

    // 自动收起逻辑
    document.addEventListener('click', (e) => {
        if (isPinned) return;
        if (!inputArea.contains(e.target) && !inputArea.classList.contains('minimized-chat-box')) {
            const textarea = inputArea.querySelector('textarea, [contenteditable="true"]');
            const hasText = textarea ? (textarea.value || textarea.innerText).trim().length > 0 : false;
            if (!hasText) inputArea.classList.add('minimized-chat-box');
        }
    });
}
// 替换掉最后的 setInterval
const globalObserver = new MutationObserver(() => {
    initService();
});

// 监听整个 body 的变化
globalObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// 初始执行一次
initService();