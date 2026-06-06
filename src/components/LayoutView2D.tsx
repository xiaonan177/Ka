"use client";

import { useEffect, useRef } from "react";
import type { PalletPlan } from "@/lib/palletize";
import { mmToDm } from "@/lib/palletize";

interface LayoutView2DProps {
  plan: PalletPlan;
  palletLength: number;
  palletWidth: number;
  palletHeight: number;
  productName: string;
}

/**
 * 2D排版视图：俯视图 + 侧视图
 * 以分米(dm)为画图缩放单位，1:1比例绘制，标注实际毫米尺寸
 * 支持混合方向排列（sections）
 */
export function LayoutView2D({ plan, palletLength, palletWidth, palletHeight, productName }: LayoutView2DProps) {
  const topViewRef = useRef<HTMLCanvasElement>(null);
  const sideViewRef = useRef<HTMLCanvasElement>(null);

  const drawTopView = () => {
    const canvas = topViewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    // 清空
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 以分米(dm)为单位进行1:1缩放
    // 托盘尺寸转dm
    const palletLdm = mmToDm(palletLength);
    const palletWdm = mmToDm(palletWidth);

    // 计算缩放：托盘映射到画布，保持1:1宽高比
    const padding = 55;
    const availW = displayWidth - padding * 2;
    const availH = displayHeight - padding * 2;
    // 1dm = scale个像素
    const scale = Math.min(availW / palletLdm, availH / palletWdm);

    const palletDrawW = palletLdm * scale;
    const palletDrawH = palletWdm * scale;
    const offsetX = (displayWidth - palletDrawW) / 2;
    const offsetY = (displayHeight - palletDrawH) / 2;

    // 绘制托盘填充
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(offsetX, offsetY, palletDrawW, palletDrawH);

    // 绘制托盘边框
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, palletDrawW, palletDrawH);

    // 绘制箱体排列（按sections，支持混合方向）
    const sections = plan.sections || [];
    let currentY = offsetY; // 沿宽度方向偏移

    // 如果没有sections，退化到单一方向
    if (sections.length === 0) {
      const boxW = mmToDm(plan.boxOnPalletLength) * scale;
      const boxH = mmToDm(plan.boxOnPalletWidth) * scale;
      for (let row = 0; row < plan.countAlongWidth; row++) {
        for (let col = 0; col < plan.countAlongLength; col++) {
          const x = offsetX + col * boxW;
          const y = offsetY + row * boxH;
          drawSingleBox(ctx, x, y, boxW, boxH, productName, 0);
        }
      }
    } else {
      // 按section绘制，每个section占据不同的宽度行
      sections.forEach((section, secIdx) => {
        const boxW = mmToDm(section.boxAlongLength) * scale;
        const boxH = mmToDm(section.boxAlongWidth) * scale;
        const sectionHeight = section.countAlongWidth * boxH;

        for (let row = 0; row < section.countAlongWidth; row++) {
          for (let col = 0; col < section.countAlongLength; col++) {
            const x = offsetX + col * boxW;
            const y = currentY + row * boxH;
            drawSingleBox(ctx, x, y, boxW, boxH, productName, secIdx);
          }
        }
        currentY += sectionHeight;
      });
    }

    // 尺寸标注 - 长度方向（下方）
    drawDimensionH(ctx, offsetX, offsetY + palletDrawH + 15, palletDrawW, `${palletLength} mm`);

    // 宽度标注线（左侧）
    drawDimensionV(ctx, offsetX - 15, offsetY, palletDrawH, `${palletWidth} mm`);

    // 如果是混合排列，在section之间标注分界
    if (sections.length > 1) {
      let divY = offsetY;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1;
      for (let i = 0; i < sections.length - 1; i++) {
        divY += mmToDm(sections[i].usedWidth) * scale;
        ctx.beginPath();
        ctx.moveTo(offsetX, divY);
        ctx.lineTo(offsetX + palletDrawW, divY);
        ctx.stroke();

        // 标注该段排列数量
        ctx.fillStyle = "#64748B";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(
          `${sections[i].countAlongLength}×${sections[i].countAlongWidth}`,
          offsetX + palletDrawW - 4,
          divY - mmToDm(sections[i].usedWidth) * scale / 2 + 3
        );
      }
      // 最后一段标注
      const lastSec = sections[sections.length - 1];
      ctx.fillText(
        `${lastSec.countAlongLength}×${lastSec.countAlongWidth}`,
        offsetX + palletDrawW - 4,
        divY + mmToDm(lastSec.usedWidth) * scale / 2 + 3
      );
      ctx.setLineDash([]);
    }

    // 排列数量标注（标题）
    ctx.fillStyle = "#64748B";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `排列: ${plan.countAlongLength} × ${plan.countAlongWidth} = ${plan.boxesPerLayer} 箱/层`,
      displayWidth / 2,
      16
    );
  };

  const drawSideView = () => {
    const canvas = sideViewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // 侧视图：展示高度堆叠，以分米为单位1:1缩放
    const padding = 55;
    const totalHeight = plan.totalHeight;

    // 侧视图宽度 = 托盘长度方向
    const sideViewPalletLdm = mmToDm(palletLength);
    const totalHdm = mmToDm(totalHeight);
    const availW = displayWidth - padding * 2;
    const availH = displayHeight - padding * 2;
    const scale = Math.min(availW / sideViewPalletLdm, availH / totalHdm);

    const palletDrawW = sideViewPalletLdm * scale;
    const totalDrawH = totalHdm * scale;
    const offsetX = (displayWidth - palletDrawW) / 2;
    const baseY = (displayHeight + totalDrawH) / 2; // 底部对齐

    // 绘制托盘
    const pH = mmToDm(palletHeight) * scale;
    ctx.fillStyle = "#374151";
    ctx.fillRect(offsetX, baseY - pH, palletDrawW, pH);
    ctx.strokeStyle = "#1F2937";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, baseY - pH, palletDrawW, pH);

    // 托盘标签
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("托盘", offsetX + palletDrawW / 2, baseY - pH / 2 + 3);

    // 绘制各层箱体
    const sections = plan.sections || [];
    // 侧视图看的是长度方向，箱体宽度取覆盖长度
    const coverageLength = plan.coverageLength || (plan.countAlongLength * plan.boxOnPalletLength);
    const boxDrawW = mmToDm(coverageLength) * scale;
    const boxDrawH = mmToDm(plan.boxStackHeight) * scale;
    const boxOffsetX = offsetX + (palletDrawW - boxDrawW) / 2;

    for (let layer = 0; layer < plan.layers; layer++) {
      const y = baseY - pH - (layer + 1) * boxDrawH;

      // 层背景
      ctx.fillStyle = layer % 2 === 0 ? "#C4A882" : "#B8A07A";
      ctx.fillRect(boxOffsetX, y, boxDrawW, boxDrawH);

      // 层边框
      ctx.strokeStyle = "#9B8B72";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(boxOffsetX, y, boxDrawW, boxDrawH);

      // 层数标注
      if (boxDrawH > 12) {
        ctx.fillStyle = "#5C4B33";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`第${layer + 1}层`, boxOffsetX + boxDrawW / 2, y + boxDrawH / 2 + 3);
      }
    }

    // 总高度标注 - 右侧
    const topY = baseY - pH - plan.layers * boxDrawH;
    const annotX = boxOffsetX + boxDrawW + 18;
    drawDimensionV(ctx, annotX, topY, baseY - topY, `${plan.totalHeight} mm`);

    // 箱体高度分标注（右侧偏移）
    const boxTotalH = plan.layers * plan.boxStackHeight;
    const boxTopY = baseY - pH - mmToDm(boxTotalH) * scale;
    const annotX2 = annotX + 45;
    ctx.strokeStyle = "#F59E0B";
    ctx.fillStyle = "#F59E0B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(annotX2, baseY - pH);
    ctx.lineTo(annotX2, boxTopY);
    ctx.stroke();
    // 端点
    ctx.beginPath();
    ctx.moveTo(annotX2 - 3, baseY - pH);
    ctx.lineTo(annotX2 + 3, baseY - pH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(annotX2 - 3, boxTopY);
    ctx.lineTo(annotX2 + 3, boxTopY);
    ctx.stroke();
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`箱体 ${boxTotalH}mm`, annotX2 + 5, (baseY - pH + boxTopY) / 2 + 3);

    // 托盘高度标注
    const annotX3 = annotX + 45;
    ctx.strokeStyle = "#3B82F6";
    ctx.fillStyle = "#3B82F6";
    const palletTopY = baseY - pH;
    ctx.beginPath();
    ctx.moveTo(annotX3 + 30, baseY);
    ctx.lineTo(annotX3 + 30, palletTopY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(annotX3 + 27, baseY);
    ctx.lineTo(annotX3 + 33, baseY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(annotX3 + 27, palletTopY);
    ctx.lineTo(annotX3 + 33, palletTopY);
    ctx.stroke();
    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`托盘 ${palletHeight}mm`, annotX3 + 35, (baseY + palletTopY) / 2 + 3);

    // 合规性标注
    if (plan.heightOk) {
      ctx.fillStyle = "#10B981";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("✓ 符合要求", annotX2 + 5, topY - 6);
    } else {
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("⚠ 超出限制", annotX2 + 5, topY - 6);
    }

    // 标题
    ctx.fillStyle = "#64748B";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`侧视图: ${plan.layers} 层`, displayWidth / 2, 16);
  };

  useEffect(() => {
    drawTopView();
    drawSideView();
  }, [plan, palletLength, palletWidth, palletHeight, productName]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-slate-500 text-center">俯视图（单层排列方式）</h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <canvas ref={topViewRef} className="w-full" style={{ height: 280 }} />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-slate-500 text-center">侧视图（堆叠高度）</h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <canvas ref={sideViewRef} className="w-full" style={{ height: 280 }} />
        </div>
      </div>
    </div>
  );
}

/** 绘制单个箱体 */
function drawSingleBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  productName: string,
  sectionIdx: number
) {
  // 不同section用微妙色差区分
  const fills = ["#C4A882", "#BFA278"];
  const strokes = ["#9B8B72", "#93816A"];

  ctx.fillStyle = fills[sectionIdx % fills.length];
  ctx.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.strokeStyle = strokes[sectionIdx % strokes.length];
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // 如果箱子够大，显示产品名
  if (w > 30 && h > 20 && productName) {
    ctx.fillStyle = "#5C4B33";
    ctx.font = `${Math.min(9, w / 4)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(productName, x + w / 2, y + h / 2, w - 6);
  }
}

/** 水平尺寸标注线 */
function drawDimensionH(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string
) {
  ctx.strokeStyle = "#3B82F6";
  ctx.fillStyle = "#3B82F6";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + width, y - 4);
  ctx.lineTo(x + width, y + 4);
  ctx.stroke();

  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x + width / 2, y + 14);
}

/** 垂直尺寸标注线 */
function drawDimensionV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  label: string
) {
  ctx.strokeStyle = "#3B82F6";
  ctx.fillStyle = "#3B82F6";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 4, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 4, y + height);
  ctx.lineTo(x + 4, y + height);
  ctx.stroke();

  ctx.save();
  ctx.translate(x - 12, y + height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}
