'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ContainerSpec, ContainerLoadResult, mmToDm } from '@/lib/palletize';

interface ContainerPreviewProps {
  container: ContainerSpec;
  loadResult: ContainerLoadResult;
  palletLength: number;
  palletWidth: number;
  palletHeight: number;
  palletColor?: string;
}

export function ContainerPreview({
  container,
  loadResult,
  palletLength,
  palletWidth,
  palletHeight,
  palletColor = '#374151',
}: ContainerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext('2d');
    if (!ctxRaw) return;
    const ctx = ctxRaw;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displayW, displayH);

    // 标题
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`集装箱装柜示意图 - ${container.name}`, displayW / 2, 20);

    // 参数转换
    const containerL = mmToDm(container.innerLength);
    const containerW = mmToDm(container.innerWidth);
    const palletL = mmToDm(palletLength);
    const palletW = mmToDm(palletWidth);

    // 计算缩放
    const margin = 60;
    const maxDrawW = displayW - margin * 2;
    const maxDrawH = displayH - margin * 2 - 40;
    const scale = Math.min(maxDrawW / containerL, maxDrawH / containerW);
    const ox = margin + (maxDrawW - containerL * scale) / 2;
    const oy = margin + 40 + (maxDrawH - containerW * scale) / 2;

    // 绘制集装箱轮廓（俯视图）
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, containerL * scale, containerW * scale);

    // 绘制集装箱内壁填充
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(ox, oy, containerL * scale, containerW * scale);

    // 绘制门的位置（左侧）
    const doorW = mmToDm(container.doorWidth);
    const doorOffset = (container.innerWidth - container.doorWidth) / 2;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(ox - 5, oy + mmToDm(doorOffset) * scale, 5, doorW * scale);
    
    // 门框标注
    ctx.fillStyle = '#64748B';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('门', ox - 4, oy + containerW * scale / 2);

    // 绘制托盘网格
    const { palletsPerRow, rows, palletOrientation } = loadResult;
    const palletAlongL = palletOrientation === 'L-along' ? palletL : palletW;
    const palletAlongW = palletOrientation === 'L-along' ? palletW : palletL;

    // 绘制每个托盘
    ctx.fillStyle = palletColor;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < palletsPerRow; col++) {
        const px = ox + row * palletAlongL * scale;
        const py = oy + col * palletAlongW * scale;
        
        // 只绘制实际装载的托盘
        if (row * palletsPerRow + col < loadResult.totalPallets) {
          ctx.fillRect(px, py, palletAlongL * scale - 1, palletAlongW * scale - 1);
          ctx.strokeRect(px, py, palletAlongL * scale - 1, palletAlongW * scale - 1);
          
          // 托盘编号
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${row * palletsPerRow + col + 1}`, px + palletAlongL * scale / 2, py + palletAlongW * scale / 2 + 4);
          ctx.fillStyle = palletColor;
        }
      }
    }

    // 绘制剩余空间标注
    const usedL = mmToDm(loadResult.lengthUsed);
    const remainL = mmToDm(loadResult.remainingLength);
    
    if (remainL > 0) {
      ctx.fillStyle = '#FEE2E2';
      ctx.fillRect(ox + usedL * scale, oy, remainL * scale, containerW * scale);
      
      ctx.fillStyle = '#EF4444';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`剩余 ${(remainL * 100).toFixed(0)}cm`, ox + usedL * scale + remainL * scale / 2, oy + containerW * scale / 2);
    }

    // 尺寸标注
    ctx.fillStyle = '#1E293B';
    ctx.font = '11px monospace';
    
    // 长度标注（顶部）
    ctx.textAlign = 'center';
    ctx.fillText(`${(containerL * 100).toFixed(0)}cm`, ox + containerL * scale / 2, oy - 15);
    
    // 已用长度标注
    ctx.fillStyle = '#10B981';
    ctx.fillText(`已用 ${(usedL * 100).toFixed(0)}cm`, ox + usedL * scale / 2, oy + containerW * scale + 25);
    
    // 宽度标注（右侧）
    ctx.save();
    ctx.translate(ox + containerL * scale + 20, oy + containerW * scale / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(`${(containerW * 100).toFixed(0)}cm`, 0, 0);
    ctx.restore();

    // 利用率信息
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    
    const infoY = displayH - 50;
    ctx.fillText(`托盘排列: ${rows}排 × ${palletsPerRow}列 = ${loadResult.totalPallets}托`, margin, infoY);
    ctx.fillText(`体积利用率: ${loadResult.volumeUtilization}%`, margin, infoY + 18);
    ctx.fillText(`重量利用率: ${loadResult.weightUtilization}%`, margin + 150, infoY);
    
    // 预警提示
    if (loadResult.warnings.length > 0) {
      const errorWarning = loadResult.warnings.find(w => w.severity === 'error');
      if (errorWarning) {
        ctx.fillStyle = '#EF4444';
        ctx.fillText(`⚠ ${errorWarning.message}`, margin + 150, infoY + 18);
      }
    }
  }, [container, loadResult, palletLength, palletWidth, palletHeight, palletColor]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}