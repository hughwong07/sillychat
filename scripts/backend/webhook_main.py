"""
Webhook Hub - 第三方 Webhook 中转服务平台
支持多租户、Webhook 接收、存储、转发和重试
集成 sillymd 用户系统
"""

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, List
import bcrypt
from jose import JWTError, jwt

import aiohttp
from fastapi import FastAPI, HTTPException, Header, Request, Depends, Form, Cookie, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, BigInteger, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import redis.asyncio as redis
from wechat_crypto import WeChatCrypto, verify_wechat_signature
from wechat_push import push_to_wechat_app
from ws_server import (
    websocket_endpoint,
    notify_by_target,
    WebSocketManager,
    cleanup_connections,
    init_redis
)

# OpenClaw 服务（可选导入）
try:
    from openclaw_ws import OpenClawService, OpenClawDevice
    OPENCLAW_AVAILABLE = True
except ImportError:
    OpenClawService = None
    OpenClawDevice = None
    OPENCLAW_AVAILABLE = False

# 数据库重试装饰器
def async_retry(max_retries=3, delay=1.0, exceptions=(Exception,)):
    """异步函数重试装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"[Retry] {func.__name__} 第 {attempt + 1} 次失败: {e}，{delay}秒后重试...")
                        await asyncio.sleep(delay * (attempt + 1))  # 指数退避
                    else:
                        logger.error(f"[Retry] {func.__name__} 最终失败: {e}")
            raise last_exception
        return wrapper
    return decorator

# 配置
DATABASE_URL = "postgresql+asyncpg://sillyAdmin:Jcoding2026@47.96.133.238:5432/webhook_hub"
USERS_DATABASE_URL = "postgresql+asyncpg://sillyAdmin:Jcoding2026@47.96.133.238:5432/sillymd"
REDIS_URL = "redis://47.96.133.238:6379/0"
WEBHOOK_TIMEOUT = 30
MAX_RETRIES = 3

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

# JWT 配置
SECRET_KEY = "webhook-hub-secret-key-change-in-production-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

# 用户等级 Webhook 请求限制（每月）
VENDOR_LEVEL_LIMITS = {
    "normal": 30_000,      # 普通用户：3万/月
    "premium": 100_000,    # 高级用户：10万/月
    "gold": 500_000,       # 金牌用户：50万/月
    "enterprise": None,    # 企业用户：不限
    "staff": None,         # 员工账户：不限
}

# 获取限制值，None 表示不限
DEFAULT_LIMIT = 30_000  # 默认限制

# 日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 数据库 - Webhook Hub
Base = declarative_base()

class Tenant(Base):
    """租户表 - 关联到 sillymd 用户"""
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(BigInteger, nullable=False, index=True)  # sillymd users.id
    name = Column(String(100), nullable=False)
    api_key = Column(String(64), unique=True, nullable=False, index=True)
    webhook_url = Column(Text)
    secret_key = Column(String(64))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    request_count = Column(Integer, default=0)
    # 企业微信验证配置
    wechat_token = Column(String(64))
    wechat_aes_key = Column(String(64))
    wechat_corp_id = Column(String(64))
    # 企业微信自建应用推送配置
    wechat_corp_secret = Column(String(128))  # 企微应用密钥
    wechat_push_target = Column(String(100))   # 推送目标用户ID
    wechat_agent_id = Column(Integer)          # 应用ID
    wechat_push_devices = Column(Text)         # 企微回复推送的设备列表（JSON数组）

class WebhookLog(Base):
    """Webhook 记录表"""
    __tablename__ = "webhook_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), nullable=False, index=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    source_ip = Column(String(45))
    method = Column(String(10))
    path = Column(Text)
    headers = Column(Text)
    body = Column(Text)
    status_code = Column(Integer)
    response_body = Column(Text)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime)
    error_message = Column(Text)


class UserMonthlyUsage(Base):
    """用户每月 Webhook 使用量统计"""
    __tablename__ = "user_monthly_usage"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(BigInteger, nullable=False, index=True)
    year_month = Column(String(7), nullable=False, index=True)  # 格式: 2024-01
    request_count = Column(Integer, default=0)
    last_request_at = Column(DateTime, default=datetime.utcnow)


class UsageAlert(Base):
    """使用量提醒记录表"""
    __tablename__ = "usage_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(BigInteger, nullable=False, index=True)
    year_month = Column(String(7), nullable=False)
    alert_threshold = Column(Integer, nullable=False)  # 90 表示 90%
    alert_sent_at = Column(DateTime, default=datetime.utcnow)
    channel = Column(String(20))  # email, wechat, feishu, sms
    status = Column(String(20), default="sent")  # sent, failed


class OpenClawDeviceModel(Base):
    """OpenClaw 设备表"""
    __tablename__ = "openclaw_devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), nullable=False, index=True)
    device_id = Column(String(64), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    ws_url = Column(Text, nullable=False)
    api_key = Column(String(128), nullable=False)  # 加密存储
    webhook_url = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 创建引擎（带连接池配置）
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    **DB_POOL_CONFIG
)
users_engine = create_async_engine(
    USERS_DATABASE_URL,
    echo=False,
    **DB_POOL_CONFIG
)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
users_async_session = sessionmaker(users_engine, class_=AsyncSession, expire_on_commit=False)

# 初始化数据库
async def init_db():
    async with engine.begin() as conn:
        await asyncio.wait_for(conn.run_sync(Base.metadata.create_all), timeout=10.0)

# Redis 连接
redis_conn = None

# OpenClaw WebSocket 服务（可选）
openclaw_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_conn, openclaw_service

    # 数据库初始化（带超时和异常处理）
    try:
        await asyncio.wait_for(init_db(), timeout=10.0)
        logger.info("[Lifespan] 数据库初始化成功")
    except asyncio.TimeoutError:
        logger.warning("[Lifespan] 数据库连接超时，将继续运行（部分功能可能不可用）")
    except Exception as e:
        logger.warning(f"[Lifespan] 数据库初始化失败，将继续运行: {e}")

    # Redis 连接（带超时和异常处理）
    try:
        redis_conn = redis.from_url(REDIS_URL, **REDIS_CONFIG)
        await asyncio.wait_for(redis_conn.ping(), timeout=5.0)
        logger.info("[Lifespan] Redis 连接成功")
    except Exception as e:
        logger.warning(f"[Lifespan] Redis 连接失败，消息转发将受限: {e}")
        redis_conn = None

    # 初始化 OpenClaw 服务（如果可用）
    if OPENCLAW_AVAILABLE:
        openclaw_service = OpenClawService()
        await openclaw_service.start()
        logger.info("[Lifespan] OpenClaw WebSocket 服务已启动")
    else:
        logger.info("[Lifespan] OpenClaw 服务不可用，跳过初始化")

    # 启动 WebSocket 清理任务（用于设备绑定推送）
    cleanup_task = asyncio.create_task(cleanup_connections())
    logger.info("[Lifespan] WebSocket 清理任务已启动")

    # 初始化 WebSocket Redis（用于跨进程消息转发）
    ws_redis_initialized = await init_redis()
    if ws_redis_initialized:
        logger.info("[Lifespan] WebSocket Redis 已初始化")
    else:
        logger.warning("[Lifespan] WebSocket Redis 初始化失败，跨进程消息转发不可用")

    yield

    # 关闭清理任务
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

    # 关闭 OpenClaw 服务（如果已启动）
    if openclaw_service:
        await openclaw_service.stop()
        logger.info("[Lifespan] OpenClaw WebSocket 服务已停止")

    # 关闭 Redis 连接（如果已连接）
    if redis_conn:
        await redis_conn.close()

app = FastAPI(
    title="Webhook Hub",
    description="第三方 Webhook 中转服务平台 - 集成 sillymd 用户系统",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======== Pydantic 模型 ========

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class TenantCreate(BaseModel):
    name: str = Field(..., description="租户名称")
    webhook_url: Optional[str] = Field(None, description="回调地址 URL")

class TenantResponse(BaseModel):
    id: str
    name: str
    api_key: str
    webhook_url: Optional[str]
    secret_key: str
    created_at: datetime

class WebhookResponse(BaseModel):
    id: str
    status: str
    message: str

class WebhookListItem(BaseModel):
    id: str
    source_ip: str
    method: str
    path: str
    status_code: Optional[int]
    retry_count: int
    created_at: datetime
    delivered_at: Optional[datetime]

class UserInfo(BaseModel):
    id: int
    email: str
    username: str

# ======== 辅助函数 ========

def generate_api_key():
    """生成 API Key - 只使用字母和数字，避免特殊字符"""
    import random, string
    return "wh" + ''.join(random.choices(string.ascii_letters + string.digits, k=48))

def generate_secret_key():
    """生成签名密钥"""
    return secrets.token_hex(32)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建 JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码 - 支持 bcrypt 和明文（兼容旧系统）"""
    # bcrypt限制72字节，截断密码
    plain_bytes = plain_password[:72].encode('utf-8')
    if hashed_password.startswith('$2'):
        try:
            return bcrypt.checkpw(plain_bytes, hashed_password.encode('utf-8'))
        except Exception:
            return False
    # 兼容旧系统的明文密码（实际应该迁移）
    return plain_password == hashed_password

def get_password_hash(password: str) -> str:
    """生成密码哈希 - bcrypt限制72字节"""
    password_bytes = password[:72].encode('utf-8')
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt(12)).decode('utf-8')


async def get_user_vendor_level(user_id: int) -> str:
    """获取用户等级"""
    async with users_async_session() as db:
        result = await db.execute(
            text("SELECT vendor_level FROM users WHERE id = :id AND is_active = true"),
            {"id": user_id}
        )
        row = result.fetchone()
        if row:
            return row.vendor_level or "normal"
        return "normal"


async def get_user_monthly_usage(user_id: int) -> int:
    """获取用户当月使用量"""
    year_month = datetime.utcnow().strftime("%Y-%m")

    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT request_count FROM user_monthly_usage
                WHERE user_id = :user_id AND year_month = :year_month
            """),
            {"user_id": user_id, "year_month": year_month}
        )
        row = result.fetchone()
        return row.request_count if row else 0


async def increment_user_usage(user_id: int):
    """增加用户使用量"""
    year_month = datetime.utcnow().strftime("%Y-%m")

    async with async_session() as db:
        # 尝试更新现有记录
        result = await db.execute(
            text("""
                UPDATE user_monthly_usage
                SET request_count = request_count + 1, last_request_at = NOW()
                WHERE user_id = :user_id AND year_month = :year_month
                RETURNING request_count
            """),
            {"user_id": user_id, "year_month": year_month}
        )

        if not result.fetchone():
            # 不存在则插入新记录
            await db.execute(
                text("""
                    INSERT INTO user_monthly_usage (id, user_id, year_month, request_count)
                    VALUES (:id, :user_id, :year_month, 1)
                    ON CONFLICT (user_id, year_month) DO UPDATE
                    SET request_count = user_monthly_usage.request_count + 1,
                        last_request_at = NOW()
                """),
                {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "year_month": year_month
                }
            )
        await db.commit()


async def check_rate_limit(user_id: int) -> Tuple[bool, Dict]:
    """检查用户是否超出限制
    返回: (是否允许, 限制信息)
    """
    # 获取用户等级
    vendor_level = await get_user_vendor_level(user_id)

    # 获取限制值
    limit = VENDOR_LEVEL_LIMITS.get(vendor_level, DEFAULT_LIMIT)

    # 无限制
    if limit is None:
        return True, {
            "vendor_level": vendor_level,
            "limit": None,
            "used": await get_user_monthly_usage(user_id),
            "remaining": None
        }

    # 获取使用量
    used = await get_user_monthly_usage(user_id)

    # 检查是否超限
    if used >= limit:
        return False, {
            "vendor_level": vendor_level,
            "limit": limit,
            "used": used,
            "remaining": 0,
            "reset_date": (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1).strftime("%Y-%m-%d")
        }

    return True, {
        "vendor_level": vendor_level,
        "limit": limit,
        "used": used,
        "remaining": limit - used - 1
    }


def get_vendor_level_name(level: str) -> str:
    """获取等级中文名"""
    names = {
        "normal": "普通用户",
        "premium": "高级用户",
        "gold": "金牌用户",
        "enterprise": "企业用户",
        "staff": "员工账户"
    }
    return names.get(level, "普通用户")


async def check_and_send_usage_alert(user_id: int, used: int, limit: int, vendor_level: str):
    """检查使用量并发送提醒"""
    if limit is None:
        return  # 无限制用户不提醒

    percentage = (used / limit) * 100

    # 只在 90% 时提醒一次
    alert_threshold = 90
    if percentage < alert_threshold:
        return

    year_month = datetime.utcnow().strftime("%Y-%m")

    # 检查本月是否已发送过 90% 提醒
    async with async_session() as db:
        result = await db.execute(
            text("""
                SELECT id FROM usage_alerts
                WHERE user_id = :user_id AND year_month = :year_month
                AND alert_threshold = :threshold
            """),
            {
                "user_id": user_id,
                "year_month": year_month,
                "threshold": alert_threshold
            }
        )
        if result.fetchone():
            return  # 已发送过，不再提醒

    # 获取用户联系信息
    async with users_async_session() as db:
        result = await db.execute(
            text("SELECT email, phone, wechat_id, feishu_id, notify_channels, username FROM users WHERE id = :id"),
            {"id": user_id}
        )
        user = result.fetchone()
        if not user:
            return

    # 构建提醒消息
    remaining = limit - used
    reset_date = (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1).strftime("%Y-%m-%d")

    message = f"""【Webhook Hub 使用量提醒】

您好 {user.username}，

您的 Webhook 服务本月使用量已达到 {percentage:.1f}%：

- 用户等级：{get_vendor_level_name(vendor_level)}
- 使用次数：{used:,} / {limit:,}
- 剩余次数：{remaining:,}
- 重置日期：{reset_date}

如需更高额度，请考虑升级账户等级。
详情访问：https://webhook.sillymd.com

---
Webhook Hub 中转服务
"""

    # 发送提醒（优先邮件，预留其他渠道）
    channels = user.notify_channels or ["email"]  # 默认邮件
    sent_channels = []

    for channel in channels:
        try:
            if channel == "email" and user.email:
                await send_email_alert(user.email, "Webhook 使用量提醒", message)
                sent_channels.append("email")
            elif channel == "wechat" and user.wechat_id:
                # 预留微信接口
                await send_wechat_alert(user.wechat_id, message)
                sent_channels.append("wechat")
            elif channel == "feishu" and user.feishu_id:
                # 预留飞书接口
                await send_feishu_alert(user.feishu_id, message)
                sent_channels.append("feishu")
            elif channel == "sms" and user.phone:
                # 预留短信接口
                await send_sms_alert(user.phone, message)
                sent_channels.append("sms")
        except Exception as e:
            logger.error(f"Failed to send {channel} alert to user {user_id}: {e}")

    # 记录已发送提醒
    if sent_channels:
        async with async_session() as db:
            for channel in sent_channels:
                await db.execute(
                    text("""
                        INSERT INTO usage_alerts (id, user_id, year_month, alert_threshold, channel, status)
                        VALUES (:id, :user_id, :year_month, :threshold, :channel, 'sent')
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "year_month": year_month,
                        "threshold": alert_threshold,
                        "channel": channel
                    }
                )
            await db.commit()


async def send_email_alert(to_email: str, subject: str, body: str):
    """发送邮件提醒 - 预留接口"""
    # TODO: 集成邮件发送服务（如 SendGrid、AWS SES 等）
    logger.info(f"[EMAIL ALERT] To: {to_email}, Subject: {subject}")
    # 实际实现时需要添加邮件发送逻辑


async def send_wechat_alert(wechat_id: str, message: str):
    """发送微信提醒 - 预留接口"""
    # TODO: 集成企业微信/微信公众号 API
    logger.info(f"[WECHAT ALERT] To: {wechat_id}, Message: {message[:50]}...")


async def send_feishu_alert(feishu_id: str, message: str):
    """发送飞书提醒 - 预留接口"""
    # TODO: 集成飞书机器人/飞书开放平台 API
    logger.info(f"[FEISHU ALERT] To: {feishu_id}, Message: {message[:50]}...")


async def send_sms_alert(phone: str, message: str):
    """发送短信提醒 - 预留接口"""
    # TODO: 集成短信服务（如阿里云短信、腾讯云短信等）
    logger.info(f"[SMS ALERT] To: {phone}, Message: {message[:50]}...")

# ======== 依赖 ========

async def get_db():
    async with async_session() as session:
        yield session

async def get_users_db():
    async with users_async_session() as session:
        yield session

async def get_current_user(
    token: Optional[str] = Cookie(None, alias="access_token"),
    authorization: Optional[str] = Header(None)
) -> dict:
    """获取当前登录用户"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 优先从 Cookie 获取，其次从 Header
    jwt_token = token
    if authorization and authorization.startswith("Bearer "):
        jwt_token = authorization[7:]

    if not jwt_token:
        raise credentials_exception

    try:
        payload = jwt.decode(jwt_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # 查询用户信息
    async with users_async_session() as db:
        result = await db.execute(
            text("SELECT id, email, username FROM users WHERE id = :id AND is_active = true"),
            {"id": int(user_id)}
        )
        row = result.fetchone()
        if row is None:
            raise credentials_exception
        return {"id": row.id, "email": row.email, "username": row.username}

async def get_tenant(
    x_api_key: str = Header(..., description="API Key"),
    db: AsyncSession = Depends(get_db)
) -> Tenant:
    """验证 API Key 并返回租户信息"""
    result = await db.execute(
        text("SELECT * FROM tenants WHERE api_key = :key AND is_active = true"),
        {"key": x_api_key}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    return Tenant(
        id=row.id,
        user_id=row.user_id,
        name=row.name,
        api_key=row.api_key,
        webhook_url=row.webhook_url,
        secret_key=row.secret_key,
        is_active=row.is_active,
        created_at=row.created_at,
        request_count=row.request_count,
        wechat_token=row.wechat_token,
        wechat_aes_key=row.wechat_aes_key,
        wechat_corp_id=row.wechat_corp_id,
        wechat_corp_secret=row.wechat_corp_secret,
        wechat_push_target=row.wechat_push_target,
        wechat_agent_id=row.wechat_agent_id
    )

# ======== Webhook 转发功能 ========

async def forward_webhook(
    webhook_url: str,
    headers: dict,
    body: bytes,
    secret_key: Optional[str] = None
) -> Tuple[int, str]:
    """转发 Webhook 到用户指定的回调地址"""
    logger.info(f"[Forward] Starting to forward webhook to: {webhook_url[:50]}...")

    forward_headers = dict(headers)
    forward_headers.pop("host", None)
    forward_headers["X-Webhook-Hub"] = "true"

    if secret_key:
        timestamp = str(int(datetime.utcnow().timestamp()))
        try:
            body_text = body.decode('utf-8')
        except UnicodeDecodeError:
            body_text = body.decode('utf-8', errors='replace')
        signature = hmac.new(
            secret_key.encode(),
            f"{timestamp}.{body_text}".encode(),
            hashlib.sha256
        ).hexdigest()
        forward_headers["X-Webhook-Signature"] = f"t={timestamp},v1={signature}"

    timeout = aiohttp.ClientTimeout(total=WEBHOOK_TIMEOUT)

    async with aiohttp.ClientSession(timeout=timeout) as session:
        try:
            async with session.post(
                webhook_url,
                headers=forward_headers,
                data=body
            ) as response:
                response_text = await response.text()
                logger.info(f"[Forward] Success: status={response.status}, body_len={len(response_text)}")
                return response.status, response_text
        except asyncio.TimeoutError:
            logger.error("[Forward] Timeout")
            return 0, "Timeout"
        except Exception as e:
            logger.error(f"[Forward] Error: {e}")
            return 0, str(e)

async def process_webhook_retry(
    log_id: str,
    tenant_id: str,
    webhook_url: str,
    headers: dict,
    body: bytes,
    secret_key: Optional[str],
    retry_count: int = 0
):
    """处理 Webhook 转发和重试"""
    logger.info(f"[Retry] Processing webhook log_id={log_id}, retry={retry_count}")
    status_code, response = await forward_webhook(webhook_url, headers, body, secret_key)
    logger.info(f"[Retry] Forward result: status_code={status_code}, retry={retry_count}")

    try:
        async with async_session() as session:
            delivered = 200 <= status_code < 300

            await session.execute(
                text("""
                    UPDATE webhook_logs
                    SET status_code = :status,
                        response_body = :response,
                        retry_count = :retry,
                        delivered_at = CASE WHEN :delivered THEN NOW() ELSE delivered_at END,
                        error_message = CASE WHEN :delivered THEN NULL ELSE :response END
                    WHERE id = :id
                """),
                {
                    "id": log_id,
                    "status": status_code if status_code else None,
                    "response": response[:1000] if response else None,
                    "retry": retry_count,
                    "delivered": delivered
                }
            )
            await session.commit()
            logger.info(f"[Retry] Database updated for log_id={log_id}, delivered={delivered}")
    except Exception as e:
        logger.error(f"[Retry] Database update failed: {e}")

        if not delivered and retry_count < MAX_RETRIES:
            await asyncio.sleep(2 ** retry_count)
            await process_webhook_retry(
                log_id, tenant_id, webhook_url, headers, body, secret_key, retry_count + 1
            )

# ======== 认证 API ========

@app.post("/api/v1/auth/register")
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_users_db)
):
    """用户注册 - 特定邮箱域名自动设为员工账号"""
    # 检查邮箱是否已存在
    result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": data.email}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 检查用户名是否已存在
    result = await db.execute(
        text("SELECT id FROM users WHERE username = :username"),
        {"username": data.username}
    )
    if result.fetchone():
        raise HTTPException(status_code=400, detail="Username already taken")

    # 判断是否为员工账号（特定邮箱域名）
    staff_domains = ['sillymd.com', 'jcoding.tech']
    email_domain = data.email.split('@')[-1].lower()
    vendor_level = 'staff' if email_domain in staff_domains else 'normal'

    # 创建用户
    password_hash = get_password_hash(data.password)
    result = await db.execute(
        text("""
            INSERT INTO users (username, email, password_hash, vendor_level, is_active, is_verified, created_at, updated_at)
            VALUES (:username, :email, :password_hash, :vendor_level, true, true, NOW(), NOW())
            RETURNING id
        """),
        {
            "username": data.username,
            "email": data.email,
            "password_hash": password_hash,
            "vendor_level": vendor_level
        }
    )
    user_id = result.fetchone()[0]
    await db.commit()

    # 创建访问令牌
    access_token = create_access_token(data={"sub": str(user_id)})

    return {
        "message": "User registered successfully",
        "user_id": user_id,
        "access_token": access_token,
        "vendor_level": vendor_level
    }

@app.post("/api/v1/auth/login")
async def login(
    response: Response,
    data: UserLogin,
    db: AsyncSession = Depends(get_users_db)
):
    """用户登录 - 支持邮箱/用户名/手机号"""
    login_input = data.email  # 字段名还是email但可以是任意登录名

    # 判断登录类型
    if '@' in login_input:
        # 邮箱登录
        result = await db.execute(
            text("SELECT id, email, username, phone, password_hash FROM users WHERE email = :email AND is_active = true"),
            {"email": login_input}
        )
    elif login_input.isdigit():
        # 手机号登录
        result = await db.execute(
            text("SELECT id, email, username, phone, password_hash FROM users WHERE phone = :phone AND is_active = true"),
            {"phone": login_input}
        )
    else:
        # 用户名登录
        result = await db.execute(
            text("SELECT id, email, username, phone, password_hash FROM users WHERE username = :username AND is_active = true"),
            {"username": login_input}
        )

    user = result.fetchone()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 创建访问令牌
    access_token = create_access_token(data={"sub": str(user.id)})

    # 设置 Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )

    return {
        "message": "Login successful",
        "user": {"id": user.id, "email": user.email, "username": user.username},
        "access_token": access_token
    }

@app.post("/api/v1/auth/logout")
async def logout(response: Response):
    """用户登出"""
    response.delete_cookie("access_token")
    return {"message": "Logout successful"}

@app.get("/api/v1/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user

# ======== Webhook 管理 API ========

@app.post("/api/v1/tenants", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建新租户（需要登录）"""

    tenant_id = str(uuid.uuid4())
    api_key = generate_api_key()
    secret_key = generate_secret_key()

    await db.execute(
        text("""
            INSERT INTO tenants (id, user_id, name, api_key, webhook_url, secret_key, is_active, created_at, request_count)
            VALUES (:id, :user_id, :name, :api_key, :webhook_url, :secret_key, true, NOW(), 0)
        """),
        {
            "id": tenant_id,
            "user_id": current_user["id"],
            "name": data.name,
            "api_key": api_key,
            "webhook_url": data.webhook_url,
            "secret_key": secret_key
        }
    )
    await db.commit()

    return TenantResponse(
        id=tenant_id,
        name=data.name,
        api_key=api_key,
        webhook_url=data.webhook_url,
        secret_key=secret_key,
        created_at=datetime.utcnow()
    )

@app.get("/api/v1/tenants")
async def list_tenants(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取当前用户的所有租户"""
    result = await db.execute(
        text("""
            SELECT id, name, api_key, webhook_url, created_at, request_count
            FROM tenants WHERE user_id = :user_id AND is_active = true
            ORDER BY created_at DESC
        """),
        {"user_id": current_user["id"]}
    )

    tenants = []
    for row in result.fetchall():
        tenants.append({
            "id": row.id,
            "name": row.name,
            "api_key": row.api_key,
            "webhook_url": row.webhook_url,
            "created_at": row.created_at,
            "request_count": row.request_count
        })

    return tenants

@app.get("/api/v1/tenants/me")
async def get_tenant_info(tenant: Tenant = Depends(get_tenant)):
    """获取当前租户信息（通过 API Key）"""
    return {
        "id": tenant.id,
        "name": tenant.name,
        "webhook_url": tenant.webhook_url,
        "request_count": tenant.request_count,
        "created_at": tenant.created_at
    }

@app.get("/api/v1/tenants/{tenant_id}")
async def get_tenant_detail(
    tenant_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取租户详细信息（包含企业微信配置）"""
    result = await db.execute(
        text("""
            SELECT id, name, api_key, webhook_url, secret_key, request_count, created_at,
                   wechat_token, wechat_aes_key, wechat_corp_id,
                   wechat_corp_secret, wechat_push_target, wechat_agent_id
            FROM tenants WHERE id = :id AND user_id = :user_id AND is_active = true
        """),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")

    return {
        "id": row.id,
        "name": row.name,
        "api_key": row.api_key,
        "webhook_url": row.webhook_url,
        "secret_key": row.secret_key,
        "request_count": row.request_count,
        "created_at": row.created_at,
        "wechat_config": {
            "token": row.wechat_token,
            "aes_key": row.wechat_aes_key,
            "corp_id": row.wechat_corp_id,
            "corp_secret": row.wechat_corp_secret,
            "push_target": row.wechat_push_target,
            "agent_id": row.wechat_agent_id
        } if (row.wechat_token or row.wechat_aes_key or row.wechat_corp_id or
              row.wechat_corp_secret or row.wechat_push_target or row.wechat_agent_id) else None
    }

class WebhookConfigUpdate(BaseModel):
    webhook_url: Optional[str] = None

@app.put("/api/v1/tenants/{tenant_id}/webhook")
async def update_webhook_url(
    tenant_id: str,
    webhook_url: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新回调地址"""
    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    await db.execute(
        text("UPDATE tenants SET webhook_url = :url WHERE id = :id"),
        {"url": webhook_url, "id": tenant_id}
    )
    await db.commit()
    return {"message": "Webhook URL updated"}

@app.post("/api/v1/tenants/{tenant_id}/webhook-config")
async def update_webhook_config(
    tenant_id: str,
    config: WebhookConfigUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新回调地址 (POST 版本供前端使用)"""
    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    await db.execute(
        text("UPDATE tenants SET webhook_url = :url WHERE id = :id"),
        {"url": config.webhook_url, "id": tenant_id}
    )
    await db.commit()
    return {"message": "Webhook URL updated"}

@app.delete("/api/v1/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除租户（软删除）"""
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    await db.execute(
        text("UPDATE tenants SET is_active = false WHERE id = :id"),
        {"id": tenant_id}
    )
    await db.commit()
    return {"message": "Tenant deleted"}

class WeChatConfig(BaseModel):
    """企业微信配置模型"""
    token: str
    aes_key: str
    corp_id: str

class WeChatPushConfig(BaseModel):
    """企业微信自建应用推送配置模型"""
    corp_secret: str = Field(..., description="企业微信应用密钥")
    push_target: str = Field(..., description="推送目标用户ID")
    agent_id: int = Field(..., description="应用ID")
    push_devices: Optional[List[str]] = Field(None, description="推送设备列表，如 ['wechat', 'my_claw']")

@app.post("/api/v1/tenants/{tenant_id}/wechat-config")
async def update_wechat_config(
    tenant_id: str,
    config: WeChatConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新企业微信验证配置（JSON格式）"""
    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 验证EncodingAESKey长度（应为43字符）
    if config.aes_key and len(config.aes_key) != 43:
        raise HTTPException(status_code=400, detail="EncodingAESKey must be 43 characters")

    await db.execute(
        text("""
            UPDATE tenants
            SET wechat_token = :token,
                wechat_aes_key = :aes_key,
                wechat_corp_id = :corp_id
            WHERE id = :id
        """),
        {
            "id": tenant_id,
            "token": config.token,
            "aes_key": config.aes_key,
            "corp_id": config.corp_id
        }
    )
    await db.commit()

    # 构建回调URL
    result = await db.execute(
        text("SELECT api_key FROM tenants WHERE id = :id"),
        {"id": tenant_id}
    )
    row = result.fetchone()
    callback_url = f"https://webhook.sillymd.com/webhook/wechat/{row.api_key}" if row else None

    return {
        "message": "企业微信配置更新成功",
        "callback_url": callback_url,
        "config": {
            "token": config.token[:10] + "..." if len(config.token) > 10 else config.token,
            "aes_key": config.aes_key[:10] + "..." if len(config.aes_key) > 10 else config.aes_key,
            "corp_id": config.corp_id
        }
    }

@app.post("/api/v1/tenants/{tenant_id}/wechat-push-config")
async def update_wechat_push_config(
    tenant_id: str,
    config: WeChatPushConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新企业微信自建应用推送配置（JSON格式）"""
    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 验证 corp_secret 长度
    if not config.corp_secret or len(config.corp_secret) < 10:
        raise HTTPException(status_code=400, detail="Invalid corp_secret")

    # 验证 agent_id
    if config.agent_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    # 验证 push_target
    if not config.push_target:
        raise HTTPException(status_code=400, detail="push_target cannot be empty")

    # 处理 push_devices
    import json
    push_devices_json = None
    if config.push_devices:
        if not isinstance(config.push_devices, list):
            raise HTTPException(status_code=400, detail="push_devices must be a list")
        if len(config.push_devices) == 0:
            raise HTTPException(status_code=400, detail="push_devices cannot be empty")
        push_devices_json = json.dumps(config.push_devices)

    await db.execute(
        text("""
            UPDATE tenants
            SET wechat_corp_secret = :corp_secret,
                wechat_push_target = :push_target,
                wechat_agent_id = :agent_id,
                wechat_push_devices = :push_devices
            WHERE id = :id
        """),
        {
            "id": tenant_id,
            "corp_secret": config.corp_secret,
            "push_target": config.push_target,
            "agent_id": config.agent_id,
            "push_devices": push_devices_json
        }
    )
    await db.commit()

    logger.info(f"[WeChatPush] 更新租户 {tenant_id} 的企业微信推送配置: target={config.push_target}, agent_id={config.agent_id}, devices={config.push_devices}")

    return {
        "message": "企业微信推送配置更新成功",
        "config": {
            "corp_secret": config.corp_secret[:10] + "..." if len(config.corp_secret) > 10 else config.corp_secret,
            "push_target": config.push_target,
            "agent_id": config.agent_id,
            "push_devices": config.push_devices or ["wechat"]  # 默认返回 ["wechat"]
        }
    }

@app.delete("/api/v1/tenants/{tenant_id}/wechat-push-config")
async def delete_wechat_push_config(
    tenant_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除企业微信自建应用推送配置"""
    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    await db.execute(
        text("""
            UPDATE tenants
            SET wechat_corp_secret = NULL,
                wechat_push_target = NULL,
                wechat_agent_id = NULL,
                wechat_push_devices = NULL
            WHERE id = :id
        """),
        {"id": tenant_id}
    )
    await db.commit()

    logger.info(f"[WeChatPush] 删除租户 {tenant_id} 的企业微信推送配置")

    return {"message": "企业微信推送配置已删除"}

@app.get("/api/v1/tenants/{tenant_id}/wechat-config")
async def get_wechat_config(
    tenant_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取企业微信配置（敏感信息部分隐藏）"""
    result = await db.execute(
        text("""
            SELECT wechat_token, wechat_aes_key, wechat_corp_id,
                   wechat_corp_secret, wechat_push_target, wechat_agent_id,
                   wechat_push_devices, api_key
            FROM tenants WHERE id = :id AND user_id = :user_id AND is_active = true
        """),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 构建回调URL
    callback_url = f"https://webhook.sillymd.com/webhook/wechat/{row.api_key}"

    # 解析 push_devices
    import json
    push_devices = ["wechat"]  # 默认值
    if row.wechat_push_devices:
        try:
            push_devices = json.loads(row.wechat_push_devices)
            if not isinstance(push_devices, list):
                push_devices = ["wechat"]
        except:
            push_devices = ["wechat"]

    return {
        "callback_url": callback_url,
        "is_configured": bool(row.wechat_token and row.wechat_aes_key and row.wechat_corp_id),
        "is_push_configured": bool(row.wechat_corp_secret and row.wechat_push_target and row.wechat_agent_id),
        "config": {
            "token": row.wechat_token[:10] + "****" if row.wechat_token else None,
            "aes_key": row.wechat_aes_key[:10] + "****" if row.wechat_aes_key else None,
            "corp_id": row.wechat_corp_id
        } if row.wechat_token or row.wechat_aes_key or row.wechat_corp_id else None,
        "push_config": {
            "corp_id": row.wechat_corp_id,
            "corp_secret": row.wechat_corp_secret[:10] + "****" if row.wechat_corp_secret else None,
            "push_target": row.wechat_push_target,
            "agent_id": row.wechat_agent_id,
            "push_devices": push_devices
        } if row.wechat_corp_secret or row.wechat_push_target or row.wechat_agent_id else None
    }

# ======== OpenClaw WebSocket API ========

class OpenClawDeviceConfig(BaseModel):
    """OpenClaw 设备配置模型"""
    device_id: str = Field(..., description="设备ID")
    name: str = Field(..., description="设备名称")
    api_key: str = Field(..., description="OpenClaw API Key")
    ws_url: str = Field(default="wss://api.openclaw.com/ws", description="WebSocket 连接地址")
    webhook_url: Optional[str] = Field(None, description="消息转发到的 Webhook 地址")


@app.post("/api/v1/tenants/{tenant_id}/openclaw-devices")
async def add_openclaw_device(
    tenant_id: str,
    config: OpenClawDeviceConfig,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """添加 OpenClaw 设备并建立 WebSocket 连接"""
    global openclaw_service

    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id, api_key, webhook_url FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 使用租户配置的 webhook_url 或自定义的
    forward_url = config.webhook_url or row.webhook_url

    # 创建设备唯一ID (tenant_id + device_id)
    unique_device_id = f"{tenant_id}:{config.device_id}"

    # 添加到 OpenClaw 服务
    if openclaw_service:
        openclaw_service.add_device_with_forwarding(
            device_id=unique_device_id,
            name=config.name,
            api_key=config.api_key,
            ws_url=config.ws_url,
            tenant_id=tenant_id,
            user_id=current_user["id"],
            webhook_url=forward_url
        )

    # 保存到数据库
    await db.execute(
        text("""
            INSERT INTO openclaw_devices (id, tenant_id, device_id, name, ws_url, api_key, webhook_url, created_at)
            VALUES (:id, :tenant_id, :device_id, :name, :ws_url, :api_key, :webhook_url, NOW())
            ON CONFLICT (tenant_id, device_id) DO UPDATE SET
                name = EXCLUDED.name,
                ws_url = EXCLUDED.ws_url,
                api_key = EXCLUDED.api_key,
                webhook_url = EXCLUDED.webhook_url,
                updated_at = NOW()
        """),
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "device_id": config.device_id,
            "name": config.name,
            "ws_url": config.ws_url,
            "api_key": config.api_key,
            "webhook_url": forward_url
        }
    )
    await db.commit()

    return {
        "message": "OpenClaw 设备已添加",
        "device_id": config.device_id,
        "name": config.name,
        "status": "connecting"
    }


@app.delete("/api/v1/tenants/{tenant_id}/openclaw-devices/{device_id}")
async def remove_openclaw_device(
    tenant_id: str,
    device_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """移除 OpenClaw 设备"""
    global openclaw_service

    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 从服务中移除
    if openclaw_service:
        unique_device_id = f"{tenant_id}:{device_id}"
        openclaw_service.remove_device(unique_device_id)

    # 从数据库中删除（软删除）
    await db.execute(
        text("""
            UPDATE openclaw_devices
            SET is_active = false, updated_at = NOW()
            WHERE tenant_id = :tenant_id AND device_id = :device_id
        """),
        {"tenant_id": tenant_id, "device_id": device_id}
    )
    await db.commit()

    return {"message": "OpenClaw 设备已移除", "device_id": device_id}


@app.get("/api/v1/tenants/{tenant_id}/openclaw-devices")
async def list_openclaw_devices(
    tenant_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取租户的 OpenClaw 设备列表"""
    # 验证租户属于当前用户
    result = await db.execute(
        text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
        {"id": tenant_id, "user_id": current_user["id"]}
    )
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 查询设备列表
    result = await db.execute(
        text("""
            SELECT device_id, name, ws_url, webhook_url, is_active, created_at
            FROM openclaw_devices
            WHERE tenant_id = :tenant_id AND is_active = true
            ORDER BY created_at DESC
        """),
        {"tenant_id": tenant_id}
    )
    devices = []
    for row in result.fetchall():
        unique_id = f"{tenant_id}:{row.device_id}"
        # 获取实时状态
        status = {}
        if openclaw_service:
            status = openclaw_service.manager.get_device_status(unique_id) or {"connected": False}

        devices.append({
            "device_id": row.device_id,
            "name": row.name,
            "ws_url": row.ws_url,
            "webhook_url": row.webhook_url,
            "is_active": row.is_active,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "connection_status": status
        })

    return {"devices": devices}


@app.get("/api/v1/openclaw/status")
async def get_openclaw_status(
    current_user: dict = Depends(get_current_user)
):
    """获取 OpenClaw 服务状态"""
    if not openclaw_service:
        return {"status": "not_initialized", "devices": {}}

    # 获取当前用户的设备状态
    all_status = openclaw_service.get_status()
    user_devices = {
        k: v for k, v in all_status.get("devices", {}).items()
        if v.get("user_id") == current_user["id"]
    }

    return {
        "status": "running",
        "devices": user_devices,
        "total_devices": len(user_devices)
    }


# ======== WebSocket API ========

@app.websocket("/ws")
async def ws_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket 连接端点 - 设备绑定后接收精准推送

    连接地址: wss://webhook.sillymd.com/ws?token=YOUR_JWT_TOKEN

    连接流程:
        1. 客户端连接: wss://webhook.sillymd.com/ws?token=xxx
        2. 服务端返回: {"type": "connected", "message": "..."}
        3. 客户端发送绑定: {"type": "bind", "device_name": "my_claw"}
        4. 服务端返回: {"type": "bound", "device_id": "user_id:device_name"}
        5. 等待接收消息...

    消息推送:
        Webhook 接收时会根据目标设备 ID 精准推送:
        {"type": "webhook", "target_device": "user_id:device_name", "data": {...}}

    参数:
        token: JWT 认证 token (从登录接口获取)
    """
    await websocket_endpoint(websocket, token)


@app.get("/api/v1/ws/status")
async def get_websocket_status(current_user: dict = Depends(get_current_user)):
    """获取 WebSocket 连接状态"""
    from ws_server import WebSocketManager
    stats = WebSocketManager.get_stats()
    # 过滤当前用户的设备
    user_devices = {
        k: v for k, v in stats.get("devices", {}).items()
        if k.startswith(f"{current_user['id']}:")
    }
    return {
        "connected_devices": len(user_devices),
        "total_connections": sum(user_devices.values()),
        "devices": user_devices
    }


# ======== Webhook 接收 API ========

@app.get("/webhook/wechat/{api_key}")
async def wechat_verify_url(
    api_key: str,
    msg_signature: str,
    timestamp: str,
    nonce: str,
    echostr: str,
    db: AsyncSession = Depends(get_db)
):
    """企业微信URL验证 - 解密echostr并返回"""
    # 查询租户
    result = await db.execute(
        text("SELECT * FROM tenants WHERE api_key = :key AND is_active = true"),
        {"key": api_key}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 检查是否配置了企业微信验证
    if not row.wechat_token or not row.wechat_aes_key or not row.wechat_corp_id:
        raise HTTPException(status_code=400, detail="WeChat verification not configured")

    try:
        # URL解码 - 处理+号被转空格的问题
        from urllib.parse import unquote
        echostr_decoded = unquote(echostr.replace(' ', '+'))

        # 调试日志
        logger.info(f"[WeChat Verify] api_key={api_key}")
        logger.info(f"[WeChat Verify] token={row.wechat_token}, corp_id={row.wechat_corp_id}")
        logger.info(f"[WeChat Verify] signature={msg_signature}, timestamp={timestamp}, nonce={nonce}")
        logger.info(f"[WeChat Verify] echostr_raw={echostr}")
        logger.info(f"[WeChat Verify] echostr_decoded={echostr_decoded}")

        # 使用企业微信加密库验证并解密
        crypto = WeChatCrypto(
            token=row.wechat_token,
            encoding_aes_key=row.wechat_aes_key,
            corp_id=row.wechat_corp_id
        )

        # 手动计算签名对比（企业微信URL验证：token+timestamp+nonce+echostr）
        import hashlib
        data = [row.wechat_token, timestamp, nonce, echostr_decoded]
        data.sort()
        concat_str = ''.join(data)
        expected_sig = hashlib.sha1(concat_str.encode()).hexdigest()
        logger.info(f"[WeChat Verify] sorted_data={data}")
        logger.info(f"[WeChat Verify] concat_str={concat_str}")
        logger.info(f"[WeChat Verify] expected_sig={expected_sig}")
        logger.info(f"[WeChat Verify] received_sig={msg_signature}")
        logger.info(f"[WeChat Verify] match={expected_sig == msg_signature}")

        # 尝试解密（即使签名不匹配也尝试）
        try:
            decrypted = crypto._decrypt(echostr_decoded)
            logger.info(f"[WeChat Verify] decrypted success: {decrypted}")
            # 确保返回纯明文，无BOM头，无换行符，无引号
            cleaned_response = decrypted.strip().replace('\n', '').replace('\r', '').replace('"', '')
            logger.info(f"[WeChat Verify] returning: {cleaned_response}")
            return Response(
                content=cleaned_response,
                media_type="text/plain; charset=utf-8"
            )
        except Exception as decrypt_err:
            logger.error(f"[WeChat Verify] decrypt failed: {decrypt_err}")
            raise HTTPException(status_code=403, detail="Invalid signature")

    except ValueError as e:
        logger.error(f"WeChat verification failed: {e}")
        raise HTTPException(status_code=403, detail="Invalid signature")
    except Exception as e:
        logger.error(f"WeChat decryption error: {e}")
        raise HTTPException(status_code=500, detail="Decryption failed")


@app.post("/webhook/wechat/{api_key}")
async def receive_wechat_webhook(
    request: Request,
    api_key: str,
    msg_signature: Optional[str] = None,
    signature: Optional[str] = None,  # 兼容不同参数名
    timestamp: Optional[str] = None,
    nonce: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """接收企业微信加密消息并解密转发"""
    # 调试日志
    actual_sig = msg_signature or signature
    logger.info(f"[WeChat POST] api_key={api_key}, msg_signature={msg_signature}, signature={signature}, timestamp={timestamp}, nonce={nonce}")

    # 参数校验
    if not actual_sig or not timestamp or not nonce:
        logger.error(f"[WeChat POST] Missing params: sig={actual_sig}, ts={timestamp}, nonce={nonce}")
        raise HTTPException(status_code=422, detail="Missing required parameters")

    # 查询租户
    result = await db.execute(
        text("SELECT * FROM tenants WHERE api_key = :key AND is_active = true"),
        {"key": api_key}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant = Tenant(
        id=row.id, user_id=row.user_id, name=row.name, api_key=row.api_key,
        webhook_url=row.webhook_url, secret_key=row.secret_key,
        is_active=row.is_active, created_at=row.created_at,
        request_count=row.request_count,
        wechat_token=row.wechat_token,
        wechat_aes_key=row.wechat_aes_key,
        wechat_corp_id=row.wechat_corp_id,
        wechat_corp_secret=row.wechat_corp_secret,
        wechat_push_target=row.wechat_push_target,
        wechat_agent_id=row.wechat_agent_id,
        wechat_push_devices=row.wechat_push_devices
    )

    # 检查用户等级限制
    allowed, limit_info = await check_rate_limit(tenant.user_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": f"您已达到本月 Webhook 接收上限（{limit_info['limit']:,} 次）",
                "vendor_level": limit_info['vendor_level'],
                "used": limit_info['used'],
                "limit": limit_info['limit'],
                "reset_date": limit_info.get('reset_date')
            }
        )

    # 读取加密的消息体
    body = await request.body()

    # 解密消息
    decrypted_xml = None
    if tenant.wechat_token and tenant.wechat_aes_key and tenant.wechat_corp_id:
        try:
            crypto = WeChatCrypto(
                token=tenant.wechat_token,
                encoding_aes_key=tenant.wechat_aes_key,
                corp_id=tenant.wechat_corp_id
            )
            # 从XML中提取Encrypt字段
            import xml.etree.ElementTree as ET
            root = ET.fromstring(body.decode('utf-8', errors='replace'))
            encrypt_node = root.find('Encrypt')
            if encrypt_node is not None:
                encrypted_msg = encrypt_node.text
                decrypted_xml = crypto.decrypt_msg(actual_sig, timestamp, nonce, encrypted_msg)
                logger.info(f"WeChat message decrypted successfully")
        except Exception as e:
            logger.error(f"Failed to decrypt WeChat message: {e}")
            decrypted_xml = body.decode('utf-8', errors='replace')
    else:
        decrypted_xml = body.decode('utf-8', errors='replace')

    # 增加用户使用量
    await increment_user_usage(tenant.user_id)

    # 异步检查是否需要发送使用量提醒
    if limit_info['limit'] is not None:
        current_used = limit_info['used'] + 1
        asyncio.create_task(check_and_send_usage_alert(
            tenant.user_id, current_used, limit_info['limit'], limit_info['vendor_level']
        ))

    headers = dict(request.headers)
    log_id = str(uuid.uuid4())

    # 记录日志（存储解密后的内容）
    await db.execute(
        text("""
            INSERT INTO webhook_logs
            (id, tenant_id, user_id, source_ip, method, path, headers, body)
            VALUES (:id, :tenant_id, :user_id, :ip, :method, :path, :headers, :body)
        """),
        {
            "id": log_id,
            "tenant_id": tenant.id,
            "user_id": tenant.user_id,
            "ip": request.client.host if request.client else "unknown",
            "method": request.method,
            "path": "/wechat/" + api_key,
            "headers": json.dumps({k: v for k, v in headers.items() if k.lower() not in ["authorization", "cookie"]}),
            "body": decrypted_xml[:10000] if decrypted_xml else None
        }
    )

    await db.execute(
        text("UPDATE tenants SET request_count = request_count + 1 WHERE id = :id"),
        {"id": tenant.id}
    )
    await db.commit()

    # 解析企微 XML 消息并通过 WebSocket 推送
    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(decrypted_xml)

        # 提取关键信息
        msg_type = root.find('MsgType')
        from_user = root.find('FromUserName')
        to_user = root.find('ToUserName')
        content = root.find('Content')
        create_time = root.find('CreateTime')

        msg_data = {
            "type": "wechat_reply",
            "msg_type": msg_type.text if msg_type is not None else "unknown",
            "from_user": from_user.text if from_user is not None else "",
            "to_user": to_user.text if to_user is not None else "",
            "content": content.text if content is not None else "",
            "create_time": create_time.text if create_time is not None else "",
            "timestamp": datetime.utcnow().isoformat()
        }

        # 通过 WebSocket 推送企微回复消息
        # 获取推送设备列表
        push_devices = ["wechat"]  # 默认值
        logger.info(f"[WeChat] DEBUG: tenant.wechat_push_devices = {tenant.wechat_push_devices}")
        if tenant.wechat_push_devices:
            try:
                push_devices = json.loads(tenant.wechat_push_devices)
                logger.info(f"[WeChat] DEBUG: parsed push_devices = {push_devices}")
                if not isinstance(push_devices, list) or len(push_devices) == 0:
                    push_devices = ["wechat"]
            except Exception as e:
                logger.error(f"[WeChat] DEBUG: json.loads failed: {e}")
                push_devices = ["wechat"]
        logger.info(f"[WeChat] DEBUG: final push_devices = {push_devices}")

        # 推送到所有指定设备
        for device_name in push_devices:
            try:
                await notify_by_target(
                    target_user_id=tenant.user_id,
                    target_device_name=device_name,
                    message=msg_data
                )
                logger.info(f"[WeChat] 企微回复已推送到设备: user_id={tenant.user_id}, device={device_name}, from_user={msg_data.get('from_user')}, msg_type={msg_data.get('msg_type')}")
            except Exception as e:
                logger.error(f"[WeChat] 推送到设备失败: device={device_name}, error={e}")
    except ET.ParseError as e:
        logger.error(f"[WeChat] XML 解析失败: {e}")
    except Exception as e:
        logger.error(f"[WeChat] WebSocket 推送失败: {e}")

    # 转发解密后的消息到用户回调地址
    if tenant.webhook_url:
        logger.info(f"[WeChat] Forwarding decrypted message to: {tenant.webhook_url[:50]}...")
        body_bytes = decrypted_xml.encode('utf-8') if decrypted_xml else b""
        asyncio.create_task(process_webhook_retry(
            log_id, tenant.id, tenant.webhook_url, headers, body_bytes, tenant.secret_key
        ))

    # 返回企业微信要求的响应格式
    return Response(
        content="<xml><ReturnCode>0</ReturnCode></xml>",
        media_type="application/xml"
    )


@app.post("/webhook/{tenant_path:path}", response_model=WebhookResponse)
async def receive_webhook(
    request: Request,
    tenant_path: str,
    db: AsyncSession = Depends(get_db)
):
    """接收 Webhook 请求"""
    parts = tenant_path.split("/", 1)
    api_key = parts[0]
    sub_path = "/" + parts[1] if len(parts) > 1 else "/"

    result = await db.execute(
        text("SELECT * FROM tenants WHERE api_key = :key AND is_active = true"),
        {"key": api_key}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant = Tenant(
        id=row.id, user_id=row.user_id, name=row.name, api_key=row.api_key,
        webhook_url=row.webhook_url, secret_key=row.secret_key,
        is_active=row.is_active, created_at=row.created_at,
        request_count=row.request_count,
        wechat_token=row.wechat_token,
        wechat_aes_key=row.wechat_aes_key,
        wechat_corp_id=row.wechat_corp_id,
        wechat_corp_secret=row.wechat_corp_secret,
        wechat_push_target=row.wechat_push_target,
        wechat_agent_id=row.wechat_agent_id,
        wechat_push_devices=row.wechat_push_devices
    )

    # 检查用户等级限制
    allowed, limit_info = await check_rate_limit(tenant.user_id)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "message": f"您已达到本月 Webhook 接收上限（{limit_info['limit']:,} 次）",
                "vendor_level": limit_info['vendor_level'],
                "used": limit_info['used'],
                "limit": limit_info['limit'],
                "reset_date": limit_info.get('reset_date')
            }
        )

    body = await request.body()
    headers = dict(request.headers)

    # 增加用户使用量
    await increment_user_usage(tenant.user_id)

    # 异步检查是否需要发送使用量提醒
    if limit_info['limit'] is not None:
        current_used = limit_info['used'] + 1
        asyncio.create_task(check_and_send_usage_alert(
            tenant.user_id, current_used, limit_info['limit'], limit_info['vendor_level']
        ))

    log_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO webhook_logs
            (id, tenant_id, user_id, source_ip, method, path, headers, body)
            VALUES (:id, :tenant_id, :user_id, :ip, :method, :path, :headers, :body)
        """),
        {
            "id": log_id,
            "tenant_id": tenant.id,
            "user_id": tenant.user_id,
            "ip": request.client.host if request.client else "unknown",
            "method": request.method,
            "path": sub_path,
            "headers": json.dumps({k: v for k, v in headers.items() if k.lower() not in ["authorization", "cookie"]}),
            "body": body.decode('utf-8', errors='replace')[:10000] if body else None
        }
    )

    await db.execute(
        text("UPDATE tenants SET request_count = request_count + 1 WHERE id = :id"),
        {"id": tenant.id}
    )
    await db.commit()

    logger.info(f"[Receive] tenant.webhook_url={tenant.webhook_url is not None}, creating forward task")

    # 构建 Webhook 数据
    webhook_data = {
        "log_id": log_id,
        "method": request.method,
        "path": sub_path,
        "headers": {k: v for k, v in headers.items() if k.lower() not in ["authorization", "cookie"]},
        "body": body.decode('utf-8', errors='replace')[:10000] if body else None,
        "source_ip": request.client.host if request.client else "unknown",
        "timestamp": datetime.utcnow().isoformat(),
        "tenant_id": tenant.id,
        "user_id": tenant.user_id
    }

    # 推送消息到 WebSocket 客户端（根据目标设备精准推送）
    # 从请求体或路径中解析目标设备信息
    # 支持以下方式指定目标设备:
    # 1. URL 路径: /webhook/{api_key}/{device_name}
    # 2. 请求体: {"target_device": "device_name"}
    # 3. Header: X-Target-Device: device_name

    target_device = None

    # 方式1: 从路径解析 (如 /webhook/api_key/claw_001)
    path_parts = sub_path.strip('/').split('/')
    if len(path_parts) >= 1 and path_parts[0]:
        target_device = path_parts[0]
        logger.info(f"[Receive] 从路径解析目标设备: {target_device}")

    # 方式2: 从请求体解析 (JSON 中的 target_device 字段)
    if body:
        try:
            body_json = json.loads(body.decode('utf-8', errors='replace'))
            if isinstance(body_json, dict) and body_json.get("target_device"):
                target_device = body_json.get("target_device")
                logger.info(f"[Receive] 从请求体解析目标设备: {target_device}")
        except json.JSONDecodeError:
            pass

    # 方式3: 从 Header 解析
    target_from_header = headers.get("x-target-device") or headers.get("X-Target-Device")
    if target_from_header:
        target_device = target_from_header
        logger.info(f"[Receive] 从Header解析目标设备: {target_device}")

    # 如果找到了目标设备，进行精准推送
    if target_device:
        from ws_server import notify_by_target
        asyncio.create_task(notify_by_target(
            target_user_id=tenant.user_id,
            target_device_name=target_device,
            message=webhook_data
        ))
        logger.info(f"[Receive] WebSocket 精准推送: user_id={tenant.user_id}, device={target_device}")
    else:
        logger.info(f"[Receive] 未指定目标设备，跳过 WebSocket 推送")

    # 推送消息：优先使用企业微信自建应用，否则使用 webhook_url 转发
    # 检查是否配置了企业微信自建应用推送
    if (tenant.wechat_corp_id and tenant.wechat_corp_secret and
        tenant.wechat_push_target and tenant.wechat_agent_id):

        logger.info(f"[Receive] 使用企业微信自建应用推送: user_id={tenant.wechat_push_target}")
        asyncio.create_task(push_to_wechat_app(
            corp_id=tenant.wechat_corp_id,
            corp_secret=tenant.wechat_corp_secret,
            agent_id=tenant.wechat_agent_id,
            push_target=tenant.wechat_push_target,
            webhook_data=webhook_data
        ))

    elif tenant.webhook_url:
        # 回退到 webhook_url 转发
        logger.info(f"[Receive] Creating forward task to: {tenant.webhook_url[:50]}...")
        asyncio.create_task(process_webhook_retry(
            log_id, tenant.id, tenant.webhook_url, headers, body, tenant.secret_key
        ))
    else:
        logger.warning("[Receive] 未配置企业微信推送或 webhook_url，跳过消息转发")

    # 构建响应消息
    message = "Webhook received and queued for delivery"
    if limit_info['limit'] is not None:
        message += f" (本月已用 {limit_info['used'] + 1:,}/{limit_info['limit']:,})"

    return WebhookResponse(
        id=log_id,
        status="accepted",
        message=message
    )

# ======== Webhook 日志 API ========

@app.get("/api/v1/webhooks")
async def list_webhooks(
    limit: int = 50,
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取 Webhook 历史记录"""
    # 如果指定了租户 ID，验证权限
    if tenant_id:
        result = await db.execute(
            text("SELECT id FROM tenants WHERE id = :id AND user_id = :user_id"),
            {"id": tenant_id, "user_id": current_user["id"]}
        )
        if not result.fetchone():
            raise HTTPException(status_code=403, detail="Access denied")

        result = await db.execute(
            text("""
                SELECT id, source_ip, method, path, status_code, retry_count, created_at, delivered_at
                FROM webhook_logs
                WHERE tenant_id = :tenant_id
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"tenant_id": tenant_id, "limit": limit}
        )
    else:
        # 获取用户所有租户的日志
        result = await db.execute(
            text("""
                SELECT w.id, w.source_ip, w.method, w.path, w.status_code,
                       w.retry_count, w.created_at, w.delivered_at, t.name as tenant_name
                FROM webhook_logs w
                JOIN tenants t ON w.tenant_id = t.id
                WHERE w.user_id = :user_id
                ORDER BY w.created_at DESC
                LIMIT :limit
            """),
            {"user_id": current_user["id"], "limit": limit}
        )

    webhooks = []
    for row in result.fetchall():
        webhooks.append({
            "id": row.id,
            "source_ip": row.source_ip,
            "method": row.method,
            "path": row.path,
            "status_code": row.status_code,
            "retry_count": row.retry_count,
            "created_at": row.created_at,
            "delivered_at": row.delivered_at,
            "tenant_name": getattr(row, 'tenant_name', None)
        })

    return webhooks

@app.get("/api/v1/webhooks/{webhook_id}")
async def get_webhook_detail(
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取 Webhook 详情"""
    result = await db.execute(
        text("""
            SELECT w.* FROM webhook_logs w
            JOIN tenants t ON w.tenant_id = t.id
            WHERE w.id = :id AND w.user_id = :user_id
        """),
        {"id": webhook_id, "user_id": current_user["id"]}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Webhook not found")

    return {
        "id": row.id,
        "source_ip": row.source_ip,
        "method": row.method,
        "path": row.path,
        "headers": json.loads(row.headers) if row.headers else {},
        "body": row.body,
        "status_code": row.status_code,
        "response_body": row.response_body,
        "retry_count": row.retry_count,
        "created_at": row.created_at,
        "delivered_at": row.delivered_at,
        "error_message": row.error_message
    }

@app.get("/api/v1/user/usage")
async def get_user_usage(current_user: dict = Depends(get_current_user)):
    """获取用户当前使用量和限制信息"""
    vendor_level = await get_user_vendor_level(current_user["id"])
    limit = VENDOR_LEVEL_LIMITS.get(vendor_level, DEFAULT_LIMIT)
    used = await get_user_monthly_usage(current_user["id"])

    reset_date = (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1)

    return {
        "vendor_level": vendor_level,
        "vendor_level_name": get_vendor_level_name(vendor_level),
        "limit": limit,
        "used": used,
        "remaining": None if limit is None else max(0, limit - used),
        "percentage": None if limit is None else round(used / limit * 100, 2),
        "reset_date": reset_date.strftime("%Y-%m-%d"),
        "is_limited": limit is not None and used >= limit
    }


@app.post("/api/v1/webhooks/{webhook_id}/retry")
async def retry_webhook(
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """手动重试失败的 Webhook"""
    result = await db.execute(
        text("""
            SELECT w.*, t.webhook_url, t.secret_key
            FROM webhook_logs w
            JOIN tenants t ON w.tenant_id = t.id
            WHERE w.id = :id AND w.user_id = :user_id
        """),
        {"id": webhook_id, "user_id": current_user["id"]}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if not row.webhook_url:
        raise HTTPException(status_code=400, detail="No webhook URL configured")

    headers = json.loads(row.headers) if row.headers else {}
    body = row.body.encode() if row.body else b""

    asyncio.create_task(process_webhook_retry(
        webhook_id, row.tenant_id, row.webhook_url, headers, body, row.secret_key
    ))

    return {"message": "Retry initiated"}

# ======== 管理界面（含登录和接入流程） ========

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """管理界面 - 含登录和接入流程"""
    return """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Webhook Hub - 第三方 Webhook 中转服务</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            text-align: center;
            color: white;
            padding: 40px 0;
        }
        header h1 { font-size: 3em; margin-bottom: 10px; }
        header p { font-size: 1.2em; opacity: 0.9; }

        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin: 20px 0;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .card h2 {
            color: #333;
            margin-bottom: 20px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }

        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }

        .btn {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            display: inline-block;
            text-decoration: none;
            margin: 5px;
        }
        .btn:hover { background: #5a6fd6; }
        .btn-secondary {
            background: #6c757d;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .btn-success {
            background: #28a745;
        }
        .btn-success:hover {
            background: #218838;
        }

        .endpoint {
            background: #1a1a2e;
            color: #00ff88;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            overflow-x: auto;
            font-size: 14px;
        }

        .code-block {
            background: #f4f4f4;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            overflow-x: auto;
        }
        .code-block code {
            font-family: 'Courier New', monospace;
            color: #333;
            font-size: 14px;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .feature {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .feature h3 { color: #667eea; margin-bottom: 10px; }

        .step {
            display: flex;
            align-items: flex-start;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .step-number {
            background: #667eea;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 20px;
            flex-shrink: 0;
        }
        .step-content {
            flex: 1;
        }
        .step-content h3 {
            margin-bottom: 10px;
            color: #333;
        }

        /* 现代化登录样式 */
        .auth-container {
            display: flex;
            gap: 40px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .auth-box {
            flex: 1;
            min-width: 360px;
            max-width: 450px;
            background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 16px;
            padding: 35px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .auth-box:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.15);
        }
        .auth-box h3 {
            color: #333;
            margin-bottom: 25px;
            font-size: 1.4em;
            text-align: center;
            position: relative;
            padding-bottom: 15px;
        }
        .auth-box h3::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 2px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 600;
            font-size: 14px;
        }
        .form-group input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            transition: all 0.3s ease;
            background: #fafafa;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
            background: #fff;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
        .form-group input::placeholder {
            color: #aaa;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 30px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: inline-block;
            text-decoration: none;
            margin: 5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .btn:active {
            transform: translateY(0);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
        }
        .btn-secondary:hover {
            box-shadow: 0 8px 25px rgba(108, 117, 125, 0.4);
        }
        .btn-success {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }
        .btn-success:hover {
            box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
        }
        .btn-full {
            width: calc(100% - 10px);
            margin: 10px 5px;
        }
        .auth-divider {
            display: flex;
            align-items: center;
            margin: 25px 0;
            color: #999;
            font-size: 13px;
        }
        .auth-divider::before,
        .auth-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, #ddd, transparent);
        }
        .auth-divider span {
            padding: 0 15px;
        }
        .input-icon-wrapper {
            position: relative;
        }
        .input-icon-wrapper input {
            padding-left: 45px;
        }
        .input-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #999;
            font-size: 18px;
        }
        .login-hint {
            text-align: center;
            color: #888;
            font-size: 13px;
            margin-top: 15px;
        }
        .login-hint code {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 4px;
            color: #667eea;
        }
        .vendor-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        .vendor-badge.staff {
            background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
            color: #333;
        }
        .vendor-badge.normal {
            background: #e9ecef;
            color: #666;
        }

        .alert {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .user-info {
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .hidden { display: none; }

        .tenant-list {
            margin-top: 20px;
        }
        .tenant-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
        }
        .tenant-item h4 {
            margin-bottom: 5px;
            color: #333;
        }
        .tenant-item .api-key {
            font-family: monospace;
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
        }
        .tenant-actions {
            margin-top: 10px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .tenant-actions .btn {
            padding: 6px 15px;
            font-size: 14px;
        }
        .btn-wechat {
            background: #07c160;
        }
        .btn-wechat:hover {
            background: #06ad56;
        }
        .config-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .config-badge.configured {
            background: #d4edda;
            color: #155724;
        }
        .config-badge.not-configured {
            background: #f8d7da;
            color: #721c24;
        }
        .btn-sm {
            padding: 4px 10px;
            font-size: 12px;
        }

        /* 模态框样式 */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        }
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            padding: 30px;
            position: relative;
        }
        .modal-close {
            position: absolute;
            right: 20px;
            top: 20px;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        .modal-close:hover {
            color: #333;
        }
        .form-hint {
            color: #666;
            font-size: 13px;
            margin-top: 4px;
        }
        .form-hint code {
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th { background: #f8f9fa; font-weight: 600; }

        footer {
            text-align: center;
            color: white;
            padding: 40px 0;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Webhook Hub</h1>
            <p>可靠的第三方 Webhook 中转服务平台</p>
        </header>

        <!-- 认证状态栏 -->
        <div id="auth-bar" class="card hidden">
            <div class="user-info">
                <span>欢迎, <strong id="username"></strong></span>
                <button onclick="logout()" class="btn btn-secondary">退出登录</button>
            </div>
        </div>

        <!-- 登录 -->
        <div id="auth-section" class="card">
            <h2 style="text-align: center; margin-bottom: 10px;">🔐 用户登录</h2>
            <p style="text-align: center; margin-bottom: 30px; color: #666;">登录账号以申请 Webhook 服务</p>

            <div id="auth-message"></div>

            <div class="auth-container" style="justify-content: center;">
                <div class="auth-box" style="max-width: 420px;">
                    <form onsubmit="login(event)">
                        <div class="form-group">
                            <label>账号</label>
                            <div class="input-icon-wrapper">
                                <span class="input-icon">👤</span>
                                <input type="text" id="login-email" required placeholder="邮箱 / 用户名 / 手机号">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>密码</label>
                            <div class="input-icon-wrapper">
                                <span class="input-icon">🔒</span>
                                <input type="password" id="login-password" required placeholder="请输入密码">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-full">登 录</button>
                    </form>
                    <div class="login-hint">
                        支持 <code>邮箱</code> / <code>用户名</code> / <code>手机号</code> 登录
                    </div>
                    <div class="auth-divider">
                        <span>还没有账号？</span>
                    </div>
                    <div style="text-align: center;">
                        <a href="#" onclick="showRegisterModal(); return false;" class="btn btn-success">立即注册</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- 注册模态框 -->
        <div id="register-modal" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <span class="modal-close" onclick="closeRegisterModal()">&times;</span>
                <h2 style="text-align: center; margin-bottom: 10px;">📝 注册账号</h2>
                <p style="text-align: center; color: #666; margin-bottom: 25px;">创建新账号以使用 Webhook 服务</p>

                <div id="register-message"></div>

                <form onsubmit="register(event)">
                    <div class="form-group">
                        <label>用户名</label>
                        <div class="input-icon-wrapper">
                            <span class="input-icon">👤</span>
                            <input type="text" id="register-username" required placeholder="设置用户名">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>邮箱</label>
                        <div class="input-icon-wrapper">
                            <span class="input-icon">✉️</span>
                            <input type="email" id="register-email" required placeholder="your@email.com">
                        </div>
                        <div class="form-hint">
                            <span class="vendor-badge staff">员工</span> sillymd.com / jcoding.tech 自动识别为员工账号
                        </div>
                    </div>
                    <div class="form-group">
                        <label>密码</label>
                        <div class="input-icon-wrapper">
                            <span class="input-icon">🔒</span>
                            <input type="password" id="register-password" required placeholder="设置密码（6-72位）" minlength="6">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-success btn-full">注 册</button>
                </form>

                <div style="text-align: center; margin-top: 20px;">
                    <a href="#" onclick="closeRegisterModal(); return false;" style="color: #667eea; text-decoration: none;">已有账号？直接登录</a>
                </div>
            </div>
        </div>

        <!-- Webhook 管理 -->
        <div id="webhook-management" class="card hidden">
            <h2>我的 Webhook 服务</h2>

            <div id="create-tenant-form">
                <h3>创建新的 Webhook 服务</h3>
                <form onsubmit="createTenant(event)">
                    <div class="form-group">
                        <label>服务名称</label>
                        <input type="text" id="tenant-name" required placeholder="例如：我的 GitHub Webhook">
                    </div>
                    <div class="form-group">
                        <label>回调地址（接收转发的 Webhook）</label>
                        <input type="url" id="tenant-webhook-url" required placeholder="https://your-server.com/webhook">
                    </div>
                    <button type="submit" class="btn">创建 Webhook 服务</button>
                </form>
            </div>

            <div id="tenant-list" class="tenant-list">
                <h3>已创建的服务</h3>
                <div id="tenants-container"></div>
            </div>
        </div>

        <!-- 企业微信配置模态框 -->
        <div id="wechat-modal" class="modal">
            <div class="modal-content">
                <span class="modal-close" onclick="closeWechatModal()">&times;</span>
                <h2>企业微信配置</h2>
                <p style="color: #666; margin-bottom: 20px;">配置企业微信的 Token、EncodingAESKey 和 CorpID，用于接收加密的企业微信消息。</p>

                <form id="wechat-config-form" onsubmit="saveWechatConfig(event)">
                    <input type="hidden" id="wechat-tenant-id">

                    <div class="form-group">
                        <label>Token <span style="color: red;">*</span></label>
                        <input type="text" id="wechat-token" required placeholder="企业微信后台设置的 Token">
                        <div class="form-hint">在企业微信后台"接收消息"页面获取</div>
                    </div>

                    <div class="form-group">
                        <label>EncodingAESKey <span style="color: red;">*</span></label>
                        <input type="text" id="wechat-aes-key" required placeholder="43位字符串"
                               pattern=".{43}" title="EncodingAESKey 必须是43位字符">
                        <div class="form-hint">在企业微信后台生成或设置，必须是 <code>43</code> 位字符</div>
                    </div>

                    <div class="form-group">
                        <label>CorpID <span style="color: red;">*</span></label>
                        <input type="text" id="wechat-corp-id" required placeholder="企业ID">
                        <div class="form-hint">在企业微信后台"我的企业"页面查看</div>
                    </div>

                    <div class="form-group" id="wechat-callback-group" style="display: none;">
                        <label>企业微信回调地址</label>
                        <div class="endpoint" id="wechat-callback-url" style="font-size: 13px;"></div>
                        <div class="form-hint">将此地址填入企业微信后台的"接收消息"URL设置中</div>
                    </div>

                    <div id="wechat-config-message"></div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-success">保存配置</button>
                        <button type="button" class="btn btn-secondary" onclick="closeWechatModal()">取消</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- 修改回调地址模态框 -->
        <div id="webhook-modal" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <span class="modal-close" onclick="closeWebhookModal()">&times;</span>
                <h2>修改回调地址</h2>
                <p style="color: #666; margin-bottom: 20px;">设置接收转发 Webhook 的地址。企业微信消息解密后会发送到这个地址。</p>

                <form id="webhook-config-form" onsubmit="saveWebhookConfig(event)">
                    <input type="hidden" id="webhook-tenant-id">

                    <div class="form-group">
                        <label>回调地址 <span style="color: red;">*</span></label>
                        <input type="url" id="webhook-url" required placeholder="https://your-server.com/webhook">
                        <div class="form-hint">支持标准HTTPS地址或OpenClaw地址</div>
                    </div>

                    <div id="webhook-config-message"></div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn btn-success">保存</button>
                        <button type="button" class="btn btn-secondary" onclick="closeWebhookModal()">取消</button>
                    </div>
                </form>

                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <h4 style="margin-bottom: 10px;">OpenClaw 配置示例</h4>
                    <p style="color: #666; font-size: 13px; margin-bottom: 10px;">如果使用 OpenClaw，回调地址格式如下：</p>
                    <div class="endpoint" style="font-size: 12px;">https://api.openclaw.com/webhook/receive?key=YOUR_KEY</div>
                </div>
            </div>
        </div>

        <!-- OpenClaw 设备管理模态框 -->
        <div id="openclaw-modal" class="modal">
            <div class="modal-content" style="max-width: 600px;">
                <span class="modal-close" onclick="closeOpenClawModal()">&times;</span>
                <h2>OpenClaw 设备管理</h2>
                <p style="color: #666; margin-bottom: 20px;">管理 OpenClaw 设备的长连接，实时接收设备消息。</p>

                <input type="hidden" id="openclaw-tenant-id">

                <!-- 设备列表 -->
                <div id="openclaw-devices-list" style="margin-bottom: 20px;">
                    <p style="color: #999;">加载中...</p>
                </div>

                <!-- 添加设备表单 -->
                <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                    <h4 style="margin-bottom: 15px;">添加新设备</h4>
                    <form id="openclaw-device-form" onsubmit="saveOpenClawDevice(event)">
                        <div class="form-group">
                            <label>设备ID <span style="color: red;">*</span></label>
                            <input type="text" id="openclaw-device-id" required placeholder="如: device_001">
                        </div>
                        <div class="form-group">
                            <label>设备名称 <span style="color: red;">*</span></label>
                            <input type="text" id="openclaw-device-name" required placeholder="如: 测试设备">
                        </div>
                        <div class="form-group">
                            <label>API Key <span style="color: red;">*</span></label>
                            <input type="text" id="openclaw-api-key" required placeholder="OpenClaw 提供的 API Key">
                        </div>
                        <div class="form-group">
                            <label>WebSocket 地址</label>
                            <input type="text" id="openclaw-ws-url" value="wss://api.openclaw.com/ws" placeholder="wss://api.openclaw.com/ws">
                        </div>
                        <div class="form-group">
                            <label>转发 Webhook 地址</label>
                            <input type="url" id="openclaw-webhook-url" placeholder="默认使用租户回调地址">
                            <div class="form-hint">留空则使用租户配置的回调地址</div>
                        </div>
                        <div id="openclaw-device-message"></div>
                        <button type="submit" class="btn btn-success">添加设备</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- 演示接入流程 -->
        <div id="onboarding-guide" class="card hidden">
            <h2>接入流程演示</h2>

            <div class="step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h3>创建 Webhook 服务</h3>
                    <p>登录后，在"我的 Webhook 服务"中创建新服务，填写：</p>
                    <ul style="margin: 10px 0 10px 20px;">
                        <li>服务名称：用于标识此服务</li>
                        <li>回调地址：您的服务器接收 Webhook 的地址</li>
                    </ul>
                    <p>创建成功后，系统会生成唯一的 <strong>API Key</strong>。</p>
                </div>
            </div>

            <div class="step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h3>将 Webhook 地址提供给第三方</h3>
                    <p>将以下格式的地址提供给需要发送 Webhook 的服务方：</p>
                    <div class="endpoint" id="example-webhook-url">
https://webhook.sillymd.com/webhook/{您的API_KEY}/任意路径
                    </div>
                    <p>例如，如果接入 GitHub：</p>
                    <div class="endpoint">
https://webhook.sillymd.com/webhook/wh_abc123def456/github/events
                    </div>
                </div>
            </div>

            <div class="step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h3>接收转发的 Webhook</h3>
                    <p>当第三方发送 Webhook 到上述地址后，系统会：</p>
                    <ul style="margin: 10px 0 10px 20px;">
                        <li>接收并存储 Webhook 请求</li>
                        <li>自动转发到您设置的回调地址</li>
                        <li>如果失败，自动重试 3 次</li>
                        <li>添加签名头 <code>X-Webhook-Signature</code> 用于验证</li>
                    </ul>
                </div>
            </div>

            <div class="step">
                <div class="step-number">4</div>
                <div class="step-content">
                    <h3>验证签名（可选但推荐）</h3>
                    <p>为确保安全，建议验证 Webhook 签名：</p>
                    <div class="code-block">
<code>import hmac
import hashlib

def verify_signature(payload, signature, secret):
    # signature 格式: "t=timestamp,v1=hash"
    parts = signature.split(',')
    timestamp = parts[0].split('=')[1]
    received_hash = parts[1].split('=')[1]

    message = f"{timestamp}.{payload}"
    expected_hash = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(received_hash, expected_hash)</code>
                    </div>
                </div>
            </div>

            <div class="step">
                <div class="step-number">5</div>
                <div class="step-content">
                    <h3>查看日志和重试</h3>
                    <p>在"我的 Webhook 服务"中可以：</p>
                    <ul style="margin: 10px 0 10px 20px;">
                        <li>查看所有接收的 Webhook 记录</li>
                        <li>查看转发状态和响应</li>
                        <li>手动重试失败的 Webhook</li>
                    </ul>
                </div>
            </div>

            <div class="step">
                <div class="step-number">6</div>
                <div class="step-content">
                    <h3>WebSocket 实时接收（可选）</h3>
                    <p>设备通过 WebSocket 连接并绑定身份，接收精准推送：</p>

                    <p style="margin-top: 10px;"><strong>使用流程：</strong></p>
                    <ol style="margin: 10px 0 10px 20px;">
                        <li>连接 WebSocket: <code>wss://webhook.sillymd.com/ws?token=xxx</code></li>
                        <li>等待 <code>connected</code> 消息</li>
                        <li>发送 bind 消息声明设备身份: <code>{"type": "bind", "device_name": "my_claw"}</code></li>
                        <li>等待 <code>bound</code> 确认</li>
                        <li>开始接收消息</li>
                    </ol>

                    <p style="margin-top: 10px;"><strong>Python 示例：</strong></p>
                    <div class="code-block">
<code>import asyncio
import websockets
import json

async def connect_ws():
    token = "your_jwt_token_here"
    device_name = "my_openclaw"  # 设备名

    uri = f"wss://webhook.sillymd.com/ws?token={token}"

    async with websockets.connect(uri) as ws:
        # 1. 接收连接成功
        response = await ws.recv()
        print(json.loads(response))  # {"type": "connected", ...}

        # 2. 发送设备绑定
        await ws.send(json.dumps({
            "type": "bind",
            "device_name": device_name
        }))

        # 3. 等待绑定确认
        response = await ws.recv()
        print(json.loads(response))  # {"type": "bound", "device_id": "..."}

        # 4. 持续接收精准推送
        while True:
            message = await ws.recv()
            data = json.loads(message)
            print(f"收到: {data}")</code>
                    </div>

                    <p style="margin-top: 10px;"><strong>发送 Webhook 到指定设备：</strong></p>
                    <div class="code-block">
<code># 方式1: 通过 URL 路径
curl -X POST https://webhook.sillymd.com/webhook/{api_key}/{device_name} \
  -H "Content-Type: application/json" \
  -d '{"action": "move"}'

# 方式2: 通过请求体字段
curl -X POST https://webhook.sillymd.com/webhook/{api_key} \
  -H "Content-Type: application/json" \
  -d '{"target_device": "my_openclaw", "action": "move"}'

# 方式3: 通过 Header
curl -X POST https://webhook.sillymd.com/webhook/{api_key} \
  -H "X-Target-Device: my_openclaw" \
  -d '{"action": "move"}'</code>
                    </div>
                </div>
            </div>
        </div>

        <!-- 功能特性 -->
        <div class="card">
            <h2>功能特性</h2>
            <div class="feature-grid">
                <div class="feature">
                    <h3>多租户支持</h3>
                    <p>每个用户独立的 API Key 和配置</p>
                </div>
                <div class="feature">
                    <h3>自动重试</h3>
                    <p>失败自动重试 3 次，指数退避</p>
                </div>
                <div class="feature">
                    <h3>请求日志</h3>
                    <p>完整的请求/响应记录和查询</p>
                </div>
                <div class="feature">
                    <h3>签名验证</h3>
                    <p>HMAC-SHA256 签名保证安全</p>
                </div>
                <div class="feature">
                    <h3>实时投递</h3>
                    <p>异步转发，低延迟</p>
                </div>
                <div class="feature">
                    <h3>用户系统</h3>
                    <p>与 sillymd.com 账号互通</p>
                </div>
            </div>
        </div>

        <!-- API 文档 -->
        <div class="card">
            <h2>API 文档</h2>
            <table>
                <tr>
                    <th>端点</th>
                    <th>方法</th>
                    <th>描述</th>
                    <th>认证</th>
                </tr>
                <tr>
                    <td>/api/v1/auth/register</td>
                    <td>POST</td>
                    <td>用户注册</td>
                    <td>否</td>
                </tr>
                <tr>
                    <td>/api/v1/auth/login</td>
                    <td>POST</td>
                    <td>用户登录</td>
                    <td>否</td>
                </tr>
                <tr>
                    <td>/api/v1/tenants</td>
                    <td>POST</td>
                    <td>创建 Webhook 服务</td>
                    <td>是</td>
                </tr>
                <tr>
                    <td>/api/v1/tenants</td>
                    <td>GET</td>
                    <td>获取所有服务</td>
                    <td>是</td>
                </tr>
                <tr>
                    <td>/api/v1/webhooks</td>
                    <td>GET</td>
                    <td>获取 Webhook 历史</td>
                    <td>是</td>
                </tr>
                <tr>
                    <td>/webhook/{api_key}/*</td>
                    <td>ANY</td>
                    <td>接收 Webhook 事件</td>
                    <td>API Key</td>
                </tr>
            </table>
            <p style="margin-top: 20px;">
                <a href="/docs" class="btn">查看完整 API 文档 (Swagger)</a>
            </p>
        </div>

        <footer>
            <p>Webhook Hub © 2024 | 简单易用的 Webhook 中转服务</p>
        </footer>
    </div>

    <script>
        const API_BASE = '';
        let currentUser = null;

        // 检查登录状态
        async function checkAuth() {
            try {
                const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    currentUser = await res.json();
                    showLoggedIn();
                } else {
                    showLoggedOut();
                }
            } catch (e) {
                showLoggedOut();
            }
        }

        function showLoggedIn() {
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('auth-bar').classList.remove('hidden');
            document.getElementById('webhook-management').classList.remove('hidden');
            document.getElementById('onboarding-guide').classList.remove('hidden');
            document.getElementById('username').textContent = currentUser.username;
            loadTenants();
        }

        function showLoggedOut() {
            document.getElementById('auth-section').classList.remove('hidden');
            document.getElementById('auth-bar').classList.add('hidden');
            document.getElementById('webhook-management').classList.add('hidden');
            document.getElementById('onboarding-guide').classList.add('hidden');
        }

        function showMessage(message, isError = false) {
            const msgDiv = document.getElementById('auth-message');
            msgDiv.className = 'alert ' + (isError ? 'alert-error' : 'alert-success');
            msgDiv.textContent = message;
            msgDiv.classList.remove('hidden');
        }

        async function login(e) {
            e.preventDefault();
            const loginInput = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!loginInput || !password) {
                showMessage('请输入账号和密码', true);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email: loginInput, password })
                });

                const data = await res.json();
                if (res.ok) {
                    currentUser = data.user;
                    showLoggedIn();
                } else {
                    showMessage(data.detail || '登录失败', true);
                }
            } catch (e) {
                showMessage('网络错误', true);
            }
        }

        async function register(e) {
            e.preventDefault();
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;

            // 验证输入
            if (!username || !email || !password) {
                showMessage('请填写所有字段', true);
                return;
            }
            if (password.length < 6) {
                showMessage('密码至少需要6位', true);
                return;
            }
            if (password.length > 72) {
                showMessage('密码不能超过72位', true);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await res.json();
                if (res.ok) {
                    let msg = '注册成功！';
                    if (data.vendor_level === 'staff') {
                        msg += ' 已自动识别为员工账号（无限额）';
                    }
                    // 显示在注册模态框中
                    const msgDiv = document.getElementById('register-message');
                    msgDiv.className = 'alert alert-success';
                    msgDiv.textContent = msg;

                    // 清空表单
                    document.getElementById('register-username').value = '';
                    document.getElementById('register-email').value = '';
                    document.getElementById('register-password').value = '';

                    // 2秒后关闭模态框
                    setTimeout(() => {
                        closeRegisterModal();
                        showMessage('注册成功，请登录');
                    }, 1500);
                } else {
                    const msgDiv = document.getElementById('register-message');
                    msgDiv.className = 'alert alert-error';
                    msgDiv.textContent = data.detail || '注册失败';
                }
            } catch (e) {
                const msgDiv = document.getElementById('register-message');
                msgDiv.className = 'alert alert-error';
                msgDiv.textContent = '网络错误，请检查连接';
            }
        }

        async function logout() {
            try {
                await fetch(`${API_BASE}/api/v1/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (e) {}
            currentUser = null;
            showLoggedOut();
        }

        async function createTenant(e) {
            e.preventDefault();
            const name = document.getElementById('tenant-name').value;
            const webhookUrl = document.getElementById('tenant-webhook-url').value;

            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, webhook_url: webhookUrl })
                });

                const data = await res.json();
                if (res.ok) {
                    alert(`Webhook 服务创建成功！\\n\\nAPI Key: ${data.api_key}\\nSecret Key: ${data.secret_key}\\n\\n请妥善保存这些信息。`);
                    document.getElementById('tenant-name').value = '';
                    document.getElementById('tenant-webhook-url').value = '';
                    loadTenants();
                } else {
                    alert(data.detail || '创建失败');
                }
            } catch (e) {
                alert('网络错误');
            }
        }

        async function loadTenants() {
            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants`, {
                    credentials: 'include'
                });

                if (res.ok) {
                    const tenants = await res.json();
                    const container = document.getElementById('tenants-container');

                    if (tenants.length === 0) {
                        container.innerHTML = '<p style="color: #666;">暂无 Webhook 服务，请创建。</p>';
                        return;
                    }

                    // 加载每个租户的企业微信配置和 OpenClaw 设备
                    const tenantsWithConfig = await Promise.all(
                        tenants.map(async t => {
                            try {
                                const [configRes, devicesRes] = await Promise.all([
                                    fetch(`${API_BASE}/api/v1/tenants/${t.id}/wechat-config`, {
                                        credentials: 'include'
                                    }),
                                    fetch(`${API_BASE}/api/v1/tenants/${t.id}/openclaw-devices`, {
                                        credentials: 'include'
                                    })
                                ]);

                                if (configRes.ok) {
                                    const config = await configRes.json();
                                    t.wechat_configured = config.is_configured;
                                    t.wechat_callback_url = config.callback_url;
                                } else {
                                    t.wechat_configured = false;
                                }

                                if (devicesRes.ok) {
                                    const devicesData = await devicesRes.json();
                                    t.openclaw_devices = devicesData.devices || [];
                                } else {
                                    t.openclaw_devices = [];
                                }
                            } catch (e) {
                                t.wechat_configured = false;
                                t.openclaw_devices = [];
                            }
                            return t;
                        })
                    );

                    container.innerHTML = tenantsWithConfig.map(t => {
                        const createdAt = t.created_at ? new Date(t.created_at).toLocaleString() : '未知';
                        const reqCount = t.request_count || 0;
                        // 确保api_key完整传递，防止转义
                        const apiKeyStr = String(t.api_key || '');
                        const tenantIdStr = String(t.id || '');

                        // 渲染 OpenClaw 设备列表
                        const devicesHtml = t.openclaw_devices && t.openclaw_devices.length > 0
                            ? `<div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                                <p style="font-weight: 500; margin-bottom: 8px;">OpenClaw 设备 (${t.openclaw_devices.length}):</p>
                                ${t.openclaw_devices.map(d => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #eee;">
                                        <span>
                                            ${d.name}
                                            <span style="font-size: 12px; color: ${d.connection_status?.connected ? '#28a745' : '#dc3545'};">
                                                (${d.connection_status?.connected ? '在线' : '离线'})
                                            </span>
                                        </span>
                                        <button class="btn btn-sm" style="padding: 2px 8px; font-size: 12px;"
                                                onclick="deleteOpenClawDevice('${tenantIdStr}', '${d.device_id}')">删除</button>
                                    </div>
                                `).join('')}
                               </div>`
                            : '';

                        return `
                        <div class="tenant-item">
                            <h4>
                                ${t.name}
                                <span class="config-badge ${t.wechat_configured ? 'configured' : 'not-configured'}">
                                    企业微信${t.wechat_configured ? '已配置' : '未配置'}
                                </span>
                                ${t.openclaw_devices && t.openclaw_devices.length > 0 ? `<span class="config-badge configured">OpenClaw ${t.openclaw_devices.length}台</span>` : ''}
                            </h4>
                            <p>API Key: <span class="api-key">${apiKeyStr}</span></p>
                            <p>回调地址: ${t.webhook_url || '未设置'}</p>
                            <p>请求数: ${reqCount} | 创建于: ${createdAt}</p>
                            <p>标准 Webhook: <code>https://webhook.sillymd.com/webhook/${apiKeyStr}/your-path</code></p>
                            ${t.wechat_configured ? `<p>企业微信: <code>${t.wechat_callback_url}</code></p>` : ''}
                            ${devicesHtml}
                            <div class="tenant-actions">
                                <button class="btn" onclick="openWebhookModal('${tenantIdStr}', '${t.webhook_url || ''}')">
                                    修改回调地址
                                </button>
                                <button class="btn btn-wechat" onclick="openWechatModal('${tenantIdStr}', '${apiKeyStr}')">
                                    ${t.wechat_configured ? '修改企业微信配置' : '配置企业微信'}
                                </button>
                                <button class="btn" style="background: #17a2b8;" onclick="openOpenClawModal('${tenantIdStr}')">
                                    ${t.openclaw_devices && t.openclaw_devices.length > 0 ? '管理 OpenClaw' : '添加 OpenClaw'}
                                </button>
                            </div>
                        </div>
                        `;
                    }).join('');
                }
            } catch (e) {
                console.error('Failed to load tenants', e);
            }
        }

        // 注册模态框函数
        function showRegisterModal() {
            document.getElementById('register-modal').classList.add('show');
            // 清空表单
            document.getElementById('register-username').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-message').innerHTML = '';
        }

        function closeRegisterModal() {
            document.getElementById('register-modal').classList.remove('show');
        }

        // 点击注册模态框外部关闭
        document.getElementById('register-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeRegisterModal();
            }
        });

        // 企业微信配置模态框相关函数
        let currentEditingTenantId = null;

        async function openWechatModal(tenantId, apiKey) {
            currentEditingTenantId = tenantId;
            document.getElementById('wechat-tenant-id').value = tenantId;

            // 确保apiKey显示完整，使用textContent避免转义问题
            const callbackUrl = 'https://webhook.sillymd.com/webhook/wechat/' + apiKey;
            document.getElementById('wechat-callback-url').textContent = callbackUrl;
            document.getElementById('wechat-callback-group').style.display = 'block';

            console.log('[openWechatModal] API Key:', apiKey);
            console.log('[openWechatModal] Callback URL:', callbackUrl);

            // 清空表单和消息
            document.getElementById('wechat-token').value = '';
            document.getElementById('wechat-aes-key').value = '';
            document.getElementById('wechat-corp-id').value = '';
            document.getElementById('wechat-config-message').innerHTML = '';

            document.getElementById('wechat-modal').classList.add('show');

            // 加载现有配置（如果存在）
            await loadWechatConfig(tenantId);
        }

        function closeWechatModal() {
            document.getElementById('wechat-modal').classList.remove('show');
            currentEditingTenantId = null;
        }

        async function loadWechatConfig(tenantId) {
            try {
                console.log('[loadWechatConfig] Loading config for tenant:', tenantId);
                const res = await fetch(`${API_BASE}/api/v1/tenants/${tenantId}`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    console.log('[loadWechatConfig] Received data:', data);
                    if (data.wechat_config && data.wechat_config.token) {
                        document.getElementById('wechat-token').value = data.wechat_config.token;
                        document.getElementById('wechat-aes-key').value = data.wechat_config.aes_key || '';
                        document.getElementById('wechat-corp-id').value = data.wechat_config.corp_id || '';
                        console.log('[loadWechatConfig] Config loaded successfully');
                    } else {
                        console.log('[loadWechatConfig] No config found');
                    }
                } else {
                    console.error('[loadWechatConfig] API error:', res.status);
                }
            } catch (e) {
                console.error('[loadWechatConfig] Failed to load wechat config:', e);
            }
        }

        async function saveWechatConfig(e) {
            e.preventDefault();
            if (!currentEditingTenantId) return;

            const token = document.getElementById('wechat-token').value.trim();
            const aesKey = document.getElementById('wechat-aes-key').value.trim();
            const corpId = document.getElementById('wechat-corp-id').value.trim();

            // 验证 EncodingAESKey 长度
            if (aesKey.length !== 43) {
                showWechatMessage('EncodingAESKey 必须是 43 位字符', true);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants/${currentEditingTenantId}/wechat-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        token: token,
                        aes_key: aesKey,
                        corp_id: corpId
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    showWechatMessage('企业微信配置保存成功！', false);
                    // 刷新租户列表
                    setTimeout(() => {
                        loadTenants();
                        closeWechatModal();
                    }, 1000);
                } else {
                    showWechatMessage(data.detail || '保存失败', true);
                }
            } catch (e) {
                showWechatMessage('网络错误', true);
            }
        }

        function showWechatMessage(message, isError) {
            const msgDiv = document.getElementById('wechat-config-message');
            msgDiv.className = 'alert ' + (isError ? 'alert-error' : 'alert-success');
            msgDiv.textContent = message;
        }

        // 点击模态框外部关闭
        document.getElementById('wechat-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeWechatModal();
            }
        });

        // ===== 回调地址配置模态框 =====
        function openWebhookModal(tenantId, currentWebhookUrl) {
            currentEditingTenantId = tenantId;
            document.getElementById('webhook-url-input').value = currentWebhookUrl || '';
            document.getElementById('webhook-config-message').textContent = '';
            document.getElementById('webhook-modal').classList.add('show');
        }

        function closeWebhookModal() {
            document.getElementById('webhook-modal').classList.remove('show');
            currentEditingTenantId = null;
        }

        async function saveWebhookConfig(e) {
            e.preventDefault();
            if (!currentEditingTenantId) return;

            const webhookUrl = document.getElementById('webhook-url-input').value.trim();

            // URL 格式验证
            if (webhookUrl && !webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
                showWebhookMessage('回调地址必须以 http:// 或 https:// 开头', true);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants/${currentEditingTenantId}/webhook-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ webhook_url: webhookUrl })
                });

                const data = await res.json();
                if (res.ok) {
                    showWebhookMessage('回调地址保存成功！', false);
                    // 刷新租户列表
                    setTimeout(() => {
                        loadTenants();
                        closeWebhookModal();
                    }, 1000);
                } else {
                    showWebhookMessage(data.detail || '保存失败', true);
                }
            } catch (e) {
                showWebhookMessage('网络错误', true);
            }
        }

        function showWebhookMessage(message, isError) {
            const msgDiv = document.getElementById('webhook-config-message');
            msgDiv.className = 'alert ' + (isError ? 'alert-error' : 'alert-success');
            msgDiv.textContent = message;
        }

        // 点击模态框外部关闭
        document.getElementById('webhook-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeWebhookModal();
            }
        });

        // ===== OpenClaw 设备管理 =====
        async function openOpenClawModal(tenantId) {
            currentEditingTenantId = tenantId;
            document.getElementById('openclaw-tenant-id').value = tenantId;

            // 清空表单
            document.getElementById('openclaw-device-id').value = '';
            document.getElementById('openclaw-device-name').value = '';
            document.getElementById('openclaw-api-key').value = '';
            document.getElementById('openclaw-ws-url').value = 'wss://api.openclaw.com/ws';
            document.getElementById('openclaw-webhook-url').value = '';
            document.getElementById('openclaw-device-message').innerHTML = '';

            document.getElementById('openclaw-modal').classList.add('show');

            // 加载设备列表
            await loadOpenClawDevices(tenantId);
        }

        function closeOpenClawModal() {
            document.getElementById('openclaw-modal').classList.remove('show');
            currentEditingTenantId = null;
        }

        async function loadOpenClawDevices(tenantId) {
            const listContainer = document.getElementById('openclaw-devices-list');
            listContainer.innerHTML = '<p style="color: #999;">加载中...</p>';

            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants/${tenantId}/openclaw-devices`, {
                    credentials: 'include'
                });

                if (res.ok) {
                    const data = await res.json();
                    const devices = data.devices || [];

                    if (devices.length === 0) {
                        listContainer.innerHTML = '<p style="color: #999;">暂无设备，请添加。</p>';
                        return;
                    }

                    listContainer.innerHTML = devices.map(d => `
                        <div style="display: flex; justify-content: space-between; align-items: center;
                                    padding: 12px; margin-bottom: 10px; background: #f8f9fa;
                                    border-radius: 4px; border-left: 4px solid ${d.connection_status?.connected ? '#28a745' : '#dc3545'};">
                            <div>
                                <div style="font-weight: 500;">${d.name}</div>
                                <div style="font-size: 12px; color: #666;">
                                    ID: ${d.device_id} |
                                    <span style="color: ${d.connection_status?.connected ? '#28a745' : '#dc3545'};">
                                        ${d.connection_status?.connected ? '在线' : '离线'}
                                    </span>
                                    ${d.connection_status?.message_count ? `| 消息: ${d.connection_status.message_count}` : ''}
                                </div>
                                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                                    ${d.ws_url}
                                </div>
                            </div>
                            <button class="btn" style="background: #dc3545; padding: 4px 12px; font-size: 12px;"
                                    onclick="deleteOpenClawDevice('${tenantId}', '${d.device_id}')">
                                删除
                            </button>
                        </div>
                    `).join('');
                } else {
                    listContainer.innerHTML = '<p style="color: #dc3545;">加载失败</p>';
                }
            } catch (e) {
                listContainer.innerHTML = '<p style="color: #dc3545;">加载错误</p>';
            }
        }

        async function saveOpenClawDevice(e) {
            e.preventDefault();
            if (!currentEditingTenantId) return;

            const deviceId = document.getElementById('openclaw-device-id').value.trim();
            const name = document.getElementById('openclaw-device-name').value.trim();
            const apiKey = document.getElementById('openclaw-api-key').value.trim();
            const wsUrl = document.getElementById('openclaw-ws-url').value.trim();
            const webhookUrl = document.getElementById('openclaw-webhook-url').value.trim();

            if (!deviceId || !name || !apiKey) {
                showOpenClawMessage('请填写必填项', true);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants/${currentEditingTenantId}/openclaw-devices`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        device_id: deviceId,
                        name: name,
                        api_key: apiKey,
                        ws_url: wsUrl || 'wss://api.openclaw.com/ws',
                        webhook_url: webhookUrl || null
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    showOpenClawMessage('设备添加成功！', false);
                    // 清空表单
                    document.getElementById('openclaw-device-id').value = '';
                    document.getElementById('openclaw-device-name').value = '';
                    document.getElementById('openclaw-api-key').value = '';
                    // 刷新设备列表和租户列表
                    await loadOpenClawDevices(currentEditingTenantId);
                    loadTenants();
                } else {
                    showOpenClawMessage(data.detail || '添加失败', true);
                }
            } catch (e) {
                showOpenClawMessage('网络错误', true);
            }
        }

        async function deleteOpenClawDevice(tenantId, deviceId) {
            if (!confirm(`确定要删除设备 "${deviceId}" 吗？`)) return;

            try {
                const res = await fetch(`${API_BASE}/api/v1/tenants/${tenantId}/openclaw-devices/${deviceId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (res.ok) {
                    // 刷新设备列表
                    if (currentEditingTenantId === tenantId) {
                        await loadOpenClawDevices(tenantId);
                    }
                    loadTenants();
                } else {
                    alert('删除失败');
                }
            } catch (e) {
                alert('网络错误');
            }
        }

        function showOpenClawMessage(message, isError) {
            const msgDiv = document.getElementById('openclaw-device-message');
            msgDiv.className = 'alert ' + (isError ? 'alert-error' : 'alert-success');
            msgDiv.textContent = message;
        }

        // 点击模态框外部关闭
        document.getElementById('openclaw-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeOpenClawModal();
            }
        });

        // 页面加载时检查登录状态
        checkAuth();
    </script>
</body>
</html>
    """

# 健康检查
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001)
