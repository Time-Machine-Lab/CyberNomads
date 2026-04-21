## 1. Contract Alignment

- [x] 1.1 更新 [strategies.yaml](/Users/mac/Code/CyberNomads/docs/api/strategies.yaml)，对齐策略 CRUD 契约、参数占位符结构以及范围排除项
- [x] 1.2 校验并按需更新 [strategies.sql](/Users/mac/Code/CyberNomads/docs/sql/strategies.sql)，确认 SQLite 仅保存最小元数据且不新增占位符或导入关系表
- [x] 1.3 更新 [Cybernomads策略领域设计文档.md](/Users/mac/Code/CyberNomads/docs/design/domain/Cybernomads策略领域设计文档.md)，将策略占位符语义从对象引用调整为参数占位符，并明确后端不承担运行时绑定与编译

## 2. Strategy Module Implementation

- [x] 2.1 在 `src/modules/strategies/` 中建立策略模块的类型、错误、Controller、Service 和占位符解析能力
- [x] 2.2 实现策略创建与更新能力，支持摘要回填、参数占位符校验和完整 Markdown 正文持久化
- [x] 2.3 实现策略列表与详情能力，保证列表返回摘要视图，详情返回完整正文和去重后的占位符声明集合
- [x] 2.4 在 `src/adapters/storage/` 和应用启动层完成 SQLite 元数据仓储、Markdown 内容存储以及 HTTP 路由注册

## 3. Verification

- [x] 3.1 增加策略模块自动化测试，覆盖创建、更新、列表、详情、摘要回填和缺失策略场景
- [x] 3.2 增加占位符解析与校验测试，覆盖 `string` / `int` 类型、空字符串默认值、重复 key 冲突和非法语法场景
- [x] 3.3 验证 MVP 范围排除项仍然成立：不实现删除、不实现运行时值绑定、不实现独立编译接口、不建立导入关系表
