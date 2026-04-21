-- Agent 服务接入域首版 SQL 契约
-- 目标：定义 MVP 阶段“当前唯一激活 Agent 服务”的最小结构化存储边界。
-- 范围：
--   1. 系统只维护一个当前激活的外部 Agent 服务，不引入多服务列表、路由或容灾槽位。
--   2. SQL 契约只保存 provider 中立的连接元数据、连接状态与能力准备状态。
--   3. 任务规划、任务调度、subagent 生命周期、平台脚本执行细节不进入本表。
--   4. 凭证明文不直接进入结构化表，表内仅保存稳定的 `credential_ref`。
--   5. 当前阶段不定义自动恢复、失败重试、故障切换或历史版本追踪字段。

CREATE TABLE agent_service_connections (
    service_scope TEXT PRIMARY KEY
        CHECK (service_scope = 'current'),
    agent_service_id TEXT NOT NULL UNIQUE,
    provider_code TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    authentication_kind TEXT NOT NULL,
    credential_ref TEXT NOT NULL,
    connection_status TEXT NOT NULL
        CHECK (connection_status IN (
            'pending_verification',
            'connected',
            'connection_failed'
        )),
    connection_status_reason TEXT,
    capability_status TEXT NOT NULL
        CHECK (capability_status IN (
            'not_ready',
            'preparing',
            'ready',
            'prepare_failed'
        )),
    capability_status_reason TEXT,
    last_verified_at TEXT,
    last_connected_at TEXT,
    capability_prepared_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_agent_service_connections_provider_code
    ON agent_service_connections(provider_code);

CREATE INDEX idx_agent_service_connections_connection_status
    ON agent_service_connections(connection_status);

CREATE INDEX idx_agent_service_connections_capability_status
    ON agent_service_connections(capability_status);

-- 领域语义映射
-- AgentServiceConnection -> `agent_service_connections` 表中的单行记录，
--   表达系统当前唯一激活的外部 Agent 服务连接关系。
-- Active Agent Service -> `service_scope = 'current'` 的唯一记录。
-- Agent Service Identifier -> `agent_service_id`
-- Agent Provider -> `provider_code`
-- Connection Configuration -> `endpoint_url` + `authentication_kind` + `credential_ref`
-- Connection Status -> `connection_status` + `connection_status_reason` + `last_verified_at`
-- Capability Provisioning Status -> `capability_status` + `capability_status_reason` + `capability_prepared_at`
--
-- 说明：
-- 1. “未配置”不以表内状态值表达，而是通过不存在 `service_scope = 'current'`
--    的记录来表达。这保持了 SQL 结构的最小化，同时允许 API 契约把“未配置”
--    暴露为上层可见状态。
-- 2. 由于本表只承载当前激活服务，因此不需要 `is_active`、优先级、路由目标、
--    备用服务或切换策略等字段。
-- 3. 连接成功即可视为当前服务可被系统使用；`capability_status` 是附加业务状态，
--    不改变“已连接即可使用”的 MVP 主语义。

-- 字段语义约束
-- service_scope:
--   - 固定为 `current`。
--   - 用于把本表约束为“当前唯一激活服务槽位”，而不是多行服务列表。
--
-- agent_service_id:
--   - 当前激活服务的稳定标识。
--   - 当用户替换外部 Agent 服务时，应更新为新的稳定标识。
--
-- provider_code:
--   - provider 中立的服务提供方编码，例如 `openclaw`。
--   - 只承担识别 provider 类型的语义，不承载 provider 私有生命周期状态。
--
-- endpoint_url:
--   - 当前激活服务的连接入口地址。
--   - 仅表达上层契约所需的统一访问入口，不记录 provider 私有路由细节。
--
-- authentication_kind:
--   - 当前连接所使用的认证方式标签，例如 `bearer-token`、`api-key`。
--   - 用于表达认证类别，不在结构化表中存储明文凭证。
--
-- credential_ref:
--   - 指向凭证存储位置或密文载体的稳定引用。
--   - SQL 契约不限定凭证具体存储实现，以保持 provider 与存储实现可替换。
--
-- connection_status:
--   - `pending_verification`: 已配置或已更新，等待显式连接校验。
--   - `connected`: 最近一次连接校验成功；该状态即表示当前服务可被系统使用。
--   - `connection_failed`: 最近一次连接校验失败，需用户显式处理；当前阶段不自动恢复。
--
-- capability_status:
--   - `not_ready`: 尚未完成 Cybernomads 所需能力准备。
--   - `preparing`: 正在执行能力准备流程。
--   - `ready`: 已完成能力准备，满足 Cybernomads 最小运行能力。
--   - `prepare_failed`: 最近一次能力准备失败；当前阶段不自动重试。
--
-- last_verified_at / last_connected_at / capability_prepared_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 分别表达最近一次校验、最近一次确认连接成功、最近一次完成能力准备的时间点。
--
-- created_at / updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 支撑当前激活服务配置的创建与更新时间追踪。

-- MVP 语义边界
-- 1. 当前阶段只保存一个当前激活 Agent 服务，不定义服务列表、流量分配、
--    路由权重、优先级或故障切换字段。
-- 2. 当前阶段不定义 `retry_count`、`next_retry_at`、`recovery_status`
--    等自动恢复与失败重试字段。
-- 3. 当前阶段不定义 provider 私有会话参数、subagent 生命周期状态、
--    平台脚本安装结果等实现细节字段。
-- 4. 当前阶段不定义历史版本表、审计流水表或旧服务保留槽位；服务替换语义
--    通过覆盖 `service_scope = 'current'` 的单行记录表达。
-- 5. 当前阶段不把任务调度、引流工作状态、日志回写或平台账号关系混入本表。
