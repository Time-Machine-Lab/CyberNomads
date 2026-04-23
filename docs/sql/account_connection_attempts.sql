-- 账号连接尝试 SQL 契约
-- 目标：为“既有账号的令牌输入 / 二维码接入 / 平台资料校验 / 日志读取”流程定义稳定的最小结构化存储边界。
-- 范围：
--   1. 连接尝试总是绑定到既有账号对象，不负责新建账号。
--   2. 连接尝试承载 challenge 摘要、候选令牌引用、已解析平台资料快照和日志引用。
--   3. 原始令牌内容、平台脚本上下文和日志原文不直接进入结构化列。
--   4. 校验成功后，候选令牌可被应用为账号当前生效令牌；校验失败时，旧令牌保持不变。

CREATE TABLE account_connection_attempts (
    attempt_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    connection_method TEXT NOT NULL
        CHECK (connection_method IN (
            'manual_token',
            'qr_login'
        )),
    attempt_status TEXT NOT NULL
        CHECK (attempt_status IN (
            'pending_resolution',
            'ready_for_validation',
            'validating',
            'validation_succeeded',
            'validation_failed',
            'expired',
            'canceled'
        )),
    attempt_status_reason TEXT,
    challenge_json TEXT NOT NULL DEFAULT 'null',
    input_token_ref TEXT,
    platform_session_ref TEXT,
    candidate_token_ref TEXT,
    resolved_platform_account_uid TEXT,
    resolved_display_name TEXT,
    resolved_avatar_url TEXT,
    resolved_profile_metadata_json TEXT NOT NULL DEFAULT '{}',
    log_ref TEXT,
    expires_at TEXT,
    validated_at TEXT,
    applied_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
        (applied_at IS NULL)
        OR (attempt_status = 'validation_succeeded')
    )
);

CREATE INDEX idx_account_connection_attempts_account_updated_at
    ON account_connection_attempts(account_id, updated_at DESC);

CREATE INDEX idx_account_connection_attempts_platform
    ON account_connection_attempts(platform);

CREATE INDEX idx_account_connection_attempts_status
    ON account_connection_attempts(attempt_status);

-- 领域语义映射
-- AccountConnectionAttempt -> `account_connection_attempts` 表中的单行记录。
-- Account Binding -> `account_id`
-- Connection Method -> `connection_method`
-- Challenge Summary -> `challenge_json`
-- Input / Session / Candidate Token Reference -> `input_token_ref` + `platform_session_ref` + `candidate_token_ref`
-- Resolved Platform Profile Snapshot -> `resolved_platform_account_uid` + `resolved_display_name` +
--   `resolved_avatar_url` + `resolved_profile_metadata_json`
-- Log Reference -> `log_ref`
-- Validation / Apply Timing -> `validated_at` + `applied_at`

-- 说明：
-- 1. `account_id` 表示该连接尝试属于哪个既有账号对象。
-- 2. `connection_method` 当前阶段只支持 `manual_token` 和 `qr_login`。
-- 3. `challenge_json` 仅保存普通前端可展示的 challenge 摘要，例如二维码地址、文本提示或轮询间隔。
-- 4. `input_token_ref` 保存手工录入令牌的敏感原始内容引用。
-- 5. `platform_session_ref` 保存平台脚本在二维码接入中生成的上下文引用，例如票据或轮询状态。
-- 6. `candidate_token_ref` 指向解析后待校验或已校验成功的候选令牌引用。
-- 7. `resolved_profile_metadata_json` 只保存已解析的平台资料摘要，不保存原始令牌内容。
-- 8. `log_ref` 指向该次连接尝试的日志引用；详情页日志区通过该引用读取日志。
-- 9. `applied_at` 只有在校验成功并将候选令牌真正应用到账户时才存在。
