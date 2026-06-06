'use client';

import { useState } from 'react';
import { PalletizeInput, PALLET_PRESETS, TRUCK_PRESETS } from '@/lib/palletize';

interface InputFormProps {
  input: PalletizeInput;
  onChange: (input: PalletizeInput) => void;
  onCalculate: () => void;
}

const DEFAULT_COLORS = [
  '#C4A882', '#D4A76A', '#8B6914', '#A0522D', '#CD853F',
  '#DEB887', '#F5DEB3', '#D2691E', '#BC8F8F', '#E8C39E',
];

export function InputForm({ input, onChange, onCalculate }: InputFormProps) {
  const [caseOpen, setCaseOpen] = useState(false);
  const [truckOpen, setTruckOpen] = useState(false);

  const update = (partial: Partial<PalletizeInput>) => {
    onChange({ ...input, ...partial });
  };

  const handlePalletTypeChange = (type: string) => {
    if (type === 'Custom') {
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
    if (type === 'No Truck') {
      update({ truckType: type, truck: undefined });
      setTruckOpen(false);
    } else if (type === 'Custom') {
      update({ truckType: type, truck: { name: 'Custom', length: 12000, width: 2400, height: 2600 } });
      setTruckOpen(true);
    } else {
      const preset = TRUCK_PRESETS.find(t => t.name === type);
      if (preset) {
        update({ truckType: type, truck: { ...preset } });
        setTruckOpen(true);
      }
    }
  };

  return (
    <div className="w-[320px] flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto h-full">
      <div className="p-4 space-y-4">

        {/* 产品名称 */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 mb-2">📦 Consumer Package</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">Name</label>
              <input
                type="text"
                value={input.productName}
                onChange={e => update({ productName: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                placeholder="Product name"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500">Length mm</label>
                <input type="number" value={input.box.length || ''} onChange={e => update({ box: { ...input.box, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Width mm</label>
                <input type="number" value={input.box.width || ''} onChange={e => update({ box: { ...input.box, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Height mm</label>
                <input type="number" value={input.box.height || ''} onChange={e => update({ box: { ...input.box, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Weight kg</label>
                <input type="number" value={input.boxWeight || ''} onChange={e => update({ boxWeight: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" step="0.1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Color</label>
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

        {/* 外箱 */}
        <div>
          <button onClick={() => { setCaseOpen(!caseOpen); if (!caseOpen) update({ useCase: true }); else update({ useCase: false }); }} className="flex items-center gap-2 text-sm font-bold text-slate-800">
            📦 Case (Outer Box)
            <span className="text-xs text-slate-400 font-normal">{input.useCase ? 'Enabled' : 'No Case'}</span>
          </button>
          {caseOpen && input.useCase && (
            <div className="mt-2 space-y-2 p-2 bg-slate-50 rounded">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Length</label>
                  <input type="number" value={input.caseBox.length || ''} onChange={e => update({ caseBox: { ...input.caseBox, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Width</label>
                  <input type="number" value={input.caseBox.width || ''} onChange={e => update({ caseBox: { ...input.caseBox, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Height</label>
                  <input type="number" value={input.caseBox.height || ''} onChange={e => update({ caseBox: { ...input.caseBox, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Cases per box</label>
                <input type="number" value={input.caseCount || ''} onChange={e => update({ caseCount: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* 托盘 */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 mb-2">🎛 Pallet</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">Type</label>
              <select value={input.palletType} onChange={e => handlePalletTypeChange(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm">
                {PALLET_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500">Length</label>
                <input type="number" value={input.pallet.length || ''} onChange={e => update({ pallet: { ...input.pallet, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Width</label>
                <input type="number" value={input.pallet.width || ''} onChange={e => update({ pallet: { ...input.pallet, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Height</label>
                <input type="number" value={input.pallet.height || ''} onChange={e => update({ pallet: { ...input.pallet, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Max stack height mm</label>
              <input type="number" value={input.maxHeight || ''} onChange={e => update({ maxHeight: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Max layers</label>
              <input type="number" value={input.maxStackLayers || ''} onChange={e => update({ maxStackLayers: Number(e.target.value) })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="0 = no limit" />
            </div>
          </div>
        </div>

        {/* 车辆 */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 mb-2">🚛 Truck / Container</h2>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">Vehicle</label>
              <select value={input.truckType} onChange={e => handleTruckTypeChange(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1 text-sm">
                <option value="No Truck">No Truck</option>
                {TRUCK_PRESETS.map(t => <option key={t.name} value={t.name}>{t.name} {t.length}×{t.width}×{t.height}mm</option>)}
                <option value="Custom">Custom</option>
              </select>
            </div>
            {truckOpen && input.truck && (() => {
                  const t = input.truck;
                  return (
                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded">
                      <div>
                        <label className="text-xs text-slate-500">Length</label>
                        <input type="number" value={t.length} onChange={e => update({ truck: { ...t, length: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Width</label>
                        <input type="number" value={t.width} onChange={e => update({ truck: { ...t, width: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Height</label>
                        <input type="number" value={t.height} onChange={e => update({ truck: { ...t, height: Number(e.target.value) } })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                      </div>
                    </div>
                  );
                })()}
          </div>
        </div>

        {/* 计算按钮 */}
        <button
          onClick={onCalculate}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors"
        >
          🚀 PALCALC it!
        </button>
      </div>
    </div>
  );
}
