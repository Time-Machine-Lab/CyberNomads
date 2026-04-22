-- 账号接入会话 SQL 契约
-- 目标：为“新增账号前的令牌接入 -> 平台身份解析 -> 新建/恢复账号”流程定义稳定的最小结构化存储边界。
-- 范围：
--   1. 接入会话是独立于 `platform_accounts` 的短生命周期资源，不等于稳定账号对象。
--   2. 会话承载平台、接入方式、challenge 摘要、解析状态、已解析身份摘要、候选令牌引用和最终结果。
--   3. 原始输入、平台会话载荷和候选令牌内容不直接进入结构化列；表内仅保存稳定引用与脱敏摘要。
--   4. 会话完成后可以指向新建账号、恢复账号或已存在账号，但不得生成重复平台身份对象。

CREATE TABLE account_onboarding_sessions (
    session_id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    authorization_method TEXT NOT NULL,
    expected_credential_type TEXT,
    input_payload_ref TEXT,
    platform_session_payload_ref TEXT,
    challenge_json TEXT NOT NULL DEFAULT 'null',
    session_status TEXT NOT NULL
        CHECK (session_status IN (
            'pending_resolution',
            'resolved',
            'resolution_failed',
            'expired',
            'consumed',
            'canceled'
        )),
    session_status_reason TEXT,
    resolved_platform_account_uid TEXT,
    resolved_display_name TEXT,
    resolved_profile_json TEXT NOT NULL DEFAULT '{}',
    candidate_credential_type TEXT,
    candidate_credential_ref TEXT,
    final_disposition TEXT
        CHECK (
            final_disposition IS NULL
            OR final_disposition IN ('created', 'restored', 'existing')
        ),
    target_account_id TEXT,
    expires_at TEXT,
    consumed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
        (candidate_credential_ref IS NULL AND candidate_credential_type IS NULL)
        OR (candidate_credential_ref IS NOT NULL AND candidate_credential_type IS NOT NULL)
    ),
    CHECK (
        (session_status = 'consumed' AND consumed_at IS NOT NULL)
        OR (session_status != 'consumed')
    )
);

CREATE INDEX idx_account_onboarding_sessions_updated_at
    ON account_onboarding_sessions(updated_at DESC);

CREATE INDEX idx_account_onboarding_sessions_platform
    ON account_onboarding_sessions(platform);

CREATE INDEX idx_account_onboarding_sessions_status
    ON account_onboarding_sessions(session_status);

-- 领域语义映射
-- AccountOnboardingSession -> `account_onboarding_sessions` 表中的单行记录。
-- Session Identifier -> `session_id`
-- Platform / Authorization Method -> `platform` + `authorization_method`
-- Input / Platform Session Payload Reference -> `input_payload_ref` + `platform_session_payload_ref`
-- Challenge Summary -> `challenge_json`
-- Resolution State -> `session_status` + `session_status_reason`
-- Resolved Identity / Profile Summary -> `resolved_platform_account_uid` + `resolved_display_name` + `resolved_profile_json`
-- Candidate Credential Reference -> `candidate_credential_type` + `candidate_credential_ref`
-- Final Result -> `final_disposition` + `target_account_id` + `consumed_at`

-- 说明：
-- 1. `input_payload_ref` 保存用户输入或接入启动时的敏感原始内容引用，例如手工录入令牌。
-- 2. `platform_session_payload_ref` 保存平台脚本在启动接入后返回的会话载荷引用，例如二维码票据、轮询上下文或脚本专有状态。
-- 3. `challenge_json` 仅保存普通前端可展示的 challenge 摘要，例如二维码地址、文本提示或轮询票据摘要。
-- 4. `resolved_profile_json` 只保存可读资料摘要，不保存原始令牌内容。
-- 5. `candidate_credential_ref` 指向解析成功后得到的候选令牌稳定引用；在最终接入完成前，它不等于任何账号的当前生效令牌。
-- 6. `final_disposition` 表示该会话最终结果是新建账号、恢复账号还是命中已存在账号。
-- 7. 若 `final_disposition = existing`，运行时不得通过本表隐式替换该既有账号的当前生效令牌。
