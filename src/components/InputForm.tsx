'use client';

import { useState } from 'react';
import { PalletizeInput, PALLET_PRESETS, TRUCK_PRESETS, CONTAINER_PRESETS, ContainerSpec, ProductSKU } from '@/lib/palletize';

interface InputFormProps {
  input: PalletizeInput;
  onChange: (input: PalletizeInput) => void;
  onCalculate: () => void;
  // 多SKU模式
  multiMode?: boolean;
  skus?: ProductSKU[];
  onSkusChange?: (skus: ProductSKU[]) => void;
  container?: ContainerSpec;
  onContainerChange?: (container: ContainerSpec | undefined) => void;
}

const DEFAULT_COLORS = [
  '#C4A882', '#D4A76A', '#8B6914', '#A0522D', '#CD853F',
  '#DEB887', '#F5DEB3', '#D2691E', '#BC8F8F', '#E8C39E',
  '#6B8E23', '#556B2F', '#8FBC8F', '#2E8B57', '#3CB371',
];

const DEFAULT_SKU: ProductSKU = {
  id: '',
  name: '',
  box: { length: 255, width: 167, height: 240 },
  boxWeight: 5,
  boxColor: '#C4A882',
  quantity: 100,
};

export function InputForm({ 
  input, onChange, onCalculate,
  multiMode = false, skus = [], onSkusChange,
  container, onContainerChange 
}: InputFormProps) {
  const [caseOpen, setCaseOpen] = useState(false);
  const [truckOpen, setTruckOpen] = useState(false);
  const [useContainer, setUseContainer] = useState(false);

  const update = (partial: Partial<PalletizeInput>) => {
    onChange({ ...input, ...partial });
  };

  const handlePalletTypeChange = (type: string) => {
    if (type === '自定义') {
      update({ palletType: type });
    } else {
      const preset = PALLET_PRESETS.find(p => p.name === type);
      if (preset) {
        update({
          palletType: type,
          pallet: { length: preset.length, width: preset.width, height: preset.height },
        });
      }
    }
  };

  const handleTruckTypeChange = (type: string) => {
    if (type === '不使用车辆') {
      update({ truckType: type, truck: undefined });
      setTruckOpen(false);
    } else if (type === '自定义') {
      update({ truckType: type, truck: { name: '自定义', length: 12000, width: 2400, height: 2600 } });
      setTruckOpen(true);
    } else {
      const preset = TRUCK_PRESETS.find(t => t.name === type);
      if (preset) {
        update({ truckType: type, truck: { ...preset } });
        setTruckOpen(true);
      }
    }
  };

  const handleContainerChange = (name: string) => {
    if (name === '不使用集装箱') {
      onContainerChange?.(undefined);
      setUseContainer(false);
    } else if (name === '自定义') {
      onContainerChange?.({
        name: '自定义',
        code: '',
        tareWeight: 3000,
        payload: 26000,
        doorWidth: 2340,
        doorHeight: 2580,
        innerWidth: 2350,
        innerLength: 12000,
        innerHeight: 2698,
        volume: 76,
        actualLoad: 65,
      });
      setUseContainer(true);
    } else {
      const preset = CONTAINER_PRESETS.find(c => c.name === name);
      if (preset) {
        onContainerChange?.(preset);
        setUseContainer(true);
      }
    }
  };

  // 多SKU操作
  const addSKU = () => {
    const newSKU: ProductSKU = {
      ...DEFAULT_SKU,
      id: `sku-${Date.now()}`,
      boxColor: DEFAULT_COLORS[skus.length % DEFAULT_COLORS.length],
    };
    onSkusChange?.([...skus, newSKU]);
  };

  const removeSKU = (id: string) => {
    onSkusChange?.(skus.filter(s => s.id !== id));
  };

  const updateSKU = (id: string, partial: Partial<ProductSKU>) => {
    onSkusChange?.(skus.map(s => s.id === id ? { ...s, ...partial } : s));
  };

  return (
    <div className="w-[340px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto h-full">
      <div className="p-4 space-y-4">

        {/* 模式切换提示 */}
        {multiMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-blue-700 mb-1">多SKU模式</div>
            <div className="text-xs text-blue-600">支持多个产品同时计算装柜方案</div>
          </div>
        )}

        {/* 多SKU产品列表 */}
        {multiMode && onSkusChange && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800">📦 产品列表</h2>
              <button
                onClick={addSKU}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                + 添加产品
              </button>
            </div>
            
            <div className="space-y-3">
              {skus.map((sku, idx) => (
                <div key={sku.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: sku.boxColor }} />
                      <span className="text-sm font-medium text-slate-700">
                        {sku.name || `产品 ${idx + 1}`}
                      </span>
                    </div>
                    <button
                      onClick={() => removeSKU(sku.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      删除
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={sku.name}
                      onChange={e => updateSKU(sku.id, { name: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      placeholder="产品名称"
                    />
                    
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="text-xs text-slate-500">长mm</label>
                        <input
                          type="number"
                          value={sku.box.length || ''}
                          onChange={e => updateSKU(sku.id, { box: { ...sku.box, length: Number(e.target.value) } })}
                          className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">宽mm</label>
                        <input
                          type="number"
                          value={sku.box.width || ''}
                          onChange={e => updateSKU(sku.id, { box: { ...sku.box, width: Number(e.target.value) } })}
                          className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">高mm</label>
                        <input
                          type="number"
                          value={sku.box.height || ''}
                          onChange={e => updateSKU(sku.id, { box: { ...sku.box, height: Number(e.target.value) } })}
                          className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">单箱重kg</label>
                        <input
                          type="number"
                          value={sku.boxWeight || ''}
                          onChange={e => updateSKU(sku.id, { boxWeight: Number(e.target.value) })}
                          className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">装箱数</label>
                        <input
                          type="number"
                          value={sku.quantity || ''}
                          onChange={e => updateSKU(sku.id, { quantity: Number(e.target.value) })}
                          className="w-full border border-slate-300 rounded px-1 py-1 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-slate-500">颜色</label>
                      <input
                        type="color"
                        value={sku.boxColor}
                        onChange={e => updateSKU(sku.id, { boxColor: e.target.value })}
                        className="w-6 h-6 border border-slate-300 rounded cursor-pointer"
                      />
                      {DEFAULT_COLORS.slice(0, 8).map(c => (
                        <button
                          key={c}
                          onClick={() => updateSKU(sku.id, { boxColor: c })}
                          className="w-4 h-4 rounded-sm border border-slate-300 hover:ring-1 ring-slate-400"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              {skus.length === 0 && (
                <div className="text-center text-sm text-slate-500 py-4">
                  请点击"添加产品"开始录入
                </div>
              )}
            </div>
          </div>
        )}

        {/* 单产品模式 */}
        {!multiMode && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-2">📦 消费者包装</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500">名称</label>
                <input
                  type="text"
                  value={input.productName}
                  onChange={e => update({ productName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                  placeholder="产品名称"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500">长 mm</label>
                  <input type="number" value={input.box.length || ''} onChange={e => update({ box: { ...input.box, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">宽 mm</label>
                  <input type="number" value={input.box.width || ''} onChange={e => update({ box: { ...input.box, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">高 mm</label>
                  <input type="number" value={input.box.height || ''} onChange={e => update({ box: { ...input.box, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">重量 kg</label>
                  <input type="number" value={input.boxWeight || ''} onChange={e => update({ boxWeight: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" step="0.1" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">颜色</label>
                  <div className="flex items-center gap-1">
                    <input type="color" value={input.boxColor} onChange={e => update({ boxColor: e.target.value })} className="w-8 h-8 border border-slate-300 rounded cursor-pointer" />
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_COLORS.slice(0, 5).map(c => (
                        <button key={c} onClick={() => update({ boxColor: c })} className="w-4 h-4 rounded-sm border border-slate-300" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 外箱 */}
        {!multiMode && (
          <div>
            <button onClick={() => { setCaseOpen(!caseOpen); if (!caseOpen) update({ useCase: true }); else update({ useCase: false }); }} className="flex items-center gap-2 text-sm font-bold text-slate-800">
              📦 外箱包装
              <span className="text-xs text-slate-400 font-normal">{input.useCase ? '已启用' : '未使用'}</span>
            </button>
            {caseOpen && input.useCase && (
              <div className="mt-2 space-y-2 p-2 bg-slate-50 rounded">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">长</label>
                    <input type="number" value={input.caseBox.length || ''} onChange={e => update({ caseBox: { ...input.caseBox, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">宽</label>
                    <input type="number" value={input.caseBox.width || ''} onChange={e => update({ caseBox: { ...input.caseBox, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">高</label>
                    <input type="number" value={input.caseBox.height || ''} onChange={e => update({ caseBox: { ...input.caseBox, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">每箱装箱数</label>
                  <input type="number" value={input.caseCount || ''} onChange={e => update({ caseCount: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 托盘 */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 mb-2">🎛 托盘</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">类型</label>
              <select value={input.palletType} onChange={e => handlePalletTypeChange(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm">
                {PALLET_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                <option value="自定义">自定义</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500">长</label>
                <input type="number" value={input.pallet.length || ''} onChange={e => update({ pallet: { ...input.pallet, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">宽</label>
                <input type="number" value={input.pallet.width || ''} onChange={e => update({ pallet: { ...input.pallet, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">高</label>
                <input type="number" value={input.pallet.height || ''} onChange={e => update({ pallet: { ...input.pallet, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">最大堆高 mm</label>
              <input type="number" value={input.maxHeight || ''} onChange={e => update({ maxHeight: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">最大层数</label>
              <input type="number" value={input.maxStackLayers || ''} onChange={e => update({ maxStackLayers: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="0 = 不限" />
            </div>
          </div>
        </div>

        {/* 集装箱选择（多SKU模式专用） */}
        {multiMode && onContainerChange && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-2">🚢 集装箱</h2>
            <div className="space-y-2">
              <select 
                value={container?.name || '不使用集装箱'} 
                onChange={e => handleContainerChange(e.target.value)} 
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
              >
                <option value="不使用集装箱">不使用集装箱</option>
                {CONTAINER_PRESETS.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.code}) - {c.volume}m³ / {c.payload}kg
                  </option>
                ))}
                <option value="自定义">自定义</option>
              </select>
              
              {useContainer && container && (
                <div className="bg-slate-50 rounded p-2 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>内尺寸:</span>
                    <span className="font-mono">{container.innerLength}×{container.innerWidth}×{container.innerHeight}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>门尺寸:</span>
                    <span className="font-mono">{container.doorWidth}×{container.doorHeight}mm</span>
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
              )}
            </div>
          </div>
        )}

        {/* 车辆（单产品模式） */}
        {!multiMode && (
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-2">🚛 车辆/集装箱</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-slate-500">车辆类型</label>
                <select value={input.truckType} onChange={e => handleTruckTypeChange(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm">
                  <option value="不使用车辆">不使用车辆</option>
                  {TRUCK_PRESETS.map(t => <option key={t.name} value={t.name}>{t.name} {t.length}×{t.width}×{t.height}mm</option>)}
                  <option value="自定义">自定义</option>
                </select>
              </div>
              {truckOpen && input.truck && (
                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded">
                  <div>
                    <label className="text-xs text-slate-500">长</label>
                    <input type="number" value={input.truck.length} onChange={e => update({ truck: { ...input.truck!, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">宽</label>
                    <input type="number" value={input.truck.width} onChange={e => update({ truck: { ...input.truck!, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">高</label>
                    <input type="number" value={input.truck.height} onChange={e => update({ truck: { ...input.truck!, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 计算按钮 */}
        <button
          onClick={onCalculate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors shadow-sm"
        >
          🚀 开始计算
        </button>
      </div>
    </div>
  );
}