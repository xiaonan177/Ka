/**
 * 托盘打托排版算法
 * 支持单层内混合方向排列，确保箱体不超出托盘边界
 * 以毫米为计算单位，以分米(dm)为画图缩放单位
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

/** 单层内的排列区域（一段同方向的箱子组） */
export interface LayerSection {
  /** 沿托盘长度方向的箱子尺寸(mm) */
  boxAlongLength: number;
  /** 沿托盘宽度方向的箱子尺寸(mm) */
  boxAlongWidth: number;
  /** 沿托盘长度方向的排列数量 */
  countAlongLength: number;
  /** 沿托盘宽度方向的排列数量 */
  countAlongWidth: number;
  /** 沿宽度方向实际占用mm */
  usedWidth: number;
  /** 箱数 */
  boxCount: number;
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
  /** 沿托盘长度方向排列数量（单一方向时） */
  countAlongLength: number;
  /** 沿托盘宽度方向排列数量（单一方向时） */
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
  /** 覆盖区域尺寸（实际占用长×宽 mm） */
  coverageLength: number;
  coverageWidth: number;
  /** 单层混合排列区域（用于2D精确绘制） */
  sections: LayerSection[];
  /** 箱体原始尺寸 */
  originalBox: BoxDimensions;
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
 * 尝试单一方向排列（全部箱子同方向）
 */
function tryUniformLayout(
  palletLength: number,
  palletWidth: number,
  alongLength: number,
  alongWidth: number
): LayerSection[] | null {
  const countAlongLength = Math.floor(palletLength / alongLength);
  const countAlongWidth = Math.floor(palletWidth / alongWidth);
  if (countAlongLength <= 0 || countAlongWidth <= 0) return null;

  const usedWidth = countAlongWidth * alongWidth;
  return [{
    boxAlongLength: alongLength,
    boxAlongWidth: alongWidth,
    countAlongLength,
    countAlongWidth,
    usedWidth,
    boxCount: countAlongLength * countAlongWidth,
  }];
}

/**
 * 尝试混合方向排列
 * 思路：将托盘宽度分成两段，一段按方向A排列，剩余空间按方向B排列
 * 两种底面方向：原始(alongLength × alongWidth) 和 旋转(alongWidth × alongLength)
 */
function tryMixedLayout(
  palletLength: number,
  palletWidth: number,
  alongLength: number,
  alongWidth: number
): LayerSection[] | null {
  // 旋转后的方向
  const rotAlongLength = alongWidth;
  const rotAlongWidth = alongLength;

  let bestSections: LayerSection[] | null = null;
  let bestTotal = 0;

  // 尝试方案1：先排若干行原始方向，剩余宽度排旋转方向
  const maxRowsOriginal = Math.floor(palletWidth / alongWidth);
  for (let rowsOrig = 1; rowsOrig <= maxRowsOriginal; rowsOrig++) {
    const usedWidthOrig = rowsOrig * alongWidth;
    const remainWidth = palletWidth - usedWidthOrig;

    // 剩余空间排旋转方向
    const countL_rot = Math.floor(palletLength / rotAlongLength);
    const countW_rot = Math.floor(remainWidth / rotAlongWidth);

    if (countL_rot > 0 && countW_rot > 0) {
      const countL_orig = Math.floor(palletLength / alongLength);
      const total = countL_orig * rowsOrig + countL_rot * countW_rot;
      if (total > bestTotal) {
        bestTotal = total;
        bestSections = [
          {
            boxAlongLength: alongLength,
            boxAlongWidth: alongWidth,
            countAlongLength: countL_orig,
            countAlongWidth: rowsOrig,
            usedWidth: usedWidthOrig,
            boxCount: countL_orig * rowsOrig,
          },
          {
            boxAlongLength: rotAlongLength,
            boxAlongWidth: rotAlongWidth,
            countAlongLength: countL_rot,
            countAlongWidth: countW_rot,
            usedWidth: countW_rot * rotAlongWidth,
            boxCount: countL_rot * countW_rot,
          },
        ];
      }
    }
  }

  // 尝试方案2：先排若干行旋转方向，剩余宽度排原始方向
  const maxRowsRotated = Math.floor(palletWidth / rotAlongWidth);
  for (let rowsRot = 1; rowsRot <= maxRowsRotated; rowsRot++) {
    const usedWidthRot = rowsRot * rotAlongWidth;
    const remainWidth = palletWidth - usedWidthRot;

    // 剩余空间排原始方向
    const countL_orig = Math.floor(palletLength / alongLength);
    const countW_orig = Math.floor(remainWidth / alongWidth);

    if (countL_orig > 0 && countW_orig > 0) {
      const countL_rot = Math.floor(palletLength / rotAlongLength);
      const total = countL_rot * rowsRot + countL_orig * countW_orig;
      if (total > bestTotal) {
        bestTotal = total;
        bestSections = [
          {
            boxAlongLength: rotAlongLength,
            boxAlongWidth: rotAlongWidth,
            countAlongLength: countL_rot,
            countAlongWidth: rowsRot,
            usedWidth: usedWidthRot,
            boxCount: countL_rot * rowsRot,
          },
          {
            boxAlongLength: alongLength,
            boxAlongWidth: alongWidth,
            countAlongLength: countL_orig,
            countAlongWidth: countW_orig,
            usedWidth: countW_orig * alongWidth,
            boxCount: countL_orig * countW_orig,
          },
        ];
      }
    }
  }

  return bestSections;
}

/**
 * 对每种摆放方向，计算最优单层排列
 */
function findBestLayerLayout(
  palletLength: number,
  palletWidth: number,
  alongLength: number,
  alongWidth: number
): { sections: LayerSection[]; totalBoxes: number } {
  // 先试单一方向
  const uniform = tryUniformLayout(palletLength, palletWidth, alongLength, alongWidth);
  const uniformTotal = uniform ? uniform.reduce((s, sec) => s + sec.boxCount, 0) : 0;

  // 再试混合方向
  const mixed = tryMixedLayout(palletLength, palletWidth, alongLength, alongWidth);
  const mixedTotal = mixed ? mixed.reduce((s, sec) => s + sec.boxCount, 0) : 0;

  // 选最优
  if (mixedTotal > uniformTotal && mixed) {
    return { sections: mixed, totalBoxes: mixedTotal };
  }
  if (uniform) {
    return { sections: uniform, totalBoxes: uniformTotal };
  }
  return { sections: [], totalBoxes: 0 };
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
    // 找到该方向下的最优单层排列
    const { sections, totalBoxes: boxesPerLayer } = findBestLayerLayout(
      pallet.length,
      pallet.width,
      ori.alongLength,
      ori.alongWidth
    );

    if (boxesPerLayer <= 0 || sections.length === 0) return;

    const layers = Math.min(
      Math.floor(effectiveMaxHeight / ori.stackHeight),
      maxStackLayers && maxStackLayers > 0 ? maxStackLayers : Infinity
    );

    if (layers <= 0) return;

    const totalBoxes = boxesPerLayer * layers;
    const totalHeight = pallet.height + layers * ori.stackHeight;

    // 计算实际覆盖尺寸
    const coverageLength = Math.max(...sections.map(s => s.countAlongLength * s.boxAlongLength));
    const coverageWidth = sections.reduce((sum, s) => sum + s.usedWidth, 0);

    // 兼容字段：取第一个section的方向作为主方向
    const primarySection = sections[0];
    const countAlongLength = primarySection.countAlongLength;
    const countAlongWidth = sections.reduce((s, sec) => s + sec.countAlongWidth, 0);

    // 空间利用率 = 箱体总体积 / (托盘面积 × 实际堆叠高度)
    const boxVolume = box.length * box.width * box.height;
    const usedVolume = totalBoxes * boxVolume;
    const palletVolume = pallet.length * pallet.width * (totalHeight - pallet.height);
    const utilization = palletVolume > 0 ? (usedVolume / palletVolume) * 100 : 0;

    const heightOk = totalHeight <= maxHeight;

    // 方向描述：如果是混合排列，标注详细
    const orientationDesc = sections.length > 1
      ? `${ori.label}(混合排列)`
      : ori.label;

    plans.push({
      id: index + 1,
      orientation: orientationDesc,
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
      sections,
      originalBox: { ...box },
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

/**
 * 毫米转分米(dm)，用于画图单位
 * 1 dm = 100 mm
 */
export function mmToDm(mm: number): number {
  return mm / 100;
}
