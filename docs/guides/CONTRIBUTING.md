# 贡献指南

感谢您对 SillyChat 的兴趣！本指南将帮助您参与项目开发。

## 目录

1. [行为准则](#行为准则)
2. [如何贡献](#如何贡献)
3. [开发流程](#开发流程)
4. [代码规范](#代码规范)
5. [提交信息规范](#提交信息规范)
6. [审查流程](#审查流程)

---

## 行为准则

### 我们的承诺

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性别歧视、种族歧视或排他性语言
- 进行人身攻击或政治攻击
- 公开或私下骚扰
- 未经明确许可发布他人私人信息
- 其他不道德或不专业的行为

---

## 如何贡献

### 报告 Bug

在提交 Bug 报告之前，请：

1. 搜索现有 Issues，避免重复
2. 使用最新的开发版本测试
3. 收集足够的信息

**Bug 报告模板：**

```markdown
## 描述
简要描述 Bug

## 复现步骤
1. 步骤一
2. 步骤二
3. 步骤三

## 期望行为
描述应该发生什么

## 实际行为
描述实际发生了什么

## 环境
- OS: [例如 macOS 14.0]
- Node.js: [例如 22.12.0]
- 版本: [例如 1.0.0]

## 截图
如果适用，添加截图

## 日志
```
粘贴相关日志
```
```

### 建议新功能

1. 先搜索是否已有类似建议
2. 创建 Issue 并标记为 `enhancement`
3. 描述功能的用例和预期行为
4. 等待维护者反馈

### 提交代码

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 开发流程

### 1. 环境设置

```bash
# Fork 并克隆项目
git clone https://github.com/YOUR_USERNAME/SillyChat.git
cd SillyChat

# 添加上游仓库
git remote add upstream https://github.com/original/SillyChat.git

# 安装依赖
npm run setup:dev
```

### 2. 创建分支

```bash
# 从最新的 develop 分支创建
git fetch upstream
git checkout -b feature/my-feature upstream/develop

# 或修复 bug
git checkout -b bugfix/issue-number upstream/develop
```

### 3. 开发

```bash
# 启动开发服务器
npm run dev:gateway

# 另一个终端
npm run dev:desktop

# 运行测试（监视模式）
npm run test:watch
```

### 4. 提交前检查

```bash
# 运行所有检查
npm run pre-commit

# 包括：
# - TypeScript 类型检查
# - ESLint 代码检查
# - Prettier 格式检查
# - 单元测试
```

### 5. 保持同步

```bash
# 定期同步上游更改
git fetch upstream
git rebase upstream/develop

# 解决冲突后继续
git rebase --continue
```

### 6. 提交 PR

```bash
# 推送到你的 fork
git push origin feature/my-feature

# 然后在 GitHub 上创建 Pull Request
```

---

## 代码规范

### TypeScript 规范

```typescript
// ✅ 好的示例

// 使用明确类型
interface UserConfig {
  name: string;
  age: number;
  email?: string;
}

// 函数文档
/**
 * 创建新用户
 * @param config - 用户配置
 * @returns 创建的用户对象
 * @throws {ValidationError} 当配置无效时
 */
async function createUser(config: UserConfig): Promise<User> {
  // 实现
}

// 错误处理
async function fetchData(): Promise<Result<Data>> {
  try {
    const data = await api.fetch();
    return { success: true, data };
  } catch (error) {
    logger.error('Fetch failed', error);
    return {
      success: false,
      error: new AppError('Fetch failed', 'FETCH_ERROR', error)
    };
  }
}

// ❌ 避免

// 不要使用 any
function bad(data: any): any {
  return data;
}

// 不要忽略错误
try {
  riskyOperation();
} catch (e) {
  // 空的 catch 块！
}
```

### 测试要求

```typescript
// 每个功能都需要测试
describe('Feature', () => {
  // 正常情况
  it('should work correctly', async () => {
    const result = await feature.doSomething();
    expect(result).toBe(expected);
  });

  // 边界情况
  it('should handle empty input', async () => {
    const result = await feature.doSomething('');
    expect(result).toBeNull();
  });

  // 错误情况
  it('should throw on invalid input', async () => {
    await expect(feature.doSomething(null))
      .rejects.toThrow(ValidationError);
  });
});
```

### 文件组织

```
src/
├── feature/
│   ├── types.ts          # 类型定义
│   ├── index.ts          # 公开 API
│   ├── feature.ts        # 主要实现
│   ├── feature.test.ts   # 单元测试
│   └── utils.ts          # 辅助函数
```

---

## 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(agents): add streaming support` |
| `fix` | 修复 Bug | `fix(gateway): handle reconnect` |
| `docs` | 文档更新 | `docs(api): update Android docs` |
| `style` | 代码格式 | `style: fix indentation` |
| `refactor` | 重构 | `refactor(storage): simplify blob pool` |
| `perf` | 性能优化 | `perf(memory): reduce allocations` |
| `test` | 测试相关 | `test(agents): add unit tests` |
| `chore` | 构建/工具 | `chore: update dependencies` |
| `ci` | CI/CD | `ci: add GitHub Actions` |

### 范围

- `agents` - AI 代理模块
- `gateway` - 网关服务
- `storage` - 存储模块
- `protocol` - 通信协议
- `memory` - 记忆系统
- `config` - 配置管理
- `ui` - 用户界面
- `docs` - 文档
- `deps` - 依赖

### 示例

```bash
# 功能提交
git commit -m "feat(agents): implement streaming message response

- Add streamMessage method to Agent class
- Implement StreamChunk interface
- Update tests for streaming functionality

Closes #123"

# 修复提交
git commit -m "fix(gateway): resolve WebSocket reconnection issue

- Add exponential backoff for reconnection attempts
- Fix memory leak in connection manager
- Add connection state logging

Fixes #456"

# 文档提交
git commit -m "docs(api): add HarmonyOS API examples

- Add code samples for AgentManager
- Document error handling patterns
- Update quick start guide"

# 破坏性变更
git commit -m "feat(storage)!: redesign blob storage API

BREAKING CHANGE: BlobPool.store() now returns Promise<BlobResult>
instead of Promise<string>. Update your code:

  // Before
  const hash = await pool.store(file);

  // After
  const result = await pool.store(file);
  const hash = result.hash;"
```

---

## 审查流程

### PR 检查清单

提交 PR 前请确认：

- [ ] 代码符合 TypeScript 规范
- [ ] 添加了必要的测试
- [ ] 所有测试通过 (`npm test`)
- [ ] 更新了相关文档
- [ ] 没有引入新的 lint 错误 (`npm run lint`)
- [ ] 提交信息符合规范
- [ ] PR 描述清晰完整

### PR 模板

```markdown
## 描述
简要描述这个 PR 做了什么

## 类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 破坏性变更
- [ ] 文档更新
- [ ] 性能优化
- [ ] 代码重构

## 检查清单
- [ ] 我的代码符合项目规范
- [ ] 我添加了测试覆盖新代码
- [ ] 所有测试通过
- [ ] 我更新了相关文档

## 相关 Issue
Fixes #(issue number)

## 截图（如果适用）

## 其他说明
```

### 审查标准

维护者会检查：

1. **正确性** - 代码是否正确实现了功能
2. **测试** - 是否有足够的测试覆盖
3. **文档** - 是否更新了相关文档
4. **性能** - 是否引入了性能问题
5. **安全** - 是否存在安全隐患
6. **风格** - 是否符合代码规范

### 合并策略

- 需要至少 1 个维护者批准
- 所有 CI 检查必须通过
- 使用 "Squash and Merge" 保持历史整洁

---

## 发布流程

### 版本号规则

遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：

- `MAJOR` - 不兼容的 API 修改
- `MINOR` - 向下兼容的功能新增
- `PATCH` - 向下兼容的问题修复

### 发布步骤

```bash
# 1. 更新版本号
npm version minor

# 2. 生成 changelog
npm run changelog

# 3. 创建发布分支
git checkout -b release/v1.1.0

# 4. 最终测试
npm run test:all

# 5. 合并到 main
git checkout main
git merge release/v1.1.0

# 6. 打标签
git tag v1.1.0

# 7. 推送
git push origin main --tags
```

---

## 获取帮助

- 💬 [Discord 社区](https://discord.gg/sillychat)
- 📧 [邮件联系](mailto:dev@sillychat.io)
- 📖 [开发文档](DEVELOPMENT.md)

---

再次感谢您的贡献！
