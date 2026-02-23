# SillyChat 性能优化文档

本文档详细描述了SillyChat全平台的性能优化策略和实现。

## 目录

1. [Android性能优化](#android性能优化)
2. [HarmonyOS性能优化](#harmonyos性能优化)
3. [React Native性能优化](#react-native性能优化)
4. [Desktop性能优化](#desktop性能优化)
5. [性能监控](#性能监控)

---

## Android性能优化

### 1. MessageList优化

#### DiffUtil实现
- **文件**: `MessageAdapter.kt`
- **优化点**:
  - 使用`DiffUtil.ItemCallback`高效计算列表差异
  - 只更新变化的项，避免完整重新绑定
  - 支持局部更新（内容、状态、删除状态）

```kotlin
class MessageDiffCallback : DiffUtil.ItemCallback<Message>() {
    override fun areItemsTheSame(oldItem: Message, newItem: Message): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: Message, newItem: Message): Boolean {
        return oldItem.content == newItem.content &&
               oldItem.timestamp == newItem.timestamp &&
               oldItem.syncStatus == newItem.syncStatus
    }
}
```

#### ViewHolder复用
- 使用`ListAdapter`自动处理ViewHolder复用
- 使用`by lazy`延迟初始化视图，减少`findViewById`调用
- 分离绑定逻辑，支持局部更新

### 2. 图片加载优化(Coil)

#### 配置优化
- **文件**: `ImageLoaderModule.kt`
- **优化策略**:
  - 内存缓存：最大可用内存的25%
  - 磁盘缓存：100MB上限
  - 启用弱引用缓存
  - 限制并发请求数（最大10个，每主机5个）

```kotlin
ImageLoader.Builder(context)
    .memoryCache {
        MemoryCache.Builder(context)
            .maxSizePercent(0.25)
            .weakReferencesEnabled(true)
            .build()
    }
    .diskCache {
        DiskCache.Builder()
            .maxSizeBytes(100 * 1024 * 1024)
            .build()
    }
```

### 3. 数据库优化

#### 索引优化
- **文件**: `Message.kt`
- **索引配置**:
  ```kotlin
  @Entity(
      tableName = "messages",
      indices = [
          Index(value = ["conversationId"]),
          Index(value = ["timestamp"]),
          Index(value = ["syncStatus"])
      ]
  )
  ```

#### 查询优化
- **文件**: `MessageDao.kt`
- **优化策略**:
  - 使用`PagingSource`实现分页加载
  - 限制返回数量，避免内存溢出
  - 使用Flow实现实时数据监听
  - 批量操作使用事务

```kotlin
@Query("""
    SELECT * FROM messages
    WHERE conversationId = :conversationId
    AND timestamp < :before
    ORDER BY timestamp DESC
    LIMIT :limit
""")
suspend fun getMessagesBefore(
    conversationId: String,
    before: Long,
    limit: Int = 20
): List<Message>
```

### 4. 内存优化

#### 内存管理器
- **文件**: `MemoryManager.kt`
- **功能**:
  - 监控内存使用情况
  - 自动清理策略（轻度/常规/深度）
  - Bitmap采样优化
  - 缓存清理

```kotlin
class MemoryManager @Inject constructor(
    private val context: Context,
    private val imageLoader: ImageLoader
) {
    fun getMemoryInfo(): MemoryInfo
    suspend fun performCleanup(level: CleanupLevel)
    fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int
}
```

---

## HarmonyOS性能优化

### 1. 列表渲染优化

#### 虚拟列表
- **文件**: `OptimizedList.ets`
- **优化策略**:
  - 只渲染可视区域内的列表项
  - 列表项缓存池复用
  - 防抖和节流优化频繁事件

```typescript
export class VirtualListCalculator {
    calculateVisibleRange(scrollOffset: number, totalItems: number): VirtualListState {
        const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
        const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);
        return { startIndex, endIndex, offsetY, totalHeight };
    }
}
```

### 2. 状态管理优化

#### 优化ViewModel
- **文件**: `OptimizedChatViewModel.ets`
- **优化策略**:
  - 使用Map存储消息，提高查找效率
  - 节流处理频繁的状态更新
  - 限制缓存消息数量（最大100条）
  - 批量添加消息

```typescript
@Observed
export class OptimizedChatUiState {
    messages: Map<string, Message> = new Map();
    messageIds: string[] = [];

    upsertMessage(message: Message): void
    addMessages(newMessages: Message[]): void
    private trimCachedMessages(): void
}
```

### 3. 内存管理

#### 内存管理器
- **文件**: `OptimizedList.ets`
- **功能**:
  - 注册清理回调
  - 自动内存清理
  - 建议GC

---

## React Native性能优化

### 1. FlatList优化

#### 优化配置
- **文件**: `OptimizedMessageList.tsx`
- **优化策略**:
  - 使用`getItemLayout`固定高度，提升滚动性能
  - `removeClippedSubviews`移除屏幕外视图
  - 控制渲染批次大小
  - 窗口大小优化

```typescript
<FlatList
    getItemLayout={getItemLayout}
    removeClippedSubviews={true}
    maxToRenderPerBatch={10}
    updateCellsBatchingPeriod={50}
    initialNumToRender={10}
    windowSize={21}
/>
```

### 2. React.memo优化

#### 消息项组件
- 使用`memo`包裹组件
- 自定义比较函数
- 只在必要时重渲染

```typescript
const MessageItem = memo(({ message, isCurrentUser }) => {
    return <MessageBubble ... />;
}, (prev, next) => {
    return prev.message.id === next.message.id &&
           prev.message.content === next.message.content &&
           prev.message.status === next.message.status;
});
```

### 3. 性能工具

#### 性能优化Hooks
- **文件**: `performance.ts`
- **功能**:
  - `useDebounce`: 防抖Hook
  - `useThrottle`: 节流Hook
  - `useMemoized`: 记忆化计算
  - `useFPSMonitor`: FPS监控
  - `useMemoryMonitor`: 内存监控

```typescript
export function useDebounce<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void

export function useThrottle<T extends (...args: any[]) => void>(
    callback: T,
    interval: number
): (...args: Parameters<T>) => void
```

---

## Desktop性能优化

### 1. 窗口管理优化

#### 窗口状态管理
- **文件**: `window-manager.ts`
- **优化策略**:
  - 保存/恢复窗口位置和大小
  - 准备就绪后再显示窗口
  - 窗口隐藏时暂停非必要任务
  - 内存压力检测和处理

```typescript
class WindowManager {
    private loadWindowState(): void
    private saveWindowState(): void
    private handleMemoryPressure(): void
}
```

### 2. 启动时间优化

#### 优化策略
- 延迟加载非关键模块
- 预加载主进程资源
- 使用`ready-to-show`事件控制窗口显示时机
- 开发模式启用热重载

### 3. 内存使用优化

#### 内存监控
- 监听渲染进程控制台消息
- 检测内存压力
- 自动清理和页面重载

---

## 性能监控

### 1. 关键指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 启动时间 | < 3s | 应用冷启动时间 |
| 列表滚动FPS | > 55 | 消息列表滚动帧率 |
| 内存使用 | < 200MB | 应用内存占用 |
| 图片加载 | < 500ms | 单张图片加载时间 |
| 数据库查询 | < 100ms | 单次查询耗时 |

### 2. 监控工具

#### Android
- Android Profiler
- LeakCanary（内存泄漏检测）
- Systrace

#### HarmonyOS
- DevEco Studio Profiler
- HiLog日志分析

#### React Native
- Flipper
- React Native Debugger
- 自定义FPS监控

#### Desktop
- Electron DevTools
- 自定义内存监控

### 3. 优化检查清单

- [ ] 列表使用DiffUtil/Virtual List
- [ ] 图片加载配置缓存
- [ ] 数据库添加索引
- [ ] 使用分页加载
- [ ] 组件使用memo优化
- [ ] 频繁事件使用防抖/节流
- [ ] 内存泄漏检测
- [ ] 启动时间优化

---

## 最佳实践

### 1. 列表优化
1. 使用DiffUtil或类似机制
2. 固定列表项高度
3. 只渲染可视区域
4. 复用ViewHolder/列表项

### 2. 图片优化
1. 配置内存和磁盘缓存
2. 使用合适的采样率
3. 懒加载屏幕外图片
4. 及时释放不再使用的图片

### 3. 数据库优化
1. 为常用查询字段添加索引
2. 使用分页加载大数据集
3. 批量操作使用事务
4. 及时清理旧数据

### 4. 内存优化
1. 避免内存泄漏
2. 使用弱引用缓存
3. 监控内存使用
4. 及时释放资源

---

## 相关文件

### Android
- `apps/android/app/src/main/java/com/sillychat/xsgchat/ui/components/message/MessageAdapter.kt`
- `apps/android/app/src/main/java/com/sillychat/xsgchat/di/ImageLoaderModule.kt`
- `apps/android/app/src/main/java/com/sillychat/xsgchat/data/local/dao/MessageDao.kt`
- `apps/android/app/src/main/java/com/sillychat/xsgchat/utils/MemoryManager.kt`

### HarmonyOS
- `apps/harmonyos/entry/src/main/ets/components/OptimizedList.ets`
- `apps/harmonyos/entry/src/main/ets/viewmodel/OptimizedChatViewModel.ets`

### React Native
- `apps/mobile/src/components/chat/OptimizedMessageList.tsx`
- `apps/mobile/src/utils/performance.ts`

### Desktop
- `apps/desktop/src/main/window-manager.ts`
