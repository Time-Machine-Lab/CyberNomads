import { computed, reactive, ref, type ComputedRef } from 'vue'

import type { TaskRunRecord } from '@/entities/task-run/model/types'

const BASE_SCENE_WIDTH = 3400
const BASE_SCENE_HEIGHT = 2400
const GRID_SIZE = 40
const MIN_GRID_SIZE = 24
const MIN_ZOOM = 0.65
const MAX_ZOOM = 1.6
const DEFAULT_CAMERA_X = -110
const DEFAULT_CAMERA_Y = -150
const PAN_KEYBOARD_STEP = 56

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(value.toFixed(2))))
}

export function useWorkspaceExecutionCanvas(tasks: ComputedRef<TaskRunRecord[]>) {
  const canvasViewport = ref<HTMLElement | null>(null)
  const hasViewportInitialized = ref(false)
  const zoom = ref(1)
  const camera = reactive({
    x: DEFAULT_CAMERA_X - 10,
    y: DEFAULT_CAMERA_Y - 10,
  })
  const dragState = reactive({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointerId: -1,
    moved: false,
  })

  const sceneBounds = computed(() => {
    if (!tasks.value.length) {
      return {
        width: BASE_SCENE_WIDTH,
        height: BASE_SCENE_HEIGHT,
      }
    }

    const maxX = Math.max(...tasks.value.map((task) => (task.x ?? 0) + 340))
    const maxY = Math.max(...tasks.value.map((task) => (task.y ?? 0) + 360))

    return {
      width: Math.max(BASE_SCENE_WIDTH, maxX + 900),
      height: Math.max(BASE_SCENE_HEIGHT, maxY + 700),
    }
  })

  const sceneStageStyle = computed(() => ({
    width: `${sceneBounds.value.width}px`,
    height: `${sceneBounds.value.height}px`,
    transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${zoom.value})`,
  }))

  const canvasStyle = computed(() => {
    const gridSize = Math.max(MIN_GRID_SIZE, GRID_SIZE * zoom.value)

    return {
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundPosition: `${camera.x}px ${camera.y}px`,
    }
  })

  function initializeView() {
    if (hasViewportInitialized.value) {
      return
    }

    resetView()
    hasViewportInitialized.value = true
  }

  function markViewportDirty() {
    hasViewportInitialized.value = false
  }

  function resetView() {
    zoom.value = 1
    camera.x = DEFAULT_CAMERA_X
    camera.y = DEFAULT_CAMERA_Y
  }

  function stopPan(event?: PointerEvent) {
    if (canvasViewport.value && dragState.pointerId !== -1) {
      canvasViewport.value.releasePointerCapture?.(dragState.pointerId)
    }

    dragState.active = false
    dragState.pointerId = -1

    if (event) {
      event.preventDefault()
    }
  }

  function startPan(event: PointerEvent) {
    if (!canvasViewport.value) return

    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 1) {
      return
    }

    const target = event.target as HTMLElement | null

    if (target?.closest('a, button')) {
      return
    }

    dragState.active = true
    dragState.startX = event.clientX
    dragState.startY = event.clientY
    dragState.originX = camera.x
    dragState.originY = camera.y
    dragState.pointerId = event.pointerId
    dragState.moved = false
    canvasViewport.value.focus?.()
    canvasViewport.value.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  function movePan(event: PointerEvent) {
    if (!dragState.active) return

    const dx = event.clientX - dragState.startX
    const dy = event.clientY - dragState.startY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragState.moved = true
    }

    camera.x = dragState.originX + dx
    camera.y = dragState.originY + dy
    event.preventDefault()
  }

  function zoomAroundViewport(delta: number, origin?: { x: number; y: number }) {
    if (!canvasViewport.value) {
      zoom.value = clampZoom(zoom.value + delta)
      return
    }

    const rect = canvasViewport.value.getBoundingClientRect()
    const anchor = origin ?? { x: rect.width / 2, y: rect.height / 2 }
    const oldZoom = zoom.value
    const nextZoom = clampZoom(oldZoom + delta)

    if (nextZoom === oldZoom) {
      return
    }

    const worldX = (anchor.x - camera.x) / oldZoom
    const worldY = (anchor.y - camera.y) / oldZoom

    zoom.value = nextZoom
    camera.x = anchor.x - worldX * nextZoom
    camera.y = anchor.y - worldY * nextZoom
  }

  function handleZoom(delta: number) {
    zoomAroundViewport(delta)
  }

  function handleCanvasWheel(event: WheelEvent) {
    event.preventDefault()

    if (!canvasViewport.value) {
      return
    }

    if (!(event.ctrlKey || event.metaKey)) {
      camera.x -= event.deltaX
      camera.y -= event.deltaY
      return
    }

    const rect = canvasViewport.value.getBoundingClientRect()
    zoomAroundViewport(event.deltaY < 0 ? 0.08 : -0.08, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  function handleCanvasKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) {
      return
    }

    if ((event.metaKey || event.ctrlKey) && event.key === '0') {
      event.preventDefault()
      resetView()
      return
    }

    if (event.key === '0') {
      event.preventDefault()
      resetView()
      return
    }

    if (event.key === '=' || event.key === '+') {
      event.preventDefault()
      handleZoom(0.1)
      return
    }

    if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      handleZoom(-0.1)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      camera.x += PAN_KEYBOARD_STEP
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      camera.x -= PAN_KEYBOARD_STEP
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      camera.y += PAN_KEYBOARD_STEP
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      camera.y -= PAN_KEYBOARD_STEP
    }
  }

  function canSelectNode() {
    return !dragState.moved
  }

  return {
    canvasViewport,
    canvasStyle,
    canSelectNode,
    dragState,
    handleCanvasKeydown,
    handleCanvasWheel,
    handleZoom,
    initializeView,
    markViewportDirty,
    resetView,
    sceneBounds,
    sceneStageStyle,
    startPan,
    movePan,
    stopPan,
    zoom,
  }
}
