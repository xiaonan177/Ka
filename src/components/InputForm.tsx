"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PalletizeInput, BoxDimensions, PalletDimensions } from "@/lib/palletize";

/** 预设托盘规格 - 对标PALCALC的12种预设 */
const PALLET_PRESETS: Array<{
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  material: string;
}> = [
  { id: "eur1", name: "EUR/EUR 1 1200×800", length: 1200, width: 800, height: 144, material: "木质" },
  { id: "eur2", name: "EUR 2 (英标) 1200×1000", length: 1200, width: 1000, height: 160, material: "塑料" },
  { id: "eur3", name: "EUR 3/芬标 1000×1200", length: 1000, width: 1200, height: 144, material: "木质" },
  { id: "upl", name: "UPL 1200×1100", length: 1200, width: 1100, height: 150, material: "塑料" },
  { id: "hpl", name: "HPL (半托) 600×800", length: 600, width: 800, height: 144, material: "木质" },
  { id: "qpl", name: "QPL (四分托) 600×400", length: 600, width: 400, height: 144, material: "木质" },
  { id: "pxl", name: "PXL 1200×1200", length: 1200, width: 1200, height: 150, material: "塑料" },
  { id: "us1", name: "美标 48×40\" 1219×1016", length: 1219, width: 1016, height: 150, material: "木质" },
  { id: "us2", name: "美标 42×42\" 1067×1067", length: 1067, width: 1067, height: 150, material: "木质" },
  { id: "us3", name: "美标 48×48\" 1219×1219", length: 1219, width: 1219, height: 150, material: "木质" },
  { id: "au", name: "澳标 1165×1165", length: 1165, width: 1165, height: 150, material: "塑料" },
  { id: "asia", name: "亚标 1100×1100", length: 1100, width: 1100, height: 150, material: "塑料" },
  { id: "custom", name: "自定义", length: 0, width: 0, height: 0, material: "" },
];

/** 预设车辆规格 */
const TRUCK_PRESETS: Array<{
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
}> = [
  { id: "none", name: "不模拟", length: 0, width: 0, height: 0 },
  { id: "eu_std", name: "欧标卡车 13600×2480×2700", length: 13600, width: 2480, height: 2700 },
  { id: "eu_mega", name: "欧标Mega 13600×2480×3000", length: 13600, width: 2480, height: 3000 },
  { id: "us53", name: "美标53ft 16154×2591×2743", length: 16154, width: 2591, height: 2743 },
  { id: "us48", name: "美标48ft 14630×2591×2743", length: 14630, width: 2591, height: 2743 },
  { id: "c20", name: "20尺柜 5898×2352×2393", length: 5898, width: 2352, height: 2393 },
  { id: "c40", name: "40尺柜 12032×2352×2393", length: 12032, width: 2352, height: 2393 },
  { id: "c40hc", name: "40尺高柜 12032×2352×2698", length: 12032, width: 2352, height: 2698 },
  { id: "c45hc", name: "45尺高柜 13556×2352×2698", length: 13556, width: 2352, height: 2698 },
];

interface InputFormProps {
  input: PalletizeInput;
  onInputChange: (input: PalletizeInput) => void;
  onCalculate: () => void;
}

export function InputForm({ input, onInputChange, onCalculate }: InputFormProps) {
  const updateBox = (partial: Partial<BoxDimensions>) => {
    onInputChange({ ...input, box: { ...input.box, ...partial } });
  };

  const updatePallet = (partial: Partial<PalletDimensions>) => {
    onInputChange({ ...input, pallet: { ...input.pallet, ...partial } });
  };

  const handlePresetChange = (value: string) => {
    const preset = PALLET_PRESETS.find((p) => p.id === value);
    if (preset && preset.length > 0) {
      onInputChange({
        ...input,
        pallet: { length: preset.length, width: preset.width, height: preset.height },
      });
    }
  };

  const handleTruckChange = (value: string) => {
    const preset = TRUCK_PRESETS.find((p) => p.id === value);
    if (preset) {
      onInputChange({
        ...input,
        truck: preset.length > 0
          ? { name: preset.name, length: preset.length, width: preset.width, height: preset.height }
          : undefined,
      });
    }
  };

  const currentPalletPreset = PALLET_PRESETS.find(
    (p) => p.length === input.pallet.length && p.width === input.pallet.width
  );

  return (
    <div className="space-y-5">
      {/* 产品信息 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          <span>📦</span>
          <span>产品信息</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="productName" className="text-xs text-slate-500">产品名称</Label>
          <Input
            id="productName"
            value={input.productName || ""}
            onChange={(e) => onInputChange({ ...input, productName: e.target.value })}
            placeholder="输入产品名称"
            className="h-8 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="boxL" className="text-xs text-slate-500">长 (mm)</Label>
            <Input
              id="boxL"
              type="number"
              min={1}
              value={input.box.length || ""}
              onChange={(e) => updateBox({ length: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="boxW" className="text-xs text-slate-500">宽 (mm)</Label>
            <Input
              id="boxW"
              type="number"
              min={1}
              value={input.box.width || ""}
              onChange={(e) => updateBox({ width: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="boxH" className="text-xs text-slate-500">高 (mm)</Label>
            <Input
              id="boxH"
              type="number"
              min={1}
              value={input.box.height || ""}
              onChange={(e) => updateBox({ height: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="boxWeight" className="text-xs text-slate-500">单箱重量 (kg)</Label>
            <Input
              id="boxWeight"
              type="number"
              min={0}
              step={0.1}
              value={input.boxWeight || ""}
              onChange={(e) => onInputChange({ ...input, boxWeight: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
              placeholder="可选"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="boxColor" className="text-xs text-slate-500">箱体颜色</Label>
            <div className="flex items-center gap-2">
              <input
                id="boxColor"
                type="color"
                value={input.boxColor || "#C4A882"}
                onChange={(e) => onInputChange({ ...input, boxColor: e.target.value })}
                className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-xs text-slate-400 font-mono">{input.boxColor || "#C4A882"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 托盘参数 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          <span>🎛</span>
          <span>托盘</span>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">托盘类型</Label>
          <Select
            value={currentPalletPreset?.id || "custom"}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="选择托盘类型" />
            </SelectTrigger>
            <SelectContent>
              {PALLET_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="palletL" className="text-xs text-slate-500">长 (mm)</Label>
            <Input
              id="palletL"
              type="number"
              min={1}
              value={input.pallet.length || ""}
              onChange={(e) => updatePallet({ length: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="palletW" className="text-xs text-slate-500">宽 (mm)</Label>
            <Input
              id="palletW"
              type="number"
              min={1}
              value={input.pallet.width || ""}
              onChange={(e) => updatePallet({ width: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="palletH" className="text-xs text-slate-500">高 (mm)</Label>
            <Input
              id="palletH"
              type="number"
              min={1}
              value={input.pallet.height || ""}
              onChange={(e) => updatePallet({ height: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* 限制条件 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          <span>📏</span>
          <span>限制条件</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="maxHeight" className="text-xs text-slate-500">最大总高度 (mm)</Label>
            <Input
              id="maxHeight"
              type="number"
              min={1}
              value={input.maxHeight || ""}
              onChange={(e) => onInputChange({ ...input, maxHeight: Number(e.target.value) || 0 })}
              className="h-8 text-sm font-mono"
              placeholder="如1500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maxLayers" className="text-xs text-slate-500">最大层数 (0=不限)</Label>
            <Input
              id="maxLayers"
              type="number"
              min={0}
              value={input.maxStackLayers || ""}
              onChange={(e) =>
                onInputChange({ ...input, maxStackLayers: Number(e.target.value) || 0 })
              }
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* 车辆/集装箱 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          <span>🚛</span>
          <span>车辆 / 集装箱</span>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">车辆类型</Label>
          <Select
            value={input.truck ? "eu_std" : "none"}
            onValueChange={handleTruckChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="选择车辆" />
            </SelectTrigger>
            <SelectContent>
              {TRUCK_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {input.truck && (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">长 (mm)</Label>
              <Input
                type="number"
                value={input.truck.length}
                onChange={(e) =>
                  onInputChange({ ...input, truck: { ...input.truck!, length: Number(e.target.value) || 0 } })
                }
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">宽 (mm)</Label>
              <Input
                type="number"
                value={input.truck.width}
                onChange={(e) =>
                  onInputChange({ ...input, truck: { ...input.truck!, width: Number(e.target.value) || 0 } })
                }
                className="h-8 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">高 (mm)</Label>
              <Input
                type="number"
                value={input.truck.height}
                onChange={(e) =>
                  onInputChange({ ...input, truck: { ...input.truck!, height: Number(e.target.value) || 0 } })
                }
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* 计算按钮 */}
      <Button
        onClick={onCalculate}
        className="w-full h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        🚀 计算打托方案
      </Button>
    </div>
  );
}
