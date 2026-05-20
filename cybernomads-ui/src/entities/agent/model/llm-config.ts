import type { CybernomadsAgentLlmSetupFormInput } from '@/entities/agent/model/types'

export interface CybernomadsAgentLlmValidationState {
  hasExistingCredential: boolean
  replaceCredential: boolean
}

export function validateCybernomadsAgentLlmInput(
  input: CybernomadsAgentLlmSetupFormInput,
  state: CybernomadsAgentLlmValidationState,
) {
  if (!input.endpointUrl.trim()) {
    return '请输入 Base URL。'
  }

  try {
    new URL(input.endpointUrl.trim())
  } catch {
    return 'Base URL 格式无效，请输入完整的 http(s) 地址。'
  }

  if (!input.model.trim()) {
    return '请输入模型名称。'
  }

  if (!input.reasoningEffort) {
    return '请选择 Reasoning Effort。'
  }

  if (state.hasExistingCredential && !state.replaceCredential) {
    return '更新配置需要显式选择“替换 API Key”，避免提交掩码占位符。'
  }

  if ((!state.hasExistingCredential || state.replaceCredential) && !input.apiKey.trim()) {
    return state.hasExistingCredential ? '替换 API Key 时必须输入新的 API Key。' : '首次配置必须输入 API Key。'
  }

  return ''
}

