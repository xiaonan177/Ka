"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { TRUCK_PRESETS, TruckDimensions } from "@/lib/palletize";
import dynamic from "next/dynamic";

const ReportCanvasContainer = dynamic(() => import("@/components/ReportCanvasContainer"), {
  ssr: false,
});

interface PalletizedProduct {
  name: string;
  palletLength: number; // 打托后长度 mm
  palletWidth: number; // 打托后宽度 mm
  palletHeight: number; // 打托后高度 mm
  boxesPerPallet: number; // 每托箱数
  palletWeight: number; // 每托重量 kg
  palletCount: number; // 总托数
  color: string;
}

interface ContainerLoadResult {
  palletsAlongLength: number; // 货柜长度方向托数
  palletsAlongWidth: number; // 货柜宽度方向托数
  totalPallets: number; // 可装托数
  remainingPallets: number; // 剩余托数
  totalBoxes: number; // 可装箱数
  totalWeight: number; // 总重量 kg
  volumeUsed: number; // 体积利用率 %
  coverageLength: number; // 产品占用长度 mm
  coverageWidth: number; // 产品占用宽度 mm
  lengthRemain: number; // 长度剩余 mm
  widthRemain: number; // 宽度剩余 mm
  truck: TruckDimensions;
}

const DEFAULT_PRODUCT: PalletizedProduct = {
  name: "",
  palletLength: 1200,
  palletWidth: 1000,
  palletHeight: 1200,
  boxesPerPallet: 48,
  palletWeight: 500,
  palletCount: 20,
  color: "#C4A882",
};

function calculateContainerLoad(product: PalletizedProduct, truck: TruckDimensions): ContainerLoadResult[] {
  const results: ContainerLoadResult[] = [];

  // 尝试两种摆放方向
  const orientations = [
    { l: product.palletLength, w: product.palletWidth },
    { l: product.palletWidth, w: product.palletLength },
  ];

  for (const ori of orientations) {
    // 检查高度是否足够
    if (product.palletHeight > truck.height) continue;

    const palletsAlongLength = Math.floor(truck.length / ori.l);
    const palletsAlongWidth = Math.floor(truck.width / ori.w);
    const totalPallets = palletsAlongLength * palletsAlongWidth;

    if (totalPallets > 0) {
      const coverageLength = palletsAlongLength * ori.l;
      const coverageWidth = palletsAlongWidth * ori.w;
      const lengthRemain = truck.length - coverageLength;
      const widthRemain = truck.width - coverageWidth;

      const totalWeight = totalPallets * product.palletWeight;
      const palletVolume = product.palletLength * product.palletWidth * product.palletHeight;
      const truckVolume = truck.length * truck.width * truck.height;
      const volumeUsed = (totalPallets * palletVolume / truckVolume) * 100;

      results.push({
        palletsAlongLength,
        palletsAlongWidth,
        totalPallets,
        remainingPallets: Math.max(0, product.palletCount - totalPallets),
        totalBoxes: totalPallets * product.boxesPerPallet,
        totalWeight,
        volumeUsed,
        coverageLength,
        coverageWidth,
        lengthRemain,
        widthRemain,
        truck,
      });
    }
  }

  return results.sort((a, b) => b.totalPallets - a.totalPallets);
}

export function ContainerLoadingCalculator() {
  const [product, setProduct] = useState<PalletizedProduct>(DEFAULT_PRODUCT);
  const [truckType, setTruckType] = useState<string>("欧标卡车");
  const [truck, setTruck] = useState<TruckDimensions>(TRUCK_PRESETS[0]);
  const [results, setResults] = useState<ContainerLoadResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleTruckTypeChange = (type: string) => {
    setTruckType(type);
    if (type === "自定义") {
      setTruck({ name: "自定义", length: 0, width: 0, height: 0, maxWeight: 0 });
    } else {
      const preset = TRUCK_PRESETS.find((p) => p.name === type);
      if (preset) setTruck(preset);
    }
  };

  const handleCalculate = useCallback(() => {
    const res = calculateContainerLoad(product, truck);
    setResults(res);
    setSelectedIdx(0);
  }, [product, truck]);

  const selectedResult = results[selectedIdx];

  // 绘制俯视图
  useEffect(() => {
    if (!selectedResult || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 计算缩放比例：画布可用空间 / 货柜尺寸（mm）
    const scale = Math.min(
      (canvas.width - 80) / truck.length,
      (canvas.height - 80) / truck.width
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制货柜轮廓
    const truckLeft = 40;
    const truckTop = 40;
    const truckW = truck.length * scale;
    const truckH = truck.width * scale;

    // 货柜背景
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(truckLeft, truckTop, truckW, truckH);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.strokeRect(truckLeft, truckTop, truckW, truckH);

    // 绘制托盘
    const palletW = product.palletLength * scale;
    const palletH = product.palletWidth * scale;

    for (let i = 0; i < selectedResult.palletsAlongLength; i++) {
      for (let j = 0; j < selectedResult.palletsAlongWidth; j++) {
        const x = truckLeft + i * palletW;
        const y = truckTop + j * palletH;
        
        // 托盘填充
        ctx.fillStyle = product.color || "#C4A882";
        ctx.fillRect(x + 2, y + 2, palletW - 4, palletH - 4);
        
        // 托盘边框
        ctx.strokeStyle = "#8B7355";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, palletW - 4, palletH - 4);

        // 托盘编号
        ctx.fillStyle = "#333";
        ctx.font = `${Math.max(8, Math.min(12, palletW / 6))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${i + 1}-${j + 1}`, x + palletW / 2, y + palletH / 2);
      }
    }

    // 尺寸标注
    ctx.fillStyle = "#3B82F6";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${truck.length}mm`, truckLeft + truckW / 2, truckTop + truckH + 20);
    ctx.save();
    ctx.translate(truckLeft - 20, truckTop + truckH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${truck.width}mm`, 0, 0);
    ctx.restore();
  }, [selectedResult, truck, product]);

  return (
    <div className="flex-1 flex h-full">
      {/* 左侧输入面板 */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto h-full">
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1">已打托产品</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-600">产品名称</label>
              <input
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                placeholder="可选"
              />
            </div>
            <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
              <strong>说明：</strong>底部使用滑托纸，无托盘
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-600">托长</label>
                <input
                  type="number"
                  value={product.palletLength}
                  onChange={(e) => setProduct({ ...product, palletLength: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">托宽</label>
                <input
                  type="number"
                  value={product.palletWidth}
                  onChange={(e) => setProduct({ ...product, palletWidth: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">托高</label>
                <input
                  type="number"
                  value={product.palletHeight}
                  onChange={(e) => setProduct({ ...product, palletHeight: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500">单位：mm（打托后的整体尺寸）</div>
            <div>
              <label className="text-xs text-slate-600">每托箱数</label>
              <input
                type="number"
                value={product.boxesPerPallet}
                onChange={(e) => setProduct({ ...product, boxesPerPallet: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">每托重量</label>
              <input
                type="number"
                value={product.palletWeight}
                onChange={(e) => setProduct({ ...product, palletWeight: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm mt-0.5"
              />
              <span className="text-xs text-slate-500">单位：kg</span>
            </div>
            <div>
              <label className="text-xs text-slate-600">总托数</label>
              <input
                type="number"
                value={product.palletCount}
                onChange={(e) => setProduct({ ...product, palletCount: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm mt-0.5"
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1">货柜/车辆</h3>
          <select
            value={truckType}
            onChange={(e) => handleTruckTypeChange(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm"
          >
            {TRUCK_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>{p.name} ({p.length}×{p.width}×{p.height}mm)</option>
            ))}
            <option value="自定义">自定义</option>
          </select>
          {truckType === "自定义" && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-600">长</label>
                  <input
                    type="number"
                    value={truck.length}
                    onChange={(e) => setTruck({ ...truck, length: Number(e.target.value) })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">宽</label>
                  <input
                    type="number"
                    value={truck.width}
                    onChange={(e) => setTruck({ ...truck, width: Number(e.target.value) })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">高</label>
                  <input
                    type="number"
                    value={truck.height}
                    onChange={(e) => setTruck({ ...truck, height: Number(e.target.value) })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600">最大载重</label>
                <input
                  type="number"
                  value={truck.maxWeight}
                  onChange={(e) => setTruck({ ...truck, maxWeight: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                <span className="text-xs text-slate-500">单位：kg</span>
              </div>
            </div>
          )}
        </section>

        <button
          onClick={handleCalculate}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors"
        >
          计算托装方案
        </button>
      </div>

      {/* 右侧结果面板 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {results.length === 0 ? (
          <div className="text-slate-400 text-center py-20">
            请输入参数后点击"计算托装方案"
          </div>
        ) : (
          <div className="space-y-4">
            {/* 方案列表 */}
            <div className="bg-white border rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">可选方案（按装托数排序）</h4>
              <div className="flex gap-2 flex-wrap">
                {results.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={`px-3 py-1.5 rounded text-xs font-medium ${
                      idx === selectedIdx
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    方案{idx + 1}: {r.totalPallets}托 ({r.palletsAlongLength}×{r.palletsAlongWidth})
                  </button>
                ))}
              </div>
            </div>

            {/* 结果详情 */}
            {selectedResult && (
              <div className="grid grid-cols-2 gap-4">
                {/* 核心指标 */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">装载结果</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-emerald-50 p-2 rounded">
                      <div className="text-emerald-600 font-semibold">{selectedResult.totalPallets} 托</div>
                      <div className="text-xs text-slate-500">可装托数</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-blue-600 font-semibold">{selectedResult.remainingPallets} 托</div>
                      <div className="text-xs text-slate-500">剩余托数</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="text-purple-700 font-semibold">{selectedResult.totalBoxes} 箱</div>
                      <div className="text-xs text-slate-500">可装箱数</div>
                    </div>
                    <div className="bg-amber-50 p-2 rounded">
                      <div className="text-amber-700 font-semibold">{selectedResult.totalWeight} kg</div>
                      <div className="text-xs text-slate-500">总重量</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded col-span-2">
                      <div className="text-slate-700 font-semibold">{selectedResult.volumeUsed.toFixed(1)}%</div>
                      <div className="text-xs text-slate-500">空间利用率</div>
                    </div>
                  </div>
                </div>

                {/* 尺寸对比 */}
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">尺寸对比</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">货柜尺寸：</span>
                      <span className="font-medium">{truck.length} × {truck.width} × {truck.height} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">单托尺寸：</span>
                      <span className="font-medium">{product.palletLength} × {product.palletWidth} × {product.palletHeight} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">产品占用：</span>
                      <span className="font-medium">{selectedResult.coverageLength} × {selectedResult.coverageWidth} mm</span>
                    </div>
                    <div className={`flex justify-between ${selectedResult.lengthRemain < 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      <span>长度剩余：</span>
                      <span className="font-medium">
                        {selectedResult.lengthRemain >= 0 ? `余 ${selectedResult.lengthRemain}mm` : `超 ${-selectedResult.lengthRemain}mm`}
                      </span>
                    </div>
                    <div className={`flex justify-between ${selectedResult.widthRemain < 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      <span>宽度剩余：</span>
                      <span className="font-medium">
                        {selectedResult.widthRemain >= 0 ? `余 ${selectedResult.widthRemain}mm` : `超 ${-selectedResult.widthRemain}mm`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 俯视图 */}
                <div className="bg-white border rounded-lg p-4 col-span-2">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">货柜俯视图（托盘排列）</h4>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={300}
                    className="border bg-slate-50"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    托盘编号格式：列号-行号
                  </div>
                  <button
                    onClick={() => setShowReport(true)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    下载报告图片
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 报告弹窗 */}
      {showReport && selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-[95vw] max-h-[90vh] overflow-auto">
            <div id="container-report-canvas">
              <ReportCanvasContainer
                product={product}
                result={selectedResult}
                truck={truck}
              />
            </div>
            <button
              onClick={() => setShowReport(false)}
              className="mt-3 px-4 py-2 bg-slate-200 rounded text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}