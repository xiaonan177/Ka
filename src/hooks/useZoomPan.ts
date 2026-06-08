'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface ZoomPanState {
  zoom: number;
  panX: number;
  panY: number;
}

export function useZoomPan(initialZoom = 1) {
  const [zoom, setZoom] = useState(initialZoom);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom(z => Math.min(z * 1.25, 8));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => Math.max(z / 1.25, 0.25));
  }, []);

  const resetView = useCallback(() => {
    setZoom(initialZoom);
    setPanX(0);
    setPanY(0);
  }, [initialZoom]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.25), 8));
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPanX(p => p + dx);
    setPanY(p => p + dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const bindCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  const unbindCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    canvas.removeEventListener('wheel', handleWheel);
    canvas.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    zoom, panX, panY,
    zoomIn, zoomOut, resetView,
    bindCanvas, unbindCanvas,
  };
}
