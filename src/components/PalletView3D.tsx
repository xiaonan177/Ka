"use client";

import { useRef, useEffect } from "react";
import type { PalletPlan, PalletDimensions } from "@/lib/palletize";

interface PalletView3DProps {
  plan: PalletPlan;
  pallet: PalletDimensions;
  productName: string;
}

/**
 * 3D托盘可视化组件
 * 使用原生Three.js实现，避免React Three Fiber的SSR问题
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

      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xF1F5F9);

      // 相机
      const camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
      camera.position.set(800, 600, 800);
      camera.lookAt(0, 300, 0);

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
      controls.target.set(0, 300, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 400;
      controls.maxDistance = 3000;
      controls.update();

      // 光照
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(500, 800, 500);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);

      const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-300, 400, -300);
      scene.add(backLight);

      // 地面
      const groundGeom = new THREE.PlaneGeometry(2000, 2000);
      const groundMat = new THREE.MeshLambertMaterial({ color: 0xE2E8F0 });
      const ground = new THREE.Mesh(groundGeom, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1;
      ground.receiveShadow = true;
      scene.add(ground);

      // 网格辅助线
      const gridHelper = new THREE.GridHelper(2000, 20, 0x94A3B8, 0xE2E8F0);
      gridHelper.position.y = 0;
      scene.add(gridHelper);

      // 绘制托盘
      buildPallet(scene, THREE, pallet);
      // 绘制箱体
      buildBoxes(scene, THREE, plan, pallet, productName);

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
  pallet: PalletDimensions
) {
  // 托盘底座
  const palletGroup = new THREE.Group();

  // 底板
  const deckGeom = new THREE.BoxGeometry(pallet.length, 12, pallet.width);
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
  const deck = new THREE.Mesh(deckGeom, deckMat);
  deck.position.y = 6;
  deck.castShadow = true;
  deck.receiveShadow = true;
  palletGroup.add(deck);

  // 支撑脚 - 9个脚垫 (3x3)
  const footGeom = new THREE.BoxGeometry(80, pallet.height - 12, 80);
  const footMat = new THREE.MeshLambertMaterial({ color: 0x1F2937 });
  const footPositions = [
    [pallet.length * 0.15, 0, pallet.width * 0.15],
    [pallet.length * 0.5, 0, pallet.width * 0.15],
    [pallet.length * 0.85, 0, pallet.width * 0.15],
    [pallet.length * 0.15, 0, pallet.width * 0.5],
    [pallet.length * 0.5, 0, pallet.width * 0.5],
    [pallet.length * 0.85, 0, pallet.width * 0.5],
    [pallet.length * 0.15, 0, pallet.width * 0.85],
    [pallet.length * 0.5, 0, pallet.width * 0.85],
    [pallet.length * 0.85, 0, pallet.width * 0.85],
  ];

  footPositions.forEach(([x, , z]) => {
    const foot = new THREE.Mesh(footGeom, footMat);
    foot.position.set(
      x - pallet.length / 2,
      12 + (pallet.height - 12) / 2,
      z - pallet.width / 2
    );
    foot.castShadow = true;
    palletGroup.add(foot);
  });

  palletGroup.position.y = 0;
  scene.add(palletGroup);
}

function buildBoxes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scene: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any,
  plan: PalletPlan,
  pallet: PalletDimensions,
  productName: string
) {
  const boxGroup = new THREE.Group();

  // 计算居中偏移
  const totalBoxW = plan.countAlongLength * plan.boxOnPalletLength;
  const totalBoxD = plan.countAlongWidth * plan.boxOnPalletWidth;
  const offsetX = (pallet.length - totalBoxW) / 2;
  const offsetZ = (pallet.width - totalBoxD) / 2;

  // 箱体材质
  const boxMat = new THREE.MeshLambertMaterial({ color: 0xC4A882 });
  const boxEdgeMat = new THREE.LineBasicMaterial({ color: 0x9B8B72 });

  for (let layer = 0; layer < plan.layers; layer++) {
    for (let row = 0; row < plan.countAlongWidth; row++) {
      for (let col = 0; col < plan.countAlongLength; col++) {
        const x = offsetX + col * plan.boxOnPalletLength + plan.boxOnPalletLength / 2 - pallet.length / 2;
        const z = offsetZ + row * plan.boxOnPalletWidth + plan.boxOnPalletWidth / 2 - pallet.width / 2;
        const y = pallet.height + layer * plan.boxStackHeight + plan.boxStackHeight / 2;

        // 箱体
        const boxGeom = new THREE.BoxGeometry(
          plan.boxOnPalletLength - 1,
          plan.boxStackHeight - 1,
          plan.boxOnPalletWidth - 1
        );
        const box = new THREE.Mesh(boxGeom, boxMat);
        box.position.set(x, y, z);
        box.castShadow = true;
        box.receiveShadow = true;
        boxGroup.add(box);

        // 边线
        const edgesGeom = new THREE.EdgesGeometry(boxGeom);
        const edges = new THREE.LineSegments(edgesGeom, boxEdgeMat);
        edges.position.copy(box.position);
        boxGroup.add(edges);
      }
    }
  }

  // 在最上层中间箱子添加产品名标签
  if (productName && plan.boxOnPalletLength > 60 && plan.boxOnPalletWidth > 40) {
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
      const labelGeom = new THREE.PlaneGeometry(
        Math.min(plan.boxOnPalletLength * 0.8, 200),
        Math.min(plan.boxStackHeight * 0.6, 100)
      );
      const label = new THREE.Mesh(labelGeom, labelMat);
      const labelZ = offsetZ + totalBoxD / 2 - pallet.width / 2 + 0.5;
      label.position.set(0, pallet.height + (plan.layers - 0.5) * plan.boxStackHeight, labelZ);
      boxGroup.add(label);
    }
  }

  scene.add(boxGroup);
}
