/**
 * 托盘打托排版算法
 * 支持多种箱体摆放方向优化，输出最优堆码方案
 */

/** 箱体尺寸（毫米） */
export interface BoxDimensions {
  length: number; // 长
  width: number;  // 宽
  height: number; // 高
}

/** 托盘尺寸（毫米） */
export interface PalletDimensions {
  length: number; // 长
  width: number;  // 宽
  height: number; // 高（托盘本身高度）
}

/** 排版方案 */
export interface PalletPlan {
  /** 方案编号 */
  id: number;
  /** 摆放方向描述 */
  orientation: string;
  /** 箱体在托盘上的有效尺寸（长×宽，即底面占位） */
  boxOnPalletLength: number;
  boxOnPalletWidth: number;
  /** 箱体堆叠高度方向尺寸 */
  boxStackHeight: number;
  /** 沿托盘长度方向排列数量 */
  countAlongLength: number;
  /** 沿托盘宽度方向排列数量 */
  countAlongWidth: number;
  /** 每层箱数 */
  boxesPerLayer: number;
  /** 层数 */
  layers: number;
  /** 每托总箱数 */
  totalBoxes: number;
  /** 托盘总高度（含托盘本身） */
  totalHeight: number;
  /** 空间利用率 */
  utilization: number;
  /** 是否满足高度限制 */
  heightOk: boolean;
  /** 覆盖区域尺寸（实际占用长×宽） */
  coverageLength: number;
  coverageWidth: number;
}

/** 算法输入参数 */
export interface PalletizeInput {
  box: BoxDimensions;
  pallet: PalletDimensions;
  maxHeight: number;        // 最大允许总高度（含托盘）
  maxStackLayers?: number;  // 最大堆码层数（0或undefined表示不限）
  productName?: string;     // 产品名称
}

/** 算法输出结果 */
export interface PalletizeResult {
  /** 所有可行方案（按总箱数降序） */
  plans: PalletPlan[];
  /** 最优方案 */
  bestPlan: PalletPlan;
  /** 输入参数回显 */
  input: PalletizeInput;
}

/**
 * 6种箱体摆放方向
 * 每种方向定义：[沿托盘长方向的尺寸, 沿托盘宽方向的尺寸, 堆叠高度方向的尺寸]
 */
function getOrientations(box: BoxDimensions): Array<{
  alongLength: number;
  alongWidth: number;
  stackHeight: number;
  label: string;
}> {
  const { length: l, width: w, height: h } = box;
  return [
    { alongLength: l, alongWidth: w, stackHeight: h, label: '平放(长×宽为底)' },
    { alongLength: w, alongWidth: l, stackHeight: h, label: '平放旋转(宽×长为底)' },
    { alongLength: l, alongWidth: h, stackHeight: w, label: '侧放(长×高为底)' },
    { alongLength: h, alongWidth: l, stackHeight: w, label: '侧放旋转(高×长为底)' },
    { alongLength: w, alongWidth: h, stackHeight: l, label: '竖放(宽×高为底)' },
    { alongLength: h, alongWidth: w, stackHeight: l, label: '竖放旋转(高×宽为底)' },
  ];
}

/**
 * 计算打托方案
 */
export function calculatePalletPlan(input: PalletizeInput): PalletizeResult {
  const { box, pallet, maxHeight, maxStackLayers } = input;
  const effectiveMaxHeight = maxHeight - pallet.height; // 可用堆叠高度

  if (effectiveMaxHeight <= 0) {
    return { plans: [], bestPlan: null as unknown as PalletPlan, input };
  }

  const orientations = getOrientations(box);
  const plans: PalletPlan[] = [];

  orientations.forEach((ori, index) => {
    const countAlongLength = Math.floor(pallet.length / ori.alongLength);
    const countAlongWidth = Math.floor(pallet.width / ori.alongWidth);

    if (countAlongLength <= 0 || countAlongWidth <= 0) return;

    const boxesPerLayer = countAlongLength * countAlongWidth;
    const layers = Math.min(
      Math.floor(effectiveMaxHeight / ori.stackHeight),
      maxStackLayers && maxStackLayers > 0 ? maxStackLayers : Infinity
    );

    if (layers <= 0) return;

    const totalBoxes = boxesPerLayer * layers;
    const totalHeight = pallet.height + layers * ori.stackHeight;
    const coverageLength = countAlongLength * ori.alongLength;
    const coverageWidth = countAlongWidth * ori.alongWidth;

    // 空间利用率 = 箱体总体积 / (托盘面积 × 实际堆叠高度)
    const boxVolume = box.length * box.width * box.height;
    const usedVolume = totalBoxes * boxVolume;
    const palletVolume = pallet.length * pallet.width * (totalHeight - pallet.height);
    const utilization = palletVolume > 0 ? (usedVolume / palletVolume) * 100 : 0;

    const heightOk = totalHeight <= maxHeight;

    plans.push({
      id: index + 1,
      orientation: ori.label,
      boxOnPalletLength: ori.alongLength,
      boxOnPalletWidth: ori.alongWidth,
      boxStackHeight: ori.stackHeight,
      countAlongLength,
      countAlongWidth,
      boxesPerLayer,
      layers,
      totalBoxes,
      totalHeight,
      utilization: Math.round(utilization * 100) / 100,
      heightOk,
      coverageLength,
      coverageWidth,
    });
  });

  // 按总箱数降序排列，箱数相同则按空间利用率降序
  plans.sort((a, b) => {
    if (b.totalBoxes !== a.totalBoxes) return b.totalBoxes - a.totalBoxes;
    return b.utilization - a.utilization;
  });

  // 重新编号
  plans.forEach((plan, i) => {
    plan.id = i + 1;
  });

  const bestPlan = plans[0] || null;

  return { plans, bestPlan, input };
}

/**
 * 格式化尺寸显示
 */
export function formatDimensions(l: number, w: number, h: number): string {
  return `${l} × ${w} × ${h} 毫米`;
}

/**
 * 格式化堆码方式
 */
export function formatStacking(countL: number, countW: number, layers: number): string {
  return `${countL} × ${countW} × ${layers}`;
}
