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
 * 支持混合方向排列（sections）
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

      // 相机 - 以dm为空间单位
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
      camera.position.set(palletL * 1.2, palletL * 0.8, palletL * 1.2);
      camera.lookAt(0, palletH + plan.layers * mmToDm(plan.boxStackHeight) * 0.4, 0);

      // 渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, palletH + plan.layers * mmToDm(plan.boxStackHeight) * 0.4, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 2;
      controls.maxDistance = 50;
      controls.update();

      // 光照
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(palletL, palletL * 2, palletL);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);

      const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-palletL, palletL, -palletL);
      scene.add(backLight);

      // 地面
      const groundSize = Math.max(palletL, palletW) * 3;
      const groundGeom = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0 });
      const ground = new THREE.Mesh(groundGeom, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      ground.receiveShadow = true;
      scene.add(ground);

      // 网格辅助线 - 1dm间距
      const gridSize = Math.ceil(groundSize);
      const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x94A3B8, 0xE2E8F0);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // 绘制托盘
      buildPallet(scene, THREE, palletL, palletW, palletH);
      // 绘制箱体
      buildBoxes(scene, THREE, plan, palletL, palletW, palletH, productName);

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
    <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-lg overflow-hidden" />
  );
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
  // 托盘底座
  const palletGroup = new THREE.Group();

  // 底板 (dm)
  const deckThickness = 0.12; // 约12mm
  const deckGeom = new THREE.BoxGeometry(palletL, deckThickness, palletW);
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
  const deck = new THREE.Mesh(deckGeom, deckMat);
  deck.position.y = deckThickness / 2;
  deck.castShadow = true;
  deck.receiveShadow = true;
  palletGroup.add(deck);

  // 支撑脚 - 9个脚垫
  const footHeight = palletH - deckThickness;
  const footSize = 0.8; // 80mm
  const footGeom = new THREE.BoxGeometry(footSize, footHeight, footSize);
  const footMat = new THREE.MeshLambertMaterial({ color: 0x1F2937 });
  const footPositions = [
    [palletL * 0.15, 0, palletW * 0.15],
    [palletL * 0.5, 0, palletW * 0.15],
    [palletL * 0.85, 0, palletW * 0.15],
    [palletL * 0.15, 0, palletW * 0.5],
    [palletL * 0.5, 0, palletW * 0.5],
    [palletL * 0.85, 0, palletW * 0.5],
    [palletL * 0.15, 0, palletW * 0.85],
    [palletL * 0.5, 0, palletW * 0.85],
    [palletL * 0.85, 0, palletW * 0.85],
  ];

  footPositions.forEach(([x, , z]) => {
    const foot = new THREE.Mesh(footGeom, footMat);
    foot.position.set(
      x - palletL / 2,
      deckThickness + footHeight / 2,
      z - palletW / 2
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
  palletH: number
  ,
  productName: string
) {
  const boxGroup = new THREE.Group();
  const sections = plan.sections || [];

  // 箱体材质
  const boxMat = new THREE.MeshLambertMaterial({ color: 0xC4A882 });
  const boxMatAlt = new THREE.MeshLambertMaterial({ color: 0xBFA278 });
  const boxEdgeMat = new THREE.LineBasicMaterial({ color: 0x9B8B72 });

  const boxStackH = mmToDm(plan.boxStackHeight);

  if (sections.length === 0) {
    // 退化：单一方向
    const bL = mmToDm(plan.boxOnPalletLength);
    const bW = mmToDm(plan.boxOnPalletWidth);
    const totalBoxW = plan.countAlongLength * bL;
    const totalBoxD = plan.countAlongWidth * bW;
    const offsetX = (palletL - totalBoxW) / 2;
    const offsetZ = (palletW - totalBoxD) / 2;

    for (let layer = 0; layer < plan.layers; layer++) {
      for (let row = 0; row < plan.countAlongWidth; row++) {
        for (let col = 0; col < plan.countAlongLength; col++) {
          const x = offsetX + col * bL + bL / 2 - palletL / 2;
          const z = offsetZ + row * bW + bW / 2 - palletW / 2;
          const y = palletH + layer * boxStackH + boxStackH / 2;

          const boxGeom = new THREE.BoxGeometry(bL * 0.98, boxStackH * 0.98, bW * 0.98);
          const box = new THREE.Mesh(boxGeom, boxMat);
          box.position.set(x, y, z);
          box.castShadow = true;
          box.receiveShadow = true;
          boxGroup.add(box);

          const edgesGeom = new THREE.EdgesGeometry(boxGeom);
          const edges = new THREE.LineSegments(edgesGeom, boxEdgeMat);
          edges.position.copy(box.position);
          boxGroup.add(edges);
        }
      }
    }
  } else {
    // 混合方向排列：按section绘制
    let currentZ = 0; // 从0开始累加z方向偏移
    const totalCoverageD = sections.reduce((s, sec) => s + mmToDm(sec.usedWidth), 0);
    const startZ = (palletW - totalCoverageD) / 2;

    sections.forEach((section, secIdx) => {
      const bL = mmToDm(section.boxAlongLength);
      const bW = mmToDm(section.boxAlongWidth);
      const sectionDepth = mmToDm(section.usedWidth);
      const offsetX = (palletL - section.countAlongLength * bL) / 2;

      const mat = secIdx % 2 === 0 ? boxMat : boxMatAlt;

      for (let layer = 0; layer < plan.layers; layer++) {
        for (let row = 0; row < section.countAlongWidth; row++) {
          for (let col = 0; col < section.countAlongLength; col++) {
            const x = offsetX + col * bL + bL / 2 - palletL / 2;
            const z = startZ + currentZ + row * bW + bW / 2 - palletW / 2;
            const y = palletH + layer * boxStackH + boxStackH / 2;

            const boxGeom = new THREE.BoxGeometry(bL * 0.98, boxStackH * 0.98, bW * 0.98);
            const box = new THREE.Mesh(boxGeom, mat);
            box.position.set(x, y, z);
            box.castShadow = true;
            box.receiveShadow = true;
            boxGroup.add(box);

            const edgesGeom = new THREE.EdgesGeometry(boxGeom);
            const edges = new THREE.LineSegments(edgesGeom, boxEdgeMat);
            edges.position.copy(box.position);
            boxGroup.add(edges);
          }
        }
      }

      currentZ += sectionDepth;
    });
  }

  // 在最上层中间箱子添加产品名标签
  if (productName) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#5C4B33";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(productName, 128, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });

      // 前面标签
      const totalCoverageD = sections.length > 0
        ? sections.reduce((s, sec) => s + mmToDm(sec.usedWidth), 0)
        : plan.countAlongWidth * mmToDm(plan.boxOnPalletWidth);
      const labelW = Math.min(palletL * 0.8, 6);
      const labelH = Math.min(boxStackH * 0.6, 2);
      const labelGeom = new THREE.PlaneGeometry(labelW, labelH);
      const label = new THREE.Mesh(labelGeom, labelMat);
      const labelZ = totalCoverageD / 2 - palletW / 2 + 0.05;
      label.position.set(0, palletH + (plan.layers - 0.5) * boxStackH, labelZ);
      boxGroup.add(label);
    }
  }

  scene.add(boxGroup);
}
