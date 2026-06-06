"use client";

import { useState, useCallback } from "react";
import type { PalletizeInput, PalletizeResult, PalletPlan } from "@/lib/palletize";
import { calculatePalletPlan } from "@/lib/palletize";
import { InputForm } from "@/components/InputForm";
import { LayoutView2D } from "@/components/LayoutView2D";
import { PalletView3D } from "@/components/PalletView3D";
import { Summary } from "@/components/Summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Package, RotateCw } from "lucide-react";

const DEFAULT_INPUT: PalletizeInput = {
  productName: "",
  box: { length: 255, width: 167, height: 240 },
  pallet: { length: 1200, width: 1000, height: 160 },
  maxHeight: 1500,
  maxStackLayers: 0,
};

export default function HomePage() {
  const [input, setInput] = useState<PalletizeInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<PalletizeResult | null>(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);

  const handleCalculate = useCallback(() => {
    const res = calculatePalletPlan(input);
    setResult(res);
    setSelectedPlanIndex(0);
  }, [input]);

  const selectedPlan: PalletPlan | null = result?.plans?.[selectedPlanIndex] ?? result?.bestPlan ?? null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 顶部标题栏 */}
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-400" />
          <h1 className="text-lg font-bold tracking-wide">托盘打托排版系统</h1>
          {input.productName && (
            <Badge variant="secondary" className="bg-slate-700 text-slate-200 text-xs">
              产品: {input.productName}
            </Badge>
          )}
        </div>
        <div className="text-xs text-slate-400">
          输入箱体与托盘参数，智能计算最优打托方案
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：参数输入面板 */}
        <aside className="w-80 border-r border-slate-200 bg-white p-5 overflow-y-auto flex-shrink-0">
          <InputForm input={input} onInputChange={setInput} onCalculate={handleCalculate} />
        </aside>

        {/* 右侧：可视化结果区 */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {!result || !selectedPlan ? (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <RotateCw className="h-16 w-16 mb-4 opacity-30" />
              <h2 className="text-xl font-medium mb-2">请输入参数并计算</h2>
              <p className="text-sm text-slate-400">
                填写左侧箱体与托盘参数，点击&quot;计算打托方案&quot;查看结果
              </p>
            </div>
          ) : (
            <>
              {/* 方案选择 */}
              {result.plans.length > 1 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    可行方案（共 {result.plans.length} 种，按装箱数降序）
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.plans.map((plan, idx) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlanIndex(idx)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          idx === selectedPlanIndex
                            ? "bg-blue-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        方案{idx + 1}: {plan.totalBoxes}箱 ({plan.orientation})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 核心参数回显表格 */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-left font-medium text-slate-600">箱体类型</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">箱体尺寸(L×W×H)</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">堆码方式</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">每层箱数</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">层数</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">每托箱数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5 text-slate-700">产品箱</td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">
                        {input.box.length} × {input.box.width} × {input.box.height}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">
                        {selectedPlan.countAlongLength} × {selectedPlan.countAlongWidth} × {selectedPlan.layers}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold">
                        {selectedPlan.boxesPerLayer} 箱
                      </td>
                      <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold">
                        {selectedPlan.layers} 层
                      </td>
                      <td className="px-4 py-2.5 font-mono text-blue-600 font-bold text-base">
                        {selectedPlan.totalBoxes} 箱
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2D排版视图 */}
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">单层箱体排列方式</h3>
                <LayoutView2D
                  plan={selectedPlan}
                  palletLength={input.pallet.length}
                  palletWidth={input.pallet.width}
                  palletHeight={input.pallet.height}
                  productName={input.productName || ""}
                />
              </div>

              {/* 3D可视化 + 托盘详情 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">成品托盘堆叠效果图</h3>
                  <PalletView3D
                    plan={selectedPlan}
                    pallet={input.pallet}
                    productName={input.productName || ""}
                  />
                </div>
                <div className="space-y-4">
                  {/* 托盘详情 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">托盘详情</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">尺寸</span>
                        <span className="font-mono text-slate-700">
                          {input.pallet.length} × {input.pallet.width} × {input.pallet.height} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">材质</span>
                        <span className="text-slate-700">塑料</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">类型</span>
                        <span className="text-slate-700">标准托盘</span>
                      </div>
                    </div>
                  </div>

                  {/* 高度计算明细 */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">高度计算明细</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">托盘高度</span>
                        <span className="font-mono text-slate-700">{input.pallet.height} mm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">箱体高度</span>
                        <span className="font-mono text-slate-700">
                          {selectedPlan.boxStackHeight} mm
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">堆码层数</span>
                        <span className="font-mono text-slate-700">× {selectedPlan.layers} 层</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-medium">
                        <span className="text-slate-700">总高度</span>
                        <span
                          className={`font-mono font-bold ${
                            selectedPlan.heightOk ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {selectedPlan.totalHeight.toLocaleString()} mm
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">最大限制</span>
                        <span className="font-mono text-slate-400">
                          {input.maxHeight.toLocaleString()} mm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 信息汇总 */}
              <Summary plan={selectedPlan} input={input} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
