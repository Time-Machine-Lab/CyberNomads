# Cybernomads Backend Scaffold

该目录是基于架构设计文档与后端开发规范初始化的后端项目骨架，当前只包含目录约定、工程配置和占位文件，不包含任何业务实现。

## 目录结构

```text
cybernomads-backend
├─ src
│  ├─ app
│  ├─ modules
│  ├─ ports
│  ├─ adapters
│  └─ shared
├─ tests
├─ scripts
├─ storage
├─ package.json
├─ tsconfig.json
├─ tsconfig.build.json
├─ eslint.config.mjs
├─ .prettierrc.json
├─ .prettierignore
├─ .gitignore
└─ .env.example
```

## 边界约定

- `src/modules`：按业务域拆分，包括 Agent 接入、资源绑定、产品、策略、引流工作、任务、观察。
- `src/ports`：统一放置 `*Port` 抽象边界。
- `src/adapters`：统一放置 OpenClaw、SQLite、文件系统、平台脚本等实现位置。
- `storage`：预留 SQLite 数据文件与文件系统产物落盘目录。
- `tests`：按单元测试、集成测试和夹具拆分。
