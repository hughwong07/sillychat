# Python 后端数据库连接修复

## 修复时间
2026-02-25

## 问题描述

Python Webhook 服务在运行时遇到以下数据库连接问题：

1. **PostgreSQL 连接中断**
   ```
   asyncpg.exceptions.ConnectionDoesNotExistError: connection was closed in the middle of operation
   ```

2. **Redis 连接失败**
   ```
   Redis 连接失败: Error 22 connecting to 47.96.133.238:6379
   ```

3. **Windows 信号超时**
   ```
   OSError: [WinError 121] 信号灯超时时间已到
   ```

## 修复内容

### 1. 添加数据库连接池配置

**文件**: `webhook/main.py`

```python
# 数据库连接池配置
DB_POOL_CONFIG = {
    "pool_size": 5,
    "max_overflow": 10,
    "pool_timeout": 30,
    "pool_recycle": 3600,
    "pool_pre_ping": True,
}

# Redis 连接配置
REDIS_CONFIG = {
    "socket_connect_timeout": 5,
    "socket_timeout": 5,
    "health_check_interval": 30,
    "retry_on_timeout": True,
}
```

**作用**:
- `pool_size`: 保持 5 个常驻连接
- `max_overflow`: 允许最多 10 个额外连接
- `pool_pre_ping`: 自动检测并重新连接断开的连接
- `pool_recycle`: 1 小时后回收连接，防止连接过期

### 2. 创建数据库重试装饰器

```python
def async_retry(max_retries=3, delay=1.0, exceptions=(Exception,)):
    """异步函数重试装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(delay * (attempt + 1))
                    else:
                        raise
        return wrapper
    return decorator
```

**作用**: 自动重试失败的数据库操作，使用指数退避策略

### 3. 更新引擎创建

```python
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    **DB_POOL_CONFIG
)
```

### 4. 更新 Redis 配置

```python
redis_conn = redis.from_url(REDIS_URL, **REDIS_CONFIG)
```

## 测试验证

启动服务验证修复效果：

```bash
cd E:/silly/md/server/webhook
python main.py
```

预期结果：
- 数据库连接成功
- Redis 连接成功或优雅降级
- 服务正常运行

## 后续建议

### 短期改进
- [ ] 监控数据库连接池状态
- [ ] 添加连接数告警
- [ ] 实现数据库故障转移

### 长期规划
- [ ] 部署本地 PostgreSQL 开发环境
- [ ] 使用 Docker Compose 统一管理依赖服务
- [ ] 配置数据库读写分离

---

**提交**: `fix: 配置数据库连接池和重试机制`
