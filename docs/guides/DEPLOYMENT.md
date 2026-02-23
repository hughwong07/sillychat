# 部署指南

本指南介绍如何将 SillyChat 部署到生产环境。

## 目录

1. [部署选项](#部署选项)
2. [桌面端部署](#桌面端部署)
3. [服务端部署](#服务端部署)
4. [移动端部署](#移动端部署)
5. [配置管理](#配置管理)
6. [监控与日志](#监控与日志)

---

## 部署选项

### 部署模式

| 模式 | 适用场景 | 复杂度 |
|------|----------|--------|
| 单机模式 | 个人使用 | 低 |
| 局域网模式 | 小团队 | 中 |
| 云端模式 | 企业/多用户 | 高 |

### 系统要求

**单机/局域网模式:**
- CPU: 2核+
- 内存: 4GB+
- 存储: 10GB+
- 网络: 局域网可达

**云端模式:**
- CPU: 4核+
- 内存: 8GB+
- 存储: 50GB+ SSD
- 带宽: 10Mbps+

---

## 桌面端部署

### Windows

```bash
# 1. 构建应用
cd apps/desktop
npm run build:win

# 2. 输出目录
dist/
├── SillyChat Setup 1.0.0.exe    # 安装程序
├── SillyChat-1.0.0.exe          # 便携版
└── latest.yml                   # 更新配置

# 3. 代码签名（推荐）
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 "SillyChat Setup 1.0.0.exe"
```

### macOS

```bash
# 1. 构建应用
npm run build:mac

# 2. 输出目录
dist/
├── SillyChat-1.0.0.dmg          # 磁盘镜像
├── SillyChat-1.0.0.pkg          # 安装包
└── SillyChat.app                # 应用包

# 3. 代码签名
 codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" SillyChat.app

# 4. 公证
xcrun altool --notarize-app --primary-bundle-id "com.sillychat.app" --username "your@email.com" --password "app-specific-password" --file SillyChat-1.0.0.dmg

# 5.  staple
xcrun stapler staple SillyChat-1.0.0.dmg
```

### Linux

```bash
# 1. 构建应用
npm run build:linux

# 2. 输出目录
dist/
├── sillychat_1.0.0_amd64.deb    # Debian/Ubuntu
├── sillychat-1.0.0.x86_64.rpm   # RHEL/CentOS
├── sillychat-1.0.0.AppImage     # 通用
└── sillychat-1.0.0.snap         # Snap

# 3. 安装
dpkg -i sillychat_1.0.0_amd64.deb  # Debian/Ubuntu
rpm -i sillychat-1.0.0.x86_64.rpm   # RHEL/CentOS
```

---

## 服务端部署

### Docker 部署

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制代码
COPY dist ./dist

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 启动
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  sillychat:
    build: .
    container_name: sillychat
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - GATEWAY_PORT=8080
      - DATA_PATH=/app/data
    networks:
      - sillychat-network

  nginx:
    image: nginx:alpine
    container_name: sillychat-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - sillychat
    networks:
      - sillychat-network

networks:
  sillychat-network:
    driver: bridge
```

```bash
# 部署命令
docker-compose up -d

# 查看日志
docker-compose logs -f sillychat

# 更新
docker-compose pull
docker-compose up -d
```

### 传统部署

```bash
# 1. 准备服务器
# Ubuntu 22.04 LTS

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 PM2
sudo npm install -g pm2

# 4. 部署应用
mkdir -p /opt/sillychat
cd /opt/sillychat
git clone https://github.com/your-org/SillyChat.git .
npm ci --only=production
npm run build

# 5. 配置环境变量
sudo tee /opt/sillychat/.env > /dev/null <<EOF
NODE_ENV=production
GATEWAY_PORT=8080
GATEWAY_HOST=0.0.0.0
DATA_PATH=/opt/sillychat/data
LOG_LEVEL=info
EOF

# 6. 创建数据目录
mkdir -p /opt/sillychat/data
mkdir -p /opt/sillychat/logs

# 7. 配置 PM2
sudo tee /opt/sillychat/ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [{
    name: 'sillychat',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 10000,
    source_map_support: true
  }]
};
EOF

# 8. 启动服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd

# 9. 配置 Nginx
sudo tee /etc/nginx/sites-available/sillychat > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/sillychat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. 配置 SSL (Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 移动端部署

### Android

```bash
# 1. 构建 APK
cd apps/android
./gradlew assembleRelease

# 2. 签名 APK
# 生成密钥库
keytool -genkey -v -keystore sillychat.keystore -alias sillychat -keyalg RSA -keysize 2048 -validity 10000

# 签名
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore sillychat.keystore app/build/outputs/apk/release/app-release-unsigned.apk sillychat

# 优化
zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release.apk

# 3. 发布到 Google Play
# 使用 Google Play Console 上传
```

### iOS

```bash
# 1. 构建
cd apps/mobile
npx react-native run-ios --configuration Release

# 2. 归档
# 使用 Xcode: Product -> Archive

# 3. 发布
# 使用 Xcode Organizer 上传到 App Store
# 或使用 Transporter
```

---

## 配置管理

### 环境变量

```bash
# 必需
NODE_ENV=production
GATEWAY_PORT=8080
DATA_PATH=/app/data

# 可选
LOG_LEVEL=info
MAX_CONNECTIONS=100
HEARTBEAT_INTERVAL=30000

# AI 模型
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key

# 安全
JWT_SECRET=your-secret
ENCRYPTION_KEY=your-key
```

### 配置文件

```yaml
# config/production.yaml
server:
  port: 8080
  host: 0.0.0.0
  cors:
    origins:
      - https://your-domain.com
    credentials: true

gateway:
  maxConnections: 100
  maxMessageSize: 10485760  # 10MB
  heartbeatInterval: 30000
  discovery:
    enabled: true

storage:
  database:
    enableWAL: true
    busyTimeout: 5000
  blobPool:
    hashAlgorithm: sha256
  organizer:
    organizeBy: type

security:
  jwt:
    expiresIn: 7d
  encryption:
    algorithm: aes-256-gcm

logging:
  level: info
  format: json
  destinations:
    - type: file
      path: /app/logs/app.log
      maxSize: 100MB
      maxFiles: 10
    - type: console
```

---

## 监控与日志

### 日志配置

```typescript
// 结构化日志
import { Logger } from '@sillychat/core/utils';

const logger = new Logger('App', {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  destinations: [
    { type: 'console' },
    {
      type: 'file',
      path: '/app/logs/app.log',
      maxSize: '100MB',
      maxFiles: 10
    }
  ]
});
```

### 健康检查

```typescript
// 健康检查端点
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    checks: {
      database: checkDatabase(),
      gateway: checkGateway(),
      storage: checkStorage()
    }
  };

  const isHealthy = Object.values(health.checks).every(c => c.status === 'ok');
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 指标收集

```typescript
// Prometheus 指标
import { Counter, Histogram, Gauge } from 'prom-client';

const messageCounter = new Counter({
  name: 'sillychat_messages_total',
  help: 'Total messages processed',
  labelNames: ['type', 'status']
});

const responseTime = new Histogram({
  name: 'sillychat_response_time_seconds',
  help: 'Response time in seconds',
  labelNames: ['method', 'route']
});

const activeConnections = new Gauge({
  name: 'sillychat_active_connections',
  help: 'Number of active connections'
});
```

### 告警配置

```yaml
# alerting-rules.yml
groups:
  - name: sillychat
    rules:
      - alert: HighErrorRate
        expr: rate(sillychat_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: ServiceDown
        expr: up{job="sillychat"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SillyChat service is down"
```

---

## 备份与恢复

### 自动备份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/sillychat"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
sqlite3 /app/data/chat.db ".backup '${BACKUP_DIR}/chat_${DATE}.db'"

# 备份文件
rsync -av /app/data/blobs/ ${BACKUP_DIR}/blobs_${DATE}/

# 压缩
tar -czf ${BACKUP_DIR}/sillychat_${DATE}.tar.gz ${BACKUP_DIR}/*_${DATE}*

# 清理旧备份 (保留7天)
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete

# 上传到云存储
aws s3 cp ${BACKUP_DIR}/sillychat_${DATE}.tar.gz s3://your-bucket/backups/
```

```bash
# 添加定时任务
crontab -e

# 每天凌晨2点备份
0 2 * * * /opt/sillychat/scripts/backup.sh >> /var/log/sillychat-backup.log 2>&1
```

### 恢复

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

# 停止服务
pm2 stop sillychat

# 恢复数据库
tar -xzf ${BACKUP_FILE}
sqlite3 /app/data/chat.db ".restore 'chat_xxxx.db'"

# 恢复文件
rsync -av blobs_xxxx/ /app/data/blobs/

# 启动服务
pm2 start sillychat
```

---

*更多部署细节请参考 [运维手册](OPERATIONS.md)*
