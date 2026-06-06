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

/** 预设托盘规格 */
const PALLET_PRESETS: Array<{
  name: string;
  length: number;
  width: number;
  height: number;
  material: string;
}> = [
  { name: "标准塑料托盘 1200×1000", length: 1200, width: 1000, height: 160, material: "塑料" },
  { name: "欧标托盘 1200×800", length: 1200, width: 800, height: 144, material: "木质" },
  { name: "日标托盘 1100×1100", length: 1100, width: 1100, height: 150, material: "塑料" },
  { name: "美标托盘 1200×1000", length: 1219, width: 1016, height: 150, material: "木质" },
  { name: "自定义", length: 0, width: 0, height: 0, material: "" },
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
    const preset = PALLET_PRESETS.find((p) => p.name === value);
    if (preset && preset.length > 0) {
      onInputChange({
        ...input,
        pallet: { length: preset.length, width: preset.width, height: preset.height },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 产品信息 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          产品信息
        </h3>
        <div className="space-y-2">
          <Label htmlFor="productName" className="text-xs text-slate-500">
            产品名称
          </Label>
          <Input
            id="productName"
            value={input.productName || ""}
            onChange={(e) => onInputChange({ ...input, productName: e.target.value })}
            placeholder="请输入产品名称"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* 箱体尺寸 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          箱体尺寸（毫米）
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="boxL" className="text-xs text-slate-500">
              长 (L)
            </Label>
            <Input
              id="boxL"
              type="number"
              min={1}
              value={input.box.length || ""}
              onChange={(e) => updateBox({ length: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="boxW" className="text-xs text-slate-500">
              宽 (W)
            </Label>
            <Input
              id="boxW"
              type="number"
              min={1}
              value={input.box.width || ""}
              onChange={(e) => updateBox({ width: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="boxH" className="text-xs text-slate-500">
              高 (H)
            </Label>
            <Input
              id="boxH"
              type="number"
              min={1}
              value={input.box.height || ""}
              onChange={(e) => updateBox({ height: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* 托盘参数 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          托盘参数
        </h3>
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">托盘规格</Label>
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="选择托盘规格" />
            </SelectTrigger>
            <SelectContent>
              {PALLET_PRESETS.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="palletL" className="text-xs text-slate-500">
              长 (L)
            </Label>
            <Input
              id="palletL"
              type="number"
              min={1}
              value={input.pallet.length || ""}
              onChange={(e) => updatePallet({ length: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="palletW" className="text-xs text-slate-500">
              宽 (W)
            </Label>
            <Input
              id="palletW"
              type="number"
              min={1}
              value={input.pallet.width || ""}
              onChange={(e) => updatePallet({ width: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="palletH" className="text-xs text-slate-500">
              高 (H)
            </Label>
            <Input
              id="palletH"
              type="number"
              min={1}
              value={input.pallet.height || ""}
              onChange={(e) => updatePallet({ height: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* 限制条件 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          限制条件（毫米）
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="maxHeight" className="text-xs text-slate-500">
              最大总高度
            </Label>
            <Input
              id="maxHeight"
              type="number"
              min={1}
              value={input.maxHeight || ""}
              onChange={(e) => onInputChange({ ...input, maxHeight: Number(e.target.value) || 0 })}
              className="h-9 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maxLayers" className="text-xs text-slate-500">
              最大堆码层数
            </Label>
            <Input
              id="maxLayers"
              type="number"
              min={0}
              placeholder="0=不限"
              value={input.maxStackLayers || ""}
              onChange={(e) =>
                onInputChange({ ...input, maxStackLayers: Number(e.target.value) || 0 })
              }
              className="h-9 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* 计算按钮 */}
      <Button onClick={onCalculate} className="w-full h-10 text-sm font-semibold" size="lg">
        计算打托方案
      </Button>
    </div>
  );
}
