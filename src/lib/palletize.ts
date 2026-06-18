/**
 * 托盘打托排版算法
 * 支持：矩形箱体、混合方向排列、交互式层编辑
 */

// ==================== 类型定义 ====================

export interface BoxDimensions {
  length: number; // mm
  width: number;  // mm
  height: number; // mm
}

export interface PalletDimensions {
  length: number; // mm
  width: number;  // mm
  height: number; // mm
}

export interface TruckDimensions {
  name: string;
  length: number; // mm
  width: number;  // mm
  height: number; // mm
}

// 集装箱详细参数（符合PRD规格）
export interface ContainerSpec {
  name: string;
  code: string;        // 箱码如 22G1
  tareWeight: number;  // 皮重 kg
  payload: number;     // 有效载荷 kg
  doorWidth: number;   // 门宽 mm
  doorHeight: number;  // 门高 mm
  innerWidth: number;  // 内宽 mm
  innerLength: number; // 内长 mm
  innerHeight: number; // 内高 mm
  volume: number;      // 内部体积 m³
  actualLoad: number;  // 实际装货 m³
}

// 产品SKU信息
export interface ProductSKU {
  id: string;
  name: string;
  box: BoxDimensions;
  boxWeight: number;
  boxColor: string;
  quantity: number;   // 需要装箱的总数量
}

// 多SKU计算结果
export interface MultiSKUResult {
  products: {
    sku: ProductSKU;
    plan: PalletPlan;
    palletsNeeded: number;
    totalWeight: number;
  }[];
  totalPallets: number;
  totalWeight: number;
  totalVolume: number;
  warnings: Warning[];
}

// 预警类型
export interface Warning {
  type: 'height' | 'weight' | 'payload' | 'door';
  severity: 'warning' | 'error';
  message: string;
  details: string;
}

export interface LayerSection {
  boxAlongLength: number;
  boxAlongWidth: number;
  countAlongLength: number;
  countAlongWidth: number;
  usedWidth: number;
  boxCount: number;
}

export interface PalletPlan {
  id: number;
  orientation: string;
  boxOnPalletLength: number;
  boxOnPalletWidth: number;
  boxStackHeight: number;
  countAlongLength: number;
  countAlongWidth: number;
  boxesPerLayer: number;
  layers: number;
  totalBoxes: number;
  totalHeight: number;
  utilization: number;
  heightOk: boolean;
  coverageLength: number;
  coverageWidth: number;
  sections: LayerSection[];
  originalBox: BoxDimensions;
}

export interface PalletizeInput {
  productName: string;
  box: BoxDimensions;
  boxWeight: number;
  boxColor: string;
  useCase: boolean;
  caseBox: BoxDimensions;
  caseCount: number;
  pallet: PalletDimensions;
  maxHeight: number;
  maxStackLayers: number;
  palletType: string;
  truckType: string;
  truck: TruckDimensions | undefined;
}

export interface PalletizeResult {
  plans: PalletPlan[];
  bestPlan: PalletPlan | null;
  input: PalletizeInput;
}

export interface TruckLoadResult {
  palletsPerRow: number;
  rows: number;
  totalPallets: number;
  totalBoxes: number;
  totalWeight: number;
  lengthUsed: number;
  widthUsed: number;
  heightUsed: number;
  volumeUtilization: number;
}

// ==================== 托盘预设 ====================

export const PALLET_PRESETS: { name: string; length: number; width: number; height: number }[] = [
  { name: '欧标1号/ISO1 1200×800mm', length: 1200, width: 800, height: 144 },
  { name: '欧标2号/英标 1200×1000mm', length: 1200, width: 1000, height: 144 },
  { name: '欧标3号/芬标/ISO2 1000×1200mm', length: 1000, width: 1200, height: 144 },
  { name: 'UPL托盘 1200×1100mm', length: 1200, width: 1100, height: 144 },
  { name: 'HPL/欧标6号/ISO0 600×800mm', length: 600, width: 800, height: 144 },
  { name: 'QPL/四分之一托盘 600×400mm', length: 600, width: 400, height: 144 },
  { name: 'PXL托盘 1200×1200mm', length: 1200, width: 1200, height: 144 },
  { name: '美标托盘 1219×1016mm', length: 1219, width: 1016, height: 152 },
  { name: '美标42寸 1067×1067mm', length: 1067, width: 1067, height: 152 },
  { name: '美标48寸 1219×1219mm', length: 1219, width: 1219, height: 152 },
  { name: '澳标托盘 1165×1165mm', length: 1165, width: 1165, height: 150 },
  { name: '亚标托盘 1100×1100mm', length: 1100, width: 1100, height: 150 },
];

// ==================== 集装箱预设 ====================

export const CONTAINER_PRESETS: ContainerSpec[] = [
  {
    name: '20GP',
    code: '22G1',
    tareWeight: 2200,
    payload: 28280,
    doorWidth: 2340,
    doorHeight: 2280,
    innerWidth: 2350,
    innerLength: 5898,
    innerHeight: 2390,
    volume: 33.2,
    actualLoad: 28,
  },
  {
    name: '40GP',
    code: '42G1',
    tareWeight: 3800,
    payload: 26680,
    doorWidth: 2340,
    doorHeight: 2280,
    innerWidth: 2350,
    innerLength: 12032,
    innerHeight: 2390,
    volume: 67.7,
    actualLoad: 58,
  },
  {
    name: '40HC',
    code: '45G1',
    tareWeight: 3900,
    payload: 26580,
    doorWidth: 2340,
    doorHeight: 2580,
    innerWidth: 2350,
    innerLength: 12032,
    innerHeight: 2698,
    volume: 76.3,
    actualLoad: 65,
  },
  {
    name: '45HC',
    code: 'L5G1',
    tareWeight: 4800,
    payload: 25680,
    doorWidth: 2340,
    doorHeight: 2580,
    innerWidth: 2350,
    innerLength: 13556,
    innerHeight: 2698,
    volume: 86.0,
    actualLoad: 76,
  },
];

// ==================== 车辆预设 ====================

export const TRUCK_PRESETS: TruckDimensions[] = [
  { name: '欧标卡车 标准', length: 13600, width: 2480, height: 2700 },
  { name: '欧标卡车 加高型', length: 13600, width: 2480, height: 3000 },
  { name: '美标53英尺挂车', length: 16154, width: 2591, height: 2743 },
  { name: '美标48英尺挂车', length: 14630, width: 2591, height: 2743 },
  { name: '20英尺集装箱', length: 5898, width: 2352, height: 2393 },
  { name: '40英尺集装箱', length: 12032, width: 2352, height: 2393 },
  { name: '40英尺高柜集装箱', length: 12032, width: 2352, height: 2698 },
  { name: '45英尺高柜集装箱', length: 13556, width: 2352, height: 2698 },
];

// ==================== 核心算法 ====================

/** 获取箱体6种摆放方向 */
function getOrientations(box: BoxDimensions) {
  return [
    { alongLength: box.length, alongWidth: box.width, stackHeight: box.height, label: '平放(LWH)' },
    { alongLength: box.width, alongWidth: box.length, stackHeight: box.height, label: '平放(WLH)' },
    { alongLength: box.length, alongWidth: box.height, stackHeight: box.width, label: '侧放(LHW)' },
    { alongLength: box.height, alongWidth: box.length, stackHeight: box.width, label: '侧放(HLW)' },
    { alongLength: box.width, alongWidth: box.height, stackHeight: box.length, label: '竖放(WHL)' },
    { alongLength: box.height, alongWidth: box.width, stackHeight: box.length, label: '竖放(HWL)' },
  ];
}

/** 尝试单一方向排列 */
function tryUniformLayout(
  palletLength: number,
  palletWidth: number,
  alongLength: number,
  alongWidth: number
): LayerSection[] | null {
  const countL = Math.floor(palletLength / alongLength);
  const countW = Math.floor(palletWidth / alongWidth);
  if (countL <= 0 || countW <= 0) return null;
  return [{
    boxAlongLength: alongLength,
    boxAlongWidth: alongWidth,
    countAlongLength: countL,
    countAlongWidth: countW,
    usedWidth: countW * alongWidth,
    boxCount: countL * countW,
  }];
}

/** 尝试混合方向排列 */
function tryMixedLayout(
  palletLength: number,
  palletWidth: number,
  alongLength: number,
  alongWidth: number
): LayerSection[] | null {
  const rotAlongLength = alongWidth;
  const rotAlongWidth = alongLength;
  let bestTotal = 0;
  let bestSections: LayerSection[] | null = null;

  // 方案1：先排若干行原始方向，剩余宽度排旋转方向
  const maxRowsOriginal = Math.floor(palletWidth / alongWidth);
  for (let rowsOrig = 1; rowsOrig <= maxRowsOriginal; rowsOrig++) {
    const usedWidthOrig = rowsOrig * alongWidth;
    const remainWidth = palletWidth - usedWidthOrig;

    if (remainWidth >= rotAlongWidth) {
      const countL_orig = Math.floor(palletLength / alongLength);
      const countL_rot = Math.floor(palletLength / rotAlongLength);
      const countW_rot = Math.floor(remainWidth / rotAlongWidth);

      if (countL_orig > 0 && countL_rot > 0 && countW_rot > 0) {
        const total = countL_orig * rowsOrig + countL_rot * countW_rot;
        if (total > bestTotal) {
          bestTotal = total;
          bestSections = [
            { boxAlongLength: alongLength, boxAlongWidth: alongWidth, countAlongLength: countL_orig, countAlongWidth: rowsOrig, usedWidth: usedWidthOrig, boxCount: countL_orig * rowsOrig },
            { boxAlongLength: rotAlongLength, boxAlongWidth: rotAlongWidth, countAlongLength: countL_rot, countAlongWidth: countW_rot, usedWidth: countW_rot * rotAlongWidth, boxCount: countL_rot * countW_rot },
          ];
        }
      }
    }
  }

  // 方案2：先排若干行旋转方向，剩余宽度排原始方向
  const maxRowsRotated = Math.floor(palletWidth / rotAlongWidth);
  for (let rowsRot = 1; rowsRot <= maxRowsRotated; rowsRot++) {
    const usedWidthRot = rowsRot * rotAlongWidth;
    const remainWidth = palletWidth - usedWidthRot;

    const countL_orig = Math.floor(palletLength / alongLength);
    const countW_orig = Math.floor(remainWidth / alongWidth);

    if (countL_orig > 0 && countW_orig > 0) {
      const countL_rot = Math.floor(palletLength / rotAlongLength);
      const total = countL_rot * rowsRot + countL_orig * countW_orig;
      if (total > bestTotal) {
        bestTotal = total;
        bestSections = [
          { boxAlongLength: rotAlongLength, boxAlongWidth: rotAlongWidth, countAlongLength: countL_rot, countAlongWidth: rowsRot, usedWidth: usedWidthRot, boxCount: countL_rot * rowsRot },
          { boxAlongLength: alongLength, boxAlongWidth: alongWidth, countAlongLength: countL_orig, countAlongWidth: countW_orig, usedWidth: countW_orig * alongWidth, boxCount: countL_orig * countW_orig },
        ];
      }
    }
  }

  return bestSections;
}

/** 对每种摆放方向，计算最优单层排列 */
function findBestLayerLayout(
  palletLength: number,
  palletWidth: number,
  alongLength: number,
  alongWidth: number
): { sections: LayerSection[]; totalBoxes: number } {
  const uniform = tryUniformLayout(palletLength, palletWidth, alongLength, alongWidth);
  const uniformTotal = uniform ? uniform.reduce((s, sec) => s + sec.boxCount, 0) : 0;
  const mixed = tryMixedLayout(palletLength, palletWidth, alongLength, alongWidth);
  const mixedTotal = mixed ? mixed.reduce((s, sec) => s + sec.boxCount, 0) : 0;

  if (mixedTotal > uniformTotal && mixed) return { sections: mixed, totalBoxes: mixedTotal };
  if (uniform) return { sections: uniform, totalBoxes: uniformTotal };
  return { sections: [], totalBoxes: 0 };
}

/** 计算打托方案（返回所有可行方案，按总箱数降序） */
export function calculatePalletPlan(input: PalletizeInput): PalletizeResult {
  const { box, pallet, maxHeight, maxStackLayers } = input;
  const effectiveMaxHeight = maxHeight - pallet.height;

  if (effectiveMaxHeight <= 0) {
    return { plans: [], bestPlan: null, input };
  }

  const orientations = getOrientations(box);
  const plans: PalletPlan[] = [];

  orientations.forEach((ori, index) => {
    const { sections, totalBoxes: boxesPerLayer } = findBestLayerLayout(
      pallet.length, pallet.width, ori.alongLength, ori.alongWidth
    );
    if (boxesPerLayer <= 0 || sections.length === 0) return;

    const layers = Math.min(
      Math.floor(effectiveMaxHeight / ori.stackHeight),
      maxStackLayers > 0 ? maxStackLayers : Infinity
    );
    if (layers <= 0) return;

    const totalBoxes = boxesPerLayer * layers;
    const totalHeight = pallet.height + layers * ori.stackHeight;
    const coverageLength = Math.max(...sections.map(s => s.countAlongLength * s.boxAlongLength));
    const coverageWidth = sections.reduce((sum, s) => sum + s.usedWidth, 0);

    const primarySection = sections[0];
    const countAlongLength = primarySection.countAlongLength;
    const countAlongWidth = sections.reduce((s, sec) => s + sec.countAlongWidth, 0);

    const boxVolume = box.length * box.width * box.height;
    const usedVolume = totalBoxes * boxVolume;
    const palletVolume = pallet.length * pallet.width * (totalHeight - pallet.height);
    const utilization = palletVolume > 0 ? (usedVolume / palletVolume) * 100 : 0;
    const heightOk = totalHeight <= maxHeight;

    const orientationDesc = sections.length > 1 ? `${ori.label}(混合排列)` : ori.label;

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

  plans.sort((a, b) => b.totalBoxes !== a.totalBoxes ? b.totalBoxes - a.totalBoxes : b.utilization - a.utilization);
  plans.forEach((plan, i) => { plan.id = i + 1; });

  return { plans, bestPlan: plans[0] || null, input };
}

/** 计算车辆装载 */
export function calculateTruckLoad(
  truck: TruckDimensions,
  palletLength: number,
  palletWidth: number,
  palletHeight: number,
  boxesPerPallet: number,
  boxWeight: number
): TruckLoadResult {
  const option1 = { palletsPerRow: Math.floor(truck.width / palletWidth), rows: Math.floor(truck.length / palletLength) };
  const option2 = { palletsPerRow: Math.floor(truck.width / palletLength), rows: Math.floor(truck.length / palletWidth) };
  const total1 = option1.palletsPerRow * option1.rows;
  const total2 = option2.palletsPerRow * option2.rows;
  const best = total1 >= total2 ? option1 : option2;
  const totalPallets = Math.max(total1, total2);
  const heightOk = palletHeight <= truck.height;
  const totalBoxes = totalPallets * boxesPerPallet;
  const totalWeight = totalPallets * boxesPerPallet * boxWeight;
  const truckVolume = truck.length * truck.width * truck.height;
  const usedVolume = totalPallets * palletLength * palletWidth * (heightOk ? palletHeight : truck.height);

  return {
    palletsPerRow: best.palletsPerRow,
    rows: best.rows,
    totalPallets,
    totalBoxes,
    totalWeight,
    lengthUsed: best.rows * palletLength,
    widthUsed: best.palletsPerRow * palletWidth,
    heightUsed: heightOk ? palletHeight : truck.height,
    volumeUtilization: truckVolume > 0 ? usedVolume / truckVolume : 0,
  };
}

export function formatDimensions(l: number, w: number, h: number): string {
  return `${l} × ${w} × ${h}`;
}

export function formatStacking(countL: number, countW: number, layers: number): string {
  return `${countL} × ${countW} × ${layers}`;
}

export function mmToDm(mm: number): number {
  return mm / 100;
}

// ==================== 集装箱装柜计算 ====================

export interface ContainerLoadResult {
  palletsPerRow: number;    // 每排托盘数
  rows: number;             // 排数
  totalPallets: number;     // 总托盘数
  totalBoxes: number;       // 总箱数
  totalWeight: number;      // 总重量 kg
  lengthUsed: number;       // 已用长度 mm
  widthUsed: number;        // 已用宽度 mm
  heightUsed: number;       // 已用高度 mm
  volumeUtilization: number; // 体积利用率 %
  weightUtilization: number; // 重量利用率 %
  remainingLength: number;  // 剩余长度 mm
  remainingPayload: number; // 剩余载重 kg
  remainingVolume: number;  // 剩余体积 m³
  warnings: Warning[];      // 预警列表
  palletOrientation: 'L-along' | 'W-along'; // 托盘摆放方向
}

/** 计算集装箱装柜方案 */
export function calculateContainerLoad(
  container: ContainerSpec,
  palletLength: number,
  palletWidth: number,
  palletHeight: number,
  boxesPerPallet: number,
  boxWeight: number,
  requestedPallets?: number
): ContainerLoadResult {
  const warnings: Warning[] = [];
  
  // 检查门高限制
  if (palletHeight > container.doorHeight) {
    warnings.push({
      type: 'door',
      severity: 'error',
      message: '托盘高度超过集装箱门高',
      details: `托盘高度 ${palletHeight}mm > 门高 ${container.doorHeight}mm，无法装柜`,
    });
  }
  
  // 检查托盘高度是否超过箱内高度
  if (palletHeight > container.innerHeight) {
    warnings.push({
      type: 'height',
      severity: 'error',
      message: '托盘高度超过集装箱内高',
      details: `托盘高度 ${palletHeight}mm > 内高 ${container.innerHeight}mm`,
    });
  }
  
  // 计算两种摆放方式
  // 方案1：托盘长边沿集装箱长方向
  const opt1 = {
    palletsPerRow: Math.floor(container.innerWidth / palletWidth),
    rows: Math.floor(container.innerLength / palletLength),
    orientation: 'L-along' as const,
  };
  
  // 方案2：托盘宽边沿集装箱长方向（旋转90°）
  const opt2 = {
    palletsPerRow: Math.floor(container.innerWidth / palletLength),
    rows: Math.floor(container.innerLength / palletWidth),
    orientation: 'W-along' as const,
  };
  
  const total1 = opt1.palletsPerRow * opt1.rows;
  const total2 = opt2.palletsPerRow * opt2.rows;
  
  const best = total1 >= total2 ? opt1 : opt2;
  let totalPallets = Math.max(total1, total2);
  
  // 如果指定了需要的托盘数，使用实际值
  if (requestedPallets && requestedPallets < totalPallets) {
    totalPallets = requestedPallets;
    // 重新计算rows
    best.rows = Math.ceil(totalPallets / best.palletsPerRow);
  }
  
  const totalBoxes = totalPallets * boxesPerPallet;
  const totalWeight = totalPallets * boxesPerPallet * boxWeight;
  
  // 重量校验
  if (totalWeight > container.payload) {
    warnings.push({
      type: 'payload',
      severity: 'error',
      message: '总重量超过集装箱有效载荷',
      details: `总重量 ${totalWeight.toFixed(0)}kg > 有效载荷 ${container.payload}kg`,
    });
  } else if (totalWeight > container.payload * 0.95) {
    warnings.push({
      type: 'payload',
      severity: 'warning',
      message: '接近载重上限',
      details: `已使用 ${(totalWeight / container.payload * 100).toFixed(1)}% 载重`,
    });
  }
  
  // 高度警告
  const heightUsed = Math.min(palletHeight, container.innerHeight);
  if (palletHeight > container.innerHeight * 0.95) {
    warnings.push({
      type: 'height',
      severity: 'warning',
      message: '接近高度上限',
      details: `托盘高度 ${palletHeight}mm，内高 ${container.innerHeight}mm`,
    });
  }
  
  // 计算利用率
  const usedVolume = totalPallets * palletLength * palletWidth * heightUsed / 1e9; // m³
  const volumeUtilization = (usedVolume / container.volume) * 100;
  const weightUtilization = (totalWeight / container.payload) * 100;
  
  const lengthUsed = best.rows * (best.orientation === 'L-along' ? palletLength : palletWidth);
  const widthUsed = best.palletsPerRow * (best.orientation === 'L-along' ? palletWidth : palletLength);
  
  return {
    palletsPerRow: best.palletsPerRow,
    rows: best.rows,
    totalPallets,
    totalBoxes,
    totalWeight,
    lengthUsed,
    widthUsed,
    heightUsed,
    volumeUtilization: Math.round(volumeUtilization * 10) / 10,
    weightUtilization: Math.round(weightUtilization * 10) / 10,
    remainingLength: container.innerLength - lengthUsed,
    remainingPayload: container.payload - totalWeight,
    remainingVolume: container.volume - usedVolume,
    warnings,
    palletOrientation: best.orientation,
  };
}

// ==================== 多SKU计算 ====================

/** 计算多个SKU的打托方案 */
export function calculateMultiSKU(
  skus: ProductSKU[],
  pallet: PalletDimensions,
  maxHeight: number,
  maxStackLayers: number = 0
): MultiSKUResult {
  const products: MultiSKUResult['products'] = [];
  const warnings: Warning[] = [];
  
  for (const sku of skus) {
    const input: PalletizeInput = {
      productName: sku.name,
      box: sku.box,
      boxWeight: sku.boxWeight,
      boxColor: sku.boxColor,
      useCase: false,
      caseBox: { length: 0, width: 0, height: 0 },
      caseCount: 0,
      pallet,
      maxHeight,
      maxStackLayers,
      palletType: '自定义',
      truckType: '不使用车辆',
      truck: undefined,
    };
    
    const result = calculatePalletPlan(input);
    const bestPlan = result.bestPlan;
    
    if (!bestPlan) {
      warnings.push({
        type: 'weight',
        severity: 'error',
        message: `产品 "${sku.name}" 无法打托`,
        details: '尺寸超出托盘范围或高度限制',
      });
      continue;
    }
    
    const palletsNeeded = Math.ceil(sku.quantity / bestPlan.totalBoxes);
    const lastPalletBoxes = sku.quantity % bestPlan.totalBoxes || bestPlan.totalBoxes;
    const totalWeight = sku.quantity * sku.boxWeight;
    
    // 检查单托重量是否超限
    const singlePalletWeight = bestPlan.totalBoxes * sku.boxWeight;
    if (singlePalletWeight > 1000) {
      warnings.push({
        type: 'weight',
        severity: 'warning',
        message: `产品 "${sku.name}" 单托重量较大`,
        details: `单托重量 ${singlePalletWeight.toFixed(0)}kg`,
      });
    }
    
    products.push({
      sku,
      plan: bestPlan,
      palletsNeeded,
      totalWeight,
    });
  }
  
  const totalPallets = products.reduce((sum, p) => sum + p.palletsNeeded, 0);
  const totalWeight = products.reduce((sum, p) => sum + p.totalWeight, 0);
  const totalVolume = products.reduce((sum, p) => {
    const boxVol = p.sku.box.length * p.sku.box.width * p.sku.box.height / 1e9;
    return sum + p.sku.quantity * boxVol;
  }, 0);
  
  return {
    products,
    totalPallets,
    totalWeight,
    totalVolume,
    warnings,
  };
}

// ==================== 预警检查 ====================

/** 检查托盘方案是否合规 */
export function checkWarnings(
  plan: PalletPlan,
  maxHeight: number,
  boxWeight: number,
  container?: ContainerSpec
): Warning[] {
  const warnings: Warning[] = [];
  
  // 高度检查
  if (plan.totalHeight > maxHeight) {
    warnings.push({
      type: 'height',
      severity: 'error',
      message: '托盘高度超过限制',
      details: `托盘总高 ${plan.totalHeight}mm > 限制 ${maxHeight}mm`,
    });
  } else if (plan.totalHeight > maxHeight * 0.95) {
    warnings.push({
      type: 'height',
      severity: 'warning',
      message: '接近高度上限',
      details: `已使用 ${(plan.totalHeight / maxHeight * 100).toFixed(1)}% 高度`,
    });
  }
  
  // 单托重量检查
  const palletWeight = plan.totalBoxes * boxWeight;
  if (palletWeight > 1000) {
    warnings.push({
      type: 'weight',
      severity: 'warning',
      message: '单托重量较大',
      details: `单托重量 ${palletWeight.toFixed(0)}kg，注意搬运安全`,
    });
  }
  
  // 集装箱门高检查
  if (container && plan.totalHeight > container.doorHeight) {
    warnings.push({
      type: 'door',
      severity: 'error',
      message: '托盘高度超过集装箱门高',
      details: `托盘高度 ${plan.totalHeight}mm > 门高 ${container.doorHeight}mm`,
    });
  }
  
  return warnings;
}
