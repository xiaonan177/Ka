'use client';

import { useEffect, useRef, useCallback } from 'react';
import { PalletPlan, PalletizeInput, LayerSection, mmToDm } from '@/lib/palletize';
import { useZoomPan } from '@/hooks/useZoomPan';

interface LayerEditorProps {
  plan: PalletPlan | null;
  input: PalletizeInput;
  layers: number;
  flipLength: boolean;
  flipWidth: boolean;
  onLayersChange: (n: number) => void;
  onFlipLengthChange: (b: boolean) => void;
  onFlipWidthChange: (b: boolean) => void;
}

export function LayerEditor({
  plan, input, layers, flipLength, flipWidth,
  onLayersChange, onFlipLengthChange, onFlipWidthChange,
}: LayerEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { zoom, panX, panY, zoomIn, zoomOut, resetView, bindCanvas, unbindCanvas } = useZoomPan(1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plan) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displayW, displayH);

    // 应用缩放和平移
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const palletL = mmToDm(input.pallet.length);
    const palletW = mmToDm(input.pallet.width);
    const margin = 40;
    const maxDrawW = displayW - margin * 2;
    const maxDrawH = displayH - margin * 2 - 20;
    const scale = Math.min(maxDrawW / palletL, maxDrawH / palletW);
    const ox = margin + (maxDrawW - palletL * scale) / 2;
    const oy = margin + 20 + (maxDrawH - palletW * scale) / 2;

    // 标题
    ctx.fillStyle = '#1E293B';
    ctx.font = `bold ${13 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('编辑层 — 俯视图', displayW / 2 / 1, 16 / zoom);

    // 托盘
    ctx.fillStyle = '#E8E8E8';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2 / zoom;
    ctx.fillRect(ox, oy, palletL * scale, palletW * scale);
    ctx.strokeRect(ox, oy, palletL * scale, palletW * scale);

    // 托盘网格
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 0.5 / zoom;
    for (let i = 1; i < palletL; i++) {
      const x = ox + i * scale;
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + palletW * scale); ctx.stroke();
    }
    for (let j = 1; j < palletW; j++) {
      const y = oy + j * scale;
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + palletL * scale, y); ctx.stroke();
    }

    // 绘制各段箱体
    let currentY = 0;
    plan.sections.forEach((section: LayerSection, si: number) => {
      const bL = mmToDm(section.boxAlongLength);
      const bW = mmToDm(section.boxAlongWidth);

      for (let row = 0; row < section.countAlongWidth; row++) {
        for (let col = 0; col < section.countAlongLength; col++) {
          const bx = ox + col * bL * scale;
          const by = oy + (currentY + row * bW) * scale;
          const bw = bL * scale - 1;
          const bh = bW * scale - 1;

          // 层翻转
          let drawX = bx, drawY = by;
          if (flipWidth) drawX = ox + palletL * scale - (col + 1) * bL * scale;
          if (flipLength) drawY = oy + palletW * scale - (currentY + (row + 1) * bW) * scale;

          // 颜色
          const baseColor = input.boxColor || '#C4A882';
          const hueShift = si * 15 + (flipLength !== flipWidth ? 10 : 0);
          ctx.fillStyle = adjustColor(baseColor, hueShift);
          ctx.fillRect(drawX, drawY, bw, bh);

          // 边框
          ctx.strokeStyle = '#8B7355';
          ctx.lineWidth = 0.8 / zoom;
          ctx.strokeRect(drawX, drawY, bw, bh);

          // 产品名 (如果空间足够)
          if (bw > 30 && bh > 15) {
            ctx.fillStyle = '#3E2723';
            ctx.font = `${Math.min(9, bh * 0.35)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const name = input.productName || '';
            ctx.fillText(name.slice(0, Math.floor(bw / 8)), drawX + bw / 2, drawY + bh / 2, bw - 4);
          }
        }
      }
      currentY += section.countAlongWidth * bW;
    });

    // 尺寸标注 — 托盘长度 + 产品占用长度
    const coverageL = plan.coverageLength;
    const remainL = input.pallet.length - coverageL;

    // 托盘长度标注
    ctx.fillStyle = '#1E293B';
    ctx.font = `${11 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${input.pallet.length} mm`, ox + palletL * scale / 2, oy + palletW * scale + 6);

    // 产品占用长度标注（托盘下方第二条线）
    const coverageLDraw = (coverageL / input.pallet.length) * palletL * scale;
    const annoY2 = oy + palletW * scale + 22;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(ox, annoY2);
    ctx.lineTo(ox + coverageLDraw, annoY2);
    ctx.stroke();
    // 箭头
    ctx.beginPath(); ctx.moveTo(ox, annoY2); ctx.lineTo(ox + 4, annoY2 - 2.5); ctx.lineTo(ox + 4, annoY2 + 2.5); ctx.closePath(); ctx.fillStyle = '#3B82F6'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(ox + coverageLDraw, annoY2); ctx.lineTo(ox + coverageLDraw - 4, annoY2 - 2.5); ctx.lineTo(ox + coverageLDraw - 4, annoY2 + 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3B82F6';
    ctx.font = `${10 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`产品 ${coverageL}mm${remainL >= 0 ? ` 余${remainL}mm` : ` 超${Math.abs(remainL)}mm`}`, ox + coverageLDraw / 2, annoY2 + 4);

    // 托盘宽度标注
    ctx.fillStyle = '#1E293B';
    ctx.font = `${11 / zoom}px sans-serif`;
    ctx.save();
    ctx.translate(ox - 6, oy + palletW * scale / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText(`${input.pallet.width} mm`, 0, 0);
    ctx.restore();

    // 产品占用宽度标注（左侧第二条线）
    const coverageW = plan.coverageWidth;
    const remainW = input.pallet.width - coverageW;
    const coverageWDraw = (coverageW / input.pallet.width) * palletW * scale;
    const annoX2 = ox - 22;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(annoX2, oy);
    ctx.lineTo(annoX2, oy + coverageWDraw);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(annoX2, oy); ctx.lineTo(annoX2 - 2.5, oy + 4); ctx.lineTo(annoX2 + 2.5, oy + 4); ctx.closePath(); ctx.fillStyle = '#3B82F6'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(annoX2, oy + coverageWDraw); ctx.lineTo(annoX2 - 2.5, oy + coverageWDraw - 4); ctx.lineTo(annoX2 + 2.5, oy + coverageWDraw - 4); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(annoX2 - 4, oy + coverageWDraw / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#3B82F6';
    ctx.font = `${10 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`产品 ${coverageW}mm${remainW >= 0 ? ` 余${remainW}mm` : ` 超${Math.abs(remainW)}mm`}`, 0, 0);
    ctx.restore();

    ctx.restore(); // 恢复缩放平移变换

  }, [plan, input, flipLength, flipWidth, zoom, panX, panY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    bindCanvas(canvas);
    return () => unbindCanvas(canvas);
  }, [bindCanvas, unbindCanvas]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* 排列策略选择 + 缩放控制 */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">📐 排列方式:</span>
          <span className="text-slate-600">
            {plan ? `${plan.countAlongLength} × ${plan.countAlongWidth} = ${plan.boxesPerLayer} 箱/层` : '—'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">{plan?.orientation || '—'}</span>
          <span className="flex-1" />
          {/* 缩放控制 */}
          <button onClick={zoomOut} className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm leading-none">−</button>
          <span className="text-[10px] text-slate-500 w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm leading-none">+</button>
          <button onClick={resetView} className="px-1.5 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px]">重置</button>
        </div>
      </div>

      {/* 俯视图 Canvas */}
      <div className="flex-1 p-2 relative">
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ minHeight: 300 }} />
        <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 pointer-events-none">滚轮缩放 · 拖拽平移</div>
      </div>

      {/* 工具栏 */}
      <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 space-y-2">
        {/* 层翻转 */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">📚 层叠方式</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={flipLength} onChange={e => onFlipLengthChange(e.target.checked)} className="accent-blue-500" />
            <span>↔ 长度翻转</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={flipWidth} onChange={e => onFlipWidthChange(e.target.checked)} className="accent-blue-500" />
            <span>↕ 宽度翻转</span>
          </label>
        </div>

        {/* 层数控制 */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">层数:</span>
          <input
            type="range" min={1} max={20} value={layers}
            onChange={e => onLayersChange(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="w-6 text-center font-mono">{layers}</span>
        </div>
      </div>
    </div>
  );
}

function adjustColor(hex: string, shift: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + shift));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + shift * 0.5));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + shift * 0.3));
  return `rgb(${r},${g},${b})`;
}
