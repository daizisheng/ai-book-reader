# AI Book Reader

一个基于 Electron 的智能电子书阅读器，集成了 PDF 阅读和 ChatGPT 功能。

## 功能特点

- 双面板布局：左侧 PDF 阅读器，右侧 ChatGPT 对话界面
- 支持记住上次打开的文件
- 支持通过命令行参数指定数据存储目录
- 现代化的深色主题界面
- 完整的菜单栏支持

## 安装

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/yourusername/ai-book-reader.git
cd ai-book-reader

# 安装依赖
npm install

# 运行应用
npm start
```

### 构建独立应用

```bash
# 构建当前平台
npm run build-app

# 构建 macOS 版本
npm run build-app:mac

# 构建 Windows 版本
npm run build-app:win

# 构建 Linux 版本
npm run build-app:linux

# 构建所有平台
npm run build-app:all
```

构建完成后，可分发的应用程序文件将位于 `dist/` 目录中。

详细的构建说明请参考 [BUILD.md](BUILD.md)。

## 使用说明

### 命令行参数

- `--data-dir` 或 `-d`: 指定数据存储目录
  ```bash
  npm start -- --data-dir /path/to/data
  ```

### 快捷键

- `Cmd/Ctrl + O`: 打开 PDF 文件
- `Cmd/Ctrl + Q`: 退出应用
- `Cmd/Ctrl + ,`: 打开设置（待实现）

## 开发

### 项目结构

- `main.js`: 主进程代码
- `renderer.js`: 渲染进程代码
- `index.html`: 主窗口界面
- `package.json`: 项目配置和依赖

### 依赖

- Electron
- electron-store

## 许可证

MIT 