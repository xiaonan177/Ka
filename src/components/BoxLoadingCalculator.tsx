"use client";
import { useState, useCallback } from "react";
import { TRUCK_PRESETS, TruckDimensions, TruckLoadResult, calculateTruckLoad } from "@/lib/palletize";
import dynamic from "next/dynamic";

const ReportCanvasBox = dynamic(() => import("@/components/ReportCanvasBox"), {
  ssr: false,
});

interface BoxInput {
  productName: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  color: string;
  count: number; // 总箱数
}

interface BoxLoadResult {
  truck: TruckDimensions;
  boxesAlongLength: number; // 货柜长度方向箱数
  boxesAlongWidth: number; // 货柜宽度方向箱数
  boxesPerLayer: number; // 每层箱数
  layers: number; // 可堆层数
  totalBoxes: number; // 可装箱数
  remainingBoxes: number; // 剩余箱数
  totalWeight: number; // 总重量 kg
  volumeUsed: number; // 体积利用率 %
  coverageLength: number; // 产品占用长度 mm
  coverageWidth: number; // 产品占用宽度 mm
  coverageHeight: number; // 产品占用高度 mm
  lengthRemain: number; // 长度剩余 mm
  widthRemain: number; // 宽度剩余 mm
}

const DEFAULT_INPUT: BoxInput = {
  productName: "",
  length: 400,
  width: 300,
  height: 250,
  weight: 15,
  color: "#C4A882",
  count: 100,
};

// 计算6种摆放方向
type Orientation = "LWH" | "LHW" | "WLH" | "WHL" | "HLW" | "HWL";

function calculateBoxLoad(box: BoxInput, truck: TruckDimensions): BoxLoadResult[] {
  const orientations: { id: Orientation; l: number; w: number; h: number }[] = [
    { id: "LWH", l: box.length, w: box.width, h: box.height },
    { id: "LHW", l: box.length, w: box.height, h: box.width },
    { id: "WLH", l: box.width, w: box.length, h: box.height },
    { id: "WHL", l: box.width, w: box.height, h: box.length },
    { id: "HLW", l: box.height, w: box.length, h: box.width },
    { id: "HWL", l: box.height, w: box.width, h: box.length },
  ];

  const results: BoxLoadResult[] = [];

  for (const ori of orientations) {
    const boxesAlongLength = Math.floor(truck.length / ori.l);
    const boxesAlongWidth = Math.floor(truck.width / ori.w);
    const boxesPerLayer = boxesAlongLength * boxesAlongWidth;
    const layers = Math.floor(truck.height / ori.h);
    const totalBoxes = boxesPerLayer * layers;

    if (totalBoxes > 0) {
      const coverageLength = boxesAlongLength * ori.l;
      const coverageWidth = boxesAlongWidth * ori.w;
      const coverageHeight = layers * ori.h;
      const lengthRemain = truck.length - coverageLength;
      const widthRemain = truck.width - coverageWidth;
      const totalWeight = totalBoxes * box.weight;
      const boxVolume = box.length * box.width * box.height;
      const truckVolume = truck.length * truck.width * truck.height;
      const volumeUsed = (totalBoxes * boxVolume / truckVolume) * 100;

      results.push({
        truck,
        boxesAlongLength,
        boxesAlongWidth,
        boxesPerLayer,
        layers,
        totalBoxes,
        remainingBoxes: Math.max(0, box.count - totalBoxes),
        totalWeight,
        volumeUsed,
        coverageLength,
        coverageWidth,
        coverageHeight,
        lengthRemain,
        widthRemain,
      });
    }
  }

  // 按可装箱数降序排列
  return results.sort((a, b) => b.totalBoxes - a.totalBoxes);
}

export function BoxLoadingCalculator() {
  const [input, setInput] = useState<BoxInput>(DEFAULT_INPUT);
  const [truckType, setTruckType] = useState<string>("欧标卡车");
  const [truck, setTruck] = useState<TruckDimensions>(TRUCK_PRESETS[0]);
  const [results, setResults] = useState<BoxLoadResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const handleTruckTypeChange = (type: string) => {
    setTruckType(type);
    if (type === "自定义") {
      setTruck({ name: "自定义", length: 0, width: 0, height: 0, maxWeight: 0 });
    } else {
      const preset = TRUCK_PRESETS.find((p) => p.name === type);
      if (preset) {
        setTruck(preset);
      }
    }
  };

  const handleCalculate = useCallback(() => {
    const res = calculateBoxLoad(input, truck);
    setResults(res);
    setSelectedIdx(0);
  }, [input, truck]);

  const selectedResult = results[selectedIdx];

  return (
    <div className="flex-1 flex h-full">
      {/* 左侧输入面板 */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto h-full">
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 border-b border-slate-200 pb-1">产品信息</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-600">产品名称</label>
              <input
                type="text"
                value={input.productName}
                onChange={(e) => setInput({ ...input, productName: e.target.value })}
                className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                placeholder="可选"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-600">长</label>
                <input
                  type="number"
                  value={input.length}
                  onChange={(e) => setInput({ ...input, length: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">宽</label>
                <input
                  type="number"
                  value={input.width}
                  onChange={(e) => setInput({ ...input, width: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">高</label>
                <input
                  type="number"
                  value={input.height}
                  onChange={(e) => setInput({ ...input, height: Number(e.target.value) })}
                  className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500">单位：mm</div>
            <div>
              <label className="text-xs text-slate-600">单箱重量</label>
              <input
                type="number"
                value={input.weight}
                onChange={(e) => setInput({ ...input, weight: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 text-sm mt-0.5"
              />
              <span className="text-xs text-slate-500">单位：kg</span>
            </div>
            <div>
              <label className="text-xs text-slate-600">总箱数</label>
              <input
                type="number"
                value={input.count}
                onChange={(e) => setInput({ ...input, count: Number(e.target.value) })}
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
          计算装箱方案
        </button>
      </div>

      {/* 右侧结果面板 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {results.length === 0 ? (
          <div className="text-slate-400 text-center py-20">
            请输入参数后点击"计算装箱方案"
          </div>
        ) : (
          <div className="space-y-4">
            {/* 方案列表 */}
            <div className="bg-white border rounded-lg p-3">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">可选方案（按装箱数排序）</h4>
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
                    方案{idx + 1}: {r.totalBoxes}箱 ({r.boxesPerLayer}×{r.layers})
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
                      <div className="text-emerald-600 font-semibold">{selectedResult.totalBoxes} 箱</div>
                      <div className="text-xs text-slate-500">可装箱数</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-blue-600 font-semibold">{selectedResult.remainingBoxes} 箱</div>
                      <div className="text-xs text-slate-500">剩余箱数</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-700 font-semibold">{selectedResult.layers} 层</div>
                      <div className="text-xs text-slate-500">堆叠层数</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                      <div className="text-slate-700 font-semibold">{selectedResult.boxesPerLayer} 箱</div>
                      <div className="text-xs text-slate-500">每层箱数</div>
                    </div>
                    <div className="bg-amber-50 p-2 rounded">
                      <div className="text-amber-700 font-semibold">{selectedResult.totalWeight} kg</div>
                      <div className="text-xs text-slate-500">总重量</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="text-purple-700 font-semibold">{selectedResult.volumeUsed.toFixed(1)}%</div>
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
                      <span className="text-slate-600">产品占用：</span>
                      <span className="font-medium">{selectedResult.coverageLength} × {selectedResult.coverageWidth} × {selectedResult.coverageHeight} mm</span>
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
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-1">货柜俯视图</h4>
                  <canvas
                    id="box-top-view"
                    width={400}
                    height={300}
                    className="border bg-slate-50"
                  />
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
            <div id="box-report-canvas">
              <ReportCanvasBox
                input={input}
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