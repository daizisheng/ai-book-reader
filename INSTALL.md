# AI Book Reader 安装指南

## 下载

从 [Releases](https://github.com/yourusername/ai-book-reader/releases) 页面下载适合你操作系统的版本。

## 安装

### macOS

1. 下载 `AI Book Reader-x.x.x.dmg` 文件
2. 双击 DMG 文件打开
3. 将 "AI Book Reader" 拖拽到 "Applications" 文件夹
4. 在 Launchpad 或 Applications 文件夹中找到并启动应用

**注意：** 首次运行时，macOS 可能会显示安全警告。请按以下步骤操作：
1. 右键点击应用图标
2. 选择"打开"
3. 在弹出的对话框中点击"打开"

### Windows

#### 安装版
1. 下载 `AI Book Reader Setup x.x.x.exe` 文件
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 在开始菜单中找到并启动应用

#### 便携版
1. 下载 `AI Book Reader x.x.x.exe` 文件
2. 将文件放到你希望的位置
3. 双击运行

**注意：** Windows 可能会显示 SmartScreen 警告。点击"更多信息"然后"仍要运行"。

### Linux

#### AppImage (推荐)
1. 下载 `AI Book Reader-x.x.x.AppImage` 文件
2. 给文件添加执行权限：
   ```bash
   chmod +x AI\ Book\ Reader-x.x.x.AppImage
   ```
3. 双击运行或在终端中执行：
   ```bash
   ./AI\ Book\ Reader-x.x.x.AppImage
   ```

#### Debian/Ubuntu
1. 下载 `ai-book-reader_x.x.x_amd64.deb` 文件
2. 安装：
   ```bash
   sudo dpkg -i ai-book-reader_x.x.x_amd64.deb
   ```
3. 如果有依赖问题，运行：
   ```bash
   sudo apt-get install -f
   ```

## 系统要求

- **macOS:** 10.15 (Catalina) 或更高版本
- **Windows:** Windows 10 或更高版本
- **Linux:** Ubuntu 18.04 或其他现代 Linux 发行版

## 故障排除

### macOS
- **应用无法打开：** 检查系统偏好设置 > 安全性与隐私 > 通用，允许应用运行
- **功能异常：** 尝试重新下载并重新安装

### Windows
- **杀毒软件误报：** 将应用添加到杀毒软件白名单
- **无法启动：** 确保系统已安装最新的 Visual C++ 运行库

### Linux
- **依赖缺失：** 安装必要的依赖包：
  ```bash
  sudo apt-get install libgtk-3-0 libxss1 libasound2
  ```
- **权限问题：** 确保 AppImage 文件有执行权限

## 卸载

### macOS
将应用从 Applications 文件夹拖到废纸篓

### Windows
通过控制面板的"程序和功能"卸载，或删除便携版文件

### Linux
- AppImage：删除文件即可
- Debian 包：`sudo apt-get remove ai-book-reader`

## 支持

如果遇到问题，请：
1. 查看 [FAQ](FAQ.md)
2. 在 [Issues](https://github.com/yourusername/ai-book-reader/issues) 页面报告问题
3. 提供详细的错误信息和系统信息 