'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PalletPlan, PalletizeInput, TruckLoadResult, mmToDm, calculateTruckLoad } from '@/lib/palletize';

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
    const cx = displayW * 0.45;
    const cy = displayH * 0.7;

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
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5; ctx.stroke();

      // 正面
      ctx.beginPath();
      ctx.moveTo(tx(x4), ty(y4)); ctx.lineTo(tx(x3), ty(y3));
      ctx.lineTo(tx(x7), ty(y7)); ctx.lineTo(tx(x8), ty(y8));
      ctx.closePath();
      ctx.fillStyle = adjustBrightness(fillColor, -10);
      ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5; ctx.stroke();

      // 顶面
      ctx.beginPath();
      ctx.moveTo(tx(x5), ty(y5)); ctx.lineTo(tx(x6), ty(y6));
      ctx.lineTo(tx(x7), ty(y7)); ctx.lineTo(tx(x8), ty(y8));
      ctx.closePath();
      ctx.fillStyle = adjustBrightness(fillColor, 15);
      ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5; ctx.stroke();
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
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx + lx * scale, cy + ly * scale);
    ctx.lineTo(cx + tx2 * scale, cy + ty2 * scale);
    ctx.stroke();

    // 总高度文字
    const totalHmm = input.pallet.height + totalLayers * plan.boxStackHeight;
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${totalHmm.toLocaleString()} mm`, cx + tx2 * scale + 8, cy + (ly + ty2) * scale / 2);

  }, [plan, input, layers, flipLength, flipWidth]);

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

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displayW, displayH);

    const truckL = mmToDm(input.truck.length);
    const truckW = mmToDm(input.truck.width);
    const truckH = mmToDm(input.truck.height);
    const palletL = mmToDm(input.pallet.length);
    const palletW = mmToDm(input.pallet.width);
    const palletH = mmToDm(input.pallet.height);
    const boxH = mmToDm(plan.boxStackHeight);
    const totalLayers = layers;
    const palletTotalH = palletH + totalLayers * boxH;

    const isoAngle = Math.PI / 6;
    const cosA = Math.cos(isoAngle);
    const sinA = Math.sin(isoAngle);

    function toIso(x: number, y: number, z: number): [number, number] {
      return [(x - y) * cosA, (x + y) * sinA - z];
    }

    const maxExt = Math.max(truckL, truckW, truckH);
    const sc = Math.min(displayW * 0.28, displayH * 0.28) / maxExt;
    const cx = displayW * 0.42;
    const cy = displayH * 0.82;

    const px = (v: number) => cx + v * sc;
    const py = (v: number) => cy + v * sc;

    // ===== 绘制等轴测长方体面 =====
    function drawIsoFace(points: [number, number][], fill: string, stroke: string, lineWidth: number = 0.8) {
      ctx.beginPath();
      ctx.moveTo(px(points[0][0]), py(points[0][1]));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(px(points[i][0]), py(points[i][1]));
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // ===== 绘制等轴测箱体（顶面+正面+右面） =====
    function drawIsoBox(bx: number, by: number, bz: number, bw: number, bd: number, bh: number, topColor: string, frontColor: string, sideColor: string, strokeColor: string) {
      // 顶面
      drawIsoFace([
        toIso(bx, by, bz + bh),
        toIso(bx + bw, by, bz + bh),
        toIso(bx + bw, by + bd, bz + bh),
        toIso(bx, by + bd, bz + bh),
      ], topColor, strokeColor, 0.5);

      // 正面 (y=by)
      drawIsoFace([
        toIso(bx, by, bz),
        toIso(bx + bw, by, bz),
        toIso(bx + bw, by, bz + bh),
        toIso(bx, by, bz + bh),
      ], frontColor, strokeColor, 0.5);

      // 右侧面 (x=bx+bw)
      drawIsoFace([
        toIso(bx + bw, by, bz),
        toIso(bx + bw, by + bd, bz),
        toIso(bx + bw, by + bd, bz + bh),
        toIso(bx + bw, by, bz + bh),
      ], sideColor, strokeColor, 0.5);
    }

    // ===== 1. 车厢底面（浅冷灰+网格） =====
    const floorColor = '#E2E8F0';
    const floorStroke = '#94A3B8';
    drawIsoFace([
      toIso(0, 0, 0), toIso(truckL, 0, 0),
      toIso(truckL, truckW, 0), toIso(0, truckW, 0),
    ], floorColor, floorStroke, 1.5);

    // 底面网格
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.3;
    const gridStepL = truckL / 20;
    for (let i = gridStepL; i < truckL; i += gridStepL) {
      const [x1, y1] = toIso(i, 0, 0);
      const [x2, y2] = toIso(i, truckW, 0);
      ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
    }
    const gridStepW = truckW / 10;
    for (let j = gridStepW; j < truckW; j += gridStepW) {
      const [x1, y1] = toIso(0, j, 0);
      const [x2, y2] = toIso(truckL, j, 0);
      ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
    }

    // ===== 2. 车厢边框线（深灰开放式框架） =====
    const frameColor = '#475569';
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 1.5;
    // 后面两条竖线
    let [lx1, ly1] = toIso(0, 0, 0); let [lx2, ly2] = toIso(0, 0, truckH);
    ctx.beginPath(); ctx.moveTo(px(lx1), py(ly1)); ctx.lineTo(px(lx2), py(ly2)); ctx.stroke();
    [lx1, ly1] = toIso(0, truckW, 0); [lx2, ly2] = toIso(0, truckW, truckH);
    ctx.beginPath(); ctx.moveTo(px(lx1), py(ly1)); ctx.lineTo(px(lx2), py(ly2)); ctx.stroke();
    // 前面两条竖线
    [lx1, ly1] = toIso(truckL, 0, 0); [lx2, ly2] = toIso(truckL, 0, truckH);
    ctx.beginPath(); ctx.moveTo(px(lx1), py(ly1)); ctx.lineTo(px(lx2), py(ly2)); ctx.stroke();
    [lx1, ly1] = toIso(truckL, truckW, 0); [lx2, ly2] = toIso(truckL, truckW, truckH);
    ctx.beginPath(); ctx.moveTo(px(lx1), py(ly1)); ctx.lineTo(px(lx2), py(ly2)); ctx.stroke();
    // 顶面四条边
    ctx.lineWidth = 1;
    const topLines: [number, number, number, number, number, number][] = [
      [0, 0, truckH, truckL, 0, truckH],
      [truckL, 0, truckH, truckL, truckW, truckH],
      [truckL, truckW, truckH, 0, truckW, truckH],
      [0, truckW, truckH, 0, 0, truckH],
    ];
    for (const [ax, ay, az, bx2, by2, bz] of topLines) {
      const [x1, y1] = toIso(ax, ay, az);
      const [x2, y2] = toIso(bx2, by2, bz);
      ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
    }
    // 底面四条边（加强）
    ctx.lineWidth = 1.5;
    const bottomLines: [number, number, number, number, number, number][] = [
      [0, 0, 0, truckL, 0, 0],
      [truckL, 0, 0, truckL, truckW, 0],
      [truckL, truckW, 0, 0, truckW, 0],
      [0, truckW, 0, 0, 0, 0],
    ];
    for (const [ax, ay, az, bx2, by2, bz] of bottomLines) {
      const [x1, y1] = toIso(ax, ay, az);
      const [x2, y2] = toIso(bx2, by2, bz);
      ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
    }

    // ===== 3. 托盘与货物 =====
    const baseColor = input.boxColor || '#C4A882';
    const palletColor = '#EAB308'; // 亮黄色托盘
    const palletDark = '#CA8A04';
    const palletSide = '#A16207';
    const boxStroke = '#8B7355';

    for (let row = 0; row < truckLoad.rows; row++) {
      for (let col = 0; col < truckLoad.palletsPerRow; col++) {
        const palX = row * palletL + 0.05;
        const palY = col * palletW + 0.05;
        const palDrawL = palletL - 0.1;
        const palDrawW = palletW - 0.1;

        // ---- 托盘底座 ----
        drawIsoBox(palX, palY, 0, palDrawL, palDrawW, palletH,
          palletColor, palletDark, palletSide, '#78350F');

        // ---- 托盘顶部网格纹理 ----
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 0.2;
        const gs = palDrawL / 8;
        for (let gi = gs; gi < palDrawL; gi += gs) {
          const [x1, y1] = toIso(palX + gi, palY, palletH);
          const [x2, y2] = toIso(palX + gi, palY + palDrawW, palletH);
          ctx.beginPath(); ctx.moveTo(px(x1), py(y1)); ctx.lineTo(px(x2), py(y2)); ctx.stroke();
        }

        // ---- 每层箱体 ----
        for (let layer = 0; layer < totalLayers; layer++) {
          const layerZ = palletH + layer * boxH;
          const t = layer / Math.max(totalLayers - 1, 1);
          const r = Math.min(255, Math.round(196 + t * 20));
          const g = Math.min(255, Math.round(150 + t * 18));
          const b = Math.min(255, Math.round(98 + t * 22));
          const layerTop = `rgb(${r + 18},${g + 18},${b + 18})`;
          const layerFront = `rgb(${r},${g},${b})`;
          const layerSide = `rgb(${Math.max(0, r - 25)},${Math.max(0, g - 25)},${Math.max(0, b - 20)})`;

          let currentW = 0;
          for (const section of plan.sections) {
            const secW = section.boxAlongWidth / 100;
            const bL = section.boxAlongLength / 100;
            const bW = section.boxAlongWidth / 100;

            for (let sRow = 0; sRow < section.countAlongWidth; sRow++) {
              for (let sCol = 0; sCol < section.countAlongLength; sCol++) {
                let bx = palX + sCol * bL + 0.02;
                let by = palY + currentW + sRow * bW + 0.02;
                if (flipWidth) bx = palX + palDrawL - (sCol + 1) * bL + 0.02;
                if (flipLength) by = palY + palDrawW - (currentW + (sRow + 1) * bW) + 0.02;

                drawIsoBox(bx, by, layerZ, bL - 0.04, bW - 0.04, boxH - 0.04,
                  layerTop, layerFront, layerSide, boxStroke);
              }
            }
            currentW += section.countAlongWidth * bW;
          }
        }
      }
    }

    // ===== 4. 车辆名称 =====
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(input.truck.name, displayW / 2, 16);

  }, [truckLoad, input, plan, layers, flipLength, flipWidth]);

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

      {/* 视图切换 */}
      <div className="flex border-b border-slate-200">
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
      </div>

      {/* Canvas预览 */}
      <div className="flex-1 p-2">
        <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 350 }} />
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
