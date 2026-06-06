'use client';

import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import type { PalletizeInput, PalletPlan } from '@/lib/palletize';
import { calculatePalletPlan } from '@/lib/palletize';
import { InputForm } from '@/components/InputForm';
import ReportCanvas from '@/components/ReportCanvas';

const defaultInput: PalletizeInput = {
  box: { length: 255, width: 167, height: 240 },
  pallet: { length: 1200, width: 1000, height: 160 },
  maxHeight: 1500,
  maxStackLayers: 0,
  productName: '牛气管干',
};

export default function Home() {
  const [input, setInput] = useState<PalletizeInput>(defaultInput);
  const [result, setResult] = useState<ReturnType<typeof calculatePalletPlan> | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleCalculate = useCallback(() => {
    const res = calculatePalletPlan(input);
    setResult(res);
    setSelectedIdx(0);
  }, [input]);

  const handleDownload = useCallback(async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `打托方案_${input.productName || '产品'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [input.productName]);

  const selectedPlan: PalletPlan | null = result?.plans?.[selectedIdx] ?? result?.bestPlan ?? null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部操作栏 */}
      <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <h1 className="text-lg font-bold tracking-wide">打托排版方案生成器</h1>
        <div className="flex items-center gap-3">
          {result && result.plans.length > 1 && (
            <select
              className="bg-slate-700 text-white text-sm rounded px-3 py-1.5 border border-slate-600"
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
            >
              {result.plans.map((p: PalletPlan, i: number) => (
                <option key={p.id} value={i}>
                  方案{i + 1}: {p.orientation} ({p.totalBoxes}箱)
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleCalculate}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-5 py-1.5 rounded transition-colors"
          >
            计算方案
          </button>
          {selectedPlan && (
            <button
              onClick={handleDownload}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-1.5 rounded transition-colors"
            >
              下载图片
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        {/* 左侧输入面板 */}
        <div className="w-80 shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto" style={{ height: 'calc(100vh - 52px)' }}>
          <InputForm input={input} onInputChange={setInput} onCalculate={handleCalculate} />
        </div>

        {/* 右侧报告预览 */}
        <div className="flex-1 overflow-auto p-6" style={{ height: 'calc(100vh - 52px)' }}>
          {selectedPlan ? (
            <div className="max-w-[1200px] mx-auto">
              <div ref={reportRef} className="bg-white shadow-xl rounded-lg overflow-hidden">
                <ReportCanvas
                  plan={selectedPlan}
                  productName={input.productName || '产品'}
                  box={input.box}
                  pallet={input.pallet}
                  maxHeight={input.maxHeight}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-lg">请在左侧输入参数后点击「计算方案」</p>
                <p className="text-sm mt-2">系统将自动计算最优打托排版方案</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
