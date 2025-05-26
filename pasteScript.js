// 智能粘贴脚本 - 在 ChatGPT 页面中执行
// 此脚本会被注入到右侧 webview 中执行

(async () => {
    try {
        console.log('=== 开始智能解释流程 ===');
        
        // 按钮检测器
        const ButtonDetector = {
            SEND_BUTTON: () => document.querySelector('button[data-testid="send-button"]'),
            STOP_BUTTON: () => document.querySelector('button[data-testid="stop-button"]'),
            VOICE_BUTTON: () => document.querySelector('button[data-testid="composer-speech-button"]'),
            
            // 检测当前状态
            getCurrentState() {
                const sendBtn = this.SEND_BUTTON();
                const stopBtn = this.STOP_BUTTON();
                const voiceBtn = this.VOICE_BUTTON();
                
                if (stopBtn) return 'AI_WORKING';
                if (sendBtn) return 'READY_TO_SEND';
                if (voiceBtn) return 'VOICE_MODE';
                return 'UNKNOWN';
            },
            
            // 打印当前状态
            logCurrentState() {
                const state = this.getCurrentState();
                const sendBtn = this.SEND_BUTTON();
                const stopBtn = this.STOP_BUTTON();
                const voiceBtn = this.VOICE_BUTTON();
                
                console.log(`当前状态: ${state}`);
                console.log(`SEND_BUTTON存在: ${!!sendBtn}, 启用: ${sendBtn ? !sendBtn.disabled : 'N/A'}`);
                console.log(`STOP_BUTTON存在: ${!!stopBtn}, 启用: ${stopBtn ? !stopBtn.disabled : 'N/A'}`);
                console.log(`VOICE_BUTTON存在: ${!!voiceBtn}, 启用: ${voiceBtn ? !voiceBtn.disabled : 'N/A'}`);
                
                return state;
            }
        };
        
        // 步骤1: 检查初始状态
        console.log('步骤1: 检查ChatGPT初始状态');
        const initialState = ButtonDetector.logCurrentState();
        
        if (initialState === 'AI_WORKING') {
            console.log('AI正在工作中，退出流程');
            return 'ai_working';
        }
        
        if (initialState === 'UNKNOWN') {
            console.log('无法识别当前状态，退出流程');
            return 'unknown_state';
        }
        
        // 步骤2: 查找编辑器并粘贴图片
        console.log('步骤2: 查找编辑器并粘贴图片');
        const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
        if (!editor) {
            console.log('找不到ChatGPT输入框，退出流程');
            return 'no_editor';
        }
        
        // 聚焦编辑器
        editor.focus();
        console.log('已聚焦编辑器');
        
        // 粘贴图片 - 使用多种方法确保成功
        console.log('开始粘贴图片...');
        
        // 方法1: execCommand
        document.execCommand('paste');
        
        // 方法2: 键盘事件
        const pasteEvent = new KeyboardEvent('keydown', {
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: navigator.platform.includes('Mac'),
            bubbles: true,
            cancelable: true
        });
        editor.dispatchEvent(pasteEvent);
        
        // 方法3: 剪贴板事件
        const clipboardEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true
        });
        editor.dispatchEvent(clipboardEvent);
        
        console.log('图片粘贴操作已执行');
        
        // 等待图片上传
        console.log('等待图片上传...');
        //await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 添加提示文本
        console.log('添加提示文本...');
        const promptText = 'PROMPT_PLACEHOLDER';
        
        // 创建新的段落元素
        const p = document.createElement('p');
        p.textContent = promptText;
        
        // 清空编辑器内容
        editor.innerHTML = '';
        
        // 添加段落到编辑器
        editor.appendChild(p);
        
        // 触发输入事件
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true,
            composed: true
        });
        editor.dispatchEvent(inputEvent);
        
        console.log('提示文本已添加');
        
        // 步骤3: 等待SEND_BUTTON出现且启用（最多30秒，每1秒检查一次）
        console.log('步骤3: 等待SEND_BUTTON出现且启用');
        let waitCount = 0;
        const maxWaitForSend = 30; // 30秒
        
        while (waitCount < maxWaitForSend) {
            const currentState = ButtonDetector.logCurrentState();
            
            if (currentState === 'READY_TO_SEND') {
                // 检查SEND_BUTTON是否启用
                const sendButton = ButtonDetector.SEND_BUTTON();
                if (sendButton && !sendButton.disabled) {
                    console.log(`SEND_BUTTON已出现且启用 (等待了${waitCount}秒)`);
                    break;
                } else {
                    console.log(`SEND_BUTTON存在但被禁用 (等待了${waitCount}秒)`);
                }
            }
            
            if (currentState === 'AI_WORKING') {
                console.log('检测到AI正在工作，退出流程');
                return 'ai_working';
            }
            
            waitCount++;
            if (waitCount >= maxWaitForSend) {
                console.log('等待SEND_BUTTON启用超时，退出流程');
                return 'wait_send_timeout';
            }
            
            console.log(`等待SEND_BUTTON启用... (${waitCount}/${maxWaitForSend})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 步骤4: 点击SEND_BUTTON
        console.log('步骤4: 点击SEND_BUTTON');
        const sendButton = ButtonDetector.SEND_BUTTON();
        
        if (!sendButton) {
            console.log('SEND_BUTTON不存在，退出流程');
            return 'no_send_button';
        }
        
        if (sendButton.disabled) {
            console.log('SEND_BUTTON被禁用，退出流程');
            return 'send_button_disabled';
        }
        
        sendButton.click();
        console.log('已点击SEND_BUTTON');
        
        // 步骤5: 等待1秒，然后检查STOP_BUTTON是否出现
        console.log('步骤5: 等待STOP_BUTTON出现');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const stateAfterSend = ButtonDetector.logCurrentState();
        if (stateAfterSend !== 'AI_WORKING') {
            console.log('发送后未检测到STOP_BUTTON，可能发送失败，退出流程');
            return 'send_failed';
        }
        
        console.log('STOP_BUTTON已出现，AI开始工作');
        
        // 步骤6: 等待STOP_BUTTON消失（最多5分钟，每5秒检查一次）
        console.log('步骤6: 等待STOP_BUTTON消失');
        let monitorCount = 0;
        const maxMonitorTime = 60; // 5分钟 = 60 * 5秒
        
        while (monitorCount < maxMonitorTime) {
            const currentState = ButtonDetector.logCurrentState();
            
            if (currentState !== 'AI_WORKING') {
                console.log(`STOP_BUTTON已消失，AI完成工作 (监控了${monitorCount * 5}秒)`);
                break;
            }
            
            monitorCount++;
            if (monitorCount >= maxMonitorTime) {
                console.log('等待STOP_BUTTON消失超时，退出流程');
                return 'monitor_timeout';
            }
            
            console.log(`等待STOP_BUTTON消失... (${monitorCount * 5}/${maxMonitorTime * 5}秒)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // 步骤7: 发送系统通知
        console.log('步骤7: 发送系统通知');
        const bookName = 'BOOK_NAME_PLACEHOLDER';
        
        // 发送IPC消息通知主进程
        try {
            if (window.sendToMain) {
                window.sendToMain('ai-explanation-complete', bookName);
                console.log('已通过sendToMain发送完成通知');
            } else {
                console.log('sendToMain不可用');
            }
        } catch (error) {
            console.log('IPC消息发送失败:', error);
        }
        
        // 备用方法：自定义事件
        try {
            const event = new CustomEvent('ai-explanation-complete', {
                detail: { bookName: bookName }
            });
            window.dispatchEvent(event);
            console.log('已发送自定义事件');
        } catch (error) {
            console.log('自定义事件发送失败:', error);
        }
        
        console.log('=== 智能解释流程完成 ===');
        return 'success';
        
    } catch (error) {
        console.error('流程执行出错:', error);
        return `error: ${error.message}`;
    }
})(); 