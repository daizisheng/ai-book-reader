const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const os = require('os');
const fs = require('fs');

// 解析命令行参数
const args = process.argv.slice(1);
let dataDir = path.join(os.homedir(), '.ai-book-reader');

// 查找 --data-dir 或 -d 参数
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data-dir' || args[i] === '-d') {
        if (i + 1 < args.length) {
            dataDir = args[i + 1];
            break;
        }
    }
}

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
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
            webviewTag: true
        },
        titleBarStyle: 'hiddenInset', // macOS 风格的标题栏
        backgroundColor: '#1e1e1e',
        show: false
    });

    mainWindow.loadFile('index.html');
    
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
            label: '文件',
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
                    role: 'undo'
                },
                {
                    label: '重做',
                    accelerator: 'CmdOrCtrl+Y',
                    role: 'redo'
                },
                { type: 'separator' },
                {
                    label: '剪切',
                    accelerator: 'CmdOrCtrl+X',
                    role: 'cut'
                },
                {
                    label: '复制',
                    accelerator: 'CmdOrCtrl+C',
                    role: 'copy'
                },
                {
                    label: '粘贴',
                    accelerator: 'CmdOrCtrl+V',
                    role: 'paste'
                }
            ]
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '设置',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        // TODO: 实现设置功能
                        console.log('Settings');
                    }
                }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        // TODO: 实现关于功能
                        console.log('About');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    // 创建持久化会话
    persistentSession = session.fromPartition('persist:chatgpt', {
        cache: true,
        path: path.join(dataDir, 'session')
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
    // 清理所有会话
    if (persistentSession) {
        persistentSession.clearStorageData();
    }
}); 