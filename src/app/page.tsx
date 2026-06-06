'use client';

import { useState, useCallback, useRef } from 'react';
import { PalletizeInput, PalletizeResult, calculatePalletPlan } from '@/lib/palletize';
import { InputForm } from '@/components/InputForm';
import { LayerEditor } from '@/components/LayerEditor';
import { SolutionPreview } from '@/components/SolutionPreview';
import dynamic from 'next/dynamic';

const ReportCanvas = dynamic(() => import('@/components/ReportCanvas'), { ssr: false });

const DEFAULT_INPUT: PalletizeInput = {
  productName: '',
  box: { length: 255, width: 167, height: 240 },
  boxWeight: 0,
  boxColor: '#C4A882',
  useCase: false,
  caseBox: { length: 0, width: 0, height: 0 },
  caseCount: 0,
  palletType: '欧标2号/英标 1200×1000mm',
  pallet: { length: 1200, width: 1000, height: 160 },
  maxHeight: 1500,
  maxStackLayers: 0,
  truckType: '不使用车辆',
  truck: undefined,
};

export default function Home() {
  const [input, setInput] = useState<PalletizeInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<PalletizeResult | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [layers, setLayers] = useState(5);
  const [flipLength, setFlipLength] = useState(false);
  const [flipWidth, setFlipWidth] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleCalculate = useCallback(() => {
    const res = calculatePalletPlan(input);
    setResult(res);
    setSelectedIdx(0);
    if (res.plans.length > 0) {
      setLayers(res.plans[0].layers);
    }
  }, [input]);

  const handleDownloadReport = useCallback(async () => {
    setShowReport(true);
    await new Promise(r => setTimeout(r, 500));
    if (!reportRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = `pallet-report-${input.productName || 'unnamed'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setShowReport(false);
  }, [input.productName]);

  const plan = result?.plans?.[selectedIdx] ?? result?.bestPlan ?? null;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 顶部导航 */}
      <header className="h-12 bg-slate-800 flex items-center px-4 flex-shrink-0">
        <h1 className="text-white font-bold text-base tracking-wide">
          PAL<span className="text-blue-400">*</span>CALC
        </h1>
        <span className="text-slate-400 text-xs ml-3">免费在线托盘装载计算器</span>
      </header>

      {/* 主内容区三栏 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：输入面板 */}
        <InputForm input={input} onChange={setInput} onCalculate={handleCalculate} />

        {/* 中间：层编辑器 */}
        <LayerEditor
          plan={plan}
          input={input}
          layers={layers}
          flipLength={flipLength}
          flipWidth={flipWidth}
          onLayersChange={setLayers}
          onFlipLengthChange={setFlipLength}
          onFlipWidthChange={setFlipWidth}
        />

        {/* 右侧：方案预览 */}
        <SolutionPreview
          plan={plan}
          input={input}
          layers={layers}
          flipLength={flipLength}
          flipWidth={flipWidth}
          onDownloadReport={handleDownloadReport}
        />
      </div>

      {/* 隐藏的报告区域（用于截图） */}
      {showReport && plan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-[95vw] max-h-[90vh] overflow-auto">
            <div ref={reportRef}>
              <ReportCanvas
                input={input}
                plan={plan}
                layers={layers}
                flipLength={flipLength}
                flipWidth={flipWidth}
              />
            </div>
            <button onClick={() => setShowReport(false)} className="mt-3 px-4 py-2 bg-slate-200 rounded text-sm">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
