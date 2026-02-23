# Skills 技能中心集成设计文档

> 本文档描述挺傻网站 Skills 技能中心与聊天工具的集成设计方案，实现网站 Skills 同步拉取到聊天工具的 Skills 频道。

## 目录

1. [架构概述](#1-架构概述)
2. [Skills 架构](#2-skills-架构)
3. [同步机制](#3-同步机制)
4. [Skills 频道](#4-skills-频道)
5. [执行环境](#5-执行环境)
6. [安全考虑](#6-安全考虑)
7. [API 接口设计](#7-api-接口设计)
8. [部署与运维](#8-部署与运维)

---

## 1. 架构概述

### 1.1 集成架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Skills 技能中心集成架构                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │   挺傻网站 Skills    │         │   聊天工具 Skills    │               │
│  │   Skill Center      │◄───────►│   Skills Channel    │               │
│  │                     │  同步    │                     │               │
│  │  ┌───────────────┐  │         │  ┌───────────────┐  │               │
│  │  │ Skills Store  │  │         │  │ Skills Cache  │  │               │
│  │  │ - 免费 Skills │  │         │  │ - 本地缓存    │  │               │
│  │  │ - 商用 Skills │  │         │  │ - 增量更新    │  │               │
│  │  └───────────────┘  │         │  └───────────────┘  │               │
│  │                     │         │                     │               │
│  │  ┌───────────────┐  │         │  ┌───────────────┐  │               │
│  │  │ Version Mgmt  │  │         │  │ Skill Runner  │  │               │
│  │  │ - 版本控制    │  │         │  │ - 沙箱执行    │  │               │
│  │  │ - 依赖解析    │  │         │  │ - 资源限制    │  │               │
│  │  └───────────────┘  │         │  └───────────────┘  │               │
│  │                     │         │                     │               │
│  └─────────────────────┘         └─────────────────────┘               │
│           ▲                               ▲                            │
│           │                               │                            │
│           └───────────────┬───────────────┘                            │
│                           │                                            │
│                    ┌──────┴──────┐                                     │
│                    │  Sync API   │                                     │
│                    │  同步网关    │                                     │
│                    └─────────────┘                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 数据流向

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          数据流向图                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   网站 Skills                    同步流程                  聊天工具      │
│                                                                         │
│   ┌──────────┐                                           ┌──────────┐  │
│   │ 发布 Skill│ ──────┐                                   │ 检测更新 │  │
│   └──────────┘       │                                   └────┬─────┘  │
│                      │                                        │        │
│   ┌──────────┐       ▼                                   ┌────┴─────┐  │
│   │ 更新版本 │ ──► ┌──────────┐      WebSocket/Poll  ──► │ 拉取变更 │  │
│   └──────────┘     │ 变更检测  │                          └────┬─────┘  │
│                    └────┬─────┘                               │        │
│   ┌──────────┐          │                                ┌────┴─────┐  │
│   │ 下架 Skill│ ◄───────┘                                │ 更新缓存 │  │
│   └──────────┘     增量同步                              └────┬─────┘  │
│                                                               │        │
│                                                          ┌────┴─────┐  │
│                                                          │ 通知用户 │  │
│                                                          └──────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Skills 架构

### 2.1 Skill 定义格式

Skill 采用标准化 YAML + Markdown 格式定义：

```yaml
# ============================================
# Skill 定义格式规范 (Skill Specification)
# ============================================

# 必需字段
skill:
  # 唯一标识符 (格式: domain-category-name)
  id: "tech-python-data-analysis"

  # 显示名称
  name: "Python 数据分析模板"

  # 版本号 (遵循 SemVer)
  version: "1.2.0"

  # 分类 (tech/product/design/marketing/ops)
  category: "tech"

  # 类型 (free/commercial)
  type: "free"

  # 作者信息
  author:
    id: "user_123"
    name: "张三"
    avatar: "https://cdn.sillymd.com/avatars/123.jpg"

  # 描述信息
  description: "标准化的 Python 数据分析流程模板"

  # 标签
  tags:
    - "python"
    - "data-analysis"
    - "pandas"
    - "visualization"

  # 图标
  icon: "📊"

  # 创建/更新时间
  created_at: "2025-01-15T08:00:00Z"
  updated_at: "2025-02-20T10:30:00Z"

# 运行时配置
runtime:
  # 执行环境类型
  environment: "python"

  # 所需权限级别
  permission_level: "standard"

  # 资源限制
  resources:
    memory_limit: "512MB"
    cpu_limit: "1.0"
    timeout: 300  # 秒

  # 依赖项
  dependencies:
    - name: "pandas"
      version: ">=1.3.0"
    - name: "numpy"
      version: ">=1.20.0"
    - name: "matplotlib"
      version: ">=3.4.0"

  # 输入参数定义
  inputs:
    - name: "data_source"
      type: "string"
      required: true
      description: "数据源路径或URL"

    - name: "analysis_type"
      type: "enum"
      options: ["descriptive", "diagnostic", "predictive"]
      default: "descriptive"
      description: "分析类型"

  # 输出定义
  outputs:
    - name: "report"
      type: "markdown"
      description: "分析报告"

    - name: "charts"
      type: "image_array"
      description: "可视化图表"

# 安全沙箱配置
sandbox:
  # 允许的网络访问
  network_access: false

  # 允许的文件系统访问
  filesystem_access: "readonly"

  # 允许的系统调用
  allowed_syscalls:
    - "read"
    - "write"
    - "exit"

  # 环境变量
  env_vars:
    - "PYTHONPATH"
    - "DATA_DIR"

# 内容部分 (Markdown 格式)
content: |
  # Python 数据分析模板

  ## 使用说明

  本 Skill 提供标准化的数据分析流程，包括：

  1. 数据加载与清洗
  2. 探索性数据分析 (EDA)
  3. 可视化报告生成

  ## 示例代码

  ```python
  import pandas as pd
  import matplotlib.pyplot as plt

  # 加载数据
  df = pd.read_csv(data_source)

  # 基础统计
  summary = df.describe()

  # 生成图表
  df.hist(figsize=(10, 8))
  plt.savefig('charts.png')
  ```

  ## 注意事项

  - 确保数据文件格式正确
  - 大文件建议分批处理
```

### 2.2 运行时环境

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Skill 运行时环境                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Skill Runtime Container                      │   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │  Python     │  │  Node.js    │  │  Shell      │              │   │
│  │  │  Runtime    │  │  Runtime    │  │  Runtime    │              │   │
│  │  │             │  │             │  │             │              │   │
│  │  │ - Python 3.9│  │ - Node 18   │  │ - Bash      │              │   │
│  │  │ - pandas    │  │ - npm       │  │ - curl      │              │   │
│  │  │ - numpy     │  │ - axios     │  │ - jq        │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              Skill Execution Engine                      │    │   │
│  │  │                                                          │    │   │
│  │  │  1. 解析 Skill YAML                                      │    │   │
│  │  │  2. 验证输入参数                                         │    │   │
│  │  │  3. 准备执行环境                                         │    │   │
│  │  │  4. 执行 Skill 代码                                      │    │   │
│  │  │  5. 捕获输出结果                                         │    │   │
│  │  │  6. 清理资源                                             │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 权限沙箱

```typescript
// ============================================
// Skill 权限沙箱配置
// ============================================

interface SkillSandboxConfig {
  // 网络访问权限
  network: {
    enabled: boolean;
    allowlist?: string[];      // 允许的域名列表
    blocklist?: string[];      // 禁止的域名列表
    maxConnections?: number;   // 最大连接数
  };

  // 文件系统权限
  filesystem: {
    access: 'none' | 'readonly' | 'readwrite';
    allowPaths?: string[];     // 允许的目录
    maxFileSize?: number;      // 最大文件大小 (bytes)
    maxTotalSize?: number;     // 最大总大小 (bytes)
  };

  // 系统资源限制
  resources: {
    memoryLimit: number;       // 内存限制 (MB)
    cpuLimit: number;          // CPU 限制 (核心数)
    timeout: number;           // 超时时间 (秒)
    maxProcesses?: number;     // 最大进程数
  };

  // 环境变量
  environment: {
    inherit: boolean;          // 是否继承父环境
    vars: Record<string, string>; // 自定义环境变量
  };
}

// 预定义权限级别
const PERMISSION_LEVELS: Record<string, SkillSandboxConfig> = {
  minimal: {
    network: { enabled: false },
    filesystem: { access: 'none' },
    resources: {
      memoryLimit: 128,
      cpuLimit: 0.5,
      timeout: 30
    },
    environment: { inherit: false, vars: {} }
  },

  standard: {
    network: { enabled: true, allowlist: ['api.sillymd.com'] },
    filesystem: { access: 'readonly', maxFileSize: 10 * 1024 * 1024 },
    resources: {
      memoryLimit: 512,
      cpuLimit: 1.0,
      timeout: 300
    },
    environment: { inherit: true, vars: {} }
  },

  elevated: {
    network: { enabled: true },
    filesystem: { access: 'readwrite', maxFileSize: 100 * 1024 * 1024 },
    resources: {
      memoryLimit: 2048,
      cpuLimit: 2.0,
      timeout: 600
    },
    environment: { inherit: true, vars: {} }
  }
};
```

---

## 3. 同步机制

### 3.1 同步触发条件

```typescript
// ============================================
// 同步触发条件配置
// ============================================

interface SyncTriggerConfig {
  // 实时推送触发条件 (网站 -> 聊天工具)
  pushTriggers: {
    // Skill 发布
    onSkillPublish: boolean;
    // Skill 更新
    onSkillUpdate: boolean;
    // Skill 下架
    onSkillUnpublish: boolean;
    // 版本变更
    onVersionChange: boolean;
  };

  // 定时拉取触发条件 (聊天工具 -> 网站)
  pullTriggers: {
    // 启动时全量同步
    onStartup: boolean;
    // 定时增量同步 (分钟)
    intervalMinutes: number;
    // 用户手动刷新
    onManualRefresh: boolean;
    // 网络恢复后同步
    onNetworkResume: boolean;
  };

  // 事件监听触发
  eventTriggers: {
    // WebSocket 连接状态变化
    onConnectionChange: boolean;
    // 用户订阅变更
    onSubscriptionChange: boolean;
  };
}

// 默认配置
const DEFAULT_SYNC_CONFIG: SyncTriggerConfig = {
  pushTriggers: {
    onSkillPublish: true,
    onSkillUpdate: true,
    onSkillUnpublish: true,
    onVersionChange: true
  },
  pullTriggers: {
    onStartup: true,
    intervalMinutes: 5,
    onManualRefresh: true,
    onNetworkResume: true
  },
  eventTriggers: {
    onConnectionChange: true,
    onSubscriptionChange: true
  }
};
```

### 3.2 增量同步策略

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        增量同步流程                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                    ┌──────────────┐                   │
│  │  网站 Skills  │                    │  聊天工具     │                   │
│  └──────┬───────┘                    └──────┬───────┘                   │
│         │                                    │                          │
│         │  1. 获取变更列表                     │                          │
│         │ ────────────────────────────────►  │                          │
│         │                                    │                          │
│         │  {                                 │                          │
│         │    last_sync: "2025-02-20T10:00Z"  │                          │
│         │    client_version: "1.0.0"         │                          │
│         │  }                                 │                          │
│         │                                    │                          │
│         │  2. 返回变更数据                     │                          │
│         │ ◄────────────────────────────────  │                          │
│         │                                    │                          │
│         │  {                                 │                          │
│         │    changes: [                      │                          │
│         │      {                             │                          │
│         │        skill_id: "tech-xxx",       │                          │
│         │        action: "update",           │                          │
│         │        version: "1.2.0",           │                          │
│         │        diff_url: "/api/diff/xxx"   │                          │
│         │      }                             │                          │
│         │    ],                              │                          │
│         │    deleted: ["skill-old"],         │                          │
│         │    has_more: false                 │                          │
│         │  }                                 │                          │
│         │                                    │                          │
│         │  3. 下载变更详情                     │                          │
│         │ ────────────────────────────────►  │                          │
│         │                                    │                          │
│         │  4. 应用变更到本地                   │                          │
│         │                                    │                          │
│         │  5. 确认同步完成                     │                          │
│         │ ────────────────────────────────►  │                          │
│         │                                    │                          │
└─────────┴────────────────────────────────────┴──────────────────────────┘
```

```typescript
// ============================================
// 增量同步实现
// ============================================

interface SyncChange {
  skillId: string;
  action: 'create' | 'update' | 'delete';
  version: string;
  timestamp: string;
  diffUrl?: string;           // 差异内容下载地址
  fullUrl?: string;           // 完整内容下载地址
  checksum: string;           // 内容校验和
  size: number;               // 内容大小
}

interface SyncResponse {
  changes: SyncChange[];
  deleted: string[];
  hasMore: boolean;
  nextCursor?: string;
  serverTime: string;
}

class IncrementalSyncManager {
  private lastSyncTime: string | null = null;
  private localVersion: string = '0.0.0';

  // 执行增量同步
  async sync(): Promise<SyncResult> {
    try {
      // 1. 获取变更列表
      const response = await this.fetchChanges();

      // 2. 下载变更内容
      const downloadedChanges = await this.downloadChanges(response.changes);

      // 3. 应用变更
      await this.applyChanges(downloadedChanges, response.deleted);

      // 4. 更新同步状态
      this.lastSyncTime = response.serverTime;

      // 5. 触发完成回调
      this.onSyncComplete({
        success: true,
        changesCount: response.changes.length,
        deletedCount: response.deleted.length
      });

      return { success: true };
    } catch (error) {
      this.onSyncError(error);
      return { success: false, error };
    }
  }

  // 获取变更列表
  private async fetchChanges(): Promise<SyncResponse> {
    const response = await fetch('/api/skills/sync/changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_sync: this.lastSyncTime,
        client_version: this.localVersion,
        categories: ['tech', 'product', 'design'],  // 订阅的分类
        types: ['free', 'commercial']               // 订阅的类型
      })
    });

    return response.json();
  }

  // 下载变更内容
  private async downloadChanges(changes: SyncChange[]): Promise<DownloadedChange[]> {
    const downloads = changes.map(async (change) => {
      const url = change.diffUrl || change.fullUrl;
      const response = await fetch(url);
      const content = await response.text();

      // 验证校验和
      const checksum = await this.calculateChecksum(content);
      if (checksum !== change.checksum) {
        throw new Error(`Checksum mismatch for skill ${change.skillId}`);
      }

      return {
        ...change,
        content
      };
    });

    return Promise.all(downloads);
  }

  // 应用变更到本地存储
  private async applyChanges(
    changes: DownloadedChange[],
    deleted: string[]
  ): Promise<void> {
    const db = await this.openDatabase();

    await db.transaction(async (tx) => {
      // 处理删除
      for (const skillId of deleted) {
        await tx.executeSql('DELETE FROM skills WHERE skill_id = ?', [skillId]);
      }

      // 处理新增/更新
      for (const change of changes) {
        if (change.action === 'create') {
          await tx.executeSql(
            `INSERT INTO skills (skill_id, version, content, updated_at)
             VALUES (?, ?, ?, ?)`,
            [change.skillId, change.version, change.content, change.timestamp]
          );
        } else if (change.action === 'update') {
          await tx.executeSql(
            `UPDATE skills
             SET version = ?, content = ?, updated_at = ?
             WHERE skill_id = ?`,
            [change.version, change.content, change.timestamp, change.skillId]
          );
        }
      }
    });
  }
}
```

### 3.3 版本管理

```typescript
// ============================================
// Skill 版本管理
// ============================================

interface SkillVersion {
  version: string;            // 版本号 (SemVer)
  parentVersion?: string;     // 父版本 (用于分支)
  contentHash: string;        // 内容哈希
  createdAt: string;
  author: string;
  changelog: string;
  deprecated?: boolean;       // 是否已弃用
}

class SkillVersionManager {
  // 版本比较
  compareVersions(v1: string, v2: string): number {
    const parse = (v: string) => v.split('.').map(Number);
    const parts1 = parse(v1);
    const parts2 = parse(v2);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  // 检查版本兼容性
  isCompatible(required: string, actual: string): boolean {
    // 简单实现：主版本号相同即兼容
    const reqMajor = required.split('.')[0];
    const actMajor = actual.split('.')[0];
    return reqMajor === actMajor;
  }

  // 解析版本约束
  parseVersionConstraint(constraint: string): VersionConstraint {
    // 支持: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0 - 2.0.0 等
    if (constraint.startsWith('^')) {
      return { type: 'caret', version: constraint.slice(1) };
    }
    if (constraint.startsWith('~')) {
      return { type: 'tilde', version: constraint.slice(1) };
    }
    if (constraint.startsWith('>=')) {
      return { type: 'gte', version: constraint.slice(2) };
    }
    return { type: 'exact', version: constraint };
  }

  // 获取最新兼容版本
  findLatestCompatible(
    versions: SkillVersion[],
    constraint: string
  ): SkillVersion | null {
    const vc = this.parseVersionConstraint(constraint);

    const compatible = versions.filter(v => {
      switch (vc.type) {
        case 'caret':
          return this.isCompatible(vc.version, v.version);
        case 'tilde':
          return v.version.startsWith(vc.version.split('.').slice(0, 2).join('.'));
        case 'gte':
          return this.compareVersions(v.version, vc.version) >= 0;
        case 'exact':
          return v.version === vc.version;
        default:
          return false;
      }
    });

    // 按版本号排序，返回最新
    compatible.sort((a, b) => this.compareVersions(b.version, a.version));
    return compatible[0] || null;
  }
}
```

---

## 4. Skills 频道

### 4.1 频道结构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Skills 频道结构                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Skills Channel                              │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  顶部导航栏                                               │    │   │
│  │  │  [ 全部 ] [ 技术 ] [ 产品 ] [ 设计 ] [ 市场 ] [ 运营 ]   │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  搜索与筛选                                               │    │   │
│  │  │  [🔍 搜索 Skills...] [ 类型 ▼ ] [ 排序 ▼ ]              │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  分类展示区域                                             │    │   │
│  │  │                                                          │    │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │   │
│  │  │  │ 📊 热门推荐   │  │ 🆕 最新发布   │  │ ⭐ 我的收藏   │   │    │   │
│  │  │  │              │  │              │  │              │   │    │   │
│  │  │  │ Skill Card 1 │  │ Skill Card 4 │  │ Skill Card 7 │   │    │   │
│  │  │  │ Skill Card 2 │  │ Skill Card 5 │  │ Skill Card 8 │   │    │   │
│  │  │  │ Skill Card 3 │  │ Skill Card 6 │  │ Skill Card 9 │   │    │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │   │
│  │  │                                                          │    │   │
│  │  │  ┌──────────────┐  ┌──────────────┐                      │    │   │
│  │  │  │ 🏢 团队 Skills│  │ 🎁 免费专区   │                      │    │   │
│  │  │  │              │  │              │                      │    │   │
│  │  │  │ Skill Card...│  │ Skill Card...│                      │    │   │
│  │  │  └──────────────┘  └──────────────┘                      │    │   │
│  │  │                                                          │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  底部操作栏                                               │    │   │
│  │  │  [ 刷新 ] [ 同步状态: ✅ ] [ 设置 ]                      │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 分类展示

```typescript
// ============================================
// Skills 分类展示配置
// ============================================

interface SkillCategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories?: SkillCategoryConfig[];
}

const SKILL_CATEGORIES: SkillCategoryConfig[] = [
  {
    id: 'tech',
    name: '技术',
    icon: '🛠️',
    color: '#3B82F6',
    description: '开发工具、架构设计、自动化、数据处理',
    subcategories: [
      { id: 'tech-dev', name: '开发工具', icon: '💻', color: '#60A5FA', description: '代码生成器、调试工具' },
      { id: 'tech-arch', name: '架构设计', icon: '🏗️', color: '#60A5FA', description: '系统架构、微服务' },
      { id: 'tech-auto', name: '自动化', icon: '🤖', color: '#60A5FA', description: 'CI/CD、脚本' },
      { id: 'tech-data', name: '数据处理', icon: '📊', color: '#60A5FA', description: 'ETL、数据清洗' }
    ]
  },
  {
    id: 'product',
    name: '产品',
    icon: '📦',
    color: '#F59E0B',
    description: '需求管理、用户研究、产品规划、数据分析'
  },
  {
    id: 'design',
    name: '设计',
    icon: '🎨',
    color: '#EC4899',
    description: 'UI 设计、UX 设计、品牌设计'
  },
  {
    id: 'marketing',
    name: '市场',
    icon: '📈',
    color: '#10B981',
    description: '内容营销、社交媒体、广告投放'
  },
  {
    id: 'ops',
    name: '运营',
    icon: '⚙️',
    color: '#8B5CF6',
    description: '用户运营、活动运营、内容运营'
  }
];

// 展示区块配置
interface DisplaySection {
  id: string;
  title: string;
  type: 'carousel' | 'grid' | 'list';
  filter: SkillFilter;
  sort: SkillSort;
  limit: number;
  refreshInterval?: number;  // 自动刷新间隔 (秒)
}

const DEFAULT_SECTIONS: DisplaySection[] = [
  {
    id: 'hot',
    title: '热门推荐',
    type: 'carousel',
    filter: { minRating: 4.0, minDownloads: 100 },
    sort: { field: 'download_count', order: 'desc' },
    limit: 10,
    refreshInterval: 3600
  },
  {
    id: 'latest',
    title: '最新发布',
    type: 'grid',
    filter: { publishedWithin: '7d' },
    sort: { field: 'published_at', order: 'desc' },
    limit: 12,
    refreshInterval: 300
  },
  {
    id: 'favorites',
    title: '我的收藏',
    type: 'grid',
    filter: { favorited: true },
    sort: { field: 'favorited_at', order: 'desc' },
    limit: 12
  },
  {
    id: 'team',
    title: '团队 Skills',
    type: 'list',
    filter: { teamOnly: true },
    sort: { field: 'updated_at', order: 'desc' },
    limit: 20
  }
];
```

### 4.3 搜索发现

```typescript
// ============================================
// Skills 搜索功能
// ============================================

interface SearchConfig {
  // 搜索引擎配置
  engine: 'local' | 'remote' | 'hybrid';

  // 本地搜索配置
  local: {
    // 索引字段权重
    fieldWeights: {
      name: 10;
      description: 5;
      tags: 8;
      content: 3;
      author: 2;
    };
    // 模糊匹配
    fuzzy: boolean;
    // 前缀匹配
    prefix: boolean;
  };

  // 搜索建议
  suggestions: {
    enabled: boolean;
    maxSuggestions: number;
    minInputLength: number;
  };

  // 搜索历史
  history: {
    enabled: boolean;
    maxHistory: number;
    persist: boolean;
  };
}

interface SearchResult {
  skill: Skill;
  score: number;
  highlights: {
    field: string;
    snippet: string;
  }[];
  matchedFields: string[];
}

class SkillSearchEngine {
  private index: SearchIndex;

  // 构建搜索索引
  async buildIndex(skills: Skill[]): Promise<void> {
    const documents = skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      tags: skill.tags.join(' '),
      content: skill.content,
      author: skill.author.name,
      category: skill.category
    }));

    await this.index.addDocuments(documents);
  }

  // 执行搜索
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    // 本地搜索
    const localResults = await this.localSearch(query, options);

    // 如果启用远程搜索，合并结果
    if (this.config.engine === 'hybrid' || this.config.engine === 'remote') {
      const remoteResults = await this.remoteSearch(query, options);
      return this.mergeResults(localResults, remoteResults);
    }

    return localResults;
  }

  // 获取搜索建议
  async getSuggestions(input: string): Promise<string[]> {
    if (input.length < this.config.suggestions.minInputLength) {
      return [];
    }

    // 从搜索历史获取
    const history = await this.getSearchHistory();
    const historyMatches = history
      .filter(h => h.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 3);

    // 从热门搜索获取
    const popular = await this.getPopularSearches();
    const popularMatches = popular
      .filter(p => p.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 3);

    // 从标签获取
    const tagMatches = await this.getTagSuggestions(input);

    return [...new Set([...historyMatches, ...popularMatches, ...tagMatches])]
      .slice(0, this.config.suggestions.maxSuggestions);
  }

  // 高级筛选
  async filterSkills(filters: SkillFilter): Promise<Skill[]> {
    let results = await this.getAllSkills();

    // 分类筛选
    if (filters.categories?.length) {
      results = results.filter(s => filters.categories!.includes(s.category));
    }

    // 类型筛选
    if (filters.types?.length) {
      results = results.filter(s => filters.types!.includes(s.type));
    }

    // 标签筛选
    if (filters.tags?.length) {
      results = results.filter(s =>
        filters.tags!.some(tag => s.tags.includes(tag))
      );
    }

    // 评分筛选
    if (filters.minRating) {
      results = results.filter(s => s.rating >= filters.minRating!);
    }

    // 价格筛选
    if (filters.priceRange) {
      results = results.filter(s =>
        s.price >= filters.priceRange!.min &&
        s.price <= filters.priceRange!.max
      );
    }

    // 时间筛选
    if (filters.publishedWithin) {
      const cutoff = this.parseTimeRange(filters.publishedWithin);
      results = results.filter(s => new Date(s.publishedAt) >= cutoff);
    }

    return results;
  }
}
```

---

## 5. 执行环境

### 5.1 沙箱设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Skill 沙箱架构                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Sandbox Manager                               │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  Container 1 │  │  Container 2 │  │  Container N │          │   │
│  │  │              │  │              │  │              │          │   │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │   │
│  │  │  │ Skill  │  │  │  │ Skill  │  │  │  │ Skill  │  │          │   │
│  │  │  │ Code   │  │  │  │ Code   │  │  │  │ Code   │  │          │   │
│  │  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │   │
│  │  │              │  │              │  │              │          │   │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │   │
│  │  │  │ Resource│  │  │  │ Resource│  │  │  │ Resource│  │          │   │
│  │  │  │ Monitor│  │  │  │ Monitor│  │  │  │ Monitor│  │          │   │
│  │  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │   │
│  │  │              │  │              │  │              │          │   │
│  │  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │   │
│  │  │  │ Network│  │  │  │ Network│  │  │  │ Network│  │          │   │
│  │  │  │ Proxy  │  │  │  │ Proxy  │  │  │  │ Proxy  │  │          │   │
│  │  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              Resource Pool                               │    │   │
│  │  │  - CPU: 4 cores                                          │    │   │
│  │  │  - Memory: 8GB                                           │    │   │
│  │  │  - Disk: 100GB                                           │    │   │
│  │  │  - Network: 100Mbps                                      │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================
// 沙箱实现
// ============================================

interface SandboxOptions {
  skillId: string;
  runtime: 'python' | 'nodejs' | 'shell';
  resources: ResourceLimits;
  permissions: PermissionConfig;
  timeout: number;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  memoryUsed: number;
  artifacts?: ExecutionArtifact[];
}

class SkillSandbox {
  private containerId: string | null = null;

  // 创建沙箱环境
  async create(options: SandboxOptions): Promise<void> {
    // 1. 创建隔离容器
    this.containerId = await this.createContainer({
      image: this.getRuntimeImage(options.runtime),
      resources: {
        memory: options.resources.memoryLimit,
        cpus: options.resources.cpuLimit
      },
      network: options.permissions.network.enabled ? 'bridge' : 'none',
      readOnlyRoot: true
    });

    // 2. 设置文件系统
    await this.setupFilesystem(this.containerId, options.permissions.filesystem);

    // 3. 配置网络代理
    if (options.permissions.network.enabled) {
      await this.setupNetworkProxy(this.containerId, options.permissions.network);
    }

    // 4. 挂载 Skill 代码
    await this.mountSkillCode(this.containerId, options.skillId);
  }

  // 执行 Skill
  async execute(inputs: Record<string, any>): Promise<ExecutionResult> {
    if (!this.containerId) {
      throw new Error('Sandbox not initialized');
    }

    const startTime = Date.now();

    try {
      // 写入输入参数
      await this.writeInputs(this.containerId, inputs);

      // 执行代码
      const result = await this.runContainer(this.containerId, {
        timeout: this.options.timeout,
        captureOutput: true
      });

      // 读取输出
      const output = await this.readOutput(this.containerId);
      const artifacts = await this.collectArtifacts(this.containerId);

      return {
        success: result.exitCode === 0,
        output,
        exitCode: result.exitCode,
        executionTime: Date.now() - startTime,
        memoryUsed: result.memoryUsed,
        artifacts
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message,
        exitCode: -1,
        executionTime: Date.now() - startTime,
        memoryUsed: 0
      };
    }
  }

  // 销毁沙箱
  async destroy(): Promise<void> {
    if (this.containerId) {
      await this.removeContainer(this.containerId, { force: true });
      this.containerId = null;
    }
  }

  // 资源监控
  private async monitorResources(): Promise<void> {
    setInterval(async () => {
      if (!this.containerId) return;

      const stats = await this.getContainerStats(this.containerId);

      // 检查资源限制
      if (stats.memory > this.options.resources.memoryLimit * 1024 * 1024) {
        await this.killContainer(this.containerId, 'SIGKILL');
        throw new Error('Memory limit exceeded');
      }

      if (stats.cpu > this.options.resources.cpuLimit * 100) {
        await this.throttleContainer(this.containerId);
      }
    }, 1000);
  }
}
```

### 5.2 资源限制

```typescript
// ============================================
// 资源限制配置
// ============================================

interface ResourceLimits {
  // CPU 限制
  cpuLimit: number;              // CPU 核心数 (如: 0.5, 1, 2)
  cpuQuota?: number;             // CPU 配额 (微秒/周期)
  cpuPeriod?: number;            // CPU 周期 (微秒)

  // 内存限制
  memoryLimit: number;           // 内存限制 (MB)
  memorySwap?: number;           // 交换空间限制 (MB, -1 表示无限制)
  memoryReservation?: number;    // 内存预留 (MB)

  // 磁盘限制
  diskLimit?: number;            // 磁盘空间限制 (MB)
  diskIO?: {
    readIOPS?: number;
    writeIOPS?: number;
    readBPS?: number;
    writeBPS?: number;
  };

  // 网络限制
  networkLimit?: {
    bandwidth?: number;          // 带宽限制 (Mbps)
    maxConnections?: number;     // 最大连接数
    maxRequestsPerSecond?: number;
  };

  // 进程限制
  maxProcesses?: number;         // 最大进程数
  maxFiles?: number;             // 最大打开文件数

  // 时间限制
  timeout: number;               // 执行超时 (秒)
  maxIdleTime?: number;          // 最大空闲时间 (秒)
}

// 资源限制级别
const RESOURCE_LIMITS = {
  minimal: {
    cpuLimit: 0.5,
    memoryLimit: 128,
    timeout: 30,
    maxProcesses: 10,
    maxFiles: 100
  },

  standard: {
    cpuLimit: 1.0,
    memoryLimit: 512,
    timeout: 300,
    maxProcesses: 50,
    maxFiles: 1000
  },

  elevated: {
    cpuLimit: 2.0,
    memoryLimit: 2048,
    timeout: 600,
    maxProcesses: 100,
    maxFiles: 10000
  }
};

class ResourceLimiter {
  // 应用资源限制
  async applyLimits(containerId: string, limits: ResourceLimits): Promise<void> {
    // CPU 限制
    await this.setCPULimit(containerId, limits.cpuLimit);

    // 内存限制
    await this.setMemoryLimit(containerId, limits.memoryLimit);

    // 进程限制
    if (limits.maxProcesses) {
      await this.setProcessLimit(containerId, limits.maxProcesses);
    }

    // 文件描述符限制
    if (limits.maxFiles) {
      await this.setFileLimit(containerId, limits.maxFiles);
    }
  }

  // 监控资源使用
  async monitorUsage(containerId: string): Promise<ResourceUsage> {
    const stats = await this.getContainerStats(containerId);

    return {
      cpu: {
        usage: stats.cpu.usage_percent,
        throttled: stats.cpu.throttled_time
      },
      memory: {
        used: stats.memory.usage,
        limit: stats.memory.limit,
        percent: (stats.memory.usage / stats.memory.limit) * 100
      },
      disk: {
        read: stats.disk.read_bytes,
        write: stats.disk.write_bytes
      },
      network: {
        rx: stats.network.rx_bytes,
        tx: stats.network.tx_bytes
      },
      processes: stats.pids.current
    };
  }
}
```

### 5.3 超时控制

```typescript
// ============================================
// 超时控制机制
// ============================================

interface TimeoutConfig {
  // 执行超时
  execution: number;

  // 初始化超时
  initialization: number;

  // 清理超时
  cleanup: number;

  // 空闲超时
  idle: number;

  // 网络请求超时
  networkRequest: number;

  // 总运行时间限制
  totalRuntime: number;
}

class TimeoutController {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private startTimes: Map<string, number> = new Map();

  // 设置执行超时
  setExecutionTimeout(
    executionId: string,
    timeoutMs: number,
    onTimeout: () => void
  ): void {
    this.startTimes.set(executionId, Date.now());

    const timeout = setTimeout(() => {
      this.handleTimeout(executionId, onTimeout);
    }, timeoutMs);

    this.timeouts.set(executionId, timeout);
  }

  // 清除超时
  clearTimeout(executionId: string): void {
    const timeout = this.timeouts.get(executionId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(executionId);
      this.startTimes.delete(executionId);
    }
  }

  // 获取剩余时间
  getRemainingTime(executionId: string): number {
    const startTime = this.startTimes.get(executionId);
    if (!startTime) return 0;

    const elapsed = Date.now() - startTime;
    const timeout = this.timeouts.get(executionId);
    // 这里需要存储原始超时时间
    return Math.max(0, this.getOriginalTimeout(executionId) - elapsed);
  }

  // 处理超时
  private async handleTimeout(
    executionId: string,
    onTimeout: () => void
  ): Promise<void> {
    console.warn(`Execution ${executionId} timed out`);

    // 执行超时回调
    onTimeout();

    // 强制终止执行
    await this.forceTerminate(executionId);

    // 清理资源
    this.clearTimeout(executionId);
  }

  // 强制终止
  private async forceTerminate(executionId: string): Promise<void> {
    // 发送终止信号
    await this.sendKillSignal(executionId, 'SIGTERM');

    // 等待优雅终止
    await this.sleep(5000);

    // 强制杀死
    await this.sendKillSignal(executionId, 'SIGKILL');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 6. 安全考虑

### 6.1 代码审计

```typescript
// ============================================
// Skill 代码审计
// ============================================

interface SecurityAuditResult {
  passed: boolean;
  score: number;              // 安全评分 (0-100)
  issues: SecurityIssue[];
  warnings: SecurityWarning[];
}

interface SecurityIssue {
  level: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  line?: number;
  code?: string;
  remediation: string;
}

class SkillSecurityAuditor {
  private static DANGEROUS_PATTERNS = [
    // 危险函数
    { pattern: /eval\s*\(/, level: 'critical', category: 'code_injection' },
    { pattern: /exec\s*\(/, level: 'critical', category: 'command_injection' },
    { pattern: /system\s*\(/, level: 'critical', category: 'command_injection' },

    // 文件操作
    { pattern: /open\s*\([^)]*['"]w/, level: 'high', category: 'file_write' },
    { pattern: /rm\s+-rf/, level: 'critical', category: 'destructive_operation' },

    // 网络操作
    { pattern: /requests\.get\s*\([^)]*http:\/\//, level: 'medium', category: 'insecure_http' },
    { pattern: /urllib\.request\.urlopen/, level: 'medium', category: 'network_access' },

    // 敏感信息
    { pattern: /password\s*=\s*['"][^'"]+['"]/i, level: 'high', category: 'hardcoded_secret' },
    { pattern: /api_key\s*=\s*['"][^'"]+['"]/i, level: 'high', category: 'hardcoded_secret' },
    { pattern: /token\s*=\s*['"][^'"]+['"]/i, level: 'high', category: 'hardcoded_secret' },

    // 反序列化
    { pattern: /pickle\.loads?\s*\(/, level: 'critical', category: 'unsafe_deserialization' },
    { pattern: /yaml\.load\s*\([^)]*Loader\s*=\s*yaml\.Loader/, level: 'high', category: 'unsafe_yaml' }
  ];

  // 执行安全审计
  async audit(skillCode: string, skillConfig: SkillConfig): Promise<SecurityAuditResult> {
    const issues: SecurityIssue[] = [];
    const warnings: SecurityWarning[] = [];

    // 1. 静态代码分析
    const staticIssues = await this.staticAnalysis(skillCode);
    issues.push(...staticIssues);

    // 2. 依赖安全检查
    if (skillConfig.runtime?.dependencies) {
      const depIssues = await this.checkDependencies(skillConfig.runtime.dependencies);
      issues.push(...depIssues);
    }

    // 3. 权限配置审查
    const permissionIssues = this.auditPermissions(skillConfig.sandbox);
    issues.push(...permissionIssues);

    // 4. 网络访问审查
    if (skillConfig.sandbox?.network_access) {
      warnings.push({
        category: 'network_access',
        message: 'Skill 请求网络访问权限，请确保仅访问必要的域名'
      });
    }

    // 计算安全评分
    const score = this.calculateSecurityScore(issues);

    return {
      passed: !issues.some(i => i.level === 'critical' || i.level === 'high'),
      score,
      issues,
      warnings
    };
  }

  // 静态代码分析
  private async staticAnalysis(code: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of SkillSecurityAuditor.DANGEROUS_PATTERNS) {
        if (pattern.pattern.test(line)) {
          issues.push({
            level: pattern.level as any,
            category: pattern.category,
            message: `发现潜在安全风险: ${pattern.category}`,
            line: i + 1,
            code: line.trim(),
            remediation: this.getRemediation(pattern.category)
          });
        }
      }
    }

    return issues;
  }

  // 依赖安全检查
  private async checkDependencies(dependencies: Dependency[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const dep of dependencies) {
      // 检查已知漏洞
      const vulnerabilities = await this.checkVulnerabilityDatabase(dep.name, dep.version);

      for (const vuln of vulnerabilities) {
        issues.push({
          level: vuln.severity,
          category: 'vulnerable_dependency',
          message: `依赖 ${dep.name}@${dep.version} 存在已知漏洞: ${vuln.cve}`,
          remediation: `升级到 ${dep.name}@${vuln.fixedVersion} 或更高版本`
        });
      }
    }

    return issues;
  }

  // 计算安全评分
  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.level) {
        case 'critical': score -= 30; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    }

    return Math.max(0, score);
  }
}
```

### 6.2 权限申请

```typescript
// ============================================
// Skill 权限申请与授权
// ============================================

interface PermissionRequest {
  skillId: string;
  skillName: string;
  requestedPermissions: Permission[];
  reason: string;
}

interface Permission {
  type: 'network' | 'filesystem' | 'camera' | 'microphone' | 'location' | 'clipboard';
  action: 'read' | 'write' | 'execute';
  resource?: string;          // 具体资源 (如: 特定域名、文件路径)
}

class PermissionManager {
  // 请求权限
  async requestPermission(
    request: PermissionRequest
  ): Promise<PermissionGrantResult> {
    // 1. 检查是否已有权限
    const existing = await this.getExistingPermissions(request.skillId);
    const newPermissions = this.filterNewPermissions(
      request.requestedPermissions,
      existing
    );

    if (newPermissions.length === 0) {
      return { granted: true, permissions: existing };
    }

    // 2. 评估权限风险
    const riskAssessment = this.assessPermissionRisk(newPermissions);

    // 3. 根据风险级别决定授权方式
    if (riskAssessment.level === 'low') {
      // 低风险：自动授权
      return this.autoGrant(request.skillId, newPermissions);
    } else if (riskAssessment.level === 'medium') {
      // 中风险：提示用户确认
      return this.promptUser(request, riskAssessment);
    } else {
      // 高风险：需要详细审核
      return this.requireDetailedReview(request, riskAssessment);
    }
  }

  // 评估权限风险
  private assessPermissionRisk(permissions: Permission[]): RiskAssessment {
    let score = 0;
    const concerns: string[] = [];

    for (const perm of permissions) {
      switch (perm.type) {
        case 'network':
          if (perm.action === 'write') {
            score += 30;
            concerns.push('网络写入权限可能用于数据外泄');
          } else {
            score += 10;
          }
          break;

        case 'filesystem':
          if (perm.action === 'write') {
            score += 40;
            concerns.push('文件写入权限可能破坏系统文件');
          } else if (perm.action === 'execute') {
            score += 50;
            concerns.push('文件执行权限存在代码注入风险');
          } else {
            score += 20;
          }
          break;

        case 'camera':
        case 'microphone':
          score += 35;
          concerns.push(`${perm.type} 权限涉及隐私敏感操作`);
          break;

        case 'location':
          score += 25;
          concerns.push('位置信息属于敏感数据');
          break;
      }
    }

    let level: 'low' | 'medium' | 'high';
    if (score < 30) level = 'low';
    else if (score < 70) level = 'medium';
    else level = 'high';

    return { level, score, concerns };
  }

  // 用户确认对话框
  private async promptUser(
    request: PermissionRequest,
    risk: RiskAssessment
  ): Promise<PermissionGrantResult> {
    const confirmed = await this.showPermissionDialog({
      title: `${request.skillName} 请求权限`,
      message: `该 Skill 需要以下权限:\n${this.formatPermissions(request.requestedPermissions)}`,
      riskLevel: risk.level,
      concerns: risk.concerns,
      rememberChoice: true
    });

    if (confirmed) {
      // 保存用户选择
      await this.savePermissionChoice(request.skillId, request.requestedPermissions);
      return { granted: true, permissions: request.requestedPermissions };
    }

    return { granted: false, reason: 'user_denied' };
  }
}
```

### 6.3 用户确认

```typescript
// ============================================
// 用户确认机制
// ============================================

interface UserConfirmation {
  // 执行前确认
  preExecution?: {
    enabled: boolean;
    showCode: boolean;          // 是否展示代码预览
    showInputs: boolean;        // 是否展示输入参数
    showPermissions: boolean;   // 是否展示所需权限
  };

  // 敏感操作确认
  sensitiveOperations: {
    networkWrite: boolean;
    filesystemWrite: boolean;
    credentialAccess: boolean;
    externalCommand: boolean;
  };

  // 执行后通知
  postExecution: {
    enabled: boolean;
    showOutput: boolean;
    showMetrics: boolean;       // 显示资源使用
    notifyOnComplete: boolean;
  };
}

class UserConfirmationManager {
  // 执行前确认
  async confirmBeforeExecution(
    skill: Skill,
    inputs: Record<string, any>,
    config: UserConfirmation
  ): Promise<boolean> {
    if (!config.preExecution?.enabled) {
      return true;
    }

    const dialogContent: DialogContent = {
      title: `确认执行 "${skill.name}"?`,
      sections: []
    };

    // 代码预览
    if (config.preExecution.showCode) {
      dialogContent.sections.push({
        title: '代码预览',
        content: this.truncateCode(skill.content, 500),
        collapsible: true
      });
    }

    // 输入参数
    if (config.preExecution.showInputs && Object.keys(inputs).length > 0) {
      dialogContent.sections.push({
        title: '输入参数',
        content: this.formatInputs(inputs),
        type: 'table'
      });
    }

    // 所需权限
    if (config.preExecution.showPermissions) {
      dialogContent.sections.push({
        title: '所需权限',
        content: this.formatPermissions(skill.sandbox),
        type: 'list',
        highlight: 'warning'
      });
    }

    // 风险提示
    const riskLevel = this.assessRiskLevel(skill);
    if (riskLevel !== 'low') {
      dialogContent.warning = {
        level: riskLevel,
        message: this.getRiskWarning(riskLevel, skill)
      };
    }

    return this.showConfirmationDialog(dialogContent);
  }

  // 敏感操作实时确认
  async confirmSensitiveOperation(
    operation: string,
    details: string
  ): Promise<boolean> {
    return this.showConfirmationDialog({
      title: '敏感操作确认',
      message: `Skill 正在尝试执行敏感操作: ${operation}`,
      details,
      warning: {
        level: 'high',
        message: '请确认您信任此 Skill 并理解该操作的后果'
      },
      requirePassword: true,      // 需要输入密码
      timeout: 30                 // 30秒超时
    });
  }

  // 执行结果展示
  async showExecutionResult(
    result: ExecutionResult,
    config: UserConfirmation
  ): Promise<void> {
    if (!config.postExecution?.enabled) {
      return;
    }

    const content: ResultContent = {
      success: result.success,
      title: result.success ? '执行成功' : '执行失败'
    };

    if (config.postExecution.showOutput && result.output) {
      content.output = result.output;
    }

    if (config.postExecution.showMetrics) {
      content.metrics = {
        executionTime: `${result.executionTime}ms`,
        memoryUsed: `${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`,
        exitCode: result.exitCode
      };
    }

    if (!result.success && result.error) {
      content.error = result.error;
    }

    await this.showResultDialog(content);
  }
}
```

---

## 7. API 接口设计

### 7.1 同步 API

```typescript
// ============================================
// Skills 同步 API
// ============================================

// POST /api/v1/skills/sync/changes
// 获取变更列表
interface GetChangesRequest {
  last_sync: string | null;     // 上次同步时间
  client_version: string;       // 客户端版本
  categories?: string[];        // 筛选分类
  types?: ('free' | 'commercial')[];
  tags?: string[];
}

interface GetChangesResponse {
  changes: SyncChange[];
  deleted: string[];
  has_more: boolean;
  next_cursor?: string;
  server_time: string;
}

// GET /api/v1/skills/sync/content/:skill_id
// 获取 Skill 完整内容
interface GetSkillContentResponse {
  skill_id: string;
  version: string;
  content: string;              // YAML + Markdown
  checksum: string;
  size: number;
  updated_at: string;
}

// GET /api/v1/skills/sync/diff/:skill_id
// 获取 Skill 差异内容
interface GetSkillDiffResponse {
  skill_id: string;
  from_version: string;
  to_version: string;
  diff: string;                 // unified diff 格式
  checksum: string;
}

// POST /api/v1/skills/sync/ack
// 确认同步完成
interface SyncAckRequest {
  sync_id: string;
  received_changes: string[];   // 已接收的变更 ID
  client_time: string;
}

// WebSocket /ws/skills/sync
// 实时同步推送
interface SyncWebSocketMessage {
  type: 'change' | 'delete' | 'heartbeat';
  timestamp: string;
  data?: SyncChange;
  skill_id?: string;
}
```

### 7.2 执行 API

```typescript
// ============================================
// Skills 执行 API
// ============================================

// POST /api/v1/skills/execute
// 执行 Skill
interface ExecuteSkillRequest {
  skill_id: string;
  version?: string;             // 默认使用最新版本
  inputs: Record<string, any>;
  timeout?: number;
  async?: boolean;              // 是否异步执行
}

interface ExecuteSkillResponse {
  execution_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ExecutionResult;
  websocket_url?: string;       // 异步执行结果推送
}

// GET /api/v1/skills/execute/:execution_id
// 查询执行状态
interface GetExecutionStatusResponse {
  execution_id: string;
  skill_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;            // 执行进度 (0-100)
  result?: ExecutionResult;
  started_at?: string;
  completed_at?: string;
}

// POST /api/v1/skills/execute/:execution_id/cancel
// 取消执行
interface CancelExecutionResponse {
  success: boolean;
  message: string;
}

// POST /api/v1/skills/validate
// 验证 Skill 配置
interface ValidateSkillRequest {
  content: string;              // Skill YAML 内容
}

interface ValidateSkillResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### 7.3 频道 API

```typescript
// ============================================
// Skills 频道 API
// ============================================

// GET /api/v1/skills/channel/sections
// 获取频道区块配置
interface GetChannelSectionsResponse {
  sections: DisplaySection[];
  updated_at: string;
}

// GET /api/v1/skills/channel/search
// 搜索 Skills
interface SearchSkillsRequest {
  q: string;
  category?: string;
  type?: 'free' | 'commercial';
  tags?: string[];
  sort?: 'relevance' | 'rating' | 'downloads' | 'newest';
  page?: number;
  page_size?: number;
}

interface SearchSkillsResponse {
  items: SkillSummary[];
  total: number;
  page: number;
  page_size: number;
  suggestions?: string[];
}

// GET /api/v1/skills/channel/categories
// 获取分类列表
interface GetCategoriesResponse {
  categories: SkillCategoryConfig[];
}

// GET /api/v1/skills/channel/favorites
// 获取收藏列表
interface GetFavoritesResponse {
  items: SkillSummary[];
  total: number;
}

// POST /api/v1/skills/channel/favorites
// 添加收藏
interface AddFavoriteRequest {
  skill_id: string;
}

// DELETE /api/v1/skills/channel/favorites/:skill_id
// 取消收藏
```

### 7.4 Skills 市场与交易 API

```typescript
// ============================================
// Skills 交易市场 API - 上传、出售、采购
// ============================================

// --------------------------------------------
// Skill 上传与发布
// --------------------------------------------

// POST /api/v1/skills/market/upload
// 上传新的 Skill
interface UploadSkillRequest {
  // Skill 内容 (YAML + Markdown)
  content: string;

  // 元数据
  metadata: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    icon?: string;              // Base64 图标
    screenshots?: string[];     // Base64 截图
  };

  // 定价信息
  pricing: {
    type: 'free' | 'onetime' | 'subscription';
    price?: number;             // 人民币，分
    subscription?: {
      period: 'month' | 'year';
      price: number;
    };
    trial_days?: number;        // 试用天数
  };

  // 权限配置
  permissions: {
    network: boolean;
    filesystem: 'none' | 'readonly' | 'readwrite';
    sandbox_level: 'minimal' | 'standard' | 'elevated';
  };

  // 版本信息
  version: {
    major: number;
    minor: number;
    patch: number;
    changelog: string;
  };
}

interface UploadSkillResponse {
  skill_id: string;
  version_id: string;
  status: 'pending_review' | 'published' | 'rejected';
  review_eta?: string;          // 预计审核完成时间
  upload_url?: string;          // 大文件上传地址（如需要）
}

// PUT /api/v1/skills/market/:skill_id/update
// 更新 Skill 版本
interface UpdateSkillRequest {
  skill_id: string;
  content: string;
  version: {
    major: number;
    minor: number;
    patch: number;
    changelog: string;
  };
  auto_publish: boolean;        // 是否自动发布（免费Skill可用）
}

// DELETE /api/v1/skills/market/:skill_id
// 下架 Skill
interface DelistSkillRequest {
  skill_id: string;
  reason: string;
  notify_subscribers: boolean;
  refund_policy: 'full' | 'prorated' | 'none';
}

// --------------------------------------------
// Skill 购买与授权
// --------------------------------------------

// GET /api/v1/skills/market/:skill_id/purchase/info
// 获取购买信息
interface GetPurchaseInfoResponse {
  skill_id: string;
  name: string;
  pricing: {
    type: 'free' | 'onetime' | 'subscription';
    price: number;
    original_price?: number;    // 折扣前价格
    currency: 'CNY';
    subscription?: {
      period: 'month' | 'year';
      price: number;
    };
  };
  promotion?: {
    type: 'discount' | 'bundle' | 'trial';
    discount_percent?: number;
    end_time?: string;
    bundle_skills?: string[];
  };
  already_owned: boolean;
  can_trial: boolean;
  trial_days_remaining?: number;
}

// POST /api/v1/skills/market/:skill_id/purchase
// 购买 Skill
interface PurchaseSkillRequest {
  skill_id: string;
  payment_method: 'alipay' | 'wechat_pay' | 'balance' | 'card';
  coupon_code?: string;
  auto_renew?: boolean;         // 订阅制自动续费
}

interface PurchaseSkillResponse {
  order_id: string;
  status: 'pending_payment' | 'completed' | 'failed';
  payment_url?: string;         // 支付跳转URL
  payment_qr?: string;          // 支付二维码 Base64
  expires_at?: string;          // 支付过期时间
  license_key?: string;         // 授权码（支付完成后）
}

// GET /api/v1/skills/market/orders/:order_id
// 查询订单状态
interface GetOrderResponse {
  order_id: string;
  skill_id: string;
  skill_name: string;
  amount: number;
  currency: 'CNY';
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  created_at: string;
  paid_at?: string;
  license?: {
    key: string;
    expires_at?: string;        // 订阅过期时间
    status: 'active' | 'expired' | 'revoked';
  };
}

// POST /api/v1/skills/market/orders/:order_id/refund
// 申请退款
interface RefundRequest {
  order_id: string;
  reason: string;
  type: 'full' | 'partial';
  amount?: number;              // 部分退款金额
}

// --------------------------------------------
// Skill 授权管理
// --------------------------------------------

// GET /api/v1/skills/licenses
// 获取我的授权列表
interface GetLicensesResponse {
  licenses: SkillLicense[];
  total: number;
}

interface SkillLicense {
  license_id: string;
  skill_id: string;
  skill_name: string;
  skill_icon?: string;
  status: 'active' | 'expired' | 'suspended';
  type: 'free' | 'purchased' | 'subscription' | 'trial';

  // 有效期
  valid_from: string;
  valid_until?: string;         // null 表示永久

  // 使用限制
  usage_limits?: {
    max_executions?: number;    // 最大执行次数
    max_users?: number;         // 最大用户数（团队版）
  };

  // 自动续费（订阅制）
  auto_renew?: boolean;
  next_billing_date?: string;

  // 更新许可
  updates_included: boolean;
  update_until?: string;
}

// POST /api/v1/skills/licenses/:license_id/activate
// 激活授权（在其他设备上使用）
interface ActivateLicenseRequest {
  license_key: string;
  device_id: string;
  device_name: string;
}

// DELETE /api/v1/skills/licenses/:license_id/deactivate
// 停用授权（释放设备配额）

// GET /api/v1/skills/licenses/:license_id/usage
// 查询授权使用统计
interface GetLicenseUsageResponse {
  license_id: string;
  total_executions: number;
  executions_this_month: number;
  active_devices: number;
  devices: {
    device_id: string;
    device_name: string;
    activated_at: string;
    last_used: string;
  }[];
}

// --------------------------------------------
// 开发者中心 - 收入管理
// --------------------------------------------

// GET /api/v1/skills/developer/sales
// 获取销售统计
interface GetSalesStatsResponse {
  total_revenue: number;        // 总收入（分）
  this_month_revenue: number;
  total_sales: number;
  this_month_sales: number;

  skills: {
    skill_id: string;
    skill_name: string;
    total_revenue: number;
    total_sales: number;
    rating: number;
  }[];

  chart_data: {
    date: string;
    revenue: number;
    sales: number;
  }[];
}

// GET /api/v1/skills/developer/transactions
// 获取交易明细
interface GetTransactionsRequest {
  start_date?: string;
  end_date?: string;
  skill_id?: string;
  type?: 'sale' | 'refund' | 'withdrawal';
  page?: number;
  page_size?: number;
}

interface GetTransactionsResponse {
  transactions: Transaction[];
  total: number;
}

interface Transaction {
  id: string;
  type: 'sale' | 'refund' | 'withdrawal';
  skill_id?: string;
  skill_name?: string;
  amount: number;               // 正数收入，负数退款
  platform_fee: number;         // 平台抽成
  net_amount: number;           // 净收入
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  description?: string;
}

// POST /api/v1/skills/developer/withdraw
// 提现申请
interface WithdrawRequest {
  amount: number;               // 提现金额（分）
  method: 'alipay' | 'bank_transfer';
  account_info: {
    account_name: string;
    account_number: string;
    bank_name?: string;
  };
}

// --------------------------------------------
// 购物车与愿望单
// --------------------------------------------

// GET /api/v1/skills/market/cart
// 获取购物车

// POST /api/v1/skills/market/cart
// 添加到购物车
interface AddToCartRequest {
  skill_id: string;
  pricing_type?: 'onetime' | 'subscription';  // 默认为 onetime
}

// DELETE /api/v1/skills/market/cart/:item_id
// 从购物车移除

// POST /api/v1/skills/market/cart/checkout
// 购物车结算
interface CheckoutCartRequest {
  payment_method: 'alipay' | 'wechat_pay' | 'balance';
  coupon_code?: string;
}

// GET /api/v1/skills/market/wishlist
// 获取愿望单

// POST /api/v1/skills/market/wishlist/:skill_id
// 添加到愿望单
```

### 7.5 交易流程设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Skills 交易流程                                │
└─────────────────────────────────────────────────────────────────────────┘

【发布流程】
开发者创建 Skill → 上传内容 → 设置价格 → 提交审核 → 平台审核 → 发布上线
     │              │           │           │           │
     ▼              ▼           ▼           ▼           ▼
  本地开发      内容检查     定价策略    安全审计    分类上架
  功能测试      格式验证     竞品分析    代码审查    搜索索引

【购买流程】
用户浏览 → 查看详情 → 试玩/演示 → 选择套餐 → 支付 → 获得授权 → 下载使用
   │          │          │          │        │        │
   ▼          ▼          ▼          ▼        ▼        ▼
推荐算法    评分评价   在线体验   月付/年付  多渠道   设备绑定   自动同步
分类筛选    使用文档   限制功能   买断制    支付     授权验证

【结算流程】
用户付款 → 平台托管 → 确认收货(7天) → 开发者提现 → 结算完成
   │          │           │            │
   ▼          ▼           ▼            ▼
支付网关   资金冻结    自动确认    T+7结算
手续费      争议期      好评奖励    税费代扣
```

### 7.6 交易安全与风控

```typescript
// 交易风控配置
interface TransactionRiskControl {
  // 买家保护
  buyer_protection: {
    // 7天无理由退款（符合条件）
    refund_window_days: 7;

    // 自动确认时间
    auto_confirm_days: 7;

    // 争议处理
    dispute_window_days: 30;

    // 质量问题退款
    quality_guarantee: boolean;
  };

  // 卖家保护
  seller_protection: {
    // 提现门槛
    min_withdrawal_amount: 10000;  // 100元

    // 结算周期
    settlement_days: 7;

    // 欺诈检测
    fraud_detection: boolean;
  };

  // 反欺诈规则
  antifraud_rules: {
    // 同一设备购买限制
    max_purchases_per_device: 10;

    // 异常交易检测
    velocity_check: {
      max_transactions_per_hour: 5;
      max_amount_per_day: 100000;  // 1000元
    };

    // 高风险地区限制
    geo_restrictions: string[];

    // 退款率监控
    max_refund_rate: 0.3;  // 30%
  };
}

// 交易安全服务
class TransactionSecurity {
  // 验证购买合法性
  async validatePurchase(
    userId: string,
    skillId: string,
    amount: number
  ): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkUserStatus(userId),
      this.checkDeviceLimit(userId),
      this.checkVelocityLimit(userId, amount),
      this.checkSkillStatus(skillId),
      this.checkPriceIntegrity(skillId, amount)
    ]);

    const failed = checks.filter(c => !c.passed);

    if (failed.length > 0) {
      return {
        valid: false,
        reasons: failed.map(f => f.reason)
      };
    }

    return { valid: true };
  }

  // 反洗钱检查
  async amlCheck(userId: string, amount: number): Promise<AMLResult> {
    // 大额交易报告
    if (amount > 100000) {  // 1000元
      await this.reportLargeTransaction(userId, amount);
    }

    // 可疑交易检测
    const pattern = await this.analyzeTransactionPattern(userId);
    if (pattern.risk_score > 0.8) {
      await this.flagForReview(userId, pattern);
    }

    return { cleared: pattern.risk_score < 0.5 };
  }
}
```

---

## 8. 部署与运维

### 8.1 部署架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Skills 集成部署架构                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      生产环境 (Production)                       │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │   Nginx      │  │  Skill API   │  │  Sync Worker │          │   │
│  │  │   (LB)       │  │   Server     │  │              │          │   │
│  │  │              │  │  (x3)        │  │  (x2)        │          │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │   │
│  │         │                 │                 │                   │   │
│  │         └─────────────────┴─────────────────┘                   │   │
│  │                           │                                      │   │
│  │                    ┌──────┴──────┐                              │   │
│  │                    │  PostgreSQL │                              │   │
│  │                    │  (Primary)  │                              │   │
│  │                    └─────────────┘                              │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │    Redis     │  │   RabbitMQ   │  │    MinIO     │          │   │
│  │  │   (Cache)    │  │    (Queue)   │  │  (Storage)   │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      沙箱环境 (Sandbox)                          │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              Kubernetes Cluster                          │    │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │   │
│  │  │  │ Skill Pod 1  │  │ Skill Pod 2  │  │ Skill Pod N  │  │    │   │
│  │  │  │ (隔离容器)    │  │ (隔离容器)    │  │ (隔离容器)    │  │    │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │   │
│  │  │                                                          │    │   │
│  │  │  Resource Quota: CPU 32 cores / Memory 64GB              │    │   │
│  │  │  Network Policy: Deny All, Allow Explicit                │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 监控告警

```yaml
# ============================================
# 监控告警配置
# ============================================

# 关键指标监控
metrics:
  # 同步指标
  sync:
    - name: sync_latency
      threshold: 5000ms
      severity: warning
    - name: sync_failure_rate
      threshold: 5%
      severity: critical
    - name: sync_queue_size
      threshold: 1000
      severity: warning

  # 执行指标
  execution:
    - name: execution_duration
      threshold: 300s
      severity: warning
    - name: execution_failure_rate
      threshold: 10%
      severity: critical
    - name: sandbox_resource_usage
      threshold: 80%
      severity: warning

  # 系统指标
  system:
    - name: api_response_time
      threshold: 1000ms
      severity: warning
    - name: error_rate
      threshold: 1%
      severity: critical
    - name: database_connection_pool
      threshold: 80%
      severity: warning

# 告警渠道
alerts:
  channels:
    - type: email
      recipients: ["ops@sillymd.com"]
    - type: slack
      webhook: "https://hooks.slack.com/xxx"
    - type: sms
      phone_numbers: ["+86xxx"]
      for_severity: [critical]
```

### 8.3 故障处理

| 故障场景 | 检测方式 | 自动处理 | 人工介入 |
|---------|---------|---------|---------|
| 同步失败 | 失败率监控 | 重试3次，降级到轮询 | 超过10分钟告警 |
| 沙箱OOM | 资源监控 | 自动杀死，返回错误 | 记录日志分析 |
| 执行超时 | 超时监控 | 强制终止 | 记录现场 |
| API异常 | 响应时间监控 | 熔断，返回缓存 | 自动恢复后通知 |
| 数据库故障 | 连接池监控 | 切换到只读模式 | 立即介入 |

---

## 附录

### A. 错误码定义

| 错误码 | 说明 | 处理建议 |
|-------|------|---------|
| 4001 | Skill 不存在 | 检查 skill_id 是否正确 |
| 4002 | Skill 版本不兼容 | 更新到最新版本 |
| 4003 | 输入参数无效 | 检查参数格式和类型 |
| 4004 | 权限不足 | 申请所需权限 |
| 5001 | 执行超时 | 增加超时时间或优化代码 |
| 5002 | 内存溢出 | 减少内存使用或申请更大配额 |
| 5003 | 沙箱错误 | 检查代码安全性 |
| 6001 | 同步冲突 | 手动解决冲突 |
| 6002 | 网络错误 | 检查网络连接 |

### B. 环境变量

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| `SKILL_SYNC_INTERVAL` | 同步间隔(秒) | 300 |
| `SKILL_EXEC_TIMEOUT` | 执行超时(秒) | 300 |
| `SKILL_SANDBOX_MEMORY` | 沙箱内存限制(MB) | 512 |
| `SKILL_SANDBOX_CPU` | 沙箱CPU限制 | 1.0 |
| `SKILL_CACHE_TTL` | 缓存时间(秒) | 3600 |

### C. 相关文档

- [Skills 分类体系](/docs/04-skills-system.md)
- [Skills 编辑器](/docs/16-skills-editor.md)
- [前端设计规范](/docs/15-frontend.md)
- [API 参考文档](/docs/28-api-reference.md)
