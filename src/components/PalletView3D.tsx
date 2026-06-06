"use client";

import { useRef, useEffect } from "react";
import type { PalletPlan, PalletDimensions } from "@/lib/palletize";
import { mmToDm } from "@/lib/palletize";

interface PalletView3DProps {
  plan: PalletPlan;
  pallet: PalletDimensions;
  productName: string;
}

/**
 * 3D托盘可视化组件
 * 使用原生Three.js实现，以分米(dm)为单位1:1缩放绘制
 * 模拟专业货运排版软件的写实渲染效果
 */
export function PalletView3D({ plan, pallet, productName }: PalletView3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendererRef = useRef<any>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initScene = async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      if (!mounted || !containerRef.current) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 如果已有渲染器，先清理
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }

      // 以分米(dm)为单位的尺寸
      const palletL = mmToDm(pallet.length);
      const palletW = mmToDm(pallet.width);
      const palletH = mmToDm(pallet.height);

      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xF1F5F9);

      // 相机 - 斜侧上方45°视角
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
      const stackH = palletH + plan.layers * mmToDm(plan.boxStackHeight);
      camera.position.set(palletL * 1.5, stackH * 1.1, palletL * 1.8);
      camera.lookAt(0, stackH * 0.45, 0);

      // 渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, stackH * 0.45, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 3;
      controls.maxDistance = 50;
      controls.update();

      // === 光照系统 - 模拟仓库灯光 ===
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // 主光源 - 左上方
      const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
      mainLight.position.set(palletL * 2, stackH * 2, palletL);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 50;
      mainLight.shadow.camera.left = -palletL * 2;
      mainLight.shadow.camera.right = palletL * 2;
      mainLight.shadow.camera.top = stackH * 2;
      mainLight.shadow.camera.bottom = -1;
      mainLight.shadow.bias = -0.001;
      scene.add(mainLight);

      // 补光 - 右侧偏冷
      const fillLight = new THREE.DirectionalLight(0xd4e5ff, 0.4);
      fillLight.position.set(-palletL, stackH * 0.8, -palletL * 0.5);
      scene.add(fillLight);

      // 底部反射光
      const bounceLight = new THREE.HemisphereLight(0xffffff, 0xE2E8F0, 0.3);
      scene.add(bounceLight);

      // === 地面 ===
      const groundSize = Math.max(palletL, palletW) * 3;
      const groundGeom = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0 });
      const ground = new THREE.Mesh(groundGeom, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      ground.receiveShadow = true;
      scene.add(ground);

      // 网格辅助线
      const gridSize = Math.ceil(groundSize);
      const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x94A3B8, 0xE2E8F0);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // === 绘制托盘 ===
      buildPallet(scene, THREE, palletL, palletW, palletH);

      // === 绘制箱体 ===
      buildBoxes(scene, THREE, plan, palletL, palletW, palletH, productName);

      // === 右侧高度标注线 ===
      buildHeightAnnotations(scene, THREE, plan, palletL, palletW, palletH, productName);

      // 动画循环
      const animate = () => {
        if (!mounted) return;
        frameRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 窗口大小变化
      const handleResize = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", handleResize);
    };

    initScene();

    return () => {
      mounted = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
    };
  }, [plan, pallet, productName]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-lg overflow-hidden" />
  );
}

/**
 * 创建瓦楞纸箱纹理
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCardboardTexture(THREE: any, _width: number, _height: number): any {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 基础瓦楞纸色
  ctx.fillStyle = "#C4A882";
  ctx.fillRect(0, 0, 512, 512);

  // 水平瓦楞纹理
  ctx.strokeStyle = "rgba(139, 119, 87, 0.3)";
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // 细微的噪点
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(${100 + Math.random() * 60}, ${80 + Math.random() * 50}, ${50 + Math.random() * 40}, 0.15)`;
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * 创建产品标签纹理
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLabelTexture(THREE: any, productName: string, width: number, height: number): any {
  const canvas = document.createElement("canvas");
  const scale = 4;
  canvas.width = Math.max(256, Math.round(width * scale));
  canvas.height = Math.max(128, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cw = canvas.width;
  const ch = canvas.height;

  // 瓦楞纸底色
  ctx.fillStyle = "#C4A882";
  ctx.fillRect(0, 0, cw, ch);

  // 瓦楞纹理
  ctx.strokeStyle = "rgba(139, 119, 87, 0.2)";
  ctx.lineWidth = 0.5;
  for (let y = 0; y < ch; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();
  }

  // 白色标签底色
  const padding = cw * 0.08;
  const labelW = cw - padding * 2;
  const labelH = ch - padding * 2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(padding, padding, labelW, labelH);

  // 标签边框
  ctx.strokeStyle = "#8B7757";
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, labelW, labelH);

  // 产品名称 - 中文
  const fontSize = Math.max(16, Math.round(ch * 0.28));
  ctx.fillStyle = "#2D1F10";
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(productName, cw / 2, ch * 0.45);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * 创建托盘顶面纹理（网格镂空效果）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPalletTopTexture(THREE: any, palletL: number, palletW: number): any {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 深灰底色
  ctx.fillStyle = "#374151";
  ctx.fillRect(0, 0, 512, 512);

  // 网格镂空 - 模拟塑料托盘的网格结构
  const gridCount = 12;
  const cellW = 512 / gridCount;
  const cellH = 512 / gridCount;
  const barW = 3;

  ctx.fillStyle = "#2D3748";
  for (let i = 0; i < gridCount; i++) {
    for (let j = 0; j < gridCount; j++) {
      // 每个格子内部留出镂空
      const margin = barW;
      ctx.fillStyle = "#1F2937";
      ctx.fillRect(
        i * cellW + margin,
        j * cellH + margin,
        cellW - margin * 2,
        cellH - margin * 2
      );
    }
  }

  // 加上横向和纵向的加强筋
  ctx.fillStyle = "#4B5563";
  for (let i = 0; i <= gridCount; i++) {
    ctx.fillRect(i * cellW - barW / 2, 0, barW, 512);
    ctx.fillRect(0, i * cellH - barW / 2, 512, barW);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function buildPallet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any,
  palletL: number,
  palletW: number,
  palletH: number
) {
  const palletGroup = new THREE.Group();

  // 托盘顶面 - 带网格纹理
  const deckThickness = 0.12;
  const topTexture = createPalletTopTexture(THREE, palletL, palletW);
  const deckMat = topTexture
    ? new THREE.MeshLambertMaterial({ map: topTexture })
    : new THREE.MeshLambertMaterial({ color: 0x374151 });
  const deckGeom = new THREE.BoxGeometry(palletL, deckThickness, palletW);
  const deck = new THREE.Mesh(deckGeom, deckMat);
  deck.position.y = palletH - deckThickness / 2;
  deck.castShadow = true;
  deck.receiveShadow = true;
  palletGroup.add(deck);

  // 底板
  const bottomGeom = new THREE.BoxGeometry(palletL, deckThickness * 0.6, palletW);
  const bottomMat = new THREE.MeshLambertMaterial({ color: 0x1F2937 });
  const bottom = new THREE.Mesh(bottomGeom, bottomMat);
  bottom.position.y = deckThickness * 0.3;
  bottom.castShadow = true;
  palletGroup.add(bottom);

  // 川字型支撑脚 - 3条纵梁 + 9个脚垫
  const footHeight = palletH - deckThickness * 1.6;
  const beamWidth = 0.6; // 60mm梁宽

  // 三条纵梁
  const beamPositions = [palletL * 0.15, palletL * 0.5, palletL * 0.85];
  const beamMat = new THREE.MeshLambertMaterial({ color: 0x2D3748 });

  beamPositions.forEach((xRatio) => {
    const beamGeom = new THREE.BoxGeometry(beamWidth, footHeight, palletW * 0.9);
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.set(
      xRatio - palletL / 2,
      deckThickness * 0.6 + footHeight / 2,
      0
    );
    beam.castShadow = true;
    palletGroup.add(beam);
  });

  // 9个脚垫 (3×3)
  const footSize = 0.8;
  const footGeom = new THREE.BoxGeometry(footSize, deckThickness * 0.6, footSize);
  const footMat = new THREE.MeshLambertMaterial({ color: 0x111827 });

  const footPositions = [
    [0.15, 0.15], [0.5, 0.15], [0.85, 0.15],
    [0.15, 0.5],  [0.5, 0.5],  [0.85, 0.5],
    [0.15, 0.85], [0.5, 0.85], [0.85, 0.85],
  ];

  footPositions.forEach(([xR, zR]) => {
    const foot = new THREE.Mesh(footGeom, footMat);
    foot.position.set(
      xR * palletL - palletL / 2,
      deckThickness * 0.3,
      zR * palletW - palletW / 2
    );
    foot.castShadow = true;
    palletGroup.add(foot);
  });

  scene.add(palletGroup);
}

function buildBoxes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any,
  plan: PalletPlan,
  palletL: number,
  palletW: number,
  palletH: number,
  productName: string
) {
  const boxGroup = new THREE.Group();
  const sections = plan.sections || [];
  const boxStackH = mmToDm(plan.boxStackHeight);

  // 创建瓦楞纸纹理
  const cardboardTex = createCardboardTexture(THREE, 1, 1);
  const cardboardTexAlt = createCardboardTexture(THREE, 1, 1);

  // 层级颜色渐变 - 从浅到深
  const layerColors = [
    0xD4BC9A, 0xCBAF8C, 0xC4A882, 0xBD9F78, 0xB5966E,
    0xAD8D64, 0xA5845A, 0x9D7B50, 0x957246, 0x8D693C,
  ];

  // 层间薄板 - 模拟层间纸板
  const layerBoardMat = new THREE.MeshLambertMaterial({ color: 0xBFB09A, transparent: true, opacity: 0.6 });

  const drawBox = (
    x: number, y: number, z: number,
    bL: number, bW: number, bH: number,
    layer: number, secIdx: number
  ) => {
    // 箱体颜色 - 按层渐变
    const colorIdx = Math.min(layer, layerColors.length - 1);
    const baseColor = layerColors[colorIdx];

    // 创建带纹理的材质
    const tex = secIdx % 2 === 0 ? cardboardTex : cardboardTexAlt;
    const boxMat = new THREE.MeshLambertMaterial({
      color: baseColor,
      map: tex,
    });

    const gap = 0.01; // 1mm间隙
    const boxGeom = new THREE.BoxGeometry(bL - gap, bH - gap, bW - gap);
    const box = new THREE.Mesh(boxGeom, boxMat);
    box.position.set(x, y, z);
    box.castShadow = true;
    box.receiveShadow = true;
    boxGroup.add(box);

    // 边缘线
    const edgeGeom = new THREE.EdgesGeometry(boxGeom);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8B7757, transparent: true, opacity: 0.4 });
    const edges = new THREE.LineSegments(edgeGeom, edgeMat);
    edges.position.copy(box.position);
    boxGroup.add(edges);

    // 在面向用户的面上添加产品标签（正面和右侧面）
    if (productName) {
      const labelTexture = createLabelTexture(THREE, productName, bL * 50, bH * 50);
      if (labelTexture) {
        const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true });

        // 正面标签
        const frontLabelW = bL * 0.8;
        const frontLabelH = bH * 0.7;
        const frontGeom = new THREE.PlaneGeometry(frontLabelW, frontLabelH);
        const frontLabel = new THREE.Mesh(frontGeom, labelMat);
        frontLabel.position.set(x, y, z + bW / 2 + 0.005);
        boxGroup.add(frontLabel);
      }
    }
  };

  if (sections.length === 0) {
    const bL = mmToDm(plan.boxOnPalletLength);
    const bW = mmToDm(plan.boxOnPalletWidth);
    const totalBoxW = plan.countAlongLength * bL;
    const totalBoxD = plan.countAlongWidth * bW;
    const offsetX = (palletL - totalBoxW) / 2;
    const offsetZ = (palletW - totalBoxD) / 2;

    for (let layer = 0; layer < plan.layers; layer++) {
      // 层间纸板
      if (layer > 0) {
        const boardGeom = new THREE.BoxGeometry(totalBoxW, 0.02, totalBoxD);
        const board = new THREE.Mesh(boardGeom, layerBoardMat);
        board.position.set(0, palletH + layer * boxStackH, 0);
        boxGroup.add(board);
      }

      for (let row = 0; row < plan.countAlongWidth; row++) {
        for (let col = 0; col < plan.countAlongLength; col++) {
          const x = offsetX + col * bL + bL / 2 - palletL / 2;
          const z = offsetZ + row * bW + bW / 2 - palletW / 2;
          const y = palletH + layer * boxStackH + boxStackH / 2;
          drawBox(x, y, z, bL, bW, boxStackH, layer, 0);
        }
      }
    }
  } else {
    let currentZ = 0;
    const totalCoverageD = sections.reduce((s, sec) => s + mmToDm(sec.usedWidth), 0);
    const startZ = (palletW - totalCoverageD) / 2;

    sections.forEach((section, secIdx) => {
      const bL = mmToDm(section.boxAlongLength);
      const bW = mmToDm(section.boxAlongWidth);
      const sectionDepth = mmToDm(section.usedWidth);
      const offsetX = (palletL - section.countAlongLength * bL) / 2;

      for (let layer = 0; layer < plan.layers; layer++) {
        // 层间纸板
        if (layer > 0) {
          const boardW = section.countAlongLength * bL;
          const boardD = section.countAlongWidth * bW;
          const boardGeom = new THREE.BoxGeometry(boardW, 0.02, boardD);
          const board = new THREE.Mesh(boardGeom, layerBoardMat);
          board.position.set(
            offsetX + boardW / 2 - palletL / 2,
            palletH + layer * boxStackH,
            startZ + currentZ + boardD / 2 - palletW / 2
          );
          boxGroup.add(board);
        }

        for (let row = 0; row < section.countAlongWidth; row++) {
          for (let col = 0; col < section.countAlongLength; col++) {
            const x = offsetX + col * bL + bL / 2 - palletL / 2;
            const z = startZ + currentZ + row * bW + bW / 2 - palletW / 2;
            const y = palletH + layer * boxStackH + boxStackH / 2;
            drawBox(x, y, z, bL, bW, boxStackH, layer, secIdx);
          }
        }
      }

      currentZ += sectionDepth;
    });
  }

  scene.add(boxGroup);
}

/**
 * 绘制右侧高度标注线
 */
function buildHeightAnnotations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any,
  plan: PalletPlan,
  palletL: number,
  _palletW: number,
  palletH: number,
  _productName: string
) {
  const annotGroup = new THREE.Group();
  const boxStackH = mmToDm(plan.boxStackHeight);
  const totalH = palletH + plan.layers * boxStackH;
  const lineX = palletL / 2 + 1.5; // 标注线在托盘右侧1.5dm处

  const lineMat = new THREE.LineBasicMaterial({ color: 0x3B82F6, linewidth: 2 });

  // === 总高度标注线 ===
  // 竖线
  const totalLineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX, 0, 0),
    new THREE.Vector3(lineX, totalH, 0),
  ]);
  annotGroup.add(new THREE.Line(totalLineGeom, lineMat));

  // 顶部横线
  const topBarGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX - 0.3, totalH, 0),
    new THREE.Vector3(lineX + 0.3, totalH, 0),
  ]);
  annotGroup.add(new THREE.Line(topBarGeom, lineMat));

  // 底部横线
  const bottomBarGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX - 0.3, 0, 0),
    new THREE.Vector3(lineX + 0.3, 0, 0),
  ]);
  annotGroup.add(new THREE.Line(bottomBarGeom, lineMat));

  // 总高度文字
  const totalLabel = createTextSprite(
    THREE,
    `${(palletH * 100 + plan.layers * plan.boxStackHeight).toLocaleString()} mm`,
    0x1E293B,
    48
  );
  totalLabel.position.set(lineX + 2.5, totalH / 2, 0);
  totalLabel.scale.set(5, 2.5, 1);
  annotGroup.add(totalLabel);

  // === 托盘高度标注 ===
  const palletLineMat = new THREE.LineBasicMaterial({ color: 0x6B7280 });
  const palletLineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX + 1.5, 0, 0),
    new THREE.Vector3(lineX + 1.5, palletH, 0),
  ]);
  annotGroup.add(new THREE.Line(palletLineGeom, palletLineMat));

  const palletTopBarGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX + 1.2, palletH, 0),
    new THREE.Vector3(lineX + 1.8, palletH, 0),
  ]);
  annotGroup.add(new THREE.Line(palletTopBarGeom, palletLineMat));

  const palletLabel = createTextSprite(
    THREE,
    `托盘 ${Math.round(palletH * 100).toLocaleString()}mm`,
    0x6B7280,
    28
  );
  palletLabel.position.set(lineX + 4, palletH / 2, 0);
  palletLabel.scale.set(4, 2, 1);
  annotGroup.add(palletLabel);

  // === 箱体高度标注 ===
  const boxLineMat = new THREE.LineBasicMaterial({ color: 0x3B82F6 });
  const boxLineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX + 1.5, palletH, 0),
    new THREE.Vector3(lineX + 1.5, totalH, 0),
  ]);
  annotGroup.add(new THREE.Line(boxLineGeom, boxLineMat));

  const boxTopBarGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lineX + 1.2, totalH, 0),
    new THREE.Vector3(lineX + 1.8, totalH, 0),
  ]);
  annotGroup.add(new THREE.Line(boxTopBarGeom, boxLineMat));

  const boxLabel = createTextSprite(
    THREE,
    `${plan.layers}层 × ${plan.boxStackHeight}mm`,
    0x3B82F6,
    28
  );
  boxLabel.position.set(lineX + 4.5, palletH + plan.layers * boxStackH / 2, 0);
  boxLabel.scale.set(5, 2.5, 1);
  annotGroup.add(boxLabel);

  // === 层间分割线 ===
  for (let i = 1; i < plan.layers; i++) {
    const y = palletH + i * boxStackH;
    const dashLineMat = new THREE.LineDashedMaterial({
      color: 0x94A3B8,
      dashSize: 0.15,
      gapSize: 0.1,
    });
    const dashGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lineX - 0.15, y, 0),
      new THREE.Vector3(lineX + 0.15, y, 0),
    ]);
    const dashLine = new THREE.Line(dashGeom, dashLineMat);
    dashLine.computeLineDistances();
    annotGroup.add(dashLine);
  }

  scene.add(annotGroup);
}

/**
 * 创建文字精灵
 */
function createTextSprite(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any,
  text: string,
  color: number,
  fontSize: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Object3D();

  ctx.clearRect(0, 0, 512, 256);

  const colorHex = "#" + new THREE.Color(color).getHexString();
  ctx.fillStyle = colorHex;
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  return new THREE.Sprite(mat);
}
