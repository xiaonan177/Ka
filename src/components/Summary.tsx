"use client";

import type { PalletPlan, PalletizeInput } from "@/lib/palletize";
import { formatDimensions, formatStacking } from "@/lib/palletize";

interface SummaryProps {
  plan: PalletPlan;
  input: PalletizeInput;
}

export function Summary({ plan, input }: SummaryProps) {
  const { box, pallet, maxHeight } = input;
  const isHeightOk = plan.totalHeight <= maxHeight;
  const areaUtilization =
    ((plan.coverageLength * plan.coverageWidth) / (pallet.length * pallet.width)) * 100;

  const leftChecks = [
    `箱体尺寸: ${formatDimensions(box.length, box.width, box.height)}`,
    `堆码方式: ${formatStacking(plan.countAlongLength, plan.countAlongWidth, plan.layers)}`,
    `每层箱数: ${plan.boxesPerLayer} 箱`,
    `层数: ${plan.layers} 层`,
  ];

  const rightChecks = [
    `每托箱数: ${plan.totalBoxes} 箱`,
    `托盘尺寸: ${formatDimensions(pallet.length, pallet.width, pallet.height)}`,
    `托盘总高度: ${plan.totalHeight.toLocaleString()} 毫米 (不超过 ${maxHeight.toLocaleString()} 毫米)`,
    `底面覆盖率: ${areaUtilization.toFixed(1)}% | 空间利用率: ${plan.utilization.toFixed(1)}%`,
  ];

  return (
    <div className="bg-[#F9F2E9] border border-[#D4A77A] rounded-lg p-4 pt-5 relative">
      {/* 标题标签 - 参考麦斯堆风格 */}
      <div className="bg-[#5C3924] text-white px-3 py-1.5 rounded text-sm font-bold inline-block absolute -top-3 left-4">
        信息汇总
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-10 gap-y-1.5">
        {leftChecks.map((item, i) => (
          <div key={`l-${i}`} className="flex items-center gap-2 text-sm text-[#333]">
            <span className="text-[#39A852] font-bold text-base leading-none">✓</span>
            <span>{item}</span>
          </div>
        ))}
        {rightChecks.map((item, i) => (
          <div key={`r-${i}`} className="flex items-center gap-2 text-sm text-[#333]">
            <span className={`${i === 2 ? (isHeightOk ? 'text-[#39A852]' : 'text-[#F59E0B]') : 'text-[#39A852]'} font-bold text-base leading-none`}>
              {i === 2 && !isHeightOk ? '⚠' : '✓'}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* 可使用标准运输及仓储设备作业 */}
      <div className="mt-3 pt-2 border-t border-[#D4A77A]/40 flex items-center gap-2 text-sm text-[#333]">
        <span className="text-[#39A852] font-bold text-base leading-none">✓</span>
        <span>可使用标准运输及仓储设备作业</span>
      </div>
    </div>
  );
}
