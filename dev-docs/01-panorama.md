# ontime 项目全景（mermaid）

> 基于 v4.13.1 源码整理。所有结论以源码为准，标注了文件位置便于回查。

## 1. 仓库 / 工作区全景

pnpm monorepo，5 个 app + 2 个共享 package：

```mermaid
graph TD
    subgraph repo["ontime monorepo (pnpm + turbo)"]
        subgraph apps["apps/*"]
            ui["ontime-ui<br/>React 19 + Vite 客户端"]
            server["ontime-server<br/>Express 5 + ws 服务端"]
            electron["ontime-electron<br/>桌面分发壳"]
            resolver["@getontime/resolver<br/>依赖/版本解析"]
            cli["@getontime/cli<br/>命令行工具"]
        end
        subgraph packages["packages/*"]
            types["ontime-types<br/>共享契约 + langEn 基准翻译"]
            utils["ontime-utils<br/>环境无关纯逻辑"]
        end
    end
    ui --> types
    ui --> utils
    server --> types
    server --> utils
    electron --> server
    cli --> types
```

依赖方向：app → shared packages，**shared packages 永不反向依赖 app**（见 `docs/agent-guides/architecture.md`）。

## 2. 运行时架构全景

```mermaid
graph LR
    subgraph browser["浏览器 / Electron"]
        views["views（timer / countdown / backstage /<br/>studio / timeline / info / cuesheet / op）"]
        features["features（rundown / control / operator /<br/>app-settings / log / overview）"]
        tanstack["TanStack Query<br/>（服务端状态缓存）"]
        zustand["Zustand / Context<br/>（本地状态 + runtime store）"]
    end
    subgraph nodeserver["ontime-server (Express 5)"]
        routers["routers<br/>/data · /api · /mcp"]
        services["services<br/>runtime · message · aux-timer ·<br/>project · restore · app-state"]
        stores["stores<br/>EventStore · runtimeState"]
        dao["DataProvider (lowdb)<br/>持久化"]
    end
    ext["外部集成<br/>OSC · Google Sheets · MCP"]
    views --> features
    features --> tanstack
    tanstack -->|"REST (axios)"| routers
    features -->|"WebSocket (ws)"| stores
    routers --> services
    services --> stores
    services --> dao
    routers --> ext
    stores -->|"WS 广播 runtime 状态"| zustand
```

关键点：

- **双通道**：REST（`apps/client/src/common/api`）管持久化数据；WebSocket（`apps/client/src/common/utils/socket` + `common/hooks/useSocket`）管运行时状态（播放、消息、auxtimer）。
- **服务端分层**：router → controller → service → store/DAO（`docs/agent-guides/architecture.md` 的依赖方向）。
- **适配器**：`apps/server/src/adapters/` 下 OscAdapter、WebsocketAdapter。

## 3. 视图路由全景

```mermaid
graph TD
    root["/ → redirect /timer"]
    root --> pub["公开视图（ViewLoader + 导航菜单）"]
    root --> prot["受保护视图（editorKey / operatorKey）"]
    root --> preset["preset/:alias 与 * → URL 预设解析"]
    pub --> t["timer 计时器"]
    pub --> c["countdown 倒计时"]
    pub --> b["backstage 后台"]
    pub --> s["studio 演播室时钟"]
    pub --> tl["timeline 时间线"]
    pub --> i["info 项目信息"]
    pub --> o["op 操作员"]
    prot --> e["editor 编辑器"]
    prot --> cs["cuesheet 提示表"]
    preset --> map["PresetViewMap: target → 同一批视图组件"]
```

- 路由表：`apps/client/src/AppRouter.tsx`（全部 `lazy` 加载）。
- **语言只影响「公开视图」**——设置页原文：*Changes to the views language does not affect the editor view*（`GeneralSettings.tsx:97`）。

## 4. i18n 机制全景（本次改动核心）

```mermaid
graph TD
    subgraph types["packages/types（基准）"]
        langEn["translations/index.ts<br/>langEn = 33 个 key → 英文"]
    end
    subgraph client["apps/client/src/translation"]
        langs["languages/{de,es,fr,it,pt,zh}.ts<br/>各自导出 langXx: TranslationObject"]
        provider["TranslationProvider.tsx<br/>translationsList: code → langXx"]
        hook["useTranslation() → getLocalizedString(key)"]
    end
    subgraph settings["settings.language（存 DB）"]
        sel1["GeneralSettings.tsx<br/>Select options 硬编码"]
        sel2["quick-start/QuickStart.tsx<br/>Select options 硬编码"]
        custom["CustomTranslationModal<br/>custom = 用户自定义翻译"]
    end
    langEn -->|"key 集合即类型"| langs
    langs --> provider
    sel1 -->|"写 language 字段"| settings
    sel2 -->|"写 language 字段"| settings
    settings -->|"useSettings() 读取"| provider
    provider --> hook
    hook -->|"视图组件取字符串"| views["timer / countdown / backstage / timeline /<br/>project-info / cuesheet / studio / operator"]
    custom -->|"language === 'custom' 时生效"| provider
```

数据流细节（`TranslationProvider.tsx:40-52`）：

1. `getLocalizedString(key, lang = settings.language ?? 'en')`；
2. `lang` 在 `translationsList` 中 → 返回对应语言值，**缺 key 时回落英文**（`langEn[key]`）；
3. `lang === 'custom'` → 返回用户自定义翻译；
4. 其余（含 `zh` 未注册时）→ 回落英文。

翻译 key 共 33 个，分四组：`common.*`（16）、`countdown.*`（9）、`timeline.*`（6）、`project.*`（4）。

## 5. 开发 / 验证流程全景

```mermaid
flowchart LR
    a["改代码<br/>languages/zh.ts + 2 处 Select"] --> b["pnpm --filter ontime-ui test:pipeline<br/>vitest run"]
    b --> c["pnpm --filter ontime-ui lint<br/>oxlint --type-aware"]
    c --> d["pnpm --filter ontime-ui typecheck<br/>tsc --noEmit"]
    d --> e["pnpm format:check<br/>oxfmt"]
    e --> f["dev 模式手验<br/>client:3000 ↔ server:4001"]
    f --> g["commit & push 到 fork"]
```

- 验证顺序来自 `docs/agent-guides/workflow.md`：focused test → package lint/typecheck → 仓库级检查。
- 新增功能必须实测后才能交付（用户工程规则 ③）。
