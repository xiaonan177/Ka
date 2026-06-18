'use client';

import { useCallback, useRef, useState } from 'react';
import { PalletPlan, PalletizeInput, ContainerLoadResult, ContainerSpec, MultiSKUResult, Warning } from '@/lib/palletize';

interface PDFExportProps {
  plan?: PalletPlan | null;
  input: PalletizeInput;
  containerLoad?: ContainerLoadResult;
  container?: ContainerSpec;
  multiResult?: MultiSKUResult;
  warnings?: Warning[];
}

export function PDFExportButton({
  plan,
  input,
  containerLoad,
  container,
  multiResult,
  warnings = [],
}: PDFExportProps) {
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = useCallback(async () => {
    if (!plan && !multiResult) return;
    
    setExporting(true);
    
    try {
      // 动态导入jsPDF
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // 创建报告内容
      if (reportRef.current) {
        // 等待渲染
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 截图报告区域
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          backgroundColor: '#FFFFFF',
          useCORS: true,
          logging: false,
        });
        
        // 创建PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        const imgWidth = 210; // A4宽度mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // 分页处理
        const pageHeight = 297; // A4高度mm
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        // 下载
        const filename = multiResult 
          ? `multi-sku-report-${Date.now()}.pdf`
          : `pallet-report-${input.productName || 'unnamed'}.pdf`;
        pdf.save(filename);
      }
    } catch (error) {
      console.error('PDF导出失败:', error);
    } finally {
      setExporting(false);
    }
  }, [plan, input, multiResult]);

  // 渲染报告内容（用于截图）
  const renderReportContent = () => {
    if (multiResult) {
      return (
        <div className="bg-white p-6 space-y-4" style={{ width: '800px' }}>
          <div className="text-center border-b border-slate-200 pb-4">
            <h1 className="text-xl font-bold text-slate-800">多SKU装柜方案报告</h1>
            <p className="text-sm text-slate-500">生成时间: {new Date().toLocaleString()}</p>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800">产品清单</h2>
            <table className="w-full border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-xs">产品</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs">尺寸(mm)</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs">重量(kg)</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs">数量</th>
                  <th className="border border-slate-300 px-2 py-1 text-xs">托盘数</th>
                </tr>
              </thead>
              <tbody>
                {multiResult.products.map((p, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 px-2 py-1 text-xs">{p.sku.name}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs font-mono">
                      {p.sku.box.length}×{p.sku.box.width}×{p.sku.box.height}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-xs">{p.sku.boxWeight}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs">{p.sku.quantity}</td>
                    <td className="border border-slate-300 px-2 py-1 text-xs font-bold">{p.palletsNeeded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded p-3">
              <div className="text-sm font-bold text-slate-700">汇总数据</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                <div>总托盘数: <span className="font-bold text-blue-600">{multiResult.totalPallets}</span></div>
                <div>总重量: <span className="font-bold">{multiResult.totalWeight.toFixed(0)}kg</span></div>
                <div>总体积: <span className="font-bold">{multiResult.totalVolume.toFixed(2)}m³</span></div>
              </div>
            </div>
            
            {container && containerLoad && (
              <div className="bg-slate-50 rounded p-3">
                <div className="text-sm font-bold text-slate-700">集装箱装载</div>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div>柜型: <span className="font-bold">{container.name}</span></div>
                  <div>托盘排列: {containerLoad.rows}排×{containerLoad.palletsPerRow}列</div>
                  <div>体积利用率: <span className="font-bold text-emerald-600">{containerLoad.volumeUtilization}%</span></div>
                  <div>重量利用率: <span className="font-bold text-emerald-600">{containerLoad.weightUtilization}%</span></div>
                </div>
              </div>
            )}
          </div>
          
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="text-sm font-bold text-amber-700">预警提示</div>
              <div className="mt-2 space-y-1">
                {warnings.map((w, idx) => (
                  <div key={idx} className="text-xs text-amber-600">
                    {w.severity === 'error' ? '[错误]' : '[警告]'} {w.message}: {w.details}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (plan) {
      return (
        <div className="bg-white p-6 space-y-4" style={{ width: '800px' }}>
          <div className="text-center border-b border-slate-200 pb-4">
            <h1 className="text-xl font-bold text-slate-800">打托方案报告</h1>
            <p className="text-sm text-slate-500">产品: {input.productName || '未命名'}</p>
            <p className="text-sm text-slate-500">生成时间: {new Date().toLocaleString()}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded p-3">
              <div className="text-sm font-bold text-slate-700">产品尺寸</div>
              <div className="mt-2 text-xs font-mono text-slate-600">
                {input.box.length} × {input.box.width} × {input.box.height} mm
              </div>
              <div className="text-xs text-slate-600 mt-1">
                单箱重量: {input.boxWeight}kg
              </div>
            </div>
            
            <div className="bg-slate-50 rounded p-3">
              <div className="text-sm font-bold text-slate-700">托盘参数</div>
              <div className="mt-2 text-xs font-mono text-slate-600">
                {input.pallet.length} × {input.pallet.width} × {input.pallet.height} mm
              </div>
              <div className="text-xs text-slate-600 mt-1">
                最大堆高: {input.maxHeight}mm
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded p-4">
            <div className="text-lg font-bold text-blue-700">最优方案</div>
            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div>
                <span className="text-slate-600">摆放方向:</span>
                <span className="font-bold ml-1">{plan.orientation}</span>
              </div>
              <div>
                <span className="text-slate-600">单层箱数:</span>
                <span className="font-bold ml-1">{plan.boxesPerLayer}箱</span>
              </div>
              <div>
                <span className="text-slate-600">层数:</span>
                <span className="font-bold ml-1">{plan.layers}层</span></div>
              <div>
                <span className="text-slate-600">单托总数:</span>
                <span className="font-bold ml-1 text-blue-600">{plan.totalBoxes}箱</span>
              </div>
              <div>
                <span className="text-slate-600">托盘高度:</span>
                <span className="font-bold ml-1">{plan.totalHeight}mm</span>
              </div>
              <div>
                <span className="text-slate-600">利用率:</span>
                <span className="font-bold ml-1 text-emerald-600">{plan.utilization}%</span>
              </div>
            </div>
          </div>
          
          {containerLoad && container && (
            <div className="bg-slate-50 rounded p-3">
              <div className="text-sm font-bold text-slate-700">集装箱装载 ({container.name})</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>托盘排列: {containerLoad.rows}排 × {containerLoad.palletsPerRow}列 = {containerLoad.totalPallets}托</div>
                <div>总箱数: {containerLoad.totalBoxes}箱</div>
                <div>体积利用率: {containerLoad.volumeUtilization}%</div>
                <div>重量利用率: {containerLoad.weightUtilization}%</div>
                <div>剩余空间: {(containerLoad.remainingLength/1000).toFixed(1)}m</div>
                <div>剩余载重: {containerLoad.remainingPayload}kg</div>
              </div>
            </div>
          )}
          
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="text-sm font-bold text-amber-700">预警提示</div>
              <div className="mt-2 space-y-1">
                {warnings.map((w, idx) => (
                  <div key={idx} className="text-xs text-amber-600">
                    {w.severity === 'error' ? '[错误]' : '[警告]'} {w.message}: {w.details}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <button
        onClick={handleExportPDF}
        disabled={exporting || (!plan && !multiResult)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          exporting 
            ? 'bg-slate-200 text-slate-500 cursor-wait'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {exporting ? '导出中...' : '导出PDF'}
      </button>
      
      {/* 隐藏的报告内容区域 */}
      <div 
        ref={reportRef} 
        className="fixed left-0 top-0 opacity-0 pointer-events-none z-[-100]"
        style={{ width: '800px' }}
      >
        {renderReportContent()}
      </div>
    </>
  );
}