'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { PalletPlan, BoxDimensions, PalletDimensions } from '@/lib/palletize';

interface ReportCanvasProps {
  plan: PalletPlan;
  productName: string;
  box: BoxDimensions;
  pallet: PalletDimensions;
  maxHeight: number;
}

// 颜色常量
const C = {
  brown: '#5C3924',
  brownLight: '#8B6243',
  boxColor: '#D4A77A',
  boxDark: '#C49060',
  boxLight: '#E4BD9A',
  palletColor: '#2A2A2A',
  palletFace: '#3A3A3A',
  palletTop: '#444444',
  blue: '#2385BB',
  blueLine: '#3B82F6',
  red: '#E03C31',
  green: '#39A852',
  black: '#333333',
  gray: '#666666',
  grayLight: '#CCCCCC',
  grayBg: '#F0F0F0',
  cream: '#F9F2E9',
  creamBorder: '#D4A77A',
  white: '#FFFFFF',
};

export default function ReportCanvas({ plan, productName, box, pallet, maxHeight }: ReportCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 画布尺寸 - A4横向比例，高清2倍
    const W = 2400;
    const H = 1700;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, W, H);

    let y = 0;

    // ======== 1. 标题栏 ========
    y = 20;
    roundRect(ctx, 20, y, W - 40, 60, 8, C.brown);
    ctx.fillStyle = C.white;
    ctx.font = 'bold 26px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`打托排版方案 - 产品: ${productName}`, W / 2, y + 40);
    ctx.textAlign = 'left';
    y += 90;

    // ======== 2. 参数表格 ========
    y = drawParamTable(ctx, plan, box, y);
    y += 25;

    // ======== 3. 左侧：排列方式 + 托盘详情 ========
    const leftX = 30;
    const leftW = 1100;

    // 3a. 单层箱体排列方式
    drawSectionTitle(ctx, leftX, y, leftW, '单层箱体排列方式');
    y += 45;

    const topViewW = 500;
    const topViewH = 320;
    const sideViewW = 300;
    const sideViewH = 280;

    // 俯视图
    const tvX = leftX + 20;
    const tvY = y;
    ctx.fillStyle = C.black;
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`排列方式: ${plan.countAlongLength} × ${plan.countAlongWidth} (俯视图)`, tvX + topViewW / 2, tvY + 20);
    drawTopView(ctx, tvX, tvY + 30, topViewW, topViewH - 30, plan, pallet);

    // 加号
    const plusX = tvX + topViewW + 25;
    const plusY = tvY + topViewH / 2;
    ctx.fillStyle = C.brown;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+', plusX, plusY + 12);

    // 侧视图
    const svX = plusX + 50;
    const svY = tvY;
    ctx.fillStyle = C.black;
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillText(`排列方式: ${plan.countAlongLength}箱一组 (侧视图)`, svX + sideViewW / 2, svY + 20);
    drawSideView(ctx, svX, svY + 30, sideViewW, sideViewH - 30, plan, pallet);

    y += topViewH + 30;

    // 3b. 托盘详情
    drawSectionTitle(ctx, leftX, y, leftW, '托盘详情');
    y += 45;

    const palletDrawW = 400;
    const palletDrawH = 260;
    drawPalletDetail(ctx, leftX + 20, y, palletDrawW, palletDrawH, pallet);

    // 托盘文字
    const ptTextX = leftX + palletDrawW + 50;
    ctx.fillStyle = C.black;
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`托盘尺寸: ${pallet.width} × ${pallet.length} × ${pallet.height} 毫米`, ptTextX, y + 80);
    ctx.fillText(`托盘材质: 塑料`, ptTextX, y + 115);

    y += palletDrawH + 25;

    // ======== 4. 右侧：成品堆叠效果图 ========
    const rightX = 1180;
    const rightW = W - rightX - 30;
    let ry = 110;

    drawSectionTitle(ctx, rightX, ry, rightW, '成品托盘堆叠效果图');
    ry += 45;

    const stackDrawW = rightW - 280;
    const stackDrawH = 850;
    drawStackedView(ctx, rightX + 10, ry, stackDrawW, stackDrawH, plan, pallet, productName);

    // 右侧高度标注
    const annotX = rightX + stackDrawW + 30;
    drawHeightAnnotation(ctx, annotX, ry, stackDrawH, plan, pallet, maxHeight);

    // ======== 5. 底部：信息汇总 ========
    const summaryY = H - 170;
    drawSummary(ctx, 30, summaryY, W - 60, 140, plan, pallet, maxHeight);
  }, [plan, productName, box, pallet, maxHeight]);

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
  roundRect(ctx, x, y, w, 36, 6, C.brown);
  ctx.fillStyle = C.white;
  ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 15, y + 26);
}

function drawParamTable(ctx: CanvasRenderingContext2D, plan: PalletPlan, box: BoxDimensions, startY: number): number {
  const cols = [
    { header: '箱体类型', value: '产品箱', w: 140 },
    { header: '箱体尺寸(长×宽×高 毫米)', value: `W${box.width} × L${box.length} × H${box.height}`, w: 380 },
    { header: '堆码方式(长×宽×高)', value: `${plan.countAlongLength} × ${plan.countAlongWidth} × ${plan.layers}`, w: 260 },
    { header: '每层箱数(箱)', value: String(plan.boxesPerLayer), w: 180 },
    { header: '层数(层)', value: String(plan.layers), w: 140 },
    { header: '每托箱数(箱)', value: String(plan.totalBoxes), w: 180 },
  ];

  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const x0 = 30;
  const rowH = 38;
  let y = startY;

  // 表头
  let cx = x0;
  ctx.fillStyle = C.grayBg;
  ctx.fillRect(cx, y, tableW, rowH);
  ctx.strokeStyle = C.grayLight;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx, y, tableW, rowH);

  for (const col of cols) {
    ctx.strokeStyle = C.grayLight;
    ctx.strokeRect(cx, y, col.w, rowH);
    ctx.fillStyle = C.black;
    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.header, cx + col.w / 2, y + 26);
    cx += col.w;
  }
  y += rowH;

  // 数据行
  cx = x0;
  ctx.fillStyle = C.white;
  ctx.fillRect(cx, y, tableW, rowH);
  ctx.strokeStyle = C.grayLight;
  ctx.strokeRect(cx, y, tableW, rowH);

  for (const col of cols) {
    ctx.strokeStyle = C.grayLight;
    ctx.strokeRect(cx, y, col.w, rowH);
    ctx.fillStyle = C.black;
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.value, cx + col.w / 2, y + 26);
    cx += col.w;
  }
  y += rowH;

  return y;
}

/** 绘制俯视图 - 箱体在托盘上的平面排列 */
function drawTopView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions) {
  const palletL = pallet.length;
  const palletW = pallet.width;

  // 缩放：让托盘适配绘图区
  const padding = 50;
  const scaleX = (w - padding * 2) / palletL;
  const scaleY = (h - padding * 2) / palletW;
  const scale = Math.min(scaleX, scaleY);

  const drawPL = palletL * scale;
  const drawPW = palletW * scale;

  // 托盘居中
  const ox = x + (w - drawPL) / 2;
  const oy = y + (h - drawPW) / 2;

  // 绘制托盘底
  roundRect(ctx, ox, oy, drawPL, drawPW, 4, C.palletTop);

  // 绘制箱体
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

        // 纸箱颜色
        roundRect(ctx, bx, by, bw, bh, 2, C.boxColor);
        ctx.strokeStyle = C.boxDark;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);

        // 箱体上小标注
        if (bw > 20 && bh > 15) {
          ctx.fillStyle = C.brown;
          ctx.font = `${Math.min(10, bw / 5)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(plan.originalBox ? '产品' : '', bx + bw / 2, by + bh / 2 + 3);
        }
      }
    }
    currentY += secDrawW;
  }

  // 尺寸标注 - 横向（长度方向）
  const annotY = oy + drawPW + 25;
  drawDimensionLine(ctx, ox, annotY, ox + drawPL, annotY, `${plan.coverageLength} 毫米`, 'bottom');

  // 尺寸标注 - 纵向（宽度方向）
  const annotX = ox - 25;
  drawDimensionLine(ctx, annotX, oy, annotX, oy + drawPW, `${plan.coverageWidth} 毫米`, 'left');
}

/** 绘制侧视图 */
function drawSideView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions) {
  const boxH = plan.boxStackHeight;
  const boxW = plan.boxOnPalletLength;
  const count = plan.countAlongLength;

  const padding = 40;
  const totalBoxW = boxW * count;
  const maxDim = Math.max(totalBoxW, boxH);

  const scaleX = (w - padding * 2) / totalBoxW;
  const scaleY = (h - padding * 2) / (boxH + 40);
  const scale = Math.min(scaleX, scaleY);

  const drawBW = boxW * scale;
  const drawBH = boxH * scale;
  const palletDrawH = 20;

  const ox = x + (w - drawBW * count) / 2;
  const oy = y + h - padding - palletDrawH;

  // 托盘底
  roundRect(ctx, ox - 5, oy, drawBW * count + 10, palletDrawH, 3, C.palletColor);

  // 箱体
  for (let i = 0; i < count; i++) {
    const bx = ox + i * drawBW + 1;
    const by = oy - drawBH;
    const bw = drawBW - 2;
    const bh = drawBH;

    roundRect(ctx, bx, by, bw, bh, 2, C.boxColor);
    ctx.strokeStyle = C.boxDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  // 横向标注
  drawDimensionLine(ctx, ox, oy + palletDrawH + 20, ox + drawBW * count, oy + palletDrawH + 20, `${totalBoxW} 毫米`, 'bottom');

  // 纵向标注
  drawDimensionLine(ctx, ox - 20, oy - drawBH, ox - 20, oy, `${boxH} 毫米`, 'left');
}

/** 绘制托盘详情 - 等轴测3D效果 */
function drawPalletDetail(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pallet: PalletDimensions) {
  const isoAngle = Math.PI / 6;
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);

  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;
  const maxDim = Math.max(palletL, palletW);

  const scale = Math.min((w - 80) / (palletL * cosA + palletW * cosA), (h - 80) / (palletW * sinA + palletL * sinA + palletH)) * 0.8;

  const sL = palletL * scale;
  const sW = palletW * scale;
  const sH = palletH * scale * 1.5;

  const cx = x + w / 2;
  const cy = y + h / 2 + 20;

  // 等轴测投影
  function iso(dx: number, dy: number, dz: number): [number, number] {
    return [
      cx + (dx - dy) * cosA,
      cy + (dx + dy) * sinA - dz,
    ];
  }

  // 顶面
  const topPoints = [iso(0, 0, sH), iso(sL, 0, sH), iso(sL, sW, sH), iso(0, sW, sH)];
  drawPolygon(ctx, topPoints, C.palletTop, '#555555');

  // 网格纹理 - 顶面
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 0.5;
  const gridStep = sL / 12;
  for (let i = gridStep; i < sL; i += gridStep) {
    const p1 = iso(i, 0, sH);
    const p2 = iso(i, sW, sH);
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
  const gridStepW = sW / 10;
  for (let j = gridStepW; j < sW; j += gridStepW) {
    const p1 = iso(0, j, sH);
    const p2 = iso(sL, j, sH);
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }

  // 前面（左）
  const frontLeftPoints = [iso(0, 0, sH), iso(0, 0, 0), iso(0, sW, 0), iso(0, sW, sH)];
  drawPolygon(ctx, frontLeftPoints, C.palletFace, '#444444');

  // 前面（右）
  const frontRightPoints = [iso(0, 0, sH), iso(0, 0, 0), iso(sL, 0, 0), iso(sL, 0, sH)];
  drawPolygon(ctx, frontRightPoints, C.palletColor, '#333333');

  // 川字脚垫 - 3条纵梁
  const beamW = sW * 0.08;
  for (const offset of [0.15, 0.5, 0.85]) {
    const bY = sW * offset - beamW / 2;
    const p1 = iso(0, bY, 0);
    const p2 = iso(sL, bY, 0);
    const p3 = iso(sL, bY + beamW, 0);
    const p4 = iso(0, bY + beamW, 0);
    drawPolygon(ctx, [p1, p2, p3, p4], '#222222', '#111111');
  }

  // 标注线
  const bottomY = iso(0, sW, 0);
  drawDimensionLine(ctx, bottomY[0], bottomY[1] + 30, bottomY[0] + sL * cosA, bottomY[1] + 30 + sL * sinA, `${pallet.length} 毫米`, 'bottom');

  const rightX = iso(sL, 0, 0);
  drawDimensionLine(ctx, rightX[0] + 20, rightX[1], rightX[0] + 20, rightX[1] - sH, `${pallet.height} 毫米`, 'right');
}

/** 绘制成品堆叠效果图 - 等轴测3D */
function drawStackedView(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions, productName: string) {
  const isoAngle = Math.PI / 6;
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);

  const palletL = pallet.length;
  const palletW = pallet.width;
  const palletH = pallet.height;
  const layers = plan.layers;

  const totalBoxH = plan.boxStackHeight * layers;
  const totalH = palletH + totalBoxH;

  // 缩放
  const maxExtent = Math.max(palletL, palletW);
  const scaleH = (h - 60) / (totalH * 0.5 + maxExtent * sinA);
  const scaleW = (w - 60) / (maxExtent * 2 * cosA);
  const scale = Math.min(scaleH, scaleW, 0.5);

  const sL = palletL * scale;
  const sW = palletW * scale;
  const sPH = palletH * scale * 1.5;
  const sBH = plan.boxStackHeight * scale;

  const cx = x + w / 2;
  const baseY = y + h - 30;

  function iso(dx: number, dy: number, dz: number): [number, number] {
    return [
      cx + (dx - dy) * cosA,
      baseY - (dx + dy) * sinA - dz,
    ];
  }

  // 托盘
  const ph = sPH;
  // 顶面
  drawPolygon(ctx, [iso(0, 0, ph), iso(sL, 0, ph), iso(sL, sW, ph), iso(0, sW, ph)], C.palletTop, '#555555');
  // 网格
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 0.5;
  const gs = sL / 10;
  for (let i = gs; i < sL; i += gs) {
    const p1 = iso(i, 0, ph);
    const p2 = iso(i, sW, ph);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  }
  // 前面
  drawPolygon(ctx, [iso(0, 0, ph), iso(0, 0, 0), iso(0, sW, 0), iso(0, sW, ph)], C.palletFace, '#444444');
  drawPolygon(ctx, [iso(0, 0, ph), iso(0, 0, 0), iso(sL, 0, 0), iso(sL, 0, ph)], C.palletColor, '#333333');

  // 箱体层
  const sections = plan.sections;
  for (let layer = 0; layer < layers; layer++) {
    const layerZ = ph + layer * sBH;
    const layerTint = layer / layers; // 0~1 渐变
    const boxR = Math.round(212 - layerTint * 30);
    const boxG = Math.round(167 - layerTint * 25);
    const boxB = Math.round(122 - layerTint * 20);
    const boxFill = `rgb(${boxR},${boxG},${boxB})`;
    const boxStroke = `rgb(${boxR - 20},${boxG - 20},${boxB - 20})`;

    let currentW = 0;
    for (const section of sections) {
      const secW = section.usedWidth * (sW / palletW);
      const bL = section.boxAlongLength * (sL / palletL);
      const bW = section.boxAlongWidth * (sW / palletW);

      for (let row = 0; row < section.countAlongWidth; row++) {
        for (let col = 0; col < section.countAlongLength; col++) {
          const dx = col * bL;
          const dy = currentW + row * bW;
          const gap = 0.5;

          // 顶面
          const t1 = iso(dx + gap, dy + gap, layerZ + sBH);
          const t2 = iso(dx + bL - gap, dy + gap, layerZ + sBH);
          const t3 = iso(dx + bL - gap, dy + bW - gap, layerZ + sBH);
          const t4 = iso(dx + gap, dy + bW - gap, layerZ + sBH);
          drawPolygon(ctx, [t1, t2, t3, t4], lighten(boxFill, 15), boxStroke);

          // 前面 (左侧可见面 - y=dy+gap)
          const f1 = iso(dx + gap, dy + gap, layerZ + sBH);
          const f2 = iso(dx + bL - gap, dy + gap, layerZ + sBH);
          const f3 = iso(dx + bL - gap, dy + gap, layerZ);
          const f4 = iso(dx + gap, dy + gap, layerZ);
          drawPolygon(ctx, [f1, f2, f3, f4], boxFill, boxStroke);

          // 右面 (x=dx+bL-gap)
          const r1 = iso(dx + bL - gap, dy + gap, layerZ + sBH);
          const r2 = iso(dx + bL - gap, dy + bW - gap, layerZ + sBH);
          const r3 = iso(dx + bL - gap, dy + bW - gap, layerZ);
          const r4 = iso(dx + bL - gap, dy + gap, layerZ);
          drawPolygon(ctx, [r1, r2, r3, r4], darken(boxFill, 15), boxStroke);

          // 正面标签 (仅在第一层第一个箱体可见面画文字)
          if (layer === 0 && col === 0 && row === 0) {
            // 在左侧面画产品名
            const labelCx = (f1[0] + f2[0] + f3[0] + f4[0]) / 4;
            const labelCy = (f1[1] + f2[1] + f3[1] + f4[1]) / 4;
            ctx.save();
            ctx.fillStyle = C.brown;
            ctx.font = `bold ${Math.min(14, bL * cosA * 0.3)}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(productName || '产品', labelCx, labelCy);
            ctx.restore();
          }
        }
      }
      currentW += secW;
    }
  }
}

/** 绘制高度标注信息 */
function drawHeightAnnotation(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, plan: PalletPlan, pallet: PalletDimensions, maxHeight: number) {
  const totalH = plan.totalHeight;
  const boxTotalH = plan.boxStackHeight * plan.layers;
  const palletH = pallet.height;

  // 蓝色竖线
  const lineX = x + 15;
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lineX, y + 10);
  ctx.lineTo(lineX, y + h - 10);
  ctx.stroke();

  // 上箭头
  ctx.beginPath();
  ctx.moveTo(lineX, y + 5);
  ctx.lineTo(lineX - 5, y + 15);
  ctx.lineTo(lineX + 5, y + 15);
  ctx.closePath();
  ctx.fillStyle = C.blueLine;
  ctx.fill();

  // 下箭头
  ctx.beginPath();
  ctx.moveTo(lineX, y + h - 5);
  ctx.lineTo(lineX - 5, y + h - 15);
  ctx.lineTo(lineX + 5, y + h - 15);
  ctx.closePath();
  ctx.fill();

  // 文字区域
  let ty = y + 30;
  ctx.textAlign = 'left';

  // 托盘总高度
  ctx.fillStyle = C.black;
  ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.fillText('托盘总高度', x + 30, ty);
  ty += 30;

  ctx.fillStyle = C.red;
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
  ctx.fillText(`${totalH} 毫米`, x + 30, ty);
  ty += 25;

  ctx.fillStyle = C.blue;
  ctx.font = '16px "Microsoft YaHei", sans-serif';
  ctx.fillText(`(不超过 ${maxHeight} 毫米)`, x + 30, ty);
  ty += 45;

  // 分项
  ctx.fillStyle = C.black;
  ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.fillText(`箱体高度 ${plan.boxStackHeight} 毫米`, x + 30, ty);
  ty += 30;
  ctx.fillText(`层数: ${plan.layers} 层`, x + 30, ty);
  ty += 30;
  ctx.fillText(`= ${boxTotalH} 毫米`, x + 30, ty);
  ty += 40;
  ctx.fillText(`托盘高度 ${palletH} 毫米`, x + 30, ty);
  ty += 50;

  // 总高度确认
  ctx.fillStyle = C.black;
  ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.fillText('总高度', x + 30, ty);
  ty += 30;

  ctx.fillStyle = C.red;
  ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
  ctx.fillText(`${totalH} 毫米`, x + 30, ty);
  ty += 25;

  const ok = plan.heightOk;
  ctx.fillStyle = ok ? C.blue : C.red;
  ctx.font = '16px "Microsoft YaHei", sans-serif';
  ctx.fillText(ok ? '(符合要求)' : '(超出限制!)', x + 30, ty);

  // 蓝色分段横线 - 箱体总高
  const boxRatio = boxTotalH / totalH;
  const boxLineY = y + 10 + (1 - boxRatio) * (h - 20);
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(lineX - 10, boxLineY);
  ctx.lineTo(lineX + 25, boxLineY);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** 绘制信息汇总 */
function drawSummary(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, plan: PalletPlan, pallet: PalletDimensions, maxHeight: number) {
  // 米色背景
  roundRect(ctx, x, y, w, h, 8, C.cream);
  ctx.strokeStyle = C.creamBorder;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // 标题
  const titleW = 200;
  drawSectionTitle(ctx, x + 15, y - 18, titleW, '信息汇总');

  // 内容 - 两列
  const leftItems = [
    `箱体尺寸: ${plan.originalBox.width} × ${plan.originalBox.length} × ${plan.originalBox.height} 毫米`,
    `堆码方式: ${plan.countAlongLength} × ${plan.countAlongWidth} × ${plan.layers}`,
    `每层箱数: ${plan.boxesPerLayer} 箱`,
    `层数: ${plan.layers} 层`,
  ];

  const rightItems = [
    `每托箱数: ${plan.totalBoxes} 箱`,
    `托盘尺寸: ${pallet.width} × ${pallet.length} × ${pallet.height} 毫米`,
    `托盘总高度: ${plan.totalHeight} 毫米 (不超过 ${maxHeight} 毫米)`,
    `可使用标准运输及仓储设备作业`,
  ];

  ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';

  const colW = (w - 80) / 2;
  const startY = y + 40;
  const lineH = 28;

  leftItems.forEach((item, i) => {
    const iy = startY + i * lineH;
    ctx.fillStyle = C.green;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('✓', x + 30, iy);
    ctx.fillStyle = C.black;
    ctx.font = '17px "Microsoft YaHei", sans-serif';
    ctx.fillText(item, x + 55, iy);
  });

  rightItems.forEach((item, i) => {
    const iy = startY + i * lineH;
    const ix = x + colW + 50;
    ctx.fillStyle = C.green;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('✓', ix, iy);
    ctx.fillStyle = C.black;
    ctx.font = '17px "Microsoft YaHei", sans-serif';
    ctx.fillText(item, ix + 25, iy);
  });
}

// ===== 通用绘图工具 =====

function drawPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], fill: string, stroke: string) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawDimensionLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, position: 'bottom' | 'left' | 'right') {
  ctx.strokeStyle = C.blueLine;
  ctx.lineWidth = 1.5;

  // 主线
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // 箭头
  const arrowSize = 6;
  if (position === 'bottom') {
    // 左箭头
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + arrowSize, y1 - arrowSize / 2);
    ctx.lineTo(x1 + arrowSize, y1 + arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = C.blueLine;
    ctx.fill();
    // 右箭头
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowSize, y2 - arrowSize / 2);
    ctx.lineTo(x2 - arrowSize, y2 + arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    // 文字
    ctx.fillStyle = C.blue;
    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, (x1 + x2) / 2, y1 + 22);
  } else {
    const isLeft = position === 'left';
    const dir = isLeft ? -1 : 1;
    // 上箭头
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - dir * arrowSize / 2, y1 + arrowSize);
    ctx.lineTo(x1 + dir * arrowSize / 2, y1 + arrowSize);
    ctx.closePath();
    ctx.fillStyle = C.blueLine;
    ctx.fill();
    // 下箭头
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - dir * arrowSize / 2, y2 - arrowSize);
    ctx.lineTo(x2 + dir * arrowSize / 2, y2 - arrowSize);
    ctx.closePath();
    ctx.fill();
    // 文字 - 旋转90度
    ctx.save();
    ctx.fillStyle = C.blue;
    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    const midX = (x1 + x2) / 2 + (isLeft ? -20 : 20);
    const midY = (y1 + y2) / 2;
    ctx.translate(midX, midY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function lighten(color: string, amount: number): string {
  const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!m) return color;
  const r = Math.min(255, parseInt(m[1]) + amount);
  const g = Math.min(255, parseInt(m[2]) + amount);
  const b = Math.min(255, parseInt(m[3]) + amount);
  return `rgb(${r},${g},${b})`;
}

function darken(color: string, amount: number): string {
  const m = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!m) return color;
  const r = Math.max(0, parseInt(m[1]) - amount);
  const g = Math.max(0, parseInt(m[2]) - amount);
  const b = Math.max(0, parseInt(m[3]) - amount);
  return `rgb(${r},${g},${b})`;
}
