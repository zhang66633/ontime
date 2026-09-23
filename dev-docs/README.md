# ontime fork 开发文档

> 项目：`zhang66633/ontime`（fork 自 [cpvalente/ontime](https://github.com/cpvalente/ontime)，v4.13.1）
> 目的：① 用 mermaid 图做项目全景；② 在语言切换选项中内置中文切换键并做好适配。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [01-panorama.md](./01-panorama.md) | **mermaid 全景图**：仓库结构 / 运行时架构 / 视图路由 / i18n 数据流 / 开发验证流程 |
| [02-plan.md](./02-plan.md) | 中文接入开发计划（改动点、方案取舍） |
| [03-iterations.md](./03-iterations.md) | 迭代过程记录 |
| [04-pitfalls.md](./04-pitfalls.md) | 踩坑记录 |

## 快速命令

```bash
# 安装（注意 packageManager 固定版本链接损坏问题，见 04-pitfalls.md）
& "$env:APPDATA\npm\pnpm.cmd" install --no-frozen-lockfile

pnpm --filter ontime-ui test:pipeline   # 客户端单测
pnpm --filter ontime-ui lint            # oxlint
pnpm --filter ontime-ui typecheck       # tsc
pnpm format:check                       # oxfmt
```
