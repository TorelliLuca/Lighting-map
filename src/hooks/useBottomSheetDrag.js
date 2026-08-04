import { useState, useRef, useEffect, useCallback } from "react"

const SHEET_DISMISS_THRESHOLD = 110
const SHEET_EXPAND_THRESHOLD = -55
const SHEET_MAX_DRAG_UP = -100

/**
 * Drag su/giù, expand e dismiss per bottom sheet mobile (stesso UX di InfoWindow sheet).
 * Con `collapsible`, lo swipe-down collassa invece di chiudere.
 */
export function useBottomSheetDrag({ isOpen, onClose, collapsible = false, onCollapse, collapsed = false }) {
  const [sheetOffsetY, setSheetOffsetY] = useState(0)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [isDraggingSheet, setIsDraggingSheet] = useState(false)
  const isDraggingSheetRef = useRef(false)
  const sheetDragStartY = useRef(0)
  const sheetDragStartOffset = useRef(0)
  const sheetOffsetYRef = useRef(0)

  useEffect(() => {
    sheetOffsetYRef.current = sheetOffsetY
  }, [sheetOffsetY])

  useEffect(() => {
    if (!isOpen || collapsed) {
      setSheetOffsetY(0)
      setSheetExpanded(false)
      setIsDraggingSheet(false)
      isDraggingSheetRef.current = false
      sheetOffsetYRef.current = 0
    }
  }, [isOpen, collapsed])

  const handleSheetDragStart = useCallback((event) => {
    isDraggingSheetRef.current = true
    setIsDraggingSheet(true)
    sheetDragStartY.current = event.clientY
    sheetDragStartOffset.current = sheetOffsetYRef.current
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handleSheetDragMove = useCallback((event) => {
    if (!isDraggingSheetRef.current) return
    const delta = event.clientY - sheetDragStartY.current
    const maxUp = sheetExpanded ? -24 : SHEET_MAX_DRAG_UP
    const nextOffset = Math.max(maxUp, sheetDragStartOffset.current + delta)
    sheetOffsetYRef.current = nextOffset
    setSheetOffsetY(nextOffset)
  }, [sheetExpanded])

  const handleSheetDragEnd = useCallback(() => {
    if (!isDraggingSheetRef.current) return
    isDraggingSheetRef.current = false
    setIsDraggingSheet(false)

    const offset = sheetOffsetYRef.current

    if (offset > SHEET_DISMISS_THRESHOLD) {
      if (collapsible) {
        setSheetOffsetY(0)
        sheetOffsetYRef.current = 0
        setSheetExpanded(false)
        onCollapse?.()
        return
      }
      setSheetOffsetY(window.innerHeight)
      sheetOffsetYRef.current = window.innerHeight
      window.setTimeout(() => onClose?.(), 220)
      return
    }

    if (offset < SHEET_EXPAND_THRESHOLD) {
      setSheetExpanded(true)
      setSheetOffsetY(0)
      sheetOffsetYRef.current = 0
      return
    }

    setSheetExpanded(false)
    setSheetOffsetY(0)
    sheetOffsetYRef.current = 0
  }, [onClose, collapsible, onCollapse])

  return {
    sheetOffsetY,
    sheetExpanded,
    isDraggingSheet,
    handleSheetDragStart,
    handleSheetDragMove,
    handleSheetDragEnd,
  }
}
