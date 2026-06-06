"use client";

import type { PalletPlan, PalletizeInput } from "@/lib/palletize";
import { formatDimensions, formatStacking } from "@/lib/palletize";
import { CheckCircle2, AlertTriangle, Package, Layers, Ruler, BarChart3 } from "lucide-react";

interface SummaryProps {
  plan: PalletPlan;
  input: PalletizeInput;
}

export function Summary({ plan, input }: SummaryProps) {
  const { box, pallet, maxHeight } = input;
  const boxTotalHeight = plan.layers * plan.boxStackHeight;
  const heightMargin = maxHeight - plan.totalHeight;
  const isHeightOk = plan.totalHeight <= maxHeight;
  const areaUtilization =
    ((plan.coverageLength * plan.coverageWidth) / (pallet.length * pallet.width)) * 100;

  const checks = [
    {
      label: `箱体尺寸：${formatDimensions(box.length, box.width, box.height)}`,
      ok: true,
    },
    {
      label: `堆码方式：${formatStacking(plan.countAlongLength, plan.countAlongWidth, plan.layers)}`,
      ok: true,
    },
    {
      label: `每层箱数：${plan.boxesPerLayer} 箱`,
      ok: true,
    },
    {
      label: `层数：${plan.layers} 层`,
      ok: true,
    },
    {
      label: `每托箱数：${plan.totalBoxes} 箱`,
      ok: true,
    },
    {
      label: `托盘尺寸：${formatDimensions(pallet.length, pallet.width, pallet.height)}`,
      ok: true,
    },
    {
      label: `托盘总高度：${plan.totalHeight.toLocaleString()} 毫米${isHeightOk ? `（不超过 ${maxHeight.toLocaleString()} 毫米）` : `（超出限制 ${maxHeight.toLocaleString()} 毫米）`}`,
      ok: isHeightOk,
    },
    {
      label: `底面覆盖率：${areaUtilization.toFixed(1)}%`,
      ok: areaUtilization > 80,
    },
    {
      label: `空间利用率：${plan.utilization.toFixed(1)}%`,
      ok: plan.utilization > 50,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 关键指标卡片 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <Package className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <div className="text-2xl font-bold font-mono text-slate-800">{plan.totalBoxes}</div>
          <div className="text-xs text-slate-500">每托箱数</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <Layers className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <div className="text-2xl font-bold font-mono text-slate-800">{plan.layers}</div>
          <div className="text-xs text-slate-500">堆码层数</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <Ruler className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <div className="text-2xl font-bold font-mono text-slate-800">
            {plan.totalHeight.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">总高(mm)</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <BarChart3 className="h-5 w-5 mx-auto text-violet-500 mb-1" />
          <div className="text-2xl font-bold font-mono text-slate-800">
            {plan.utilization.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">空间利用率</div>
        </div>
      </div>

      {/* 高度合规性 */}
      <div
        className={`rounded-lg p-3 border ${
          isHeightOk
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-start gap-2">
          {isHeightOk ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className={`text-sm font-medium ${isHeightOk ? "text-emerald-700" : "text-amber-700"}`}>
              {isHeightOk ? "高度合规" : "高度超限"}
            </div>
            <div className="text-xs text-slate-600 space-y-0.5">
              <div>
                托盘高度 {pallet.height} mm + 箱体高度 {plan.boxStackHeight} mm × {plan.layers} 层 = {pallet.height + boxTotalHeight} mm
              </div>
              <div>
                总高度 {plan.totalHeight.toLocaleString()} mm
                {isHeightOk
                  ? `，低于限制 ${maxHeight.toLocaleString()} mm，余量 ${heightMargin.toLocaleString()} mm`
                  : `，超出限制 ${maxHeight.toLocaleString()} mm`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 信息汇总清单 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">信息汇总</h4>
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {check.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
              <span className={check.ok ? "text-slate-700" : "text-amber-700"}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 摆放方向说明 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">摆放方向</h4>
        <div className="text-sm text-slate-600">{plan.orientation}</div>
        <div className="text-xs text-slate-500 mt-1">
          箱体底面：{plan.boxOnPalletLength} × {plan.boxOnPalletWidth} mm，
          堆叠高度方向：{plan.boxStackHeight} mm
        </div>
      </div>
    </div>
  );
}
