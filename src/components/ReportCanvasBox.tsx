"use client";
import { useEffect, useRef } from "react";
import { TruckDimensions } from "@/lib/palletize";

interface BoxInput {
  productName: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  color: string;
  count: number;
}

interface BoxLoadResult {
  boxesAlongLength: number;
  boxesAlongWidth: number;
  boxesPerLayer: number;
  layers: number;
  totalBoxes: number;
  remainingBoxes: number;
  totalWeight: number;
  volumeUsed: number;
  coverageLength: number;
  coverageWidth: number;
  coverageHeight: number;
  lengthRemain: number;
  widthRemain: number;
}

interface ReportCanvasBoxProps {
  input: BoxInput;
  result: BoxLoadResult;
  truck: TruckDimensions;
}

export default function ReportCanvasBox({ input, result, truck }: ReportCanvasBoxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 600;
    canvas.width = W;
    canvas.height = H;

    // 背景
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    // 标题栏
    ctx.fillStyle = "#3E2723";
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("装箱计算报告", 20, 32);

    // 参数表格
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(20, 60, 350, 120);
    ctx.strokeStyle = "#E0E0E0";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 60, 350, 120);

    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    const params = [
      ["产品名称", input.productName || "未填写"],
      ["单箱尺寸", `${input.length}×${input.width}×${input.height}mm`],
      ["单箱重量", `${input.weight}kg`],
      ["总箱数", `${input.count}箱`],
      ["货柜", `${truck.name} (${truck.length}×${truck.width}×${truck.height}mm)`],
    ];
    params.forEach((p, i) => {
      ctx.fillText(`${p[0]}：${p[1]}`, 30, 80 + i * 22);
    });

    // 结果区域
    ctx.fillStyle = "#E8F5E9";
    ctx.fillRect(380, 60, 400, 120);
    ctx.strokeStyle = "#C8E6C9";
    ctx.strokeRect(380, 60, 400, 120);

    ctx.fillStyle = "#2E7D32";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("装载结果", 390, 80);
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    const results = [
      ["可装箱数", `${result.totalBoxes}箱`],
      ["剩余箱数", `${result.remainingBoxes}箱`],
      ["堆叠层数", `${result.layers}层`],
      ["每层箱数", `${result.boxesPerLayer}箱`],
      ["空间利用率", `${result.volumeUsed.toFixed(1)}%`],
    ];
    results.forEach((r, i) => {
      ctx.fillText(`${r[0]}：${r[1]}`, 390, 100 + i * 20);
    });

    // 俯视图
    ctx.fillStyle = "#333";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("货柜俯视图", 20, 200);

    const scale = Math.min((W - 60) / truck.length, (H - 260) / truck.width) * 0.8;
    const truckLeft = 20;
    const truckTop = 220;
    const truckW = truck.length * scale;
    const truckH = truck.width * scale;

    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.strokeRect(truckLeft, truckTop, truckW, truckH);

    // 绘制箱子
    const boxW = input.length * scale;
    const boxH = input.width * scale;
    ctx.fillStyle = input.color;
    for (let i = 0; i < result.boxesAlongLength; i++) {
      for (let j = 0; j < result.boxesAlongWidth; j++) {
        const x = truckLeft + i * boxW;
        const y = truckTop + j * boxH;
        ctx.fillRect(x + 1, y + 1, boxW - 2, boxH - 2);
        ctx.strokeStyle = "#8B7355";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, boxW - 2, boxH - 2);
      }
    }

    // 尺寸标注
    ctx.fillStyle = "#3B82F6";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${truck.length}mm`, truckLeft + truckW / 2, truckTop + truckH + 15);
    ctx.save();
    ctx.translate(truckLeft - 15, truckTop + truckH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${truck.width}mm`, 0, 0);
    ctx.restore();

    // 产品占用标注
    ctx.fillStyle = "#10B981";
    ctx.fillText(`产品占用: ${result.coverageLength}mm`, truckLeft + truckW / 2, truckTop + truckH + 30);

    // 信息汇总
    ctx.fillStyle = "#FFF3E0";
    ctx.fillRect(20, H - 80, W - 40, 60);
    ctx.strokeStyle = "#FFE0B2";
    ctx.strokeRect(20, H - 80, W - 40, 60);

    ctx.fillStyle = "#E65100";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("尺寸对比", 30, H - 60);
    ctx.fillStyle = "#333";
    ctx.font = "11px sans-serif";
    ctx.fillText(`长度: ${result.lengthRemain >= 0 ? `剩余${result.lengthRemain}mm` : `超出${-result.lengthRemain}mm`}`, 30, H - 40);
    ctx.fillText(`宽度: ${result.widthRemain >= 0 ? `剩余${result.widthRemain}mm` : `超出${-result.widthRemain}mm`}`, 200, H - 40);
    ctx.fillText(`高度: ${result.coverageHeight}mm / 货柜${truck.height}mm`, 400, H - 40);
  }, [input, result, truck]);

  return <canvas ref={canvasRef} className="border" />;
}