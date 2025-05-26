#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取版本类型参数
const versionType = process.argv[2] || 'patch'; // patch, minor, major

console.log(`🚀 开始发布流程 (${versionType})...`);

try {
    // 1. 检查工作目录是否干净
    console.log('📋 检查 Git 状态...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
        console.warn('⚠️  工作目录不干净，请先提交或暂存更改');
        console.log(gitStatus);
        process.exit(1);
    }

    // 2. 更新版本号
    console.log(`📈 更新版本号 (${versionType})...`);
    execSync(`npm version ${versionType}`, { stdio: 'inherit' });

    // 3. 获取新版本号
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const newVersion = packageJson.version;
    console.log(`✅ 新版本: ${newVersion}`);

    // 4. 构建所有平台
    console.log('🔨 构建所有平台...');
    execSync('npm run build-app:all', { stdio: 'inherit' });

    // 5. 创建发布说明
    const releaseNotes = `# AI Book Reader v${newVersion}

## 下载

### macOS
- [AI Book Reader-${newVersion}.dmg](./AI%20Book%20Reader-${newVersion}.dmg) (Intel)
- [AI Book Reader-${newVersion}-arm64.dmg](./AI%20Book%20Reader-${newVersion}-arm64.dmg) (Apple Silicon)

### Windows
- [AI Book Reader Setup ${newVersion}.exe](./AI%20Book%20Reader%20Setup%20${newVersion}.exe)

### Linux
- [AI Book Reader-${newVersion}.AppImage](./AI%20Book%20Reader-${newVersion}.AppImage)

## 更新内容

- 请在此处添加更新内容

## 系统要求

- macOS 10.15+ (Catalina)
- Windows 10+
- Ubuntu 18.04+ 或其他现代 Linux 发行版
`;

    fs.writeFileSync(`RELEASE-${newVersion}.md`, releaseNotes);
    console.log(`📝 创建发布说明: RELEASE-${newVersion}.md`);

    // 6. 推送到远程仓库
    console.log('📤 推送到远程仓库...');
    execSync('git push', { stdio: 'inherit' });
    execSync('git push --tags', { stdio: 'inherit' });

    console.log('🎉 发布完成！');
    console.log(`📦 构建文件位于 dist/ 目录`);
    console.log(`📝 发布说明: RELEASE-${newVersion}.md`);
    console.log(`🏷️  Git 标签: v${newVersion}`);

} catch (error) {
    console.error('❌ 发布失败:', error.message);
    process.exit(1);
} 