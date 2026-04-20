import { onScopeDispose, ref } from 'vue'

export interface UsePollingOptions {
  immediate?: boolean
  intervalMs: number
}

export function usePolling(task: () => Promise<void> | void, options: UsePollingOptions) {
  const isRunning = ref(false)

  let timerId: number | undefined
  let inFlight = false

  function clearTimer() {
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      timerId = undefined
    }
  }

  async function runTask() {
    if (inFlight) {
      return
    }

    inFlight = true

    try {
      await task()
    } finally {
      inFlight = false
    }
  }

  function scheduleNextTick() {
    clearTimer()
    timerId = window.setTimeout(async () => {
      if (!isRunning.value) {
        return
      }

      await runTask()

      if (isRunning.value) {
        scheduleNextTick()
      }
    }, options.intervalMs)
  }

  async function start() {
    if (isRunning.value) {
      return
    }

    isRunning.value = true

    if (options.immediate !== false) {
      try {
        await runTask()
      } finally {
        if (isRunning.value) {
          scheduleNextTick()
        }
      }

      return
    }

    scheduleNextTick()
  }

  function stop() {
    isRunning.value = false
    clearTimer()
  }

  onScopeDispose(stop)

  return {
    isRunning,
    start,
    stop,
  }
}
