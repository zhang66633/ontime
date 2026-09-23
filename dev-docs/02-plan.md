# 开发计划：内置中文语言切换

## 需求

1. fork `cpvalente/ontime`（已完成：`zhang66633/ontime`）
2. 用 mermaid 图做项目全景（见 [01-panorama.md](./01-panorama.md)）
3. 在语言切换选项中**内置中文切换键**，并做好适配

## i18n 机制摸底结论（源码为准）

| 层 | 位置 | 说明 |
| --- | --- | --- |
| 基准翻译 | `packages/types/src/translations/index.ts` | `langEn` 共 33 个 key；`TranslationObject` 类型由 key 集合派生 |
| 各语言包 | `apps/client/src/translation/languages/{de,es,fr,it,pt}.ts` | 各自 `export const langXx: TranslationObject` |
| 注册表 | `apps/client/src/translation/TranslationProvider.tsx` | `translationsList` 映射 code → 语言包 |
| 消费方 | 各 view 组件 | `useTranslation().getLocalizedString(key)` |
| 持久化 | `Settings.language`（DB） | 服务端仅校验 `isString().notEmpty()`，**无枚举白名单** |
| 入口 A | `GeneralSettings.tsx` 设置页 | Select options **硬编码** |
| 入口 B | `quick-start/QuickStart.tsx` 新建项目 | Select options **硬编码**（无 custom 项） |
| 特殊模式 | `language === 'custom'` | 用户自定义翻译，走 `CustomTranslationModal` |

回落策略（`TranslationProvider.tsx:40-52`）：lang 在表中但缺 key → 回落英文；lang 不在表中 → 回落英文；`custom` → 用户翻译。

## 方案与取舍

**采用：新增 `zh.ts` + 两处 Select 加选项 + Provider 注册**（最小改动，符合仓库 AGENTS.md 的 smallest maintainable change）。

备选方案（未采用，记录理由）：

| 方案 | 放弃理由 |
| --- | --- |
| 引入 i18next 等库 | 仓库已有自研机制且工作正常；AGENTS.md 明确「Add dependencies only when platform/current stack cannot solve the need」 |
| 把 options 提成共享常量 | 两处 options 内容不同（QuickStart 无 custom），提取常量反而要传参区分；小重复优于耦合（architecture.md 原则） |
| 语言码用 `zh-CN` | 现有全是两字母 code（en/fr/de/it/pt/es），`zh` 保持一致 |

**术语斟酌**（对齐 ontime 演出行业语境）：

- `common.minutes/seconds` 在 Timer 视图作文单位后缀，用单字 `分`/`秒`（英文用缩写 min/sec）
- `timeline.live` → `进行中`（英文 live，时间线状态）
- `timeline.due` → `即将开始`（英文 due，注意 `TimelineSections.tsx:24` 会 `.toUpperCase()`，中文无副作用）
- `countdown.overtime` → `超时中`（in overtime）
- `project.url` → `项目链接`（不用「网址」，与 info 卡片语境一致）

## 适配边界（如实记录）

翻译系统只覆盖 33 个视图标签 key。以下**不在**覆盖范围（与英文版行为一致，非回归）：

- studio 视图硬编码 `ON AIR`（`StudioClock.tsx:58,76`）
- countdown 的 `Add` 按钮、info 页的说明段落（演示项目用户数据）
- 编辑器（editor）界面本身不随语言切换（官方设计，`GeneralSettings.tsx:97` 有说明）

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `apps/client/src/translation/languages/zh.ts` | 新增，33 key 全量中文 |
| `apps/client/src/translation/TranslationProvider.tsx` | 注册 `zh: langZh` |
| `apps/client/src/features/app-settings/panel/settings-panel/GeneralSettings.tsx` | Select 增加 `{ value: 'zh', label: '中文' }` |
| `apps/client/src/features/app-settings/quick-start/QuickStart.tsx` | 同上 |
| `apps/client/src/translation/__tests__/languages.test.ts` | 新增，语言包数据完整性测试 |
