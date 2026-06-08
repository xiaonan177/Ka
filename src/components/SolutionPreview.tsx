'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PalletPlan, PalletizeInput, TruckLoadResult, mmToDm, calculateTruckLoad } from '@/lib/palletize';
import { useZoomPan } from '@/hooks/useZoomPan';

interface SolutionPreviewProps {
  plan: PalletPlan | null;
  input: PalletizeInput;
  layers: number;
  flipLength: boolean;
  flipWidth: boolean;
  onDownloadReport: () => void;
}

export function SolutionPreview({ plan, input, layers, flipLength, flipWidth, onDownloadReport }: SolutionPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'pallet' | 'truck'>('pallet');
  const { zoom, panX, panY, zoomIn, zoomOut, resetView, bindCanvas, unbindCanvas } = useZoomPan(1);

  const truckLoad: TruckLoadResult | null = plan && input.truck
    ? calculateTruckLoad(input.truck, input.pallet.length, input.pallet.width, plan.totalHeight, plan.boxesPerLayer * layers, input.boxWeight)
    : null;

  const drawPalletView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plan) return;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx = ctxRaw;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, displayW, displayH);

    // 应用缩放和平移
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 等轴测参数
    const palletL = mmToDm(input.pallet.length);
    const palletW = mmToDm(input.pallet.width);
    const palletH = mmToDm(input.pallet.height);
    const boxH = mmToDm(plan.boxStackHeight);
    const totalLayers = layers;

    const isoAngle = Math.PI / 6;
    const cos30 = Math.cos(isoAngle);
    const sin30 = Math.sin(isoAngle);

    function toIso(x: number, y: number, z: number): [number, number] {
      const ix = (x - y) * cos30;
      const iy = (x + y) * sin30 - z;
      return [ix, iy];
    }

    // 计算缩放
    const maxExt = Math.max(palletL, palletW, palletH + totalLayers * boxH);
    const scale = Math.min(displayW * 0.35, displayH * 0.35) / maxExt;
    const cx = displayW * 0.45 / zoom;
    const cy = displayH * 0.7 / zoom;

    function drawIso(x: number, y: number, z: number, w: number, d: number, h: number, fillColor: string, strokeColor: string) {
      const [x1, y1] = toIso(x, y, z);
      const [x2, y2] = toIso(x + w, y, z);
      const [x3, y3] = toIso(x + w, y + d, z);
      const [x4, y4] = toIso(x, y + d, z);
      const [x5, y5] = toIso(x, y, z + h);
      const [x6, y6] = toIso(x + w, y, z + h);
      const [x7, y7] = toIso(x + w, y + d, z + h);
      const [x8, y8] = toIso(x, y + d, z + h);

      const tx = (v: number) => cx + v * scale;
      const ty = (v: number) => cy + v * scale;

      // 右侧面
      ctx.beginPath();
      ctx.moveTo(tx(x2), ty(y2)); ctx.lineTo(tx(x3), ty(y3));
      ctx.lineTo(tx(x7), ty(y7)); ctx.lineTo(tx(x6), ty(y6));
      ctx.closePath();
      ctx.fillStyle = adjustBrightness(fillColor, -25);
      ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5 / zoom; ctx.stroke();

      // 正面
      ctx.beginPath();
      ctx.moveTo(tx(x4), ty(y4)); ctx.lineTo(tx(x3), ty(y3));
      ctx.lineTo(tx(x7), ty(y7)); ctx.lineTo(tx(x8), ty(y8));
      ctx.closePath();
      ctx.fillStyle = adjustBrightness(fillColor, -10);
      ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5 / zoom; ctx.stroke();

      // 顶面
      ctx.beginPath();
      ctx.moveTo(tx(x5), ty(y5)); ctx.lineTo(tx(x6), ty(y6));
      ctx.lineTo(tx(x7), ty(y7)); ctx.lineTo(tx(x8), ty(y8));
      ctx.closePath();
      ctx.fillStyle = adjustBrightness(fillColor, 15);
      ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5 / zoom; ctx.stroke();
    }

    // 绘制托盘
    drawIso(0, 0, 0, palletL, palletW, palletH, '#6B7280', '#4B5563');

    // 绘制每层箱体
    let currentY = 0;
    plan.sections.forEach((section, si) => {
      const bL = mmToDm(section.boxAlongLength);
      const bW = mmToDm(section.boxAlongWidth);
      for (let layer = 0; layer < totalLayers; layer++) {
        const z = palletH + layer * boxH;
        const layerShift = adjustColor(input.boxColor || '#C4A882', layer * 8 + si * 12);

        for (let row = 0; row < section.countAlongWidth; row++) {
          for (let col = 0; col < section.countAlongLength; col++) {
            let bx = col * bL;
            let by = currentY + row * bW;
            if (flipWidth) bx = palletL - (col + 1) * bL;
            if (flipLength) by = palletW - (currentY + (row + 1) * bW);
            drawIso(bx, by, z, bL - 0.02, bW - 0.02, boxH - 0.02, layerShift, '#8B7355');
          }
        }
      }
      currentY += section.countAlongWidth * bW;
    });

    // 高度标注
    const totalH = palletH + totalLayers * boxH;
    const [lx, ly] = toIso(palletL + 1, 0, 0);
    const [tx2, ty2] = toIso(palletL + 1, 0, totalH);

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx + lx * scale, cy + ly * scale);
    ctx.lineTo(cx + tx2 * scale, cy + ty2 * scale);
    ctx.stroke();

    // 总高度文字
    const totalHmm = input.pallet.height + totalLayers * plan.boxStackHeight;
    ctx.fillStyle = '#DC2626';
    ctx.font = `bold ${14 / zoom}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${totalHmm.toLocaleString()} mm`, cx + tx2 * scale + 8 / zoom, cy + (ly + ty2) * scale / 2);

    ctx.restore(); // 恢复缩放平移

  }, [plan, input, layers, flipLength, flipWidth, zoom, panX, panY]);

  const drawTruckView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !truckLoad || !input.truck || !plan) return;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx = ctxRaw;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(0, 0, displayW, displayH);

    // 应用缩放和平移
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const truckL = mmToDm(input.truck.length);
    const truckW = mmToDm(input.truck.width);
    const truckH = mmToDm(input.truck.height);
    const palletL = mmToDm(input.pallet.length);
    const palletW = mmToDm(input.pallet.width);
    const palletH_d = mmToDm(plan.totalHeight);

    const isoAngle = Math.PI / 6;
    const cos30 = Math.cos(isoAngle);
    const sin30 = Math.sin(isoAngle);

    function toIso(x: number, y: number, z: number): [number, number] {
      return [(x - y) * cos30, (x + y) * sin30 - z];
    }

    // 计算等轴测后的完整包围盒，自适应缩放
    const [minIsoX, maxIsoX] = [toIso(0, truckW, 0)[0], toIso(truckL, 0, 0)[0]];
    const [minIsoY, maxIsoY] = [toIso(truckL, 0, truckH)[1], toIso(0, truckW, 0)[1]];
    const isoW = maxIsoX - minIsoX;
    const isoH = maxIsoY - minIsoY;

    const padding = 30;
    const sc = Math.min((displayW / zoom - padding * 2) / isoW, (displayH / zoom - padding * 2 - 20) / isoH);
    const cx = displayW / zoom / 2 - (minIsoX + isoW / 2) * sc;
    const cy = displayH / zoom / 2 + 10 - (minIsoY + isoH / 2) * sc;

    const tx = (v: number) => cx + v * sc;
    const ty = (v: number) => cy + v * sc;

    // 卡车外框
    const [a1, b1] = toIso(0, 0, 0);
    const [a2, b2] = toIso(truckL, 0, 0);
    const [a3, b3] = toIso(truckL, truckW, 0);
    const [a4, b4] = toIso(0, truckW, 0);
    const [a5, b5] = toIso(0, 0, truckH);

    // 地面
    ctx.beginPath();
    ctx.moveTo(tx(a1), ty(b1)); ctx.lineTo(tx(a2), ty(b2));
    ctx.lineTo(tx(a3), ty(b3)); ctx.lineTo(tx(a4), ty(b4));
    ctx.closePath();
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1.5 / zoom; ctx.stroke();

    // 侧面线
    ctx.beginPath();
    ctx.moveTo(tx(a1), ty(b1)); ctx.lineTo(tx(a5), ty(b5));
    ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1 / zoom; ctx.stroke();

    const [a6, b6] = toIso(truckL, 0, truckH);
    ctx.beginPath();
    ctx.moveTo(tx(a2), ty(b2));
    ctx.lineTo(tx(a6), ty(b6));
    ctx.stroke();

    const [a7, b7] = toIso(0, truckW, truckH);
    ctx.beginPath();
    ctx.moveTo(tx(a4), ty(b4));
    ctx.lineTo(tx(a7), ty(b7));
    ctx.stroke();

    // 托盘
    for (let row = 0; row < truckLoad.rows; row++) {
      for (let col = 0; col < truckLoad.palletsPerRow; col++) {
        const px = row * palletL + 0.1;
        const py = col * palletW + 0.1;
        const [p1x, p1y] = toIso(px, py, 0);
        const [p2x, p2y] = toIso(px + palletL - 0.2, py, 0);
        const [p3x, p3y] = toIso(px + palletL - 0.2, py + palletW - 0.2, 0);
        const [p4x, p4y] = toIso(px, py + palletW - 0.2, 0);

        ctx.beginPath();
        ctx.moveTo(tx(p1x), ty(p1y)); ctx.lineTo(tx(p2x), ty(p2y));
        ctx.lineTo(tx(p3x), ty(p3y)); ctx.lineTo(tx(p4x), ty(p4y));
        ctx.closePath();
        ctx.fillStyle = input.boxColor || '#C4A882';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#8B7355'; ctx.lineWidth = 0.5 / zoom; ctx.stroke();

        // 托盘顶部线
        const [t1x, t1y] = toIso(px, py, palletH_d);
        const [t2x, t2y] = toIso(px + palletL - 0.2, py, palletH_d);
        const [t3x, t3y] = toIso(px + palletL - 0.2, py + palletW - 0.2, palletH_d);
        const [t4x, t4y] = toIso(px, py + palletW - 0.2, palletH_d);
        ctx.beginPath();
        ctx.moveTo(tx(t1x), ty(t1y)); ctx.lineTo(tx(t2x), ty(t2y));
        ctx.lineTo(tx(t3x), ty(t3y)); ctx.lineTo(tx(t4x), ty(t4y));
        ctx.closePath();
        ctx.fillStyle = adjustBrightness(input.boxColor || '#C4A882', 10);
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#8B7355'; ctx.lineWidth = 0.3 / zoom; ctx.stroke();
      }
    }

    // 卡车名称
    ctx.fillStyle = '#1E293B';
    ctx.font = `bold ${12 / zoom}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(input.truck.name, displayW / zoom / 2, 16 / zoom);

    ctx.restore(); // 恢复缩放平移

  }, [truckLoad, input, plan, zoom, panX, panY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    bindCanvas(canvas);
    return () => unbindCanvas(canvas);
  }, [bindCanvas, unbindCanvas]);

  useEffect(() => {
    if (viewMode === 'pallet') drawPalletView();
    else drawTruckView();
  }, [viewMode, drawPalletView, drawTruckView]);

  if (!plan) {
    return (
      <div className="w-[380px] flex-shrink-0 bg-white border-l border-slate-200 flex items-center justify-center">
        <div className="text-center text-slate-400 p-6">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm font-medium">点击「开始计算」生成方案</p>
        </div>
      </div>
    );
  }

  const totalH = input.pallet.height + layers * plan.boxStackHeight;
  const totalBoxes = plan.boxesPerLayer * layers;
  const heightOk = totalH <= input.maxHeight;

  return (
    <div className="w-[380px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
      {/* 指标卡片 */}
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
            <div className="text-[10px] text-slate-500">每托箱数</div>
            <div className="text-lg font-bold text-blue-600">{totalBoxes}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
            <div className="text-[10px] text-slate-500">总高度</div>
            <div className={`text-lg font-bold ${heightOk ? 'text-emerald-600' : 'text-amber-600'}`}>{totalH.toLocaleString()} mm</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
            <div className="text-[10px] text-slate-500">每层箱数</div>
            <div className="text-lg font-bold text-slate-700">{plan.boxesPerLayer}</div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm border border-slate-100">
            <div className="text-[10px] text-slate-500">空间利用率</div>
            <div className="text-lg font-bold text-slate-700">{plan.utilization}%</div>
          </div>
        </div>
      </div>

      {/* 视图切换 + 缩放控制 */}
      <div className="flex border-b border-slate-200 items-center">
        <button
          onClick={() => setViewMode('pallet')}
          className={`flex-1 py-2 text-xs font-medium ${viewMode === 'pallet' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          📦 托盘预览
        </button>
        {input.truck && (
          <button
            onClick={() => setViewMode('truck')}
            className={`flex-1 py-2 text-xs font-medium ${viewMode === 'truck' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            🚛 车辆视图
          </button>
        )}
        <div className="flex items-center gap-1 px-2 border-l border-slate-200">
          <button onClick={zoomOut} className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs leading-none">−</button>
          <span className="text-[9px] text-slate-400 w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs leading-none">+</button>
          <button onClick={resetView} className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-500 text-[9px]">⟲</button>
        </div>
      </div>

      {/* Canvas预览 */}
      <div className="flex-1 p-2 relative">
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" style={{ minHeight: 350 }} />
        <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 pointer-events-none">滚轮缩放 · 拖拽平移</div>
      </div>

      {/* 车辆装载信息 */}
      {truckLoad && viewMode === 'truck' && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1">
          <h3 className="text-xs font-bold text-slate-700">车辆装载</h3>
          <div className="grid grid-cols-2 gap-x-3 text-xs text-slate-600">
            <span>托盘数: <strong>{truckLoad.totalPallets}</strong></span>
            <span>总箱数: <strong>{truckLoad.totalBoxes.toLocaleString()}</strong></span>
            <span>重量: <strong>{truckLoad.totalWeight.toLocaleString()} kg</strong></span>
            <span>体积率: <strong>{(truckLoad.volumeUtilization * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
      )}

      {/* 合规检查 */}
      <div className="p-3 border-t border-slate-200 space-y-1.5">
        {/* 高度检查 */}
        <div className="flex items-center gap-2 text-xs">
          {heightOk ? (
            <><span className="text-emerald-500">✓</span><span className="text-emerald-700">高度 {totalH.toLocaleString()}mm ≤ {input.maxHeight.toLocaleString()}mm 限制</span></>
          ) : (
            <><span className="text-amber-500">⚠</span><span className="text-amber-700">高度 {totalH.toLocaleString()}mm &gt; {input.maxHeight.toLocaleString()}mm 限制</span></>
          )}
        </div>
        {/* 长度对比 */}
        {(() => {
          const diffL = input.pallet.length - plan.coverageLength;
          return (
            <div className="flex items-center gap-2 text-xs">
              {diffL >= 0 ? (
                <><span className="text-emerald-500">✓</span><span className="text-emerald-700">长度: 产品占 {plan.coverageLength}mm，托盘 {input.pallet.length}mm，剩余 {diffL}mm</span></>
              ) : (
                <><span className="text-amber-500">⚠</span><span className="text-amber-700">长度: 产品占 {plan.coverageLength}mm，超出托盘 {Math.abs(diffL)}mm</span></>
              )}
            </div>
          );
        })()}
        {/* 宽度对比 */}
        {(() => {
          const diffW = input.pallet.width - plan.coverageWidth;
          return (
            <div className="flex items-center gap-2 text-xs">
              {diffW >= 0 ? (
                <><span className="text-emerald-500">✓</span><span className="text-emerald-700">宽度: 产品占 {plan.coverageWidth}mm，托盘 {input.pallet.width}mm，剩余 {diffW}mm</span></>
              ) : (
                <><span className="text-amber-500">⚠</span><span className="text-amber-700">宽度: 产品占 {plan.coverageWidth}mm，超出托盘 {Math.abs(diffW)}mm</span></>
              )}
            </div>
          );
        })()}
      </div>

      {/* 下载按钮 */}
      <div className="p-3 border-t border-slate-200">
        <button onClick={onDownloadReport} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors">
          📥 下载报告图片
        </button>
      </div>
    </div>
  );
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `rgb(${r},${g},${b})`;
}

function adjustColor(hex: string, shift: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + shift));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + shift * 0.5));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + shift * 0.3));
  return `rgb(${r},${g},${b})`;
}
