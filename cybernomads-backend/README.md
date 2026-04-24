# Cybernomads Backend

当前后端已经接入最小可运行的 runtime bootstrap 流程。启动时会先准备本地运行根目录、SQLite 运行时数据库和 bundled runtime SQL 资产，只有这些步骤全部成功后，进程才会进入 ready 状态。

## Startup

后端当前依赖 Node 22 的内置 `node:sqlite`。如果你本机默认版本不是 Node 22，请先切到仓库根目录并执行：

```bash
nvm use
```

如果本机没有安装 `nvm`，也可以临时用：

```bash
npx -y node@22 -v
```

```bash
npm install
npm run dev
```

如果只验证构建产物，可以执行：

```bash
npm run build
npm start
```

## Runtime Layout

后端默认把运行目录放在仓库外。

在 macOS 上，默认运行根目录是：

```text
~/Library/Application Support/CyberNomads/backend
```

如果你显式传入 `workingDirectory`，运行目录仍然会落在 `<workingDirectory>/cybernomads/`，这主要用于测试和临时运行。

如果你想手动覆盖默认位置，也可以设置环境变量：

```bash
export CYBERNOMADS_RUNTIME_ROOT="/your/custom/runtime/root"
```

运行根目录会确保以下结构存在：

```text
<runtime-root>/
├── product/
├── strategy/
├── work/
├── .account-secrets/
└── runtime.sqlite
```

说明：

- `product/`、`strategy/`、`work/` 是固定运行时目录，启动时会自动补齐缺失项。
- `.account-secrets/` 用于保存账号模块的运行时凭证、平台会话和连接日志，不会回写到 API 明文响应里。
- `runtime.sqlite` 是运行时 SQLite 数据库文件，启动时会自动创建或复用。
- 启动阶段不会创建任何 `work/<specific-work>/` 目录，也不会生成默认产品或策略内容。

## Bundled Runtime SQL

运行时 SQL 资产位于 `runtime-assets/sql/`，来源独立于仓库的 `docs/sql/`。当前首个脚本只负责创建系统级的 `runtime_sql_scripts` 表，用来记录 bootstrap SQL 的执行历史，确保重复启动不会重复执行已完成脚本。

构建时会自动把 `runtime-assets/` 复制到 `dist/`，保证 `npm start` 运行编译产物时也能加载这些 SQL 资产。
