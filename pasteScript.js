// 智能粘贴脚本 - 在 ChatGPT 页面中执行
// 此脚本会被注入到右侧 webview 中执行

(async () => {
    try {
        console.log('=== 开始智能解释流程 ===');
        
        // 步骤1: 检查是否有正在进行的对话（通过检查停止按钮）
        console.log('步骤1: 检查AI是否正在工作...');
        
        // 检查是否有停止按钮（表示AI正在生成回复）
        const stopButton = document.querySelector('button[aria-label*="停止"]') ||
                         document.querySelector('button[aria-label*="Stop"]') ||
                         document.querySelector('button[data-testid*="stop"]') ||
                         document.querySelector('button:has(svg) [d*="M6 6h12v12H6z"]'); // 停止图标的路径
        
        if (stopButton) {
            console.log('检测到停止按钮，AI正在工作');
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
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (!sendButton) {
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