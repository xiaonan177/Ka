"use client";

import { useMemo } from "react";
import type { PalletPlan, PalletDimensions, LayerSection } from "@/lib/palletize";

interface LayerExplodedViewProps {
  plan: PalletPlan;
  pallet: PalletDimensions;
  productName: string;
}

/** 箱体颜色 - 按层渐变，从暖棕到深棕 */
const LAYER_COLORS = [
  "#D4A574", // 第1层 - 浅瓦楞色
  "#C49B64", // 第2层
  "#B48F54", // 第3层
  "#A48344", // 第4层
  "#947734", // 第5层
  "#846B24", // 第6层
  "#745F14", // 第7层
  "#645304", // 第8层+
];

/** 毫米转画布像素的比例因子 - 基于分米单位 */
const MM_TO_DM = 0.01; // 1mm = 0.01dm

export function LayerExplodedView({ plan, pallet, productName }: LayerExplodedViewProps) {
  const { sections, layers, boxesPerLayer, boxStackHeight, totalHeight } = plan;

  /** 绘制单层的俯视图 */
  const drawLayer = useMemo(() => {
    return (canvas: HTMLCanvasElement, layerIndex: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;

      // 画布尺寸设定
      const canvasDisplayWidth = 460;
      const canvasDisplayHeight = 320;
      canvas.width = canvasDisplayWidth * dpr;
      canvas.height = canvasDisplayHeight * dpr;
      canvas.style.width = `${canvasDisplayWidth}px`;
      canvas.style.height = `${canvasDisplayHeight}px`;
      ctx.scale(dpr, dpr);

      // 绘图区域（留出标注空间）
      const margin = { top: 32, right: 50, bottom: 50, left: 50 };
      const drawWidth = canvasDisplayWidth - margin.left - margin.right;
      const drawHeight = canvasDisplayHeight - margin.top - margin.bottom;

      // 托盘在dm单位下的尺寸
      const palletLDm = pallet.length * MM_TO_DM;
      const palletWDm = pallet.width * MM_TO_DM;

      // 缩放：让托盘适配绘图区域
      const scale = Math.min(drawWidth / palletLDm, drawHeight / palletWDm);

      // 托盘绘制区域（居中）
      const palletDrawW = palletLDm * scale;
      const palletDrawH = palletWDm * scale;
      const offsetX = margin.left + (drawWidth - palletDrawW) / 2;
      const offsetY = margin.top + (drawHeight - palletDrawH) / 2;

      // 背景
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasDisplayWidth, canvasDisplayHeight);

      // 标题
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 13px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `第 ${layerIndex + 1} 层（共 ${layers} 层）`,
        canvasDisplayWidth / 2,
        20
      );

      // 绘制托盘底板
      ctx.fillStyle = "#F1F5F9";
      ctx.fillRect(offsetX, offsetY, palletDrawW, palletDrawH);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(offsetX, offsetY, palletDrawW, palletDrawH);

      // 托盘网格纹理
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 0.5;
      const gridStep = 1 * scale; // 1dm 网格
      for (let gx = gridStep; gx < palletDrawW; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(offsetX + gx, offsetY);
        ctx.lineTo(offsetX + gx, offsetY + palletDrawH);
        ctx.stroke();
      }
      for (let gy = gridStep; gy < palletDrawH; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + gy);
        ctx.lineTo(offsetX + palletDrawW, offsetY + gy);
        ctx.stroke();
      }

      // 绘制各排列区域的箱体
      const layerColor = LAYER_COLORS[layerIndex % LAYER_COLORS.length];
      const darkerColor = LAYER_COLORS[Math.min(layerIndex + 1, LAYER_COLORS.length - 1)];

      let currentY = offsetY;
      sections.forEach((section: LayerSection, secIdx: number) => {
        const secHeight = section.countAlongWidth * section.boxAlongWidth * MM_TO_DM * scale;
        const secWidth = section.countAlongLength * section.boxAlongLength * MM_TO_DM * scale;

        // 绘制该区域的箱子
        for (let row = 0; row < section.countAlongWidth; row++) {
          for (let col = 0; col < section.countAlongLength; col++) {
            const boxW = section.boxAlongLength * MM_TO_DM * scale;
            const boxH = section.boxAlongWidth * MM_TO_DM * scale;
            const bx = offsetX + col * boxW;
            const by = currentY + row * boxH;

            // 箱体填充
            ctx.fillStyle = layerColor;
            ctx.fillRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

            // 箱体边框
            ctx.strokeStyle = darkerColor;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

            // 箱体内产品名（如果空间足够）
            if (boxW > 35 && boxH > 20 && productName) {
              ctx.fillStyle = "#5D4037";
              ctx.font = `${Math.min(9, boxH * 0.35)}px 'PingFang SC', sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              const displayName = productName.length > 4 ? productName.slice(0, 4) : productName;
              ctx.fillText(displayName, bx + boxW / 2, by + boxH / 2);
            }
          }
        }

        // 混合排列时，区域之间画虚线分界
        if (sections.length > 1 && secIdx < sections.length - 1) {
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(offsetX, currentY + secHeight);
          ctx.lineTo(offsetX + palletDrawW, currentY + secHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        currentY += section.countAlongWidth * section.boxAlongWidth * MM_TO_DM * scale;
      });

      // 尺寸标注 - 托盘长度（底部）
      const dimY = offsetY + palletDrawH + 12;
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1;
      // 左端线
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + palletDrawH + 4);
      ctx.lineTo(offsetX, dimY + 4);
      ctx.stroke();
      // 右端线
      ctx.beginPath();
      ctx.moveTo(offsetX + palletDrawW, offsetY + palletDrawH + 4);
      ctx.lineTo(offsetX + palletDrawW, dimY + 4);
      ctx.stroke();
      // 横线
      ctx.beginPath();
      ctx.moveTo(offsetX + 3, dimY);
      ctx.lineTo(offsetX + palletDrawW - 3, dimY);
      ctx.stroke();
      // 箭头
      ctx.beginPath();
      ctx.moveTo(offsetX, dimY);
      ctx.lineTo(offsetX + 6, dimY - 3);
      ctx.lineTo(offsetX + 6, dimY + 3);
      ctx.fillStyle = "#3B82F6";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(offsetX + palletDrawW, dimY);
      ctx.lineTo(offsetX + palletDrawW - 6, dimY - 3);
      ctx.lineTo(offsetX + palletDrawW - 6, dimY + 3);
      ctx.fill();
      // 文字
      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 11px ui-monospace, 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${pallet.length}`, offsetX + palletDrawW / 2, dimY + 4);

      // 尺寸标注 - 托盘宽度（右侧）
      const dimX = offsetX + palletDrawW + 12;
      // 上端线
      ctx.beginPath();
      ctx.moveTo(offsetX + palletDrawW + 4, offsetY);
      ctx.lineTo(dimX + 4, offsetY);
      ctx.stroke();
      // 下端线
      ctx.beginPath();
      ctx.moveTo(offsetX + palletDrawW + 4, offsetY + palletDrawH);
      ctx.lineTo(dimX + 4, offsetY + palletDrawH);
      ctx.stroke();
      // 竖线
      ctx.beginPath();
      ctx.moveTo(dimX, offsetY + 3);
      ctx.lineTo(dimX, offsetY + palletDrawH - 3);
      ctx.stroke();
      // 箭头
      ctx.beginPath();
      ctx.moveTo(dimX, offsetY);
      ctx.lineTo(dimX - 3, offsetY + 6);
      ctx.lineTo(dimX + 3, offsetY + 6);
      ctx.fillStyle = "#3B82F6";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dimX, offsetY + palletDrawH);
      ctx.lineTo(dimX - 3, offsetY + palletDrawH - 6);
      ctx.lineTo(dimX + 3, offsetY + palletDrawH - 6);
      ctx.fill();
      // 文字（旋转）
      ctx.save();
      ctx.translate(dimX + 14, offsetY + palletDrawH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#3B82F6";
      ctx.font = "bold 11px ui-monospace, 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${pallet.width}`, 0, 0);
      ctx.restore();

      // 箱数标注
      ctx.fillStyle = "#1E293B";
      ctx.font = "11px 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${boxesPerLayer} 箱/层`, offsetX + 4, offsetY + 4);
    };
  }, [sections, layers, boxesPerLayer, pallet.length, pallet.width, productName]);

  return (
    <div className="space-y-4">
      {/* 层级选择与3D爆炸视图 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">分层展示</h3>

        {/* 爆炸式3D侧视图 - 每层分离展示，带高度标注 */}
        <div className="mb-4">
          <ExplodedSideView
            plan={plan}
            pallet={pallet}
            productName={productName}
          />
        </div>

        {/* 每层俯视图列表 */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: layers }, (_, i) => (
            <LayerCanvas
              key={i}
              layerIndex={i}
              drawFn={drawLayer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 单层Canvas组件 */
function LayerCanvas({
  layerIndex,
  drawFn,
}: {
  layerIndex: number;
  drawFn: (canvas: HTMLCanvasElement, layerIndex: number) => void;
}) {
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
      <canvas
        ref={(el) => {
          if (el) drawFn(el, layerIndex);
        }}
      />
    </div>
  );
}

/** 爆炸式侧视图 - 各层分离展示，带高度标注线 */
function ExplodedSideView({
  plan,
  pallet,
  productName,
}: {
  plan: PalletPlan;
  pallet: PalletDimensions;
  productName: string;
}) {
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = 640;
    const displayH = 320;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    const { layers, boxStackHeight, totalHeight, sections } = plan;
    const boxH = boxStackHeight; // 单层箱体高度(mm)
    const palletH = pallet.height; // 托盘高度(mm)

    // dm单位尺寸
    const palletLDm = pallet.length * MM_TO_DM;
    const palletHDm = palletH * MM_TO_DM;
    const boxHDm = boxH * MM_TO_DM;

    // 绘图区域
    const margin = { top: 30, right: 120, bottom: 25, left: 30 };
    const drawW = displayW - margin.left - margin.right;
    const drawH = displayH - margin.top - margin.bottom;

    // 堆叠总高度（dm）：托盘 + 所有层 + 层间间隔
    const gapDm = 0.3; // 层间间隔(dm) = 30mm
    const totalStackDm = palletHDm + layers * boxHDm + (layers - 1) * gapDm;

    // 缩放
    const scaleX = (drawW * 0.55) / palletLDm;
    const scaleY = (drawH * 0.9) / totalStackDm;
    const scale = Math.min(scaleX, scaleY);

    // 背景
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, displayW, displayH);

    // 标题
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 12px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("分层侧视图（爆炸展示）", displayW / 2, 18);

    // 定位：从底部往上画
    const palletDrawW = palletLDm * scale;
    const baseX = margin.left + (drawW * 0.55 - palletDrawW) / 2;
    let currentY = margin.top + drawH; // 底部起点

    // 绘制托盘
    const palletDrawH = palletHDm * scale;
    currentY -= palletDrawH;

    // 托盘主体
    ctx.fillStyle = "#374151";
    ctx.fillRect(baseX, currentY, palletDrawW, palletDrawH);
    // 托盘纹理 - 横线
    ctx.strokeStyle = "#4B5563";
    ctx.lineWidth = 0.5;
    for (let ly = 0; ly < palletDrawH; ly += 3) {
      ctx.beginPath();
      ctx.moveTo(baseX, currentY + ly);
      ctx.lineTo(baseX + palletDrawW, currentY + ly);
      ctx.stroke();
    }
    ctx.strokeStyle = "#1F2937";
    ctx.lineWidth = 1;
    ctx.strokeRect(baseX, currentY, palletDrawW, palletDrawH);

    // 托盘标注
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("托盘", baseX + palletDrawW / 2, currentY + palletDrawH / 2);

    // 绘制每一层
    let heightAccumMm = palletH; // 累计高度(mm)

    for (let i = 0; i < layers; i++) {
      currentY -= gapDm * scale; // 间隔
      const layerDrawH = boxHDm * scale;
      currentY -= layerDrawH;

      const layerColor = LAYER_COLORS[i % LAYER_COLORS.length];

      // 箱体层 - 使用sections确定实际宽度
      sections.forEach((section: LayerSection) => {
        const coverageLDm = section.countAlongLength * section.boxAlongLength * MM_TO_DM;
        const secDrawW = coverageLDm * scale;

        ctx.fillStyle = layerColor;
        ctx.fillRect(baseX, currentY, secDrawW, layerDrawH);
        ctx.strokeStyle = LAYER_COLORS[Math.min(i + 1, LAYER_COLORS.length - 1)];
        ctx.lineWidth = 0.8;
        ctx.strokeRect(baseX, currentY, secDrawW, layerDrawH);
      });

      // 层标签
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 10px 'PingFang SC', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `第${i + 1}层`,
        baseX + 4,
        currentY + layerDrawH / 2
      );

      // 产品名（如果空间够）
      if (productName && palletDrawW > 100) {
        ctx.fillStyle = "#5D4037";
        ctx.font = "9px 'PingFang SC', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          productName,
          baseX + palletDrawW / 2,
          currentY + layerDrawH / 2
        );
      }

      // 右侧高度标注线
      const lineX = baseX + palletDrawW + 15;
      const layerTop = currentY;
      const layerBottom = currentY + layerDrawH;

      // 端线
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(lineX - 4, layerTop);
      ctx.lineTo(lineX + 4, layerTop);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lineX - 4, layerBottom);
      ctx.lineTo(lineX + 4, layerBottom);
      ctx.stroke();

      // 竖线
      ctx.beginPath();
      ctx.moveTo(lineX, layerTop + 3);
      ctx.lineTo(lineX, layerBottom - 3);
      ctx.stroke();

      // 高度文字
      ctx.fillStyle = "#3B82F6";
      ctx.font = "10px ui-monospace, 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${boxH}`, lineX + 8, (layerTop + layerBottom) / 2);

      heightAccumMm += boxH;
    }

    // 最右侧：总高度标注线
    const totalLineX = baseX + palletDrawW + 65;
    const topY = currentY;
    const bottomY = margin.top + drawH; // 托盘底部

    ctx.strokeStyle = "#10B981";
    ctx.lineWidth = 1.2;
    // 上端线
    ctx.beginPath();
    ctx.moveTo(totalLineX - 5, topY);
    ctx.lineTo(totalLineX + 5, topY);
    ctx.stroke();
    // 下端线
    ctx.beginPath();
    ctx.moveTo(totalLineX - 5, bottomY);
    ctx.lineTo(totalLineX + 5, bottomY);
    ctx.stroke();
    // 竖线
    ctx.beginPath();
    ctx.moveTo(totalLineX, topY + 3);
    ctx.lineTo(totalLineX, bottomY - 3);
    ctx.stroke();

    // 总高度文字
    ctx.save();
    ctx.translate(totalLineX + 14, (topY + bottomY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = totalHeight <= (plan as PalletPlan & { _maxHeight?: number }).totalHeight ? "#10B981" : "#10B981";
    ctx.font = "bold 12px ui-monospace, 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`总高 ${totalHeight.toLocaleString()} mm`, 0, 0);
    ctx.restore();

    // 合规标注
    const heightOk = (plan as PalletPlan).heightOk;
    ctx.fillStyle = heightOk ? "#10B981" : "#F59E0B";
    ctx.font = "bold 10px 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      heightOk ? "✓ 符合要求" : "⚠ 超出限制",
      totalLineX + 14 + (displayW - totalLineX - 14) / 2 - 10,
      topY - 8
    );
  };

  return (
    <canvas ref={canvasRef} className="border border-slate-100 rounded-lg" />
  );
}
