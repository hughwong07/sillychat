# SillyChat 性能最佳实践

本文档总结了SillyChat项目中使用的性能优化最佳实践，供开发团队参考。

## 目录

1. [通用原则](#通用原则)
2. [Android最佳实践](#android最佳实践)
3. [HarmonyOS最佳实践](#harmonyos最佳实践)
4. [React Native最佳实践](#react-native最佳实践)
5. [Desktop最佳实践](#desktop最佳实践)
6. [性能检查清单](#性能检查清单)

---

## 通用原则

### 1. 延迟加载（Lazy Loading）

只在需要时加载资源，避免一次性加载过多内容。

```kotlin
// Android - 延迟初始化
val expensiveObject by lazy { createExpensiveObject() }
```

```typescript
// React Native - 动态导入
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

### 2. 缓存策略

合理使用内存缓存和磁盘缓存，避免重复计算和网络请求。

```kotlin
// 内存缓存
val memoryCache = LruCache<String, Bitmap>(cacheSize)

// 磁盘缓存
val diskCache = DiskLruCache.open(cacheDir, 1, 1, cacheSize)
```

### 3. 资源释放

及时释放不再使用的资源，避免内存泄漏。

```kotlin
override fun onDestroy() {
    super.onDestroy()
    // 清理资源
    imageLoader.memoryCache?.clear()
    job.cancel()
}
```

### 4. 异步处理

耗时操作放在后台线程执行，避免阻塞主线程。

```kotlin
// Kotlin Coroutines
viewModelScope.launch(Dispatchers.IO) {
    val result = repository.fetchData()
    withContext(Dispatchers.Main) {
        updateUI(result)
    }
}
```

---

## Android最佳实践

### 1. RecyclerView优化

#### 使用DiffUtil

```kotlin
class MessageAdapter : ListAdapter<Message, ViewHolder>(MessageDiffCallback()) {
    class MessageDiffCallback : DiffUtil.ItemCallback<Message>() {
        override fun areItemsTheSame(old: Message, new: Message) = old.id == new.id
        override fun areContentsTheSame(old: Message, new: Message) = old == new
    }
}
```

#### ViewHolder模式

```kotlin
class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
    // 使用lazy延迟初始化
    private val textView: TextView by lazy { itemView.findViewById(R.id.text) }

    fun bind(message: Message) {
        textView.text = message.content
    }
}
```

#### 固定高度

```kotlin
recyclerView.setHasFixedSize(true)
layoutManager = LinearLayoutManager(context).apply {
    // 如果知道每项高度，启用预测动画
    isItemPrefetchEnabled = true
}
```

### 2. 图片加载优化

#### Coil配置

```kotlin
ImageLoader.Builder(context)
    .memoryCache {
        MemoryCache.Builder(context)
            .maxSizePercent(0.25)
            .build()
    }
    .diskCache {
        DiskCache.Builder()
            .directory(context.cacheDir.resolve("image_cache"))
            .maxSizeBytes(100 * 1024 * 1024)
            .build()
    }
    .crossfade(true)
    .build()
```

#### 图片采样

```kotlin
fun decodeSampledBitmap(path: String, reqWidth: Int, reqHeight: Int): Bitmap {
    val options = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
        BitmapFactory.decodeFile(path, this)
        inSampleSize = calculateInSampleSize(this, reqWidth, reqHeight)
        inJustDecodeBounds = false
        inPreferredConfig = Bitmap.Config.RGB_565 // 减少内存占用
    }
    return BitmapFactory.decodeFile(path, options)
}
```

### 3. 数据库优化

#### 索引使用

```kotlin
@Entity(
    tableName = "messages",
    indices = [
        Index(value = ["conversationId"]),
        Index(value = ["timestamp"]),
        Index(value = ["syncStatus"])
    ]
)
data class Message(...)
```

#### 分页查询

```kotlin
@Query("SELECT * FROM messages WHERE conversationId = :id ORDER BY timestamp DESC LIMIT :limit OFFSET :offset")
suspend fun getMessagesPaged(id: String, limit: Int, offset: Int): List<Message>
```

#### 批量操作

```kotlin
@Transaction
suspend fun insertMessages(messages: List<Message>) {
    messages.forEach { insert(it) }
}
```

### 4. 内存管理

#### 内存泄漏检测

```kotlin
// 使用LeakCanary检测内存泄漏
debugImplementation 'com.squareup.leakcanary:leakcanary-android:2.12'
```

#### 弱引用使用

```kotlin
class MyClass {
    private val listener = WeakReference<Listener>(listener)
}
```

#### 大对象处理

```kotlin
// 使用LargeObject优化大对象
@LargeObject
@Entity
data class MessageWithAttachments(...)
```

---

## HarmonyOS最佳实践

### 1. 状态管理优化

#### 使用@Observed

```typescript
@Observed
export class ChatUiState {
    messages: Message[] = [];
    isLoading: boolean = false;
}
```

#### 避免不必要的状态更新

```typescript
// 使用节流控制更新频率
private throttledUpdate = throttle((callback: () => void) => {
    callback();
}, 16);
```

### 2. 列表渲染优化

#### 虚拟列表

```typescript
// 只渲染可视区域
@Builder
MessageListBuilder() {
    List() {
        ForEach(this.visibleMessages, (msg: Message) => {
            ListItem() {
                MessageItem({ message: msg })
            }
        })
    }
}
```

#### 列表项复用

```typescript
export class ListItemPool<T> {
    private pool: T[] = [];

    acquire(): T {
        return this.pool.pop() ?? this.createFn();
    }

    release(item: T): void {
        if (this.pool.length < this.maxSize) {
            this.resetFn(item);
            this.pool.push(item);
        }
    }
}
```

### 3. 内存优化

#### 限制缓存大小

```typescript
private trimCachedMessages(): void {
    if (this.messageIds.length > MAX_CACHED_MESSAGES) {
        const excess = this.messageIds.length - MAX_CACHED_MESSAGES;
        const toRemove = this.messageIds.slice(0, excess);
        toRemove.forEach(id => this.messages.delete(id));
        this.messageIds = this.messageIds.slice(excess);
    }
}
```

#### 及时释放资源

```typescript
aboutToDisappear() {
    this.clearTypingAnimation();
    this.viewModel.destroy();
}
```

---

## React Native最佳实践

### 1. 组件优化

#### React.memo

```typescript
const MessageBubble = React.memo(({ message }) => {
    return <View>...</View>;
}, (prev, next) => {
    // 自定义比较
    return prev.message.id === next.message.id &&
           prev.message.content === next.message.content;
});
```

#### useMemo和useCallback

```typescript
const sortedMessages = useMemo(() => {
    return messages.sort((a, b) => a.timestamp - b.timestamp);
}, [messages]);

const handlePress = useCallback((message) => {
    onMessagePress(message);
}, [onMessagePress]);
```

### 2. FlatList优化

#### 关键配置

```typescript
<FlatList
    data={messages}
    renderItem={renderItem}
    keyExtractor={keyExtractor}
    getItemLayout={getItemLayout} // 固定高度
    removeClippedSubviews={true} // 移除屏幕外视图
    maxToRenderPerBatch={10} // 每批渲染数量
    updateCellsBatchingPeriod={50} // 更新间隔
    initialNumToRender={10} // 初始渲染数量
    windowSize={21} // 可视区域外渲染数量
/>
```

#### 避免匿名函数

```typescript
// 不好
renderItem={({ item }) => <MessageItem message={item} />}

// 好
const renderItem = useCallback(({ item }) => {
    return <MessageItem message={item} />;
}, []);
```

### 3. 事件优化

#### 防抖和节流

```typescript
// 防抖 - 搜索输入
const debouncedSearch = useDebounce((query) => {
    performSearch(query);
}, 300);

// 节流 - 滚动事件
const throttledScroll = useThrottle((offset) => {
    updateScrollPosition(offset);
}, 16);
```

### 4. 图片优化

#### 使用react-native-fast-image

```typescript
import FastImage from 'react-native-fast-image';

<FastImage
    source={{
        uri: imageUrl,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
    }}
    style={styles.image}
/>
```

#### 预加载图片

```typescript
useEffect(() => {
    const urls = messages.map(m => m.avatarUrl).filter(Boolean);
    preloadImages(urls);
}, [messages]);
```

---

## Desktop最佳实践

### 1. 窗口管理

#### 状态保存和恢复

```typescript
// 保存窗口状态
private saveWindowState(): void {
    const state: WindowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: window.isMaximized(),
    };
    fs.writeFileSync(statePath, JSON.stringify(state));
}

// 恢复窗口状态
private loadWindowState(): WindowState | null {
    try {
        const data = fs.readFileSync(statePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}
```

#### 延迟显示

```typescript
const window = new BrowserWindow({
    show: false, // 准备就绪后再显示
    // ...
});

window.once('ready-to-show', () => {
    window.show();
    window.focus();
});
```

### 2. 内存管理

#### 内存压力处理

```typescript
window.webContents.on('console-message', (event, level, message) => {
    if (message.includes('out of memory')) {
        handleMemoryPressure();
    }
});

private handleMemoryPressure(): void {
    // 清理缓存
    window.webContents.send('memory-pressure');
    // 必要时重载页面
    window.webContents.reload();
}
```

#### 窗口隐藏优化

```typescript
window.on('hide', () => {
    window.webContents.send('window-hidden');
    // 暂停非必要任务
});

window.on('show', () => {
    window.webContents.send('window-shown');
    // 恢复任务
});
```

### 3. 启动优化

#### 延迟加载

```typescript
// 主进程启动后再加载其他模块
app.whenReady().then(async () => {
    await createMainWindow();
    // 延迟加载非关键模块
    setTimeout(() => {
        loadOptionalModules();
    }, 1000);
});
```

---

## 性能检查清单

### 代码审查检查项

- [ ] 列表使用DiffUtil或类似机制
- [ ] 图片加载配置缓存
- [ ] 数据库查询使用索引
- [ ] 大数据集使用分页
- [ ] 组件使用memo优化
- [ ] 频繁事件使用防抖/节流
- [ ] 耗时操作放在后台线程
- [ ] 及时释放资源
- [ ] 避免内存泄漏
- [ ] 使用固定高度的列表项

### 发布前检查

- [ ] 启动时间 < 3秒
- [ ] 列表滚动FPS > 55
- [ ] 内存使用 < 200MB
- [ ] 无内存泄漏（使用工具检测）
- [ ] 图片加载有加载状态和错误处理
- [ ] 离线模式可用
- [ ] 低端设备测试通过

### 性能监控指标

| 指标 | 警告阈值 | 严重阈值 |
|------|----------|----------|
| 启动时间 | > 3s | > 5s |
| 列表FPS | < 50 | < 30 |
| 内存使用 | > 200MB | > 300MB |
| 图片加载时间 | > 1s | > 3s |
| ANR率 | > 0.1% | > 0.5% |
| 崩溃率 | > 0.1% | > 0.5% |

---

## 工具推荐

### Android
- **Android Studio Profiler**: CPU、内存、网络分析
- **LeakCanary**: 内存泄漏检测
- **Systrace**: 系统级性能分析
- **Layout Inspector**: UI布局分析

### HarmonyOS
- **DevEco Studio Profiler**: 性能分析
- **HiLog**: 日志分析

### React Native
- **Flipper**: 调试和性能分析
- **React Native Debugger**: 调试工具
- **Hermes**: JavaScript引擎优化

### Desktop
- **Chrome DevTools**: 渲染性能分析
- **Electron DevTools**: Electron专用工具
- **Process Monitor**: 系统资源监控

---

## 参考资料

- [Android Performance Patterns](https://developer.android.com/topic/performance)
- [HarmonyOS Performance Guidelines](https://developer.harmonyos.com/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Electron Performance](https://www.electronjs.org/docs/latest/tutorial/performance)
