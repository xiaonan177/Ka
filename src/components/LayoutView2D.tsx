"use client";

import { useEffect, useRef } from "react";
import type { PalletPlan } from "@/lib/palletize";

interface LayoutView2DProps {
  plan: PalletPlan;
  palletLength: number;
  palletWidth: number;
  palletHeight: number;
  productName: string;
}

/**
 * 2D排版视图：俯视图 + 侧视图
 * 使用Canvas绘制，保证精确的尺寸标注
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

    // 计算缩放：托盘映射到画布
    const padding = 50;
    const availW = displayWidth - padding * 2;
    const availH = displayHeight - padding * 2;
    const scale = Math.min(availW / palletLength, availH / palletWidth);

    const palletDrawW = palletLength * scale;
    const palletDrawH = palletWidth * scale;
    const offsetX = (displayWidth - palletDrawW) / 2;
    const offsetY = (displayHeight - palletDrawH) / 2;

    // 绘制托盘边框
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, palletDrawW, palletDrawH);

    // 绘制托盘填充
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(offsetX, offsetY, palletDrawW, palletDrawH);

    // 绘制箱体排列
    const boxW = plan.boxOnPalletLength * scale;
    const boxH = plan.boxOnPalletWidth * scale;

    for (let row = 0; row < plan.countAlongWidth; row++) {
      for (let col = 0; col < plan.countAlongLength; col++) {
        const x = offsetX + col * boxW;
        const y = offsetY + row * boxH;

        // 箱体填充
        ctx.fillStyle = "#C4A882";
        ctx.fillRect(x + 1, y + 1, boxW - 2, boxH - 2);

        // 箱体边框
        ctx.strokeStyle = "#9B8B72";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 1, y + 1, boxW - 2, boxH - 2);

        // 如果箱子够大，显示产品名
        if (boxW > 30 && boxH > 20 && productName) {
          ctx.fillStyle = "#5C4B33";
          ctx.font = `${Math.min(9, boxW / 4)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(productName, x + boxW / 2, y + boxH / 2, boxW - 6);
        }
      }
    }

    // 尺寸标注 - 长度方向
    const annotY = offsetY + palletDrawH + 20;
    ctx.strokeStyle = "#3B82F6";
    ctx.fillStyle = "#3B82F6";
    ctx.lineWidth = 1;

    // 长度标注线
    ctx.beginPath();
    ctx.moveTo(offsetX, annotY);
    ctx.lineTo(offsetX + palletDrawW, annotY);
    ctx.stroke();

    // 端点
    ctx.beginPath();
    ctx.moveTo(offsetX, annotY - 4);
    ctx.lineTo(offsetX, annotY + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offsetX + palletDrawW, annotY - 4);
    ctx.lineTo(offsetX + palletDrawW, annotY + 4);
    ctx.stroke();

    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${palletLength} mm`, offsetX + palletDrawW / 2, annotY + 14);

    // 宽度标注线
    const annotX = offsetX - 20;
    ctx.beginPath();
    ctx.moveTo(annotX, offsetY);
    ctx.lineTo(annotX, offsetY + palletDrawH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(annotX - 4, offsetY);
    ctx.lineTo(annotX + 4, offsetY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(annotX - 4, offsetY + palletDrawH);
    ctx.lineTo(annotX + 4, offsetY + palletDrawH);
    ctx.stroke();

    ctx.save();
    ctx.translate(annotX - 14, offsetY + palletDrawH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(`${palletWidth} mm`, 0, 0);
    ctx.restore();

    // 排列数量标注
    ctx.fillStyle = "#64748B";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `排列: ${plan.countAlongLength} × ${plan.countAlongWidth} = ${plan.boxesPerLayer} 箱/层`,
      displayWidth / 2,
      18
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

    // 侧视图：展示高度堆叠
    const padding = 50;
    const totalHeight = plan.totalHeight;
    const availW = displayWidth - padding * 2;
    const availH = displayHeight - padding * 2;

    // 托盘宽度（侧面看的宽度 = 托盘长度方向，取一个合理的宽度显示）
    const sideViewPalletW = palletLength;
    const scale = Math.min(availW / sideViewPalletW, availH / totalHeight);

    const palletDrawW = sideViewPalletW * scale;
    const totalDrawH = totalHeight * scale;
    const offsetX = (displayWidth - palletDrawW) / 2;
    const baseY = (displayHeight + totalDrawH) / 2; // 底部对齐

    // 绘制托盘
    const pH = palletHeight * scale;
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
    const boxDrawW = plan.boxOnPalletLength * scale * plan.countAlongLength;
    const boxDrawH = plan.boxStackHeight * scale;
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

      // 如果空间足够，标注层数
      if (boxDrawH > 12) {
        ctx.fillStyle = "#5C4B33";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`第${layer + 1}层`, boxOffsetX + boxDrawW / 2, y + boxDrawH / 2 + 3);
      }
    }

    // 高度标注 - 右侧
    const annotX = boxOffsetX + boxDrawW + 20;
    const topY = baseY - pH - plan.layers * boxDrawH;

    ctx.strokeStyle = "#3B82F6";
    ctx.fillStyle = "#3B82F6";
    ctx.lineWidth = 1;

    // 总高度标注
    ctx.beginPath();
    ctx.moveTo(annotX, baseY);
    ctx.lineTo(annotX, topY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(annotX - 4, baseY);
    ctx.lineTo(annotX + 4, baseY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(annotX - 4, topY);
    ctx.lineTo(annotX + 4, topY);
    ctx.stroke();

    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${plan.totalHeight} mm`, annotX + 6, (baseY + topY) / 2 + 3);

    // 箱体高度分标注
    const boxTotalH = plan.layers * plan.boxStackHeight;
    const boxTopY = baseY - pH - boxTotalH * scale;
    ctx.strokeStyle = "#F59E0B";
    ctx.fillStyle = "#F59E0B";

    const annotX2 = annotX + 50;
    ctx.beginPath();
    ctx.moveTo(annotX2, baseY - pH);
    ctx.lineTo(annotX2, boxTopY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(annotX2 - 4, baseY - pH);
    ctx.lineTo(annotX2 + 4, baseY - pH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(annotX2 - 4, boxTopY);
    ctx.lineTo(annotX2 + 4, boxTopY);
    ctx.stroke();

    ctx.font = "9px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${boxTotalH}`, annotX2 + 6, (baseY - pH + boxTopY) / 2 + 3);

    // 标题
    ctx.fillStyle = "#64748B";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`侧视图: ${plan.layers} 层`, displayWidth / 2, 18);
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
          <canvas ref={topViewRef} className="w-full" style={{ height: 240 }} />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-slate-500 text-center">侧视图（堆叠高度）</h4>
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <canvas ref={sideViewRef} className="w-full" style={{ height: 240 }} />
        </div>
      </div>
    </div>
  );
}
