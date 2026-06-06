'use client';

import { useEffect, useRef, useCallback } from 'react';
import { PalletPlan, PalletizeInput, LayerSection, mmToDm } from '@/lib/palletize';

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
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Edit Layer — Top View', displayW / 2, 16);

    // 托盘
    ctx.fillStyle = '#E8E8E8';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.fillRect(ox, oy, palletL * scale, palletW * scale);
    ctx.strokeRect(ox, oy, palletL * scale, palletW * scale);

    // 托盘网格
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 0.5;
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
          ctx.lineWidth = 0.8;
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

    // 尺寸标注
    ctx.fillStyle = '#3B82F6';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${input.pallet.length} mm`, ox + palletL * scale / 2, oy + palletW * scale + 6);

    ctx.save();
    ctx.translate(ox - 6, oy + palletW * scale / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText(`${input.pallet.width} mm`, 0, 0);
    ctx.restore();

  }, [plan, input, flipLength, flipWidth]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* 排列策略选择 */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">📐 Pattern:</span>
          <span className="text-slate-600">
            {plan ? `${plan.countAlongLength} × ${plan.countAlongWidth} = ${plan.boxesPerLayer} boxes/layer` : '—'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">{plan?.orientation || '—'}</span>
        </div>
      </div>

      {/* 俯视图 Canvas */}
      <div className="flex-1 p-2">
        <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
      </div>

      {/* 工具栏 */}
      <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 space-y-2">
        {/* 层翻转 */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">📚 Layer Stacking</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={flipLength} onChange={e => onFlipLengthChange(e.target.checked)} className="accent-blue-500" />
            <span>↔ Flip Length</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={flipWidth} onChange={e => onFlipWidthChange(e.target.checked)} className="accent-blue-500" />
            <span>↕ Flip Width</span>
          </label>
        </div>

        {/* 层数控制 */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-700">Layers:</span>
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
