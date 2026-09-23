# 迭代记录

## Iter 1 — 环境搭建（2026-09-23）

- fork `cpvalente/ontime` → `zhang66633/ontime`，克隆到 `D:\_Projects\ontime`（master @ 98c1832f，v4.13.1）
- 安装依赖踩坑，见 [04-pitfalls.md](./04-pitfalls.md#坑-1pnpm-固定版本链接损坏)
- 阅读仓库自带 `AGENTS.md` + `docs/agent-guides/*`，确认验证流程与代码规范

## Iter 2 — 机制摸底

- 定位 i18n 全链路：`langEn`（types 包）→ `languages/*.ts` → `TranslationProvider.translationsList` → `getLocalizedString` → 各视图
- 确认语言选项硬编码在两处 Select：`GeneralSettings.tsx`（设置页，含 custom）与 `QuickStart.tsx`（新建项目）
- 确认服务端 `language` 字段无枚举白名单（`settings.validation.ts:30` 仅 `isString().notEmpty()`），加 `zh` 无需服务端改动
- 确认 electron 侧无语言相关代码；e2e 无语言用例

## Iter 3 — 实现

- 新增 `languages/zh.ts`（33 key 全量中文，术语斟酌见 02-plan.md）
- `TranslationProvider.tsx` 注册 `zh: langZh`
- 两处 Select 在 `en` 之后插入 `{ value: 'zh', label: '中文' }`（默认项之后、便于查找）
- 新增 `translation/__tests__/languages.test.ts`：7 种语言各自校验 key 集合与 langEn 完全一致、无空字符串、中文不是英文复制

## Iter 4 — 验证（全部实测通过）

| 验证项 | 命令 / 方式 | 结果 |
| --- | --- | --- |
| 语言包单测 | `vitest run src/translation` | 15/15 通过 |
| 客户端全量单测 | `vitest run` | 37 文件 307 测试全过 |
| 类型检查 | `tsc -p apps/client/tsconfig.app.json --noEmit` | 0 错误 |
| Lint | `oxlint --quiet --type-aware` | 0 错误（1 个预存 warning 位于未改动代码行） |
| E2E：下拉含中文 | Playwright 打开设置页 | ✅ |
| E2E：保存落库 zh | GET /data/settings | ✅ `language: 'zh'` |
| E2E：timer/countdown/studio 视图中文 | DOM 文本断言 | ✅ 当前时间/选择要跟踪的活动/预计结束 |
| E2E：切回英文可逆 | UI 切回 en | ✅ |
| E2E：QuickStart 弹窗含中文 | Playwright | ✅ |
| 视图文本证据导出 | 6 个视图 DOM dump | ✅ 见下方「中文生效证据」 |

### 中文生效证据（DOM 导出，2026-09-23 20:41）

```text
/timer     当前时间
/countdown 选择要跟踪的活动
/backstage 等待活动开始 / 计划开始 / 计划结束
/studio    开始于 / 预计结束 / 现在 / 下一个
/timeline  进行中 / 待机 / 下一个 / 即将开始 / 接下来
/info      项目信息 / 项目链接
语言下拉   English | 中文 | French | German | Italian | Portuguese | Spanish | Custom
```

### 发现并记录的问题

- 首个验证脚本末尾用 `POST /data/settings {settings:{language:'zh'}}`（嵌套格式）想重置语言，**接口要扁平 Settings 对象**，该请求静默失败，导致截图实际是英文。已改用 UI 切换重取证据。教训：验证脚本的「 setup 步骤」也要断言结果。

## Iter 5 — 提交

- 待执行：commit + push 到 `zhang66633/ontime`
