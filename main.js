const { app, BrowserWindow, ipcMain, Menu, dialog, session, MenuItem } = require('electron');
const path = require('path');
const Store = require('electron-store');
const os = require('os');
const fs = require('fs');

// 在应用启动前设置用户数据目录
const dataDir = path.join(os.homedir(), '.ai-book-reader');
const chromeDataDir = path.join(dataDir, 'chrome-data');

// 设置整个 Electron 应用的数据目录
app.setPath('userData', chromeDataDir);

app.setName('AI Book Reader');

// 确保数据目录存在并设置正确的权限
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
}
if (!fs.existsSync(chromeDataDir)) {
    fs.mkdirSync(chromeDataDir, { recursive: true, mode: 0o755 });
}

// 设置 Chrome 数据目录
app.commandLine.appendSwitch('user-data-dir', chromeDataDir);
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('enable-blink-features', 'ClipboardAPI');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

console.log('Chrome data directory:', chromeDataDir);

// 解析命令行参数
const args = process.argv.slice(1);
let enableDebug = false;

// 查找 --enable-debug 参数
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--enable-debug') {
        enableDebug = true;
    }
}

// 创建配置存储，指定数据目录
const store = new Store({
    cwd: dataDir,
    name: 'config'
});

let persistentSession;
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            devTools: true,
            enableBlinkFeatures: 'ClipboardAPI'
        },
        titleBarStyle: 'hiddenInset', // macOS 风格的标题栏
        backgroundColor: '#1e1e1e',
        show: false
    });

    mainWindow.loadFile('index.html');
    
    // 只有启用 debug 时才打开开发者工具
    if (enableDebug) {
        mainWindow.webContents.openDevTools();
    }

    // 向渲染进程发送 enable-debug 标志
    mainWindow.webContents.on('did-finish-load', () => {
        if (enableDebug) {
            mainWindow.webContents.send('enable-debug');
        }
    });

    // 处理上下文菜单事件
    mainWindow.webContents.on('context-menu', (event, params) => {
        console.log('Main window context menu:', params);
        // 允许显示上下文菜单，不调用 event.preventDefault()
    });
    
    // 等待窗口加载完成后再显示，避免白屏
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        // 如果有上次打开的文件，发送给渲染进程
        const lastFile = store.get('lastFile');
        if (lastFile) {
            mainWindow.webContents.send('file-opened', lastFile);
        }
    });

    // 监听窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 创建完整的应用菜单，包含快捷键支持
    const template = [
        {
            label: 'AI Book Reader',
            submenu: [
                {
                    label: '打开文件',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'PDF Files', extensions: ['pdf'] }
                            ]
                        });

                        if (!result.canceled && result.filePaths.length > 0) {
                            const filePath = result.filePaths[0];
                            // 保存文件路径
                            store.set('lastFile', filePath);
                            mainWindow.webContents.send('file-opened', filePath);
                        }
                    }
                },
                {
                    label: '关闭文件',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        // 清除保存的文件路径
                        store.delete('lastFile');
                        mainWindow.webContents.send('file-closed');
                    }
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '编辑',
            submenu: [
                {
                    label: '撤销',
                    accelerator: 'CmdOrCtrl+Z',
                    role: 'undo',
                    click: () => {
                        // 发送撤销命令到当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'undo');
                    }
                },
                {
                    label: '重做',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    role: 'redo',
                    click: () => {
                        // 发送重做命令到当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'redo');
                    }
                },
                { type: 'separator' },
                {
                    label: '剪切',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut',
                    click: () => {
                        // 发送剪切命令到当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'cut');
                    }
                },
                {
                    label: '复制',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy',
                    click: () => {
                        // 发送复制命令到当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'copy');
                    }
                },
                {
                    label: '粘贴',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste',
                    click: () => {
                        // 发送粘贴命令到当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'paste');
                    }
                },
                {
                    label: '全选',
                    accelerator: 'CmdOrCtrl+A',
                    role: 'selectall',
                    click: () => {
                        // 发送全选命令到当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'selectAll');
                    }
                }
            ]
        },
        {
            label: '查看',
            submenu: [
                {
                    label: '重新加载',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        // 重新加载当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'reload');
                    }
                },
                {
                    label: '强制重新加载',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        // 强制重新加载当前焦点的webview
                        mainWindow.webContents.send('webview-command', 'reloadIgnoringCache');
                    }
                },
                { type: 'separator' },
                {
                    label: '实际大小',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        // 重置缩放
                        mainWindow.webContents.send('webview-command', 'zoomReset');
                    }
                },
                {
                    label: '放大',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        // 放大
                        mainWindow.webContents.send('webview-command', 'zoomIn');
                    }
                },
                {
                    label: '缩小',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        // 缩小
                        mainWindow.webContents.send('webview-command', 'zoomOut');
                    }
                },

                { type: 'separator' },
                {
                    label: '切换开发者工具',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: '窗口',
            submenu: [
                {
                    label: '最小化',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
                },
                {
                    label: '关闭',
                    accelerator: 'CmdOrCtrl+W',
                    role: 'close'
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
    // 创建共享的持久化会话
    persistentSession = session.fromPartition('persist:shared', {
        cache: true,
        path: chromeDataDir
    });

    // 设置会话持久化
    await persistentSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = [
            'media', 
            'geolocation', 
            'notifications', 
            'clipboard-read', 
            'clipboard-write',
            'clipboard-sanitized-write',
            'clipboard',
            'camera',
            'microphone'
        ];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    // 设置会话数据持久化
    await persistentSession.setPreloads([path.join(__dirname, 'preload.js')]);
    
    // 启用上下文菜单
    persistentSession.on('context-menu', (event, params, webContents) => {
        console.log('Context menu requested:', params);
        // 不阻止上下文菜单显示
    });
    
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
    app.quit();
});

// 在应用退出前清理资源
app.on('before-quit', () => {
    if (mainWindow) {
        mainWindow.removeAllListeners('close');
        mainWindow.close();
    }
});

// 确保应用完全退出
app.on('will-quit', (event) => {
    // 保留登录状态，只清理临时数据
    if (persistentSession) {
        persistentSession.clearStorageData({
            storages: ['cache', 'shadercache', 'websql', 'serviceworkers'],
            quotas: ['temporary']
        });
    }
});

// Settings IPC handlers
const booksJsonPath = path.join(dataDir, 'books.json');
const globalJsonPath = path.join(dataDir, 'global.json');
const pageStatesJsonPath = path.join(dataDir, 'page-states.json');
const rightWebviewUrlPath = path.join(dataDir, 'right-webview-url.json');
const layoutConfigPath = path.join(dataDir, 'layout-config.json');

// Load global settings
ipcMain.handle('load-global-settings', async () => {
    try {
        if (fs.existsSync(globalJsonPath)) {
            const data = fs.readFileSync(globalJsonPath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('Error loading global settings:', error);
        return null;
    }
});

// Save global settings
ipcMain.handle('save-global-settings', async (event, settings) => {
    try {
        fs.writeFileSync(globalJsonPath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving global settings:', error);
        return false;
    }
});

// Load book settings
ipcMain.handle('load-book-settings', async (event, fileMD5) => {
    try {
        if (fs.existsSync(booksJsonPath)) {
            const data = fs.readFileSync(booksJsonPath, 'utf8');
            const books = JSON.parse(data);
            return books[fileMD5] || null;
        }
        return null;
    } catch (error) {
        console.error('Error loading book settings:', error);
        return null;
    }
});

// Save book settings
ipcMain.handle('save-book-settings', async (event, fileMD5, settings) => {
    try {
        let books = {};
        if (fs.existsSync(booksJsonPath)) {
            const data = fs.readFileSync(booksJsonPath, 'utf8');
            books = JSON.parse(data);
        }
        
        books[fileMD5] = settings;
        fs.writeFileSync(booksJsonPath, JSON.stringify(books, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving book settings:', error);
        return false;
    }
});

// Load page state
ipcMain.handle('load-page-state', async (event, fileMD5) => {
    try {
        if (fs.existsSync(pageStatesJsonPath)) {
            const data = fs.readFileSync(pageStatesJsonPath, 'utf8');
            const pageStates = JSON.parse(data);
            return pageStates[fileMD5] || null;
        }
        return null;
    } catch (error) {
        console.error('Error loading page state:', error);
        return null;
    }
});

// Save page state
ipcMain.handle('save-page-state', async (event, fileMD5, pageState) => {
    try {
        let pageStates = {};
        if (fs.existsSync(pageStatesJsonPath)) {
            const data = fs.readFileSync(pageStatesJsonPath, 'utf8');
            pageStates = JSON.parse(data);
        }
        
        pageStates[fileMD5] = pageState;
        fs.writeFileSync(pageStatesJsonPath, JSON.stringify(pageStates, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving page state:', error);
        return false;
    }
});

// Load right webview URL
ipcMain.handle('load-right-webview-url', async () => {
    try {
        if (fs.existsSync(rightWebviewUrlPath)) {
            const data = fs.readFileSync(rightWebviewUrlPath, 'utf8');
            const urlData = JSON.parse(data);
            return urlData.url || 'https://chat.openai.com/';
        }
        return 'https://chat.openai.com/';
    } catch (error) {
        console.error('Error loading right webview URL:', error);
        return 'https://chat.openai.com/';
    }
});

// Save right webview URL
ipcMain.handle('save-right-webview-url', async (event, url) => {
    try {
        const urlData = {
            url: url,
            lastSaved: new Date().toISOString()
        };
        fs.writeFileSync(rightWebviewUrlPath, JSON.stringify(urlData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving right webview URL:', error);
        return false;
    }
});

// File-specific right webview URLs path
const fileWebviewUrlsPath = path.join(dataDir, 'file-webview-urls.json');

// Load right webview URL for specific file
ipcMain.handle('load-right-webview-url-for-file', async (event, fileMD5) => {
    try {
        if (fs.existsSync(fileWebviewUrlsPath)) {
            const data = fs.readFileSync(fileWebviewUrlsPath, 'utf8');
            const fileUrls = JSON.parse(data);
            return fileUrls[fileMD5]?.url || null;
        }
        return null;
    } catch (error) {
        console.error('Error loading file-specific right webview URL:', error);
        return null;
    }
});

// Save right webview URL for specific file
ipcMain.handle('save-right-webview-url-for-file', async (event, fileMD5, url) => {
    try {
        let fileUrls = {};
        if (fs.existsSync(fileWebviewUrlsPath)) {
            const data = fs.readFileSync(fileWebviewUrlsPath, 'utf8');
            fileUrls = JSON.parse(data);
        }
        
        fileUrls[fileMD5] = {
            url: url,
            lastSaved: new Date().toISOString()
        };
        
        fs.writeFileSync(fileWebviewUrlsPath, JSON.stringify(fileUrls, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving file-specific right webview URL:', error);
        return false;
    }
});

// Load layout configuration
ipcMain.handle('load-layout-config', async () => {
    try {
        if (fs.existsSync(layoutConfigPath)) {
            const data = fs.readFileSync(layoutConfigPath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('Error loading layout config:', error);
        return null;
    }
});

// Save layout configuration
ipcMain.handle('save-layout-config', async (event, layoutConfig) => {
    try {
        const configData = {
            ...layoutConfig,
            lastSaved: new Date().toISOString()
        };
        fs.writeFileSync(layoutConfigPath, JSON.stringify(configData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving layout config:', error);
        return false;
    }
});

// Handle focus window request
ipcMain.on('focus-window', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
    }
});

// Handle context menu request
ipcMain.on('show-context-menu', (event, params) => {
    console.log('Creating context menu with params:', params);
    
    const template = [];
    
    // 添加复制选项
    if (params.canCopy && params.selectionText) {
        template.push({
            label: `复制 "${params.selectionText.substring(0, 20)}${params.selectionText.length > 20 ? '...' : ''}"`,
            click: () => {
                event.sender.send('context-menu-command', 'copy');
            }
        });
    }
    
    // 添加粘贴选项
    if (params.canPaste && params.isEditable) {
        template.push({
            label: '粘贴',
            click: () => {
                event.sender.send('context-menu-command', 'paste');
            }
        });
    }
    
    // 添加剪切选项
    if (params.canCut && params.selectionText && params.isEditable) {
        template.push({
            label: '剪切',
            click: () => {
                event.sender.send('context-menu-command', 'cut');
            }
        });
    }
    
    // 添加分隔符
    if (template.length > 0) {
        template.push({ type: 'separator' });
    }
    
    // 添加全选选项
    template.push({
        label: '全选',
        click: () => {
            event.sender.send('context-menu-command', 'selectAll');
        }
    });
    
    // 添加撤销/重做选项
    if (params.canUndo) {
        template.push({
            label: '撤销',
            click: () => {
                event.sender.send('context-menu-command', 'undo');
            }
        });
    }
    
    if (params.canRedo) {
        template.push({
            label: '重做',
            click: () => {
                event.sender.send('context-menu-command', 'redo');
            }
        });
    }
    
    // 添加分隔符和调试选项
    template.push(
        { type: 'separator' },
        {
            label: '检查剪贴板',
            click: async () => {
                try {
                    const { clipboard } = require('electron');
                    const text = clipboard.readText();
                    const image = clipboard.readImage();
                    console.log('剪贴板文本:', text ? `"${text.substring(0, 50)}..."` : '无');
                    console.log('剪贴板图片:', image.isEmpty() ? '无' : `${image.getSize().width}x${image.getSize().height}`);
                    
                    // 显示通知
                    const { Notification } = require('electron');
                    new Notification({
                        title: '剪贴板内容',
                        body: `文本: ${text ? '有' : '无'}, 图片: ${image.isEmpty() ? '无' : '有'}`
                    }).show();
                } catch (error) {
                    console.error('检查剪贴板失败:', error);
                }
            }
        }
    );
    
    // 创建并显示菜单
    const menu = Menu.buildFromTemplate(template);
    menu.popup({
        window: mainWindow,
        x: params.x,
        y: params.y
    });
    
    console.log('Context menu displayed');
});

