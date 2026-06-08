'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { PalletPlan, PalletizeInput, TruckLoadResult, PalletDimensions, BoxDimensions } from '@/lib/palletize';

// ===== 颜色常量 =====
const C = {
  white: '#FFFFFF',
  black: '#333333',
  brown: '#5C3924',
  brownDark: '#3D2516',
  boxColor: '#D4A77A',
  boxLight: '#E2BE96',
  boxDark: '#B8895E',
  boxStroke: '#A07040',
  palletTop: '#2563EB',
  palletFace: '#1D4ED8',
  palletColor: '#1E40AF',
  palletFoot: '#1E3A8A',
  palletEdge: '#93C5FD',
  palletBeam: '#1E40AF',
  blue: '#2385BB',
  blueLine: '#3B82F6',
  red: '#E03C31',
  green: '#39A852',
  cream: '#F9F2E9',
  creamBorder: '#D4A77A',
  grayBg: '#F0F0F0',
  grayLight: '#CCCCCC',
  grayMid: '#999999',
  sectionBg: '#FAFAFA',
};

interface ReportCanvasProps {
  plan: PalletPlan;
  input: PalletizeInput;
  layers: number;
  flipLength: boolean;
  flipWidth: boolean;
  truckLoad?: TruckLoadResult;
}

export default function ReportCanvas({ plan, input, layers, flipLength, flipWidth, truckLoad }: ReportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = 2;
    const W = 1280;
    const H = 900;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // 白色背景
    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, W, H);

    let curY = 15;

    // ========== 1. 标题栏 ==========
    curY = drawTitleBar(ctx, 20, curY, W - 40, input.productName || '产品');

    curY += 12;

    // ========== 2. 参数表格 ==========
    curY = drawParamTable(ctx, 20, curY, plan, input.box);

    curY += 14;

    // ========== 3. 左侧区域 ==========
    const leftW = 620;
    const rightW = W - 40 - leftW - 16;
    const leftX = 20;

    // 单层排列方式标题
    drawSectionTitle(ctx, leftX, curY, leftW, '单层箱体排列方式');
    curY += 44;

    // 俯视图和侧视图
    const viewH = 200;
    const topViewW = leftW * 0.55;
    const sideViewW = leftW * 0.38;
    const plusW = leftW - topViewW - sideViewW;

    drawTopView(ctx, leftX, curY, topViewW, viewH, plan, input.pallet);

    // 加号连接
    ctx.fillStyle = C.brown;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', leftX + topViewW + plusW / 2, curY + viewH / 2 + 10);

    drawSideView(ctx, leftX + topViewW + plusW, curY, sideViewW, viewH, plan, input.pallet);
    curY += viewH + 14;

    // 托盘详情
    drawSectionTitle(ctx, leftX, curY, leftW, '托盘详情');
    curY += 44;
    const palletDetailH = 180;
    drawPalletDetail(ctx, leftX, curY, leftW, palletDetailH, input.pallet);
    curY += palletDetailH + 14;

    // ========== 4. 右侧区域 ==========
    const rightX = leftX + leftW + 16;

    // 成品堆叠效果图标题
    drawSectionTitle(ctx, rightX, 83, rightW, '成品托盘堆叠效果图');

    // 3D堆叠图 + 右侧标注
    const stackedH = 680;
    const annoW = 180;
    const stackedW = rightW - annoW;
    drawStackedView(ctx, rightX, 127, stackedW, stackedH, plan, input.pallet, input.productName || '产品', layers, flipLength, flipWidth);
    drawHeightAnnotation(ctx, rightX + stackedW, 127, annoW, stackedH, plan, input.pallet, input.maxHeight);

    // ========== 5. 底部信息汇总 ==========
    const summaryY = Math.max(curY, 830);
    const summaryH = 72;
    drawSummary(ctx, 20, summaryY, W - 40, summaryH, plan, input.pallet, input.maxHeight);

  }, [plan, input, layers, flipLength, flipWidth, truckLoad]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  );
}

// ===== 绘图辅助函数 =====

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawSectionTitle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string) {
  roundRect(ctx, x, y, w, 32, 5, C.brown);
  ctx.fillStyle = C.white;
  ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 12, y + 23);
}

function drawTitleBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, productName: string): number {
  const h = 42;
  roundRect(ctx, x, y, w, h, 6, C.brown);
  ctx.fillStyle = C.white;
  ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`智能堆码 - 产品: ${productName || '产品'}`, x + w / 2, y + 28);
  return y + h;
}

function drawParamTable(ctx: CanvasRenderingContext2D, x: number, y: number, plan: PalletPlan, box: BoxDimensions): number {
  const cols = [
    { header: '箱体类型', value: '产品箱', w: 100 },
    { header: '箱体尺寸(长×宽×高 毫米)', value: `W${box.width} × L${box.length} × H${box.height}`, w: 300 },
    { header: '堆码方式(长×宽×高)', value: `${plan.countAlongLength} × ${plan.countAlongWidth} × ${plan.layers}`, w: 210 },
    { header: '每层箱数(箱)', value: String(plan.boxesPerLayer), w: 140 },
    { header: '层数(层)', value: String(plan.layers), w: 100 },
    { header: '每托箱数(箱)', value: String(plan.totalBoxes), w: 140 },
  ];

  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const rowH = 34;
  let cx = x;

  // 表头
  ctx.fillStyle = C.grayBg;
  ctx.fillRect(cx, y, tableW, rowH);
  ctx.strokeStyle = C.grayLight;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx, y, tableW, rowH);

  for (const col of cols) {
    ctx.strokeStyle = C.grayLight;
    ctx.strokeRect(cx, y, col.w, rowH);
    ctx.fillStyle = '#555555';
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.header, cx + col.w / 2, y + 22);
    cx += col.w;
  }

  // 数据行
  cx = x;
  ctx.fillStyle = C.white;
  ctx.fillRect(cx, y + rowH, tableW, rowH);
  ctx.strokeStyle = C.grayLight;
  ctx.strokeRect(cx, y + rowH, tableW, rowH);

  for (const col of cols) {
    ctx.strokeStyle = C.grayLight;
    ctx.strokeRect(cx, y + rowH, col.w, rowH);
    ctx.fillStyle = C.black;
    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.value, cx + col.w / 2, y + rowH + 23);
    cx += col.w;
  }

  return y + rowH * 2;
}

/** 绘制俯视图 */
function drawTopView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions) {
  // 标题
  ctx.fillStyle = C.black;
  ctx.font = '13px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`排列方式: ${plan.countAlongLength} × ${plan.countAlongWidth} (俯视图)`, x + w / 2, y + 16);

  const drawY = y + 24;
  const drawH = h - 44;

  const palletL = pallet.length;
  const palletW = pallet.width;
  const padding = 35;
  const scaleX = (w - padding * 2) / palletL;
  const scaleY = (drawH - padding * 2) / palletW;
  const scale = Math.min(scaleX, scaleY);

  const drawPL = palletL * scale;
  const drawPW = palletW * scale;
  const ox = x + (w - drawPL) / 2;
  const oy = drawY + (drawH - drawPW) / 2;

  // 托盘底
  roundRect(ctx, ox, oy, drawPL, drawPW, 3, C.palletTop);
  // 网格
  ctx.strokeStyle = '#4A4A4A';
  ctx.lineWidth = 0.3;
  const gs = drawPL / 12;
  for (let i = gs; i < drawPL; i += gs) {
    ctx.beginPath(); ctx.moveTo(ox + i, oy); ctx.lineTo(ox + i, oy + drawPW); ctx.stroke();
  }
  const gsw = drawPW / 10;
  for (let j = gsw; j < drawPW; j += gsw) {
    ctx.beginPath(); ctx.moveTo(ox, oy + j); ctx.lineTo(ox + drawPL, oy + j); ctx.stroke();
  }

  // 箱体
  const sections = plan.sections;
  let currentY = oy;
  for (const section of sections) {
    const secDrawW = section.usedWidth * scale;
    const boxDL = section.boxAlongLength * scale;
    const boxDW = section.boxAlongWidth * scale;
    const gap = 1;

    for (let row = 0; row < section.countAlongWidth; row++) {
      for (let col = 0; col < section.countAlongLength; col++) {
        const bx = ox + col * boxDL + gap;
        const by = currentY + row * boxDW + gap;
        const bw = boxDL - gap * 2;
        const bh = boxDW - gap * 2;

        // 瓦楞纸箱渐变
        const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        grad.addColorStop(0, '#D9AD7C');
        grad.addColorStop(0.5, '#C89B6A');
        grad.addColorStop(1, '#D4A77A');
        roundRect(ctx, bx, by, bw, bh, 2, '#D4A77A');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = C.boxStroke;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx, by, bw, bh);

        // 瓦楞纹理
        if (bw > 15 && bh > 12) {
          ctx.strokeStyle = 'rgba(160,112,64,0.2)';
          ctx.lineWidth = 0.3;
          for (let ly = by + 3; ly < by + bh - 2; ly += 3) {
            ctx.beginPath(); ctx.moveTo(bx + 2, ly); ctx.lineTo(bx + bw - 2, ly); ctx.stroke();
          }
        }

        // 箱体标注
        if (bw > 25 && bh > 18) {
          ctx.fillStyle = C.brownDark;
          ctx.font = `${Math.min(9, bw / 6)}px "Microsoft YaHei", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('产品', bx + bw / 2, by + bh / 2 + 3);
        }
      }
    }
    currentY += secDrawW;
  }

  // 托盘边框
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox, oy, drawPL, drawPW);

  // 尺寸标注
  const annotY = oy + drawPW + 18;
  drawDimLine(ctx, ox, annotY, ox + drawPL, annotY, `${plan.coverageLength} 毫米`, 'bottom');
  const annotX = ox - 18;
  drawDimLine(ctx, annotX, oy, annotX, oy + drawPW, `${plan.coverageWidth} 毫米`, 'left');
}

/** 绘制侧视图 */
function drawSideView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions) {
  const count = plan.countAlongLength;
  const boxW = plan.boxOnPalletLength;
  const boxH = plan.boxStackHeight;

  ctx.fillStyle = C.black;
  ctx.font = '13px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`排列方式: ${count}箱一组 (侧视图)`, x + w / 2, y + 16);

  const drawY = y + 24;
  const drawH = h - 44;
  const padding = 30;
  const totalBoxW = boxW * count;
  const scaleX = (w - padding * 2) / totalBoxW;
  const scaleY = (drawH - padding * 2) / (boxH + 30);
  const scale = Math.min(scaleX, scaleY);

  const drawBW = boxW * scale;
  const drawBH = boxH * scale;
  const palletDrawH = 16;

  const ox = x + (w - drawBW * count) / 2;
  const oy = drawY + drawH - padding - palletDrawH;

  // 托盘底
  roundRect(ctx, ox - 4, oy, drawBW * count + 8, palletDrawH, 3, C.palletColor);
  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 4, oy, drawBW * count + 8, palletDrawH);

  // 箱体
  for (let i = 0; i < count; i++) {
    const bx = ox + i * drawBW + 1;
    const by = oy - drawBH;
    const bw = drawBW - 2;
    const bh = drawBH;

    const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
    grad.addColorStop(0, '#D9AD7C');
    grad.addColorStop(1, '#C89B6A');
    roundRect(ctx, bx, by, bw, bh, 2, '#D4A77A');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = C.boxStroke;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bx, by, bw, bh);

    // 瓦楞纹理
    ctx.strokeStyle = 'rgba(160,112,64,0.2)';
    ctx.lineWidth = 0.3;
    for (let ly = by + 3; ly < by + bh - 2; ly += 3) {
      ctx.beginPath(); ctx.moveTo(bx + 2, ly); ctx.lineTo(bx + bw - 2, ly); ctx.stroke();
    }

    // 产品名
    if (bw > 20 && bh > 15) {
      ctx.fillStyle = C.brownDark;
      ctx.font = `${Math.min(9, bw / 5)}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('产品', bx + bw / 2, by + bh / 2 + 3);
    }
  }

  // 标注
  drawDimLine(ctx, ox, oy + palletDrawH + 16, ox + drawBW * count, oy + palletDrawH + 16, `${totalBoxW} 毫米`, 'bottom');
  drawDimLine(ctx, ox - 16, oy - drawBH, ox - 16, oy, `${boxH} 毫米`, 'left');
}

/** 绘制托盘详情 */
function drawPalletDetail(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pallet: PalletDimensions) {
  const isoAngle = Math.PI / 6;
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);

  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;

  const scale = Math.min((w - 100) / (palletL * cosA + palletW * cosA), (h - 40) / (palletW * sinA + palletL * sinA + palletH)) * 0.7;

  const sL = palletL * scale;
  const sW = palletW * scale;
  const sH = palletH * scale * 1.5;

  const cx = x + w * 0.45;
  const cy = y + h / 2 + 10;

  function iso(dx: number, dy: number, dz: number): [number, number] {
    return [cx + (dx - dy) * cosA, cy + (dx + dy) * sinA - dz];
  }

  // 阴影
  const shadowPts = [iso(3, 3, -3), iso(sL + 3, 3, -3), iso(sL + 3, sW + 3, -3), iso(3, sW + 3, -3)];
  drawPolygon(ctx, shadowPts, 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0)');

  // === 蓝色塑料托盘 ===
  const deckH = sH * 0.22;
  const footH = sH - deckH;
  const footL = sL * 0.08;
  const footW = sW * 0.08;
  const beamH = footH * 0.35;

  // 3×3脚墩
  const footPos = [
    { x: sL * 0.1, y: sW * 0.1 },
    { x: sL * 0.5 - footL / 2, y: sW * 0.1 },
    { x: sL * 0.9 - footL, y: sW * 0.1 },
    { x: sL * 0.1, y: sW * 0.5 - footW / 2 },
    { x: sL * 0.5 - footL / 2, y: sW * 0.5 - footW / 2 },
    { x: sL * 0.9 - footL, y: sW * 0.5 - footW / 2 },
    { x: sL * 0.1, y: sW * 0.9 - footW },
    { x: sL * 0.5 - footL / 2, y: sW * 0.9 - footW },
    { x: sL * 0.9 - footL, y: sW * 0.9 - footW },
  ];

  for (const fp of footPos) {
    // 正面
    drawPolygon(ctx,
      [iso(fp.x, fp.y + footW, footH), iso(fp.x + footL, fp.y + footW, footH),
       iso(fp.x + footL, fp.y + footW, 0), iso(fp.x, fp.y + footW, 0)],
      C.palletFace, C.palletFoot);
    // 右面
    drawPolygon(ctx,
      [iso(fp.x + footL, fp.y, footH), iso(fp.x + footL, fp.y + footW, footH),
       iso(fp.x + footL, fp.y + footW, 0), iso(fp.x + footL, fp.y, 0)],
      C.palletColor, C.palletFoot);
    // 顶面
    drawPolygon(ctx,
      [iso(fp.x, fp.y, footH), iso(fp.x + footL, fp.y, footH),
       iso(fp.x + footL, fp.y + footW, footH), iso(fp.x, fp.y + footW, footH)],
      C.palletTop, C.palletFoot);
  }

  // 横梁
  const beamRows = [sW * 0.1 + footW / 2, sW * 0.5, sW * 0.9 - footW / 2];
  for (const by of beamRows) {
    const bw = sW * 0.04;
    // 正面
    drawPolygon(ctx,
      [iso(0, by - bw / 2, beamH), iso(sL, by - bw / 2, beamH),
       iso(sL, by - bw / 2, 0), iso(0, by - bw / 2, 0)],
      C.palletBeam, C.palletFoot);
    // 右面
    drawPolygon(ctx,
      [iso(sL, by - bw / 2, beamH), iso(sL, by + bw / 2, beamH),
       iso(sL, by + bw / 2, 0), iso(sL, by - bw / 2, 0)],
      C.palletColor, C.palletFoot);
    // 顶面
    drawPolygon(ctx,
      [iso(0, by - bw / 2, beamH), iso(sL, by - bw / 2, beamH),
       iso(sL, by + bw / 2, beamH), iso(0, by + bw / 2, beamH)],
      C.palletTop, C.palletFoot);
  }

  // 顶板
  drawPolygon(ctx, [iso(0, 0, sH), iso(sL, 0, sH), iso(sL, sW, sH), iso(0, sW, sH)], C.palletTop, C.palletFoot);
  // 顶面网格
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 0.4;
  const gsL = sL / 12;
  for (let i = gsL; i < sL; i += gsL) {
    const p1 = iso(i, 0, sH); const p2 = iso(i, sW, sH);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  }
  const gsW = sW / 10;
  for (let j = gsW; j < sW; j += gsW) {
    const p1 = iso(0, j, sH); const p2 = iso(sL, j, sH);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  }
  // 顶面边框高光
  ctx.strokeStyle = C.palletEdge;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const [e1, e2, e3, e4] = [iso(0, 0, sH), iso(sL, 0, sH), iso(sL, sW, sH), iso(0, sW, sH)];
  ctx.moveTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.lineTo(e3[0], e3[1]); ctx.lineTo(e4[0], e4[1]);
  ctx.closePath(); ctx.stroke();

  // 顶板正面边缘
  drawPolygon(ctx, [iso(0, sW, sH), iso(sL, sW, sH), iso(sL, sW, footH), iso(0, sW, footH)], C.palletFace, C.palletFoot);
  // 顶板右面边缘
  drawPolygon(ctx, [iso(sL, 0, sH), iso(sL, sW, sH), iso(sL, sW, footH), iso(sL, 0, footH)], C.palletColor, C.palletFoot);

  // 叉车孔标记
  const forkH = footH * 0.6;
  for (const fy of [sW * 0.1, sW * 0.5 - footW / 2, sW * 0.9 - footW]) {
    const fw = footW * 0.7;
    drawPolygon(ctx, [
      iso(0, fy, footH * 0.3), iso(sL * 0.3, fy, footH * 0.3),
      iso(sL * 0.3, fy + fw, footH * 0.3), iso(0, fy + fw, footH * 0.3)
    ], '#1E3A8A', '#172554');
  }

  // 右侧文字标注
  const textX = x + w * 0.72;
  ctx.fillStyle = C.black;
  ctx.font = '14px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`托盘尺寸: ${pallet.width} × ${pallet.length} × ${pallet.height} 毫米`, textX, y + 50);
  ctx.fillText(`托盘材质: 塑料`, textX, y + 75);

  // 蓝色标注线
  const bottomPt = iso(0, sW, 0);
  drawDimLine(ctx, bottomPt[0], bottomPt[1] + 18, bottomPt[0] + sL * cosA, bottomPt[1] + 18 + sL * sinA, `${pallet.length} 毫米`, 'bottom');

  const rightPt = iso(sL, 0, 0);
  drawDimLine(ctx, rightPt[0] + 12, rightPt[1], rightPt[0] + 12 + sW * cosA, rightPt[1] + sW * sinA, `${pallet.width} 毫米`, 'bottom');

  const topPt = iso(sL, 0, sH);
  drawDimLine(ctx, topPt[0] + 12, topPt[1], topPt[0] + 12, topPt[1] + sH, `${pallet.height} 毫米`, 'right');
}

/** 绘制成品堆叠效果图 */
function drawStackedView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions, productName: string, layersCount: number, flipLen: boolean, flipWid: boolean) {
  const isoAngle = Math.PI / 6;
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);

  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;
  const layerCount = layersCount;
  const totalBoxH = plan.boxStackHeight * layerCount;
  const totalH = palletH + totalBoxH;

  // 缩放
  const maxExtent = Math.max(palletL, palletW);
  const scaleH = (h - 40) / (totalH * 0.5 + maxExtent * sinA);
  const scaleW = (w - 30) / (maxExtent * 2 * cosA);
  const scale = Math.min(scaleH, scaleW) * 0.85;

  const sL = palletL * scale;
  const sW = palletW * scale;
  const sPH = palletH * scale * 1.5;
  const sBH = plan.boxStackHeight * scale;

  const cx = x + w / 2;
  const baseY = y + h - 15;

  function iso(dx: number, dy: number, dz: number): [number, number] {
    return [cx + (dx - dy) * cosA, baseY - (dx + dy) * sinA - dz];
  }

  // 地面阴影
  const shadowPts = [iso(-5, -5, 0), iso(sL + 5, -5, 0), iso(sL + 5, sW + 5, 0), iso(-5, sW + 5, 0)];
  drawPolygon(ctx, shadowPts, 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0)');

  // === 蓝色塑料托盘 ===
  const ph = sPH;
  const deckH = ph * 0.22;
  const footH = ph - deckH;
  const footL = sL * 0.08;
  const footW = sW * 0.08;
  const beamHH = footH * 0.35;

  // 3×3脚墩
  const footPoss = [
    { x: sL * 0.1, y: sW * 0.1 }, { x: sL * 0.5 - footL / 2, y: sW * 0.1 }, { x: sL * 0.9 - footL, y: sW * 0.1 },
    { x: sL * 0.1, y: sW * 0.5 - footW / 2 }, { x: sL * 0.5 - footL / 2, y: sW * 0.5 - footW / 2 }, { x: sL * 0.9 - footL, y: sW * 0.5 - footW / 2 },
    { x: sL * 0.1, y: sW * 0.9 - footW }, { x: sL * 0.5 - footL / 2, y: sW * 0.9 - footW }, { x: sL * 0.9 - footL, y: sW * 0.9 - footW },
  ];
  for (const fp of footPoss) {
    drawPolygon(ctx, [iso(fp.x, fp.y + footW, footH), iso(fp.x + footL, fp.y + footW, footH), iso(fp.x + footL, fp.y + footW, 0), iso(fp.x, fp.y + footW, 0)], C.palletFace, C.palletFoot);
    drawPolygon(ctx, [iso(fp.x + footL, fp.y, footH), iso(fp.x + footL, fp.y + footW, footH), iso(fp.x + footL, fp.y + footW, 0), iso(fp.x + footL, fp.y, 0)], C.palletColor, C.palletFoot);
    drawPolygon(ctx, [iso(fp.x, fp.y, footH), iso(fp.x + footL, fp.y, footH), iso(fp.x + footL, fp.y + footW, footH), iso(fp.x, fp.y + footW, footH)], C.palletTop, C.palletFoot);
  }

  // 横梁
  const beamR = [sW * 0.1 + footW / 2, sW * 0.5, sW * 0.9 - footW / 2];
  for (const by of beamR) {
    const bw = sW * 0.04;
    drawPolygon(ctx, [iso(0, by - bw / 2, beamHH), iso(sL, by - bw / 2, beamHH), iso(sL, by - bw / 2, 0), iso(0, by - bw / 2, 0)], C.palletBeam, C.palletFoot);
    drawPolygon(ctx, [iso(sL, by - bw / 2, beamHH), iso(sL, by + bw / 2, beamHH), iso(sL, by + bw / 2, 0), iso(sL, by - bw / 2, 0)], C.palletColor, C.palletFoot);
    drawPolygon(ctx, [iso(0, by - bw / 2, beamHH), iso(sL, by - bw / 2, beamHH), iso(sL, by + bw / 2, beamHH), iso(0, by + bw / 2, beamHH)], C.palletTop, C.palletFoot);
  }

  // 顶板
  drawPolygon(ctx, [iso(0, 0, ph), iso(sL, 0, ph), iso(sL, sW, ph), iso(0, sW, ph)], C.palletTop, C.palletFoot);
  // 顶面网格
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 0.3;
  const gs = sL / 12;
  for (let i = gs; i < sL; i += gs) {
    const p1 = iso(i, 0, ph); const p2 = iso(i, sW, ph);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  }
  const gsw = sW / 10;
  for (let j = gsw; j < sW; j += gsw) {
    const p1 = iso(0, j, ph); const p2 = iso(sL, j, ph);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  }
  // 顶面边框高光
  ctx.strokeStyle = C.palletEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const [pe1, pe2, pe3, pe4] = [iso(0, 0, ph), iso(sL, 0, ph), iso(sL, sW, ph), iso(0, sW, ph)];
  ctx.moveTo(pe1[0], pe1[1]); ctx.lineTo(pe2[0], pe2[1]); ctx.lineTo(pe3[0], pe3[1]); ctx.lineTo(pe4[0], pe4[1]);
  ctx.closePath(); ctx.stroke();
  // 顶板正面边缘
  drawPolygon(ctx, [iso(0, sW, ph), iso(sL, sW, ph), iso(sL, sW, footH), iso(0, sW, footH)], C.palletFace, C.palletFoot);
  drawPolygon(ctx, [iso(sL, 0, ph), iso(sL, sW, ph), iso(sL, sW, footH), iso(sL, 0, footH)], C.palletColor, C.palletFoot);

  // === 箱体层 ===
  const sections = plan.sections;
  for (let layer = 0; layer < layerCount; layer++) {
    const layerZ = ph + layer * sBH;
    const t = layer / Math.max(layerCount - 1, 1); // 0~1
    // 层级颜色渐变：底层深，上层浅
    const boxR = Math.round(196 + t * 20);
    const boxG = Math.round(150 + t * 18);
    const boxB = Math.round(98 + t * 22);
    const boxFill = `rgb(${boxR},${boxG},${boxB})`;
    const boxLight = `rgb(${boxR + 18},${boxG + 18},${boxB + 18})`;
    const boxDark = `rgb(${boxR - 25},${boxG - 25},${boxB - 20})`;
    const boxStrokeC = `rgb(${boxR - 40},${boxG - 40},${boxB - 30})`;

    let currentW = 0;
    for (const section of sections) {
      const secW = section.usedWidth * (sW / palletW);
      const bL = section.boxAlongLength * (sL / palletL);
      const bW = section.boxAlongWidth * (sW / palletW);

      for (let row = 0; row < section.countAlongWidth; row++) {
        for (let col = 0; col < section.countAlongLength; col++) {
          const dx = col * bL;
          const dy = currentW + row * bW;
          const gap = 0.4;

          // 顶面
          const t1 = iso(dx + gap, dy + gap, layerZ + sBH);
          const t2 = iso(dx + bL - gap, dy + gap, layerZ + sBH);
          const t3 = iso(dx + bL - gap, dy + bW - gap, layerZ + sBH);
          const t4 = iso(dx + gap, dy + bW - gap, layerZ + sBH);
          drawPolygon(ctx, [t1, t2, t3, t4], boxLight, boxStrokeC);

          // 左前面 (y = dy + gap)
          const f1 = iso(dx + gap, dy + gap, layerZ + sBH);
          const f2 = iso(dx + bL - gap, dy + gap, layerZ + sBH);
          const f3 = iso(dx + bL - gap, dy + gap, layerZ);
          const f4 = iso(dx + gap, dy + gap, layerZ);
          drawPolygon(ctx, [f1, f2, f3, f4], boxFill, boxStrokeC);

          // 右面 (x = dx + bL - gap)
          const r1 = iso(dx + bL - gap, dy + gap, layerZ + sBH);
          const r2 = iso(dx + bL - gap, dy + bW - gap, layerZ + sBH);
          const r3 = iso(dx + bL - gap, dy + bW - gap, layerZ);
          const r4 = iso(dx + bL - gap, dy + gap, layerZ);
          drawPolygon(ctx, [r1, r2, r3, r4], boxDark, boxStrokeC);

          // 瓦楞纹理 - 正面
          const ft = (f1[1] + f4[1]) / 2;
          const fb = (f2[1] + f3[1]) / 2;
          const fl = (f1[0] + f4[0]) / 2;
          const fr = (f2[0] + f3[0]) / 2;
          ctx.strokeStyle = `rgba(${boxR - 40},${boxG - 40},${boxB - 30},0.15)`;
          ctx.lineWidth = 0.3;
          const stepY = (fb - ft) / 4;
          for (let k = 1; k < 4; k++) {
            const ly = ft + k * stepY;
            const lx = fl + (fr - fl) * (k / 4);
            const rx = fl + (fr - fl) * (1 - k / 4);
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ly); ctx.stroke();
          }

          // 产品标签 - 正面可见面（仅前两行、前两层绘制）
          if (row < 2 && layer < 2) {
            const labelCx = (f1[0] + f2[0] + f3[0] + f4[0]) / 4;
            const labelCy = (f1[1] + f2[1] + f3[1] + f4[1]) / 4;
            const faceW = Math.sqrt((f1[0] - f2[0]) ** 2 + (f1[1] - f2[1]) ** 2);
            const faceH = Math.sqrt((f1[0] - f4[0]) ** 2 + (f1[1] - f4[1]) ** 2);
            if (faceW > 12 && faceH > 10) {
              // 白色标签底
              const lW = Math.min(faceW * 0.7, 40);
              const lH = Math.min(faceH * 0.5, 16);
              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.fillRect(labelCx - lW / 2, labelCy - lH / 2, lW, lH);
              ctx.strokeStyle = 'rgba(0,0,0,0.15)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(labelCx - lW / 2, labelCy - lH / 2, lW, lH);
              // 产品名
              ctx.fillStyle = C.black;
              ctx.font = `bold ${Math.min(8, lW / 5)}px "Microsoft YaHei", sans-serif`;
              ctx.textAlign = 'center';
              ctx.fillText(productName || '产品', labelCx, labelCy + 2);
            }
          }
        }
      }
      currentW += secW;
    }
  }
}

/** 高度标注信息 */
function drawHeightAnnotation(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions, maxHeight: number) {
  const totalH = plan.totalHeight;
  const boxTotalH = plan.boxStackHeight * plan.layers;
  const palletH = pallet.height;
  const ok = plan.heightOk;

  // 蓝色竖线 - 全高
  const lineX = x + 12;
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lineX, y + 8);
  ctx.lineTo(lineX, y + h - 8);
  ctx.stroke();

  // 上下箭头
  drawArrow(ctx, lineX, y + 8, 'up');
  drawArrow(ctx, lineX, y + h - 8, 'down');

  // 箱体高度段虚线
  const boxRatio = boxTotalH / totalH;
  const boxLineY = y + 8 + (1 - boxRatio) * (h - 16);
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(lineX - 6, boxLineY);
  ctx.lineTo(lineX + 20, boxLineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 托盘高度段虚线
  const palletRatio = palletH / totalH;
  const palletLineY = y + h - 8 - palletRatio * (h - 16);
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(lineX - 6, palletLineY);
  ctx.lineTo(lineX + 20, palletLineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 文字
  let ty = y + 30;
  ctx.textAlign = 'left';

  // 托盘总高度
  ctx.fillStyle = C.black;
  ctx.font = '14px "Microsoft YaHei", sans-serif';
  ctx.fillText('托盘总高度', x + 28, ty);
  ty += 24;

  ctx.fillStyle = C.red;
  ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
  ctx.fillText(`${totalH} 毫米`, x + 28, ty);
  ty += 20;

  ctx.fillStyle = C.blue;
  ctx.font = '12px "Microsoft YaHei", sans-serif';
  ctx.fillText(`(不超过 ${maxHeight} 毫米)`, x + 28, ty);
  ty += 35;

  // 分项
  ctx.fillStyle = C.black;
  ctx.font = '13px "Microsoft YaHei", sans-serif';
  ctx.fillText(`箱体高度 ${plan.boxStackHeight} 毫米`, x + 28, ty);
  ty += 22;
  ctx.fillText(`层数: ${plan.layers} 层`, x + 28, ty);
  ty += 22;
  ctx.fillText(`= ${boxTotalH} 毫米`, x + 28, ty);
  ty += 30;
  ctx.fillText(`托盘高度 ${palletH} 毫米`, x + 28, ty);
  ty += 40;

  // 总高度确认
  ctx.fillStyle = C.black;
  ctx.font = '14px "Microsoft YaHei", sans-serif';
  ctx.fillText('总高度', x + 28, ty);
  ty += 24;

  ctx.fillStyle = C.red;
  ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
  ctx.fillText(`${totalH} 毫米`, x + 28, ty);
  ty += 20;

  ctx.fillStyle = ok ? C.blue : C.red;
  ctx.font = '12px "Microsoft YaHei", sans-serif';
  ctx.fillText(ok ? '(符合要求)' : '(超出限制!)', x + 28, ty);
}

/** 信息汇总 */
function drawSummary(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions, maxHeight: number) {
  // 米色背景
  roundRect(ctx, x, y, w, h, 6, C.cream);
  ctx.strokeStyle = C.creamBorder;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);

  // 标题 - 覆盖在边框上方
  const titleW = 160;
  ctx.save();
  ctx.fillStyle = C.cream;
  ctx.fillRect(x + 12, y - 10, titleW + 4, 14);
  ctx.restore();
  drawSectionTitle(ctx, x + 14, y - 16, titleW, '信息汇总');

  // 内容两列
  const lengthDiff = pallet.length - plan.coverageLength;
  const widthDiff = pallet.width - plan.coverageWidth;

  const leftItems = [
    `箱体尺寸: ${plan.originalBox.width} × ${plan.originalBox.length} × ${plan.originalBox.height} 毫米`,
    `堆码方式: ${plan.countAlongLength} × ${plan.countAlongWidth} × ${plan.layers}`,
    `每层箱数: ${plan.boxesPerLayer} 箱`,
    `层数: ${plan.layers} 层`,
  ];
  const rightItems = [
    `每托箱数: ${plan.totalBoxes} 箱`,
    `托盘尺寸: ${pallet.width} × ${pallet.length} × ${pallet.height} 毫米`,
    `长度: 产品占${plan.coverageLength}mm${lengthDiff >= 0 ? `，余${lengthDiff}mm` : `，超${Math.abs(lengthDiff)}mm`}`,
    `宽度: 产品占${plan.coverageWidth}mm${widthDiff >= 0 ? `，余${widthDiff}mm` : `，超${Math.abs(widthDiff)}mm`}`,
    `托盘总高度: ${plan.totalHeight} 毫米 (不超过 ${maxHeight} 毫米)`,
    `可使用标准运输及仓储设备作业`,
  ];

  const colW = (w - 60) / 2;
  const startY = y + 22;
  const lineH = 22;

  ctx.font = '13px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';

  leftItems.forEach((item, i) => {
    const iy = startY + i * lineH;
    ctx.fillStyle = C.green;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✓', x + 22, iy);
    ctx.fillStyle = C.black;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText(item, x + 38, iy);
  });

  rightItems.forEach((item, i) => {
    const iy = startY + i * lineH;
    const ix = x + colW + 35;
    ctx.fillStyle = C.green;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('✓', ix, iy);
    ctx.fillStyle = C.black;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText(item, ix + 16, iy);
  });
}

// ===== 通用工具 =====

function drawPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], fill: string, stroke: string) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke !== 'rgba(0,0,0,0)') {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawDimLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, position: 'bottom' | 'left' | 'right') {
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const as = 5;
  if (position === 'bottom') {
    // 左箭头
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + as, y1 - as / 2); ctx.lineTo(x1 + as, y1 + as / 2); ctx.closePath();
    ctx.fillStyle = C.blueLine; ctx.fill();
    // 右箭头
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - as, y2 - as / 2); ctx.lineTo(x2 - as, y2 + as / 2); ctx.closePath();
    ctx.fill();
    // 文字
    ctx.fillStyle = C.blue;
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, (x1 + x2) / 2, y1 + 14);
  } else if (position === 'left') {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + as / 2, y1 + as); ctx.lineTo(x1 - as / 2, y1 + as); ctx.closePath();
    ctx.fillStyle = C.blueLine; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 + as / 2, y2 - as); ctx.lineTo(x2 - as / 2, y2 - as); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.blue;
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.save();
    ctx.translate(x1 - 10, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else if (position === 'right') {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - as / 2, y1 + as); ctx.lineTo(x1 + as / 2, y1 + as); ctx.closePath();
    ctx.fillStyle = C.blueLine; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - as / 2, y2 - as); ctx.lineTo(x2 + as / 2, y2 - as); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.blue;
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.save();
    ctx.translate(x1 + 12, (y1 + y2) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'up' | 'down') {
  const s = 5;
  ctx.beginPath();
  if (dir === 'up') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - s, y + s * 1.5);
    ctx.lineTo(x + s, y + s * 1.5);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x - s, y - s * 1.5);
    ctx.lineTo(x + s, y - s * 1.5);
  }
  ctx.closePath();
  ctx.fillStyle = C.blueLine;
  ctx.fill();
}
