# AI Book Reader 构建指南

本文档详细说明如何将 AI Book Reader 打包成独立的应用程序。

## 前置要求

### 开发环境
- Node.js 16+ 
- npm 或 yarn
- Git

### 平台特定要求

#### macOS
- macOS 10.15+ (Catalina)
- Xcode Command Line Tools
- 可选：Apple Developer 账号（用于代码签名）

#### Windows
- Windows 10+
- 可选：代码签名证书

#### Linux
- Ubuntu 18.04+ 或其他现代 Linux 发行版
- 构建工具：`build-essential`

## 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd ai-book-reader

# 安装依赖
npm install
```

## 构建命令

### 快速构建（推荐）

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

### 原生 electron-builder 命令

```bash
# 构建当前平台
npm run build

# 构建特定平台
npm run build:mac
npm run build:win
npm run build:linux

# 仅打包（不创建安装包）
npm run pack

# 构建但不发布
npm run dist
```

## 构建产物

构建完成后，所有文件将位于 `dist/` 目录：

### macOS
- `AI Book Reader-1.0.0.dmg` - DMG 安装包
- `AI Book Reader-1.0.0-mac.zip` - ZIP 压缩包

### Windows
- `AI Book Reader Setup 1.0.0.exe` - NSIS 安装程序
- `AI Book Reader 1.0.0.exe` - 便携版

### Linux
- `AI Book Reader-1.0.0.AppImage` - AppImage 格式
- `ai-book-reader_1.0.0_amd64.deb` - Debian 包

## 应用图标

项目包含以下图标文件：
- `assets/icon.svg` - 源 SVG 图标
- `assets/icon.icns` - macOS 图标
- `assets/icon.ico` - Windows 图标  
- `assets/icon.png` - Linux 图标

## 立即开始构建

现在你可以运行以下命令来构建应用：

```bash
# 构建当前平台（macOS）
npm run build-app
```

构建完成后，你将在 `dist/` 目录中找到可分发的应用程序文件。 
 