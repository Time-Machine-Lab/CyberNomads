# 可用工具

本 Skill 提供三类可直接执行的 JS 工具。默认使用 Node.js 22+ 执行。

## 通用约定

- 默认后端地址：`http://127.0.0.1:3000`
- 如需覆盖，传入 `--backend-url` 或设置环境变量 `CYBERNOMADS_BACKEND_URL`
- 所有脚本都支持 `--help`
- 所有脚本都支持 `--output <file>`，把 JSON 结果保存到文件

## 资源复制工具

- 路径：`scripts/copy-runtime-resource.js`
- 作用：把全局 Skill 或 Knowledge 复制到当前引流工作目录

示例：

```bash
node scripts/copy-runtime-resource.js \
  --traffic-work-id traffic-work-123 \
  --resource-type skill \
  --resource-path cybernomads-task-execution \
  --output ./data/task-decomposition/copy-skill-cybernomads-task-execution.json
```

## 任务批量保存工具

- 路径：`scripts/batch-save-tasks.js`
- 作用：读取本地 `task-set.json`，先做结构校验，再通过受控接口保存任务集

示例：

```bash
node scripts/batch-save-tasks.js \
  --traffic-work-id traffic-work-123 \
  --mode create \
  --task-set-file ./data/task-decomposition/task-set.json \
  --output ./data/task-decomposition/save-result.json
```

## 自检工具

- 路径：`scripts/run-self-check.js`
- 作用：检查任务结构、资源复制结果和任务保存结果是否完整闭环

示例：

```bash
node scripts/run-self-check.js \
  --task-set-file ./data/task-decomposition/task-set.json \
  --save-result-file ./data/task-decomposition/save-result.json \
  --copy-result-file ./data/task-decomposition/copy-skill-cybernomads-task-execution.json \
  --require-skill cybernomads-task-execution \
  --require-saved \
  --output ./data/task-decomposition/self-check-report.json
```

## 何时必须使用工具

- 需要复制全局 Skill 或 Knowledge 时：必须使用资源复制工具
- 需要保存任务集时：必须使用任务批量保存工具
- 结束前检查完整性时：必须使用自检工具

## 禁止事项

- 不要直接调用数据库
- 不要绕过工具手写等价脚本
- 不要把工具输出写到当前引流工作目录之外
