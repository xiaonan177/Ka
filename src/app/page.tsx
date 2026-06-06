'use client';

import { useState, useCallback, useRef } from 'react';
import { InputForm } from '@/components/InputForm';
import ReportCanvas from '@/components/ReportCanvas';
import {
  PalletizeInput,
  PalletizeResult,
  PalletPlan,
  calculatePalletPlan,
  TruckLoadResult,
  calculateTruckLoad,
} from '@/lib/palletize';

export default function Home() {
  const [input, setInput] = useState<PalletizeInput>({
    box: { length: 255, width: 167, height: 240 },
    pallet: { length: 1200, width: 1000, height: 160 },
    maxHeight: 1500,
    maxStackLayers: 0,
    productName: '产品名称',
  });

  const [result, setResult] = useState<PalletizeResult | null>(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [truckLoad, setTruckLoad] = useState<TruckLoadResult | null>(null);
  const [layers, setLayers] = useState(1);
  const [flipLength, setFlipLength] = useState(false);
  const [flipWidth, setFlipWidth] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const selectedPlan: PalletPlan | null =
    result?.plans?.[selectedPlanIndex] ?? result?.bestPlan ?? null;

  const handleCalculate = useCallback(() => {
    const res = calculatePalletPlan(input);
    setResult(res);
    setSelectedPlanIndex(0);
    if (res.bestPlan) {
      setLayers(res.bestPlan.layers);
    }
    // 计算车辆装载
    if (input.truck && res.bestPlan) {
      const tl = calculateTruckLoad(
        input.truck,
        input.pallet.length,
        input.pallet.width,
        res.bestPlan.totalHeight,
        res.bestPlan.totalBoxes,
        input.boxWeight ?? 0
      );
      setTruckLoad(tl);
    } else {
      setTruckLoad(null);
    }
  }, [input]);

  const handleDownload = useCallback(async () => {
    if (!reportRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `打托方案_${input.productName || '报告'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [input.productName]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 顶部标题栏 */}
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-sm">托</div>
          <h1 className="text-lg font-bold tracking-wide">托盘打托排版系统</h1>
        </div>
        {result && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors"
            >
              重新计算
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载图片
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：参数输入面板 */}
        <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
          <InputForm input={input} onInputChange={setInput} onCalculate={handleCalculate} />
        </div>

        {/* 右侧：方案展示区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-lg font-medium">输入参数后点击「计算方案」</p>
              <p className="text-sm mt-1">系统将自动计算最优托盘排列方案</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 方案选择栏 */}
              {result.plans.length > 1 && (
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 mb-2 font-medium">排列方案选择</div>
                  <div className="flex gap-2 flex-wrap">
                    {result.plans.map((p: PalletPlan, i: number) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPlanIndex(i); setLayers(p.layers); }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          i === selectedPlanIndex
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        方案{i + 1}: {p.orientation} ({p.totalBoxes}箱)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 层编辑控制栏 */}
              {selectedPlan && (
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">层数</span>
                      <button
                        onClick={() => setLayers(Math.max(1, layers - 1))}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-sm font-bold transition-colors"
                      >−</button>
                      <span className="w-8 text-center text-sm font-bold">{layers}</span>
                      <button
                        onClick={() => setLayers(layers + 1)}
                        className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center text-sm font-bold transition-colors"
                      >+</button>
                    </div>
                    <div className="h-5 w-px bg-slate-200" />
                    <button
                      onClick={() => setFlipLength(!flipLength)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        flipLength ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ↔ 翻转长度
                    </button>
                    <button
                      onClick={() => setFlipWidth(!flipWidth)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        flipWidth ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ↕ 翻转宽度
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                    {/* 核心指标 */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <div className="text-slate-400">每层箱数</div>
                        <div className="text-blue-600 font-bold text-base">{selectedPlan.boxesPerLayer}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400">每托箱数</div>
                        <div className="text-blue-600 font-bold text-base">{selectedPlan.boxesPerLayer * layers}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400">总高度</div>
                        <div className={`font-bold text-base ${selectedPlan.heightOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {input.pallet.height + selectedPlan.boxStackHeight * layers} mm
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400">利用率</div>
                        <div className="text-blue-600 font-bold text-base">{(selectedPlan.utilization * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 车辆装载信息 */}
              {truckLoad && (
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 mb-2 font-medium">🚛 车辆装载方案 — {input.truck?.name}</div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="text-slate-400">托盘排列</div>
                      <div className="text-slate-700 font-bold">{truckLoad.palletsPerRow}×{truckLoad.rows}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">总托盘数</div>
                      <div className="text-blue-600 font-bold text-base">{truckLoad.totalPallets}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">总箱数</div>
                      <div className="text-blue-600 font-bold text-base">{truckLoad.totalBoxes}</div>
                    </div>
                    {input.boxWeight ? (
                      <div className="text-center">
                        <div className="text-slate-400">总重量</div>
                        <div className="text-slate-700 font-bold">{truckLoad.totalWeight.toFixed(1)} kg</div>
                      </div>
                    ) : null}
                    <div className="text-center">
                      <div className="text-slate-400">体积利用率</div>
                      <div className="text-blue-600 font-bold">{(truckLoad.volumeUtilization * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 报告预览区 */}
              <div ref={reportRef} className="bg-white rounded-lg shadow-sm">
                {selectedPlan && (
                  <ReportCanvas
                    plan={selectedPlan}
                    input={input}
                    layers={layers}
                    flipLength={flipLength}
                    flipWidth={flipWidth}
                    truckLoad={truckLoad ?? undefined}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
