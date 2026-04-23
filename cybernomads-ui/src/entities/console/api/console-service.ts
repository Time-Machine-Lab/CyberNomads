import { getCurrentAgentServiceStatus, toRecoverableAgentServiceError } from '@/entities/agent/api/agent-service'
import type { AgentServiceStatusSnapshotDto } from '@/entities/agent/model/types'
import type { ConsoleOverviewRecord } from '@/entities/console/model/types'

function mapStatusToOverview(status: AgentServiceStatusSnapshotDto): ConsoleOverviewRecord {
  if (!status.hasCurrentService || !status.currentService) {
    return {
      state: 'not_configured',
      statusLabel: '尚未配置',
      statusTone: 'error',
      actionLabel: '配置 OpenClaw',
      description: status.warning ?? '当前还没有可用的 Agent 服务。请先配置 OpenClaw，完成连接测试后再继续创建推广工作。',
      connectionStatus: 'not_configured',
      capabilityStatus: 'not_ready',
      hasCurrentService: false,
      isUsable: false,
      currentService: null,
      warning: status.warning,
    }
  }

  const service = status.currentService

  if (service.connectionStatus === 'connection_failed') {
    return {
      state: 'connection_failed',
      statusLabel: '连接失败',
      statusTone: 'error',
      actionLabel: '修复连接',
      description: service.connectionStatusReason ?? '最近一次连接测试失败，请检查端点地址与认证凭据后重新测试。',
      connectionStatus: service.connectionStatus,
      capabilityStatus: service.capabilityStatus,
      hasCurrentService: true,
      isUsable: false,
      currentService: service,
      warning: status.warning,
    }
  }

  if (service.connectionStatus === 'pending_verification') {
    return {
      state: 'pending_verification',
      statusLabel: '等待测试',
      statusTone: 'warning',
      actionLabel: '继续测试连接',
      description: 'OpenClaw 配置已保存，但尚未完成显式连接测试。保存配置不等于服务可用。',
      connectionStatus: service.connectionStatus,
      capabilityStatus: service.capabilityStatus,
      hasCurrentService: true,
      isUsable: false,
      currentService: service,
      warning: status.warning,
    }
  }

  if (service.capabilityStatus === 'prepare_failed') {
    return {
      state: 'prepare_failed',
      statusLabel: '能力准备失败',
      statusTone: 'warning',
      actionLabel: '重新准备能力',
      description:
        service.capabilityStatusReason ??
        'Agent 服务已经连接可用，但 CyberNomads 所需能力准备失败。可以继续修复能力准备，不需要重新配置服务。',
      connectionStatus: service.connectionStatus,
      capabilityStatus: service.capabilityStatus,
      hasCurrentService: true,
      isUsable: service.isUsable,
      currentService: service,
      warning: status.warning,
    }
  }

  if (service.capabilityStatus === 'ready') {
    return {
      state: 'ready',
      statusLabel: '已就绪',
      statusTone: 'primary',
      actionLabel: '查看配置',
      description: 'OpenClaw 连接可用，CyberNomads 所需能力也已准备完成。现在可以继续配置账号、产品、策略和推广工作区。',
      connectionStatus: service.connectionStatus,
      capabilityStatus: service.capabilityStatus,
      hasCurrentService: true,
      isUsable: service.isUsable,
      currentService: service,
      warning: status.warning,
    }
  }

  return {
    state: 'connected_not_ready',
    statusLabel: '连接可用',
    statusTone: 'secondary',
    actionLabel: '准备能力',
    description: 'OpenClaw 已经通过连接测试，当前可被系统使用；CyberNomads 所需能力还需要继续准备。',
    connectionStatus: service.connectionStatus,
    capabilityStatus: service.capabilityStatus,
    hasCurrentService: true,
    isUsable: service.isUsable,
    currentService: service,
    warning: status.warning,
  }
}

export async function getConsoleOverview(): Promise<ConsoleOverviewRecord> {
  try {
    return mapStatusToOverview(await getCurrentAgentServiceStatus())
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)

    return {
      state: 'loading_failed',
      statusLabel: '状态读取失败',
      statusTone: 'error',
      actionLabel: '重试配置',
      description: `无法读取当前 Agent 服务状态：${recoverable.message}`,
      connectionStatus: 'not_configured',
      capabilityStatus: 'not_ready',
      hasCurrentService: false,
      isUsable: false,
      currentService: null,
      warning: recoverable.message,
    }
  }
}
