# 目录结构调整说明

## 调整日期
2026-02-23

## 调整内容

### 1. 删除空目录

**删除**: `apps/windows/`
- 原因：空目录，无实质内容
- desktop (Electron) 已包含 Windows 支持

### 2. 目录结构说明

调整后结构：

```
apps/
├── desktop/          # Electron 跨平台桌面应用
│                     # 支持 Windows + macOS + Linux
├── macos/            # 原生 Swift macOS 应用（保留）
│                     # 与 desktop 并行存在，提供原生体验
├── mobile/           # React Native 跨平台移动应用
│                     # 支持 Android + iOS
└── android/          # 原生 Kotlin Android 应用（保留）
                      # 与 mobile 并行存在，提供原生体验
```

### 3. 平台关系说明

| 目录 | 技术栈 | 支持平台 | 定位 |
|------|--------|----------|------|
| desktop | Electron + TypeScript | Windows/macOS/Linux | 跨平台桌面方案 |
| macos | Swift + SwiftUI | macOS only | 原生 macOS 方案 |
| mobile | React Native + TypeScript | Android/iOS | 跨平台移动方案 |
| android | Kotlin + Jetpack Compose | Android only | 原生 Android 方案 |

### 4. 不合并的原因

**desktop vs macos**:
- desktop 是 Electron 跨平台方案
- macos 是原生 Swift 方案
- 两者技术栈完全不同，目标不同
- desktop 追求跨平台一致性
- macos 追求原生体验和性能

**mobile vs android**:
- mobile 是 React Native 跨平台方案
- android 是原生 Kotlin 方案
- 两者技术栈完全不同
- mobile 追求一套代码多端运行
- android 追求最佳 Android 体验

### 5. 使用建议

**桌面端选择**:
- 需要同时支持 Windows 和 macOS → 使用 desktop
- 只需要 macOS 且追求原生体验 → 使用 macos

**移动端选择**:
- 需要同时支持 Android 和 iOS → 使用 mobile
- 只需要 Android 且追求原生体验 → 使用 android

## 后续规划

可能考虑添加：
- `apps/ios/` - 原生 Swift iOS 应用
- `apps/web/` - Web 网页版
- `apps/server/` - 纯服务端版本
