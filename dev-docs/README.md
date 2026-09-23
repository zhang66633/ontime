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

## 如何体验中文版（三种方式，均已实测）

**官方下载的 Windows 安装版不含中文**（上游 release，无 fork 改动）。要体验：

```bash
# 方式 A：dev 模式（改代码时用）
& "$env:APPDATA\npm\pnpm.cmd" dev --filter=ontime-server   # 终端 1，:4001
& "$env:APPDATA\npm\pnpm.cmd" dev --filter=ontime-ui       # 终端 2，:3000
# 浏览器打开 http://localhost:3000/editor → 设置 → Views language → 中文

# 方式 B：生产构建独立运行（最接近安装版形态，无需 electron）
& "$env:APPDATA\npm\pnpm.cmd" build
robocopy apps\client\build apps\server\client /E           # 必须 robocopy，见坑 7
node D:\_Projects\run-ontime-standalone.cjs                # :4001，打开 /editor

# 方式 C：打 Windows 安装包（已实测跑通）
& "$env:APPDATA\npm\pnpm.cmd" build
# 若 electron 二进制缺失：node apps\electron\node_modules\electron\install.js（直连 github.com）
& "$env:APPDATA\npm\pnpm.cmd" dist-win --filter=ontime-electron
# 产物 apps/electron/dist/ontime-win64.exe（约 93MB）
```

端到端验证脚本（`BASE` 可切 3000/4001）：`node D:\_Projects\verify-ontime-zh.mjs`

**适配边界**：只有公开视图（timer/countdown/backstage/studio/timeline/info）跟随语言；编辑器界面、studio 硬编码 `ON AIR` 等不翻译（上游设计）。
