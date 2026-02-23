#!/bin/bash

# macOS 构建脚本
# 支持 Intel (x64) 和 Apple Silicon (arm64) Universal 构建

set -e

echo "🍎 开始构建 macOS 版本..."

# 检查是否在 macOS 上运行
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 错误: 此脚本需要在 macOS 上运行"
    echo "💡 提示: 在 Windows/Linux 上可以使用 electron-builder 的 --mac 标志交叉构建"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建主进程和预加载脚本
echo "🔨 构建主进程..."
npm run build:main
npm run build:preload

# 构建渲染进程
echo "🎨 构建渲染进程..."
npm run build:renderer

# 构建 macOS Universal 应用
echo "🚀 构建 macOS Universal 应用..."
npx electron-builder --mac --universal

echo "✅ 构建完成!"
echo "📁 输出目录: release/"

# 列出构建产物
echo "📦 构建产物:"
ls -lh release/*.dmg release/*.zip 2>/dev/null || echo "未找到构建产物"
