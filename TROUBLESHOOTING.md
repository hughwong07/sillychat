# 故障排除指南

本指南帮助您诊断和解决 SillyChat 使用中的常见问题。

## 目录

1. [安装问题](#安装问题)
2. [启动问题](#启动问题)
3. [连接问题](#连接问题)
4. [性能问题](#性能问题)
5. [数据问题](#数据问题)
6. [平台特定问题](#平台特定问题)

---

## 安装问题

### 错误：`npm install` 失败

**症状：**
```
npm ERR! code E404
npm ERR! 404 Not Found
```

**解决方案：**
```bash
# 1. 清理npm缓存
npm cache clean --force

# 2. 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 3. 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 错误：Node.js 版本不兼容

**症状：**
```
Error: Node.js version must be >= 22.12.0
```

**解决方案：**
```bash
# 使用nvm切换版本
nvm install 22
nvm use 22

# 或使用n
npm install -g n
n 22

# 验证版本
node --version  # 应显示 v22.x.x
```

### 错误：权限不足

**症状：**
```
npm ERR! Error: EACCES: permission denied
```

**解决方案：**
```bash
# 不要sudo安装！改为：
# 方法1: 更改npm目录
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# 方法2: 使用npx
npx sillychat
```

---

## 启动问题

### 错误：网关服务端口被占用

**症状：**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**解决方案：**
```bash
# 查找占用端口的进程
# macOS/Linux
lsof -i :8080

# Windows
netstat -ano | findstr :8080

# 终止进程
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 或更换端口
npm run dev:gateway -- --port 8081
```

### 错误：模块未找到

**症状：**
```
Error: Cannot find module '@sillychat/core/agents'
```

**解决方案：**
```bash
# 1. 重新构建
npm run build

# 2. 检查tsconfig路径
# 确保tsconfig.json中的paths配置正确

# 3. 清理并重新安装
rm -rf node_modules dist
npm install
npm run build
```

### 错误：TypeScript编译失败

**症状：**
```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

**解决方案：**
```bash
# 1. 检查类型定义
npm run type-check

# 2. 更新类型定义
npm update @types/node

# 3. 跳过类型检查（临时）
npm run build -- --skip-type-check
```

---

## 连接问题

### 错误：WebSocket连接失败

**症状：**
```
WebSocket connection to 'ws://localhost:8080/ws' failed
```

**解决方案：**
```bash
# 1. 检查网关服务是否运行
curl http://localhost:8080/health

# 2. 检查防火墙
sudo ufw allow 8080  # Ubuntu

# 3. 检查代理设置
unset HTTP_PROXY
unset HTTPS_PROXY

# 4. 使用localhost而非127.0.0.1
# 在代码中修改连接地址
```

### 错误：API认证失败

**症状：**
```
401 Unauthorized
{
  "error": "Invalid token"
}
```

**解决方案：**
```typescript
// 1. 重新获取token
const response = await fetch('http://localhost:8080/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${refreshToken}`
  }
});

// 2. 检查token过期时间
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));

// 3. 清除并重新登录
localStorage.removeItem('token');
// 重新登录流程
```

### 错误：CORS策略阻止

**症状：**
```
Access to fetch at 'http://localhost:8080/api' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**解决方案：**
```typescript
// 在网关配置中启用CORS
const gateway = new GatewayServer({
  config: {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    }
  }
});
```

---

## 性能问题

### 问题：应用响应缓慢

**诊断：**
```bash
# 检查CPU和内存使用
# macOS
ps aux | grep node

# 查看Node.js内存使用
node --expose-gc -e "console.log(process.memoryUsage())"
```

**解决方案：**
```bash
# 1. 增加内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. 启用GC日志
export NODE_OPTIONS="--trace-gc --max-old-space-size=4096"

# 3. 优化代码
# - 减少不必要的重渲染
# - 使用虚拟列表
# - 实现分页加载
```

### 问题：内存泄漏

**症状：**
- 内存使用持续增长
- 最终OOM崩溃

**诊断：**
```bash
# 生成堆快照
node --expose-gc --inspect index.js
# 使用Chrome DevTools分析
```

**解决方案：**
```typescript
// 1. 清理事件监听器
componentWillUnmount() {
  this.eventEmitter.removeAllListeners();
}

// 2. 清理定时器
clearInterval(this.intervalId);
clearTimeout(this.timeoutId);

// 3. 断开WebSocket连接
ws.close();

// 4. 释放大对象
largeArray = null;
```

### 问题：数据库查询慢

**诊断：**
```sql
-- 查看慢查询
EXPLAIN QUERY PLAN SELECT * FROM messages WHERE conversation_id = 'xxx';

-- 检查索引
SELECT * FROM sqlite_master WHERE type = 'index';
```

**解决方案：**
```sql
-- 添加索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation
ON messages(conversation_id, created_at);

-- 优化查询
-- 使用LIMIT和OFFSET
SELECT * FROM messages
WHERE conversation_id = ?
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- 定期VACUUM
VACUUM;
```

---

## 数据问题

### 错误：数据库损坏

**症状：**
```
SQLITE_CORRUPT: database disk image is malformed
```

**解决方案：**
```bash
# 1. 备份损坏的数据库
cp data/chat.db data/chat.db.corrupt

# 2. 尝试恢复
sqlite3 data/chat.db ".recover" | sqlite3 data/chat.db.recovered

# 3. 验证恢复的数据库
sqlite3 data/chat.db.recovered "PRAGMA integrity_check;"

# 4. 替换原数据库
mv data/chat.db.recovered data/chat.db
```

### 错误：文件存储失败

**症状：**
```
Error: ENOENT: no such file or directory, open '/data/blobs/xx/xxxx'
```

**解决方案：**
```bash
# 1. 检查目录权限
ls -la data/blobs/

# 2. 创建缺失目录
mkdir -p data/blobs/{00,01,02,...,ff}

# 3. 修复权限
chmod -R 755 data/

# 4. 检查磁盘空间
df -h
```

### 问题：数据同步冲突

**症状：**
- 多端数据不一致
- 同步失败

**解决方案：**
```typescript
// 1. 手动触发同步
await syncManager.forceSync();

// 2. 解决冲突
const conflicts = await syncManager.getConflicts();
for (const conflict of conflicts) {
  await syncManager.resolveConflict(conflict.id, 'local'); // 或 'remote'
}

// 3. 重置同步状态
await syncManager.reset();
```

---

## 平台特定问题

### Windows

#### 错误：找不到VCRUNTIME140.dll

**解决方案：**
```bash
# 安装Visual C++ Redistributable
# 下载地址：https://aka.ms/vs/17/release/vc_redist.x64.exe
```

#### 错误：路径过长

**解决方案：**
```powershell
# 启用长路径支持
# 1. 组策略编辑器 -> 计算机配置 -> 管理模板 -> 系统 -> 文件系统
# 2. 启用"启用Win32长路径"

# 或使用短路径
npm config set cache C:\npm-cache --global
```

### macOS

#### 错误："SillyChat"已损坏，无法打开

**解决方案：**
```bash
# 移除隔离属性
xattr -cr /Applications/SillyChat.app

# 或允许任何来源
sudo spctl --master-disable
```

#### 错误：无法验证开发者

**解决方案：**
```bash
# 系统设置 -> 隐私与安全性 -> 安全性
# 点击"仍要打开"

# 或使用命令行
sudo xattr -rd com.apple.quarantine /Applications/SillyChat.app
```

### Android

#### 错误：INSTALL_FAILED_UPDATE_INCOMPATIBLE

**解决方案：**
```bash
# 卸载旧版本
adb uninstall com.sillychat.app

# 重新安装
adb install app-release.apk
```

#### 错误：证书不匹配

**解决方案：**
```bash
# 清理并重新构建
cd apps/android
./gradlew clean
./gradlew assembleDebug
```

### HarmonyOS

#### 错误：签名验证失败

**解决方案：**
```bash
# 1. 在DevEco Studio中重新生成签名
# Build -> Generate Key and CSR

# 2. 配置签名
# File -> Project Structure -> Signing Configs
```

---

## 日志和调试

### 启用详细日志

```bash
# 设置日志级别
export SILLYCHAT_LOG_LEVEL=debug

# 或运行时指定
npm run dev -- --verbose
```

### 收集诊断信息

```bash
# 生成诊断报告
npx sillychat diagnose > diagnose-report.txt

# 包含的信息：
# - 系统信息
# - Node.js版本
# - 依赖版本
# - 配置文件
# - 最近日志
```

### 查看日志文件

```bash
# 实时查看
tail -f logs/app.log

# 查看最近100行
tail -n 100 logs/app.log

# 搜索错误
grep ERROR logs/app.log
```

---

## 获取帮助

如果以上方案无法解决问题：

1. **查看文档**
   - [API文档](docs/api/README.md)
   - [开发指南](docs/guides/DEVELOPMENT.md)

2. **搜索Issues**
   - https://github.com/your-org/SillyChat/issues

3. **提交新Issue**
   - 包含错误信息
   - 包含复现步骤
   - 包含环境信息
   - 包含诊断报告

4. **联系支持**
   - 邮件：support@sillychat.io
   - Discord：https://discord.gg/sillychat

---

## 快速修复检查清单

- [ ] 重启应用
- [ ] 清理缓存 (`npm run clean`)
- [ ] 重新安装依赖 (`rm -rf node_modules && npm install`)
- [ ] 重新构建 (`npm run build`)
- [ ] 检查端口占用
- [ ] 检查磁盘空间
- [ ] 检查网络连接
- [ ] 更新到最新版本 (`git pull`)
- [ ] 查看日志文件
- [ ] 重置配置 (`rm -rf ~/.sillychat/config`)

---

*最后更新：2026-02-24*
