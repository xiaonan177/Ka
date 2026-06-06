"use client";

import { useState, useCallback } from "react";
import type { PalletizeInput, PalletizeResult, PalletPlan } from "@/lib/palletize";
import { calculatePalletPlan } from "@/lib/palletize";
import { InputForm } from "@/components/InputForm";
import { LayoutView2D } from "@/components/LayoutView2D";
import { PalletView3D } from "@/components/PalletView3D";
import { Summary } from "@/components/Summary";
import { LayerExplodedView } from "@/components/LayerExplodedView";
import { Button } from "@/components/ui/button";
import {
  Package,
  RefreshCw,
  Layers,
  ChevronLeft,
  Settings2,
} from "lucide-react";

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
  const [lastCalcInput, setLastCalcInput] = useState<PalletizeInput | null>(null);
  const [viewMode, setViewMode] = useState<"stacked" | "layers">("stacked");
  const [showInput, setShowInput] = useState(true);

  const handleCalculate = useCallback(() => {
    const res = calculatePalletPlan(input);
    setResult(res);
    setSelectedPlanIndex(0);
    setLastCalcInput(input);
  }, [input]);

  const inputChanged =
    result !== null &&
    lastCalcInput !== null &&
    (lastCalcInput.box.length !== input.box.length ||
      lastCalcInput.box.width !== input.box.width ||
      lastCalcInput.box.height !== input.box.height ||
      lastCalcInput.pallet.length !== input.pallet.length ||
      lastCalcInput.pallet.width !== input.pallet.width ||
      lastCalcInput.pallet.height !== input.pallet.height ||
      lastCalcInput.maxHeight !== input.maxHeight ||
      lastCalcInput.maxStackLayers !== input.maxStackLayers ||
      lastCalcInput.productName !== input.productName);

  const selectedPlan: PalletPlan | null = result?.plans?.[selectedPlanIndex] ?? result?.bestPlan ?? null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部标题栏 - 参考麦斯堆风格 */}
      <header className="bg-[#5C3924] text-white px-6 py-2.5 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5" />
          <h1 className="text-base font-bold tracking-wide">
            托盘打托排版系统
            {input.productName && (
              <span className="font-normal ml-2 opacity-90">
                — 产品: {input.productName}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowInput(!showInput)}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10 text-xs h-7 px-3"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            {showInput ? "隐藏参数" : "显示参数"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：参数输入面板（可折叠） */}
        {showInput && (
          <aside className="w-72 border-r border-[#E2E8F0] bg-white p-4 overflow-y-auto flex-shrink-0">
            <InputForm input={input} onInputChange={setInput} onCalculate={handleCalculate} />
          </aside>
        )}

        {/* 右侧：报告式展示区 */}
        <main className="flex-1 overflow-y-auto">
          {!result || !selectedPlan ? (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center h-full text-[#94A3B8]">
              <Package className="h-16 w-16 mb-4 opacity-20" />
              <h2 className="text-xl font-medium mb-2 text-[#64748B]">请输入参数并计算</h2>
              <p className="text-sm">
                填写箱体与托盘参数，点击&quot;计算打托方案&quot;查看结果
              </p>
            </div>
          ) : (
            <div className="p-6 max-w-[1200px] mx-auto space-y-5">
              {/* 参数变更提示 */}
              {inputChanged && (
                <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#92400E] text-sm">
                    <RefreshCw className="h-4 w-4" />
                    <span>参数已变更，当前结果可能不准确</span>
                  </div>
                  <Button
                    onClick={handleCalculate}
                    size="sm"
                    className="bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs h-7 px-3"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    重新计算
                  </Button>
                </div>
              )}

              {/* ===== 报告式布局：匹配参考图 ===== */}

              {/* 1. 核心参数表格 - 参考麦斯堆表格风格 */}
              <div className="border border-[#CCCCCC] rounded overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F0F0F0]">
                      <th className="px-4 py-2 text-center font-medium text-[#333] border-r border-[#CCCCCC]">箱体类型</th>
                      <th className="px-4 py-2 text-center font-medium text-[#333] border-r border-[#CCCCCC]">箱体尺寸(长×宽×高 毫米)</th>
                      <th className="px-4 py-2 text-center font-medium text-[#333] border-r border-[#CCCCCC]">堆码方式(长×宽×高)</th>
                      <th className="px-4 py-2 text-center font-medium text-[#333] border-r border-[#CCCCCC]">每层箱数(箱)</th>
                      <th className="px-4 py-2 text-center font-medium text-[#333] border-r border-[#CCCCCC]">层数(层)</th>
                      <th className="px-4 py-2 text-center font-medium text-[#333]">每托箱数(箱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-4 py-2.5 text-center text-[#333] border-r border-[#E5E7EB]">产品箱</td>
                      <td className="px-4 py-2.5 text-center font-mono text-[#333] border-r border-[#E5E7EB]">
                        W{input.box.width} × L{input.box.length} × H{input.box.height}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-[#333] border-r border-[#E5E7EB]">
                        {selectedPlan.countAlongLength} × {selectedPlan.countAlongWidth} × {selectedPlan.layers}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-[#3B82F6] font-semibold border-r border-[#E5E7EB]">
                        {selectedPlan.boxesPerLayer}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-[#3B82F6] font-semibold border-r border-[#E5E7EB]">
                        {selectedPlan.layers}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-[#E03C31] font-bold text-base">
                        {selectedPlan.totalBoxes}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 方案选择 + 重新生成 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.plans.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {result.plans.map((plan, idx) => (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlanIndex(idx)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            idx === selectedPlanIndex
                              ? "bg-[#3B82F6] text-white shadow-sm"
                              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          方案{idx + 1}: {plan.totalBoxes}箱
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleCalculate}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-[#3B82F6] text-[#3B82F6] hover:bg-[#EFF6FF]"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  重新生成方案
                </Button>
              </div>

              {/* 2. 单层箱体排列方式 - 深棕色标题 + 俯视图/侧视图并排 */}
              <div>
                <div className="bg-[#5C3924] text-white px-3 py-1.5 rounded text-sm font-bold inline-block mb-3">
                  单层箱体排列方式
                </div>
                <div className="border border-[#E2E8F0] rounded-lg p-4 bg-white">
                  <LayoutView2D
                    plan={selectedPlan}
                    palletLength={input.pallet.length}
                    palletWidth={input.pallet.width}
                    palletHeight={input.pallet.height}
                    productName={input.productName || ""}
                  />
                </div>
              </div>

              {/* 3. 托盘详情 + 成品堆叠效果图 - 左右布局 */}
              <div className="grid grid-cols-12 gap-5">
                {/* 左侧：托盘详情 */}
                <div className="col-span-4">
                  <div className="bg-[#5C3924] text-white px-3 py-1.5 rounded text-sm font-bold inline-block mb-3">
                    托盘详情
                  </div>
                  <div className="border border-[#E2E8F0] rounded-lg p-4 bg-white">
                    {/* 托盘3D小图 */}
                    <div className="mb-3 flex justify-center">
                      <PalletView3D
                        plan={selectedPlan}
                        pallet={input.pallet}
                        productName={input.productName || ""}
                        palletOnly={true}
                      />
                    </div>
                    {/* 托盘参数 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666]">托盘尺寸:</span>
                        <span className="font-mono text-[#333]">
                          {input.pallet.width} × {input.pallet.length} × {input.pallet.height} 毫米
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666]">托盘材质:</span>
                        <span className="text-[#333]">塑料</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右侧：成品托盘堆叠效果图 */}
                <div className="col-span-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-[#5C3924] text-white px-3 py-1.5 rounded text-sm font-bold inline-block">
                      成品托盘堆叠效果图
                    </div>
                    <div className="flex items-center gap-1 bg-[#F1F5F9] rounded p-0.5">
                      <button
                        onClick={() => setViewMode("stacked")}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                          viewMode === "stacked"
                            ? "bg-white text-[#3B82F6] shadow-sm"
                            : "text-[#64748B] hover:text-[#334155]"
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        整体视图
                      </button>
                      <button
                        onClick={() => setViewMode("layers")}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                          viewMode === "layers"
                            ? "bg-white text-[#3B82F6] shadow-sm"
                            : "text-[#64748B] hover:text-[#334155]"
                        }`}
                      >
                        <Layers className="h-3 w-3" />
                        分层展示
                      </button>
                    </div>
                  </div>
                  <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
                    {viewMode === "stacked" ? (
                      <PalletView3D
                        plan={selectedPlan}
                        pallet={input.pallet}
                        productName={input.productName || ""}
                      />
                    ) : (
                      <LayerExplodedView
                        plan={selectedPlan}
                        pallet={input.pallet}
                        productName={input.productName || ""}
                      />
                    )}
                  </div>

                  {/* 右侧高度标注信息 - 参考麦斯堆风格 */}
                  <div className="mt-3 border border-[#E2E8F0] rounded-lg p-4 bg-white">
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-[#333]">托盘总高度</span>
                        <span className="text-lg font-bold font-mono text-[#E03C31]">
                          {selectedPlan.totalHeight.toLocaleString()} 毫米
                        </span>
                        <span className="text-sm text-[#2385BB]">
                          (不超过 {input.maxHeight.toLocaleString()} 毫米)
                        </span>
                      </div>
                      <div className="border-t border-[#E5E7EB] pt-2 space-y-1 text-sm text-[#333]">
                        <div>箱体高度 {selectedPlan.boxStackHeight} 毫米</div>
                        <div>层数: {selectedPlan.layers} 层</div>
                        <div className="pl-4 font-mono">= {(selectedPlan.layers * selectedPlan.boxStackHeight).toLocaleString()} 毫米</div>
                        <div>托盘高度 {input.pallet.height} 毫米</div>
                      </div>
                      <div className="border-t border-[#E5E7EB] pt-2 flex items-baseline gap-2">
                        <span className="text-sm text-[#333]">总高度</span>
                        <span className="text-lg font-bold font-mono text-[#E03C31]">
                          {selectedPlan.totalHeight.toLocaleString()} 毫米
                        </span>
                        <span className="text-sm text-[#2385BB]">
                          {selectedPlan.heightOk ? "(符合要求)" : "(超出限制)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. 信息汇总 - 米色背景 + 绿色勾选 + 两列 */}
              <Summary plan={selectedPlan} input={input} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
