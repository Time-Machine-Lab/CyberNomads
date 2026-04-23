## 1. Storage And Runtime Foundation

- [x] 1.1 新增 runtime SQL 脚本并与 `docs/sql/tasks.sql` 对齐
- [x] 1.2 新增任务仓储端口与 SQLite 仓储实现
- [x] 1.3 支持按 `trafficWorkId` 查询、创建和替换任务集

## 2. Module Implementation

- [x] 2.1 实现 `tasks` 模块类型、错误、服务和状态更新规则
- [x] 2.2 实现任务集批量创建能力，供引流工作创建后的任务拆分结果落库
- [x] 2.3 实现任务集替换能力，供引流工作更新重建时使用
- [x] 2.4 实现任务产出记录创建与查询能力
- [x] 2.5 实现任务 HTTP 控制器并接入 `http-server`

## 3. Verification

- [x] 3.1 补齐任务服务单元测试，覆盖任务集创建、任务集替换、状态更新和产出记录
- [x] 3.2 补齐任务 HTTP 集成测试，覆盖列表、详情、状态更新、产出记录接口
- [x] 3.3 补齐边界测试，确认任务模块不调用 Agent provider、不执行平台脚本、不直接管理引流工作生命周期
