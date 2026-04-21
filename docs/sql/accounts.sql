-- 账号模块首版 SQL 契约
-- 目标：定义 MVP 阶段账号模块的最小结构化存储边界。
-- 范围：
--   1. 账号以稳定主键 `account_id` 作为唯一标识；`platform + platform_account_uid`
--      作为平台业务身份，并在全生命周期内保持唯一。
--   2. 本表同时承载账号基础资料、三维状态、当前生效凭证引用和当前/最近一次授权尝试摘要。
--   3. 原始凭证 payload 与授权尝试 payload 不直接进入结构化表，表内仅保存稳定引用。
--   4. 当前阶段只支持逻辑删除与恢复，不定义物理删除、多凭证并存、授权尝试历史表或版本链。
--   5. 普通详情读取只返回脱敏管理语义；受控凭证解析需基于 `active_credential_ref`
--      走内部运行时能力，而不是由普通查询直接返回。

CREATE TABLE platform_accounts (
    account_id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    platform_account_uid TEXT NOT NULL,
    display_name TEXT NOT NULL,
    remark TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    platform_metadata_json TEXT NOT NULL DEFAULT '{}',
    lifecycle_status TEXT NOT NULL
        CHECK (lifecycle_status IN (
            'active',
            'disabled',
            'deleted'
        )),
    authorization_status TEXT NOT NULL
        CHECK (authorization_status IN (
            'unauthorized',
            'authorizing',
            'authorized',
            'expired',
            'revoked'
        )),
    authorization_status_reason TEXT,
    availability_status TEXT NOT NULL
        CHECK (availability_status IN (
            'unknown',
            'healthy',
            'risk',
            'restricted',
            'offline'
        )),
    availability_status_reason TEXT,
    active_credential_type TEXT,
    active_credential_ref TEXT,
    active_credential_expires_at TEXT,
    active_credential_updated_at TEXT,
    authorization_attempt_id TEXT,
    authorization_attempt_method TEXT,
    authorization_attempt_expected_credential_type TEXT,
    authorization_attempt_payload_ref TEXT,
    authorization_attempt_status TEXT
        CHECK (
            authorization_attempt_status IS NULL
            OR authorization_attempt_status IN (
                'pending_verification',
                'verification_succeeded',
                'verification_failed',
                'expired',
                'canceled'
            )
        ),
    authorization_attempt_status_reason TEXT,
    authorization_attempt_expires_at TEXT,
    authorization_attempt_created_at TEXT,
    authorization_attempt_updated_at TEXT,
    last_authorized_at TEXT,
    last_availability_checked_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (platform, platform_account_uid),
    CHECK (
        (active_credential_ref IS NULL AND active_credential_type IS NULL)
        OR (active_credential_ref IS NOT NULL AND active_credential_type IS NOT NULL)
    ),
    CHECK (
        (authorization_attempt_id IS NULL
            AND authorization_attempt_method IS NULL
            AND authorization_attempt_payload_ref IS NULL
            AND authorization_attempt_status IS NULL)
        OR (authorization_attempt_id IS NOT NULL
            AND authorization_attempt_method IS NOT NULL
            AND authorization_attempt_payload_ref IS NOT NULL
            AND authorization_attempt_status IS NOT NULL)
    ),
    CHECK (
        (lifecycle_status = 'deleted' AND deleted_at IS NOT NULL)
        OR (lifecycle_status IN ('active', 'disabled') AND deleted_at IS NULL)
    )
);

CREATE INDEX idx_platform_accounts_updated_at
    ON platform_accounts(updated_at DESC);

CREATE INDEX idx_platform_accounts_platform
    ON platform_accounts(platform);

CREATE INDEX idx_platform_accounts_management_state
    ON platform_accounts(
        lifecycle_status,
        authorization_status,
        availability_status
    );

-- 领域语义映射
-- PlatformAccount -> `platform_accounts` 表中的单行记录，表达一个稳定的平台账号对象。
-- Account Identifier -> `account_id`
-- Platform Identity -> `platform` + `platform_account_uid`
-- Account Profile -> `display_name` + `remark` + `tags_json` + `platform_metadata_json`
-- Lifecycle / Authorization / Availability -> 三个独立状态维度分别落到
--   `lifecycle_status`、`authorization_status`、`availability_status`
-- Active Credential Reference -> `active_credential_type` + `active_credential_ref`
-- Authorization Attempt Slot -> `authorization_attempt_*` 字段集合，表达当前或最近一次授权尝试摘要
-- Soft Delete / Restore -> `lifecycle_status = deleted` + `deleted_at`
--
-- 说明：
-- 1. 当前阶段不单独拆授权尝试历史表，而是在聚合根记录中保留一个“当前/最近一次授权尝试槽位”。
--    这满足“待验证授权尝试与当前生效凭证分离”的领域约束，同时保持 MVP 存储边界最小化。
-- 2. `active_credential_ref` 与 `authorization_attempt_payload_ref` 只表达稳定引用语义；
--    SQL 契约不限定密文格式、文件系统布局或加密实现。
-- 3. 账号可读与账号可消费不是同一语义。账号默认可消费集合由如下最小条件共同决定：
--    `lifecycle_status = active`
--    `authorization_status = authorized`
--    `availability_status = healthy`
--    `active_credential_ref IS NOT NULL`
-- 4. 普通管理查询可以读取本表构造账号摘要与脱敏详情，但不得把引用目标中的原始凭证
--    或授权尝试 payload 直接并入普通详情响应。

-- 字段语义约束
-- account_id:
--   - 账号稳定标识。
--   - 由系统生成，不依赖显示名或平台昵称。
--
-- platform / platform_account_uid:
--   - 共同承担平台侧业务身份语义。
--   - 通过 UNIQUE 约束保证同一平台账号在系统中只有一个稳定对象。
--   - 若对象被逻辑删除，后续同身份重新接入时应恢复原对象而不是创建重复记录。
--
-- display_name:
--   - 账号可读显示名。
--   - 不添加 UNIQUE 约束，允许同名账号存在。
--
-- remark:
--   - 管理端补充说明。
--   - 不承担业务身份语义。
--
-- tags_json:
--   - 账号标签集合的 JSON 数组文本。
--   - 用于列表筛选与识别，不承担角色绑定或人格语义。
--
-- platform_metadata_json:
--   - 平台扩展字段的 JSON 对象文本。
--   - 用于承载平台私有补充信息，不得替代核心通用字段。
--
-- lifecycle_status:
--   - `active`: 当前为正常管理对象。
--   - `disabled`: 当前被停用，仍可读取但不进入默认可消费集合。
--   - `deleted`: 当前被逻辑删除，保留身份语义与恢复可能性。
--
-- authorization_status:
--   - `unauthorized`: 尚未具备可用授权关系。
--   - `authorizing`: 存在进行中的授权过程。
--   - `authorized`: 当前存在已验证通过的生效凭证。
--   - `expired`: 最近一次已知授权已过期。
--   - `revoked`: 最近一次已知授权被撤销或失效。
--
-- availability_status:
--   - `unknown`: 尚未完成可用性检查或暂无稳定判断。
--   - `healthy`: 当前适合作为默认可执行资源。
--   - `risk`: 当前可读，但存在风险，不进入默认可消费集合。
--   - `restricted`: 当前受到平台限制，不进入默认可消费集合。
--   - `offline`: 当前不可达或不可用，不进入默认可消费集合。
--
-- active_credential_type / active_credential_ref:
--   - 表达当前生效凭证的类型与稳定引用。
--   - 引用存在时，类型必须同时存在；普通详情只返回脱敏摘要，不返回引用目标内容。
--
-- active_credential_expires_at / active_credential_updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 分别表达当前生效凭证的预计过期时间与最近一次切换/更新时间。
--
-- authorization_attempt_*:
--   - 表达当前或最近一次授权尝试摘要，而不是历史流水表。
--   - `authorization_attempt_method` 为授权方式，例如 `token_input`、`cookie_input`、`qr_authorization`。
--   - `authorization_attempt_expected_credential_type` 表达验证成功后预期切换出的凭证类型。
--   - `authorization_attempt_payload_ref` 指向待验证输入的稳定引用，不暴露原始内容。
--   - `authorization_attempt_status` 用于表达待验证、成功、失败、过期或取消等结果。
--
-- last_authorized_at:
--   - 最近一次授权尝试成功并切换为当前生效凭证的时间。
--
-- last_availability_checked_at:
--   - 最近一次可用性检查完成时间。
--
-- deleted_at:
--   - 逻辑删除时间。
--   - 只有当 `lifecycle_status = deleted` 时允许存在。
--
-- created_at / updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 支撑列表排序、详情展示和更新追踪。

-- MVP 语义边界
-- 1. 当前阶段不定义物理删除，因此本表只提供逻辑删除所需字段，不提供硬删语义。
-- 2. 当前阶段不定义多当前凭证、多活凭证切换或凭证历史版本链。
-- 3. 当前阶段不定义授权尝试历史明细表；如未来需要审计流水或多轮并行授权，
--    需通过独立变更新增结构。
-- 4. 当前阶段不在本表中引入任务调度、工作区绑定、策略角色、平台日志或执行结果字段。
-- 5. 当前阶段不把受控凭证解析结果直接持久化为普通详情字段；受信调用方需通过运行时内部能力解析。
