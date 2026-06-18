'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  PalletizeInput, PalletizeResult, calculatePalletPlan, 
  ProductSKU, ContainerSpec, CONTAINER_PRESETS,
  calculateMultiSKU, MultiSKUResult,
  calculateContainerLoad, ContainerLoadResult,
  checkWarnings, Warning
} from '@/lib/palletize';
import { InputForm } from '@/components/InputForm';
import { LayerEditor } from '@/components/LayerEditor';
import { SolutionPreview } from '@/components/SolutionPreview';
import { ContainerPreview } from '@/components/ContainerPreview';
import { WarningPanel, WarningBadge } from '@/components/WarningPanel';
import { PDFExportButton } from '@/components/PDFExport';
import dynamic from 'next/dynamic';

const ReportCanvas = dynamic(() => import('@/components/ReportCanvas'), { ssr: false });

const DEFAULT_INPUT: PalletizeInput = {
  productName: '',
  box: { length: 255, width: 167, height: 240 },
  boxWeight: 5,
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

const DEFAULT_SKU: ProductSKU = {
  id: 'sku-1',
  name: '中箱',
  box: { length: 255, width: 167, height: 240 },
  boxWeight: 5,
  boxColor: '#C4A882',
  quantity: 100,
};

export default function Home() {
  // 模式切换
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  
  // 单产品模式状态
  const [input, setInput] = useState<PalletizeInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<PalletizeResult | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [layers, setLayers] = useState(5);
  const [flipLength, setFlipLength] = useState(false);
  const [flipWidth, setFlipWidth] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // 多SKU模式状态
  const [skus, setSkus] = useState<ProductSKU[]>([DEFAULT_SKU]);
  const [container, setContainer] = useState<ContainerSpec | undefined>(CONTAINER_PRESETS[2]); // 默认40HC
  const [multiResult, setMultiResult] = useState<MultiSKUResult | null>(null);
  const [containerLoad, setContainerLoad] = useState<ContainerLoadResult | null>(null);
  
  // 预警状态
  const [warnings, setWarnings] = useState<Warning[]>([]);
  
  // 视图模式
  const [viewMode, setViewMode] = useState<'pallet' | 'container'>('pallet');

  // 单产品计算
  const handleCalculateSingle = useCallback(() => {
    const res = calculatePalletPlan(input);
    setResult(res);
    setSelectedIdx(0);
    if (res.plans.length > 0) {
      setLayers(res.plans[0].layers);
    }
    
    // 检查预警
    if (res.bestPlan) {
      const ws = checkWarnings(res.bestPlan, input.maxHeight, input.boxWeight);
      setWarnings(ws);
    }
  }, [input]);

  // 多SKU计算
  const handleCalculateMulti = useCallback(() => {
    if (skus.length === 0 || !container) return;
    
    const res = calculateMultiSKU(skus, input.pallet, input.maxHeight, input.maxStackLayers);
    setMultiResult(res);
    setWarnings(res.warnings);
    
    // 计算集装箱装载
    if (container && res.products.length > 0) {
      // 使用第一个产品的托盘高度作为参考
      const firstProduct = res.products[0];
      const load = calculateContainerLoad(
        container,
        input.pallet.length,
        input.pallet.width,
        firstProduct.plan.totalHeight,
        firstProduct.plan.totalBoxes,
        firstProduct.sku.boxWeight,
        res.totalPallets
      );
      setContainerLoad(load);
      setWarnings([...res.warnings, ...load.warnings]);
    }
  }, [skus, container, input]);

  const plan = result?.plans?.[selectedIdx] ?? result?.bestPlan ?? null;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* 顶部导航 */}
      <header className="h-12 bg-slate-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center">
          <h1 className="text-white font-bold text-base tracking-wide">
            PAL<span className="text-blue-400">*</span>CALC
          </h1>
          <span className="text-slate-400 text-xs ml-3">专业托盘装柜计算器</span>
        </div>
        
        {/* 模式切换 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'single' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            单产品
          </button>
          <button
            onClick={() => setMode('multi')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'multi' 
                ? 'bg-blue-500 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            多SKU装柜
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：输入面板 */}
        <InputForm 
          input={input} 
          onChange={setInput} 
          onCalculate={mode === 'single' ? handleCalculateSingle : handleCalculateMulti}
          multiMode={mode === 'multi'}
          skus={skus}
          onSkusChange={setSkus}
          container={container}
          onContainerChange={setContainer}
        />

        {/* 中间/右侧：结果展示 */}
        {mode === 'single' && (
          <div className="flex-1 flex min-h-0">
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
            <div className="w-[400px] flex-shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col">
              <SolutionPreview
                plan={plan}
                input={input}
                layers={layers}
                flipLength={flipLength}
                flipWidth={flipWidth}
                onDownloadReport={() => setShowReport(true)}
              />
              
              {/* 底部：预警和导出 */}
              <div className="p-3 space-y-2 border-t border-slate-200">
                <WarningPanel warnings={warnings} />
                <div className="flex gap-2">
                  <PDFExportButton 
                    plan={plan} 
                    input={input} 
                    warnings={warnings}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'multi' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
            {/* 上部：结果汇总 */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="text-sm font-bold text-slate-800 mb-3">装柜方案汇总</h2>
              
              {multiResult ? (
                <div className="grid grid-cols-3 gap-4">
                  {/* 产品列表 */}
                  <div className="col-span-2">
                    <table className="w-full border-collapse">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="border border-slate-200 px-2 py-1 text-xs text-left">产品</th>
                          <th className="border border-slate-200 px-2 py-1 text-xs text-left">尺寸</th>
                          <th className="border border-slate-200 px-2 py-1 text-xs text-left">单托箱数</th>
                          <th className="border border-slate-200 px-2 py-1 text-xs text-left">托盘数</th>
                          <th className="border border-slate-200 px-2 py-1 text-xs text-left">重量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {multiResult.products.map((p, idx) => (
                          <tr key={idx}>
                            <td className="border border-slate-200 px-2 py-1 text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: p.sku.boxColor }} />
                                {p.sku.name}
                              </div>
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-xs font-mono">
                              {p.sku.box.length}×{p.sku.box.width}×{p.sku.box.height}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-xs font-bold">
                              {p.plan.totalBoxes}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-xs font-bold text-blue-600">
                              {p.palletsNeeded}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-xs">
                              {p.totalWeight.toFixed(0)}kg
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* 汇总数据 */}
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-xs font-bold text-blue-700">总托盘数</div>
                      <div className="text-xl font-bold text-blue-600 mt-1">{multiResult.totalPallets}</div>
                    </div>
                    
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-xs font-bold text-slate-700">总重量</div>
                      <div className="text-lg font-bold mt-1">{multiResult.totalWeight.toFixed(0)}kg</div>
                    </div>
                    
                    <div className="bg-slate-50 rounded p-3">
                      <div className="text-xs font-bold text-slate-700">总体积</div>
                      <div className="text-lg font-bold mt-1">{multiResult.totalVolume.toFixed(2)}m³</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  请添加产品并点击"开始计算"
                </div>
              )}
            </div>

            {/* 下部：装柜示意图和预警 */}
            <div className="flex-1 flex gap-4 min-h-0">
              {/* 装柜示意图 */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-800">
                    集装箱装载示意图 {container ? `- ${container.name}` : ''}
                  </h2>
                  {containerLoad && <WarningBadge warnings={containerLoad.warnings} />}
                </div>
                
                {container && containerLoad ? (
                  <ContainerPreview
                    container={container}
                    loadResult={containerLoad}
                    palletLength={input.pallet.length}
                    palletWidth={input.pallet.width}
                    palletHeight={multiResult?.products[0]?.plan.totalHeight || 1500}
                  />
                ) : (
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                    <span className="text-slate-500">请选择集装箱并计算</span>
                  </div>
                )}
              </div>
              
              {/* 预警和导出 */}
              <div className="w-[280px] flex-shrink-0 space-y-3">
                <WarningPanel warnings={warnings} title="合规性检查" />
                
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-700 mb-2">集装箱参数</div>
                  {container ? (
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>内尺寸:</span>
                        <span className="font-mono">{container.innerLength}×{container.innerWidth}×{container.innerHeight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>门尺寸:</span>
                        <span className="font-mono">{container.doorWidth}×{container.doorHeight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>有效载荷:</span>
                        <span className="font-mono">{container.payload}kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>容积:</span>
                        <span className="font-mono">{container.volume}m³</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">请选择集装箱</div>
                  )}
                </div>
                
                {containerLoad && (
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-emerald-700 mb-2">利用率分析</div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>体积利用率</span>
                          <span className="font-bold">{containerLoad.volumeUtilization}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full">
                          <div 
                            className="h-2 bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(containerLoad.volumeUtilization, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>重量利用率</span>
                          <span className="font-bold">{containerLoad.weightUtilization}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              containerLoad.weightUtilization > 95 ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(containerLoad.weightUtilization, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                        <div className="text-slate-600">剩余空间: {(containerLoad.remainingLength/1000).toFixed(1)}m</div>
                        <div className="text-slate-600">剩余载重: {containerLoad.remainingPayload}kg</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <PDFExportButton 
                  multiResult={multiResult ?? undefined}
                  container={container}
                  containerLoad={containerLoad ?? undefined}
                  warnings={warnings}
                  input={input}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 隐藏的报告区域（用于截图） */}
      {showReport && plan && mode === 'single' && (
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