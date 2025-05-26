// 智能粘贴脚本 - 在 ChatGPT 页面中执行
// 此脚本会被注入到右侧 webview 中执行

(async () => {
    try {
        console.log('=== 开始智能解释流程 ===');
        
        // 按钮检测配置
        const buttonSelectors = {
            stopButtons: [
                'button[data-testid="stop-button"]',
                'button[aria-label*="停止"]',
                'button[aria-label*="Stop"]',
                'button:has(svg rect[width="10"][height="10"])',
                'button#composer-submit-button[aria-label*="停止"]'
            ],
            sendButtons: [
                'button[data-testid="send-button"]',
                'button[aria-label*="发送"]',
                'button[aria-label*="Send"]',
                'button:has(svg path[d*="14.9993V5.41334"])',
                'button#composer-submit-button[aria-label*="发送"]',
                'button#composer-submit-button[aria-label*="Send"]'
            ],
            voiceButtons: [
                'button[data-testid="composer-speech-button"]',
                'button[aria-label*="语音"]',
                'button[aria-label*="Voice"]',
                'button[aria-label*="启动语音模式"]'
            ]
        };
        
        // 智能按钮检测函数
        function findButton(selectors, buttonType) {
            for (const selector of selectors) {
                try {
                    const button = document.querySelector(selector);
                    if (button) {
                        console.log(`找到${buttonType}按钮:`, selector, button.getAttribute('aria-label'));
                        return button;
                    }
                } catch (error) {
                    console.log(`选择器 "${selector}" 执行失败:`, error.message);
                }
            }
            return null;
        }
        
        // 步骤1: 检查ChatGPT当前状态
        console.log('步骤1: 检查ChatGPT当前状态...');
        
        // 检测停止按钮（AI正在工作）
        const stopButton = findButton(buttonSelectors.stopButtons, '停止');
        if (stopButton) {
            console.log('AI正在工作，等待完成');
            return 'ai_working';
        }
        
        console.log('AI未在工作，继续执行...');
        
        // 等待页面完全加载
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }
        
        // 查找 ProseMirror 编辑器
        const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
        if (!editor) {
            throw new Error('找不到 ChatGPT 输入框');
        }
        
        // 聚焦编辑器
        editor.focus();
        
        // 方法1: 使用 execCommand
        document.execCommand('paste');
        
        // 方法2: 使用 Clipboard API
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                if (item.types.includes('image/png')) {
                    const blob = await item.getType('image/png');
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(blob);
                    editor.appendChild(img);
                }
            }
        } catch (clipboardError) {
            console.log('Clipboard API 失败，尝试其他方法');
        }
        
        // 方法3: 模拟键盘事件
        const pasteEvent = new KeyboardEvent('keydown', {
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
        });
        editor.dispatchEvent(pasteEvent);
        
        // 方法4: 模拟粘贴事件
        const pasteEvent2 = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
            bubbles: true,
            cancelable: true
        });
        editor.dispatchEvent(pasteEvent2);

        // 等待图片上传完成
        console.log('等待图片上传...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('图片上传等待完成');

        // 添加提示文本 - 这里会被动态替换
        const promptText = 'PROMPT_PLACEHOLDER';
        const textNode = document.createTextNode(promptText);
        editor.appendChild(textNode);

        // 触发输入事件以确保 ChatGPT 识别到文本变化
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        editor.dispatchEvent(inputEvent);

        // 等待一小段时间让 ChatGPT 处理输入
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 查找发送按钮
        console.log('查找发送按钮...');
        const sendButton = findButton(buttonSelectors.sendButtons, '发送');
        
        if (!sendButton) {
            // 检查是否是语音模式
            const voiceButton = findButton(buttonSelectors.voiceButtons, '语音');
            if (voiceButton) {
                throw new Error('当前处于语音模式，无法发送文本消息');
            }
            throw new Error('找不到发送按钮');
        }

        // 检查按钮是否可用
        if (sendButton.disabled) {
            console.log('发送按钮当前不可用，等待按钮可用...');
            // 等待按钮可用
            let attempts = 0;
            while (sendButton.disabled && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                console.log('等待按钮可用，尝试次数: ' + attempts);
            }
            if (sendButton.disabled) {
                throw new Error('发送按钮在等待后仍然不可用');
            }
        }

        // 点击发送按钮
        sendButton.click();
        console.log('已点击发送按钮');
        
        return true;
    } catch (error) {
        console.error('操作错误:', error);
        return error.message;
    }
})(); 