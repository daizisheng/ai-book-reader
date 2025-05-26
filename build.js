#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建 AI Book Reader...');

// 清理之前的构建
if (fs.existsSync('dist')) {
    console.log('🧹 清理之前的构建文件...');
    execSync('rm -rf dist', { stdio: 'inherit' });
}

// 获取平台参数
const platform = process.argv[2] || 'current';

try {
    switch (platform) {
        case 'mac':
            console.log('🍎 构建 macOS 版本...');
            execSync('npm run build:mac', { stdio: 'inherit' });
            break;
        case 'win':
            console.log('🪟 构建 Windows 版本...');
            execSync('npm run build:win', { stdio: 'inherit' });
            break;
        case 'linux':
            console.log('🐧 构建 Linux 版本...');
            execSync('npm run build:linux', { stdio: 'inherit' });
            break;
        case 'all':
            console.log('🌍 构建所有平台版本...');
            execSync('npm run build:mac', { stdio: 'inherit' });
            execSync('npm run build:win', { stdio: 'inherit' });
            execSync('npm run build:linux', { stdio: 'inherit' });
            break;
        case 'current':
        default:
            console.log('💻 构建当前平台版本...');
            execSync('npm run build', { stdio: 'inherit' });
            break;
    }

    console.log('✅ 构建完成！');
    console.log('📦 构建文件位于 dist/ 目录');
    
    // 显示构建结果
    if (fs.existsSync('dist')) {
        const files = fs.readdirSync('dist');
        console.log('\n📋 构建产物：');
        files.forEach(file => {
            const filePath = path.join('dist', file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`  - ${file} (${size} MB)`);
        });
    }

} catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
} 