const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const os = require('os');
const fs = require('fs');

// 在应用启动前设置用户数据目录
const dataDir = path.join(os.homedir(), '.ai-book-reader');
const chromeDataDir = path.join(dataDir, 'chrome-data');

// 设置整个 Electron 应用的数据目录
app.setPath('userData', chromeDataDir);

// 确保数据目录存在并设置正确的权限
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
}
if (!fs.existsSync(chromeDataDir)) {
    fs.mkdirSync(chromeDataDir, { recursive: true, mode: 0o755 });
}

// 设置 Chrome 数据目录
app.commandLine.appendSwitch('user-data-dir', chromeDataDir);
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');

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
            devTools: true
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

    // 创建菜单
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
        const allowedPermissions = ['media', 'geolocation', 'notifications'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    // 设置会话数据持久化
    await persistentSession.setPreloads([path.join(__dirname, 'preload.js')]);
    
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