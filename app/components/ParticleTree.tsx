"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import SplitText from "./SplitText";

// --- Color palettes ---
const PALETTES = [
  // ExKitchens Green (default)
  [0x3d7a44, 0x5a9c64, 0x2d5e33, 0x78b582, 0xa8d5b0, 0x4caf50, 0x81c784, 0x66bb6a],
  // Autumn orange
  [0xef6c00, 0xf57f17, 0xff8f00, 0xd84315, 0xf4511e, 0xffa726, 0xe65100, 0xffb74d],
  // Cherry blossom
  [0xf8bbd0, 0xf48fb1, 0xf06292, 0xec407a, 0xfce4ec, 0xe91e63, 0xf8bbd0, 0xffc1e3],
  // Pastel mint
  [0xa5d6a7, 0x81c784, 0x66bb6a, 0xc8e6c9, 0xb9f6ca, 0x4caf50, 0x80cbc4, 0xa5d6a7],
  // Lavender
  [0xce93d8, 0xba68c8, 0xb39ddb, 0xd1c4e9, 0xe1bee7, 0x9575cd, 0xab47bc, 0xd7bde2],
  // Peach coral
  [0xffccbc, 0xffab91, 0xff8a65, 0xff7043, 0xfbe9e7, 0xf4a582, 0xffcc80, 0xffab91],
  // Ice blue
  [0x90caf9, 0x64b5f6, 0x42a5f5, 0xbbdefb, 0x81d4fa, 0x4fc3f7, 0x80deea, 0xb3e5fc],
  // Golden yellow
  [0xfff176, 0xffee58, 0xffeb3b, 0xfdd835, 0xfbc02d, 0xf9a825, 0xffe082, 0xffd54f],
];

// --- Scene creation (pure Three.js) ---
async function createTreeScene(
  container: HTMLDivElement,
  onReady: () => void
) {
  const THREE = await import("three");
  const { OrbitControls } = await import(
    "three/addons/controls/OrbitControls.js"
  );

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.FogExp2(0xffffff, 0.012);

  // Camera
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 8, 25);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  const isMobile = width < 768;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  container.appendChild(renderer.domElement);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 8, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = -0.5;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.75;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.update();

  // Flat circle texture for particles
  const texCanvas = document.createElement("canvas");
  texCanvas.width = 64;
  texCanvas.height = 64;
  const texCtx = texCanvas.getContext("2d")!;
  texCtx.beginPath();
  texCtx.arc(32, 32, 32, 0, Math.PI * 2);
  texCtx.fillStyle = "white";
  texCtx.fill();
  const flatCircle = new THREE.CanvasTexture(texCanvas);

  // --- Mouse interaction ---
  const mouse = new THREE.Vector2(9999, 9999);
  const raycaster = new THREE.Raycaster();
  const mouseWorld = new THREE.Vector3(9999, 9999, 9999);
  const mouseRadius = 3.5;
  const mouseStrength = 0.12;
  let mouseActive = false;

  const onMouseMove = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouseActive = true;
    raycaster.setFromCamera(mouse, camera);
    const planeNormal = camera
      .getWorldDirection(new THREE.Vector3())
      .negate();
    const dynPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      new THREE.Vector3(0, 8, 0)
    );
    raycaster.ray.intersectPlane(dynPlane, mouseWorld);
  };

  const onMouseLeave = () => {
    mouseActive = false;
    mouseWorld.set(9999, 9999, 9999);
  };

  // Touch support — project touch point the same way as mouse
  const updateFromTouch = (touch: Touch) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    mouseActive = true;
    raycaster.setFromCamera(mouse, camera);
    const planeNormal = camera
      .getWorldDirection(new THREE.Vector3())
      .negate();
    const dynPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      new THREE.Vector3(0, 8, 0)
    );
    raycaster.ray.intersectPlane(dynPlane, mouseWorld);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) updateFromTouch(e.touches[0]);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      updateFromTouch(e.touches[0]);
    }
  };
  const onTouchEnd = () => {
    mouseActive = false;
    mouseWorld.set(9999, 9999, 9999);
  };

  container.addEventListener("mousemove", onMouseMove);
  container.addEventListener("mouseleave", onMouseLeave);
  container.addEventListener("touchstart", onTouchStart, { passive: true });
  container.addEventListener("touchmove", onTouchMove, { passive: false });
  container.addEventListener("touchend", onTouchEnd, { passive: true });

  // --- Build trunk & branches ---
  const trunkPositions: number[] = [];
  const trunkColors: number[] = [];
  const branchTips: { x: number; y: number; z: number }[] = [];

  function addBranch(
    startX: number, startY: number, startZ: number,
    angle: number, pitch: number, length: number,
    radius: number, depth: number
  ) {
    const segments = Math.floor(length * 8);
    const brown = new THREE.Color(0x5c3a1e);
    const darkBrown = new THREE.Color(0x3b2410);

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const currentRadius = radius * (1 - t * 0.7);
      const particlesInRing = Math.max(3, Math.floor(currentRadius * 20));
      const x = startX + Math.sin(angle) * Math.cos(pitch) * length * t;
      const y = startY + Math.sin(pitch) * length * t;
      const z = startZ + Math.cos(angle) * Math.cos(pitch) * length * t;

      for (let j = 0; j < particlesInRing; j++) {
        const theta = (j / particlesInRing) * Math.PI * 2 + Math.random() * 0.5;
        const r = currentRadius * (0.7 + Math.random() * 0.3);
        trunkPositions.push(
          x + Math.cos(theta) * r,
          y + (Math.random() - 0.5) * 0.15,
          z + Math.sin(theta) * r
        );
        const color = brown.clone().lerp(darkBrown, Math.random());
        trunkColors.push(color.r, color.g, color.b);
      }

      if (depth < 4 && t > 0.3 && Math.random() < 0.04 && length > 0.8) {
        addBranch(
          x, y, z,
          angle + (Math.random() - 0.5) * 2.5,
          pitch + (Math.random() * 0.5 - 0.1),
          length * (0.4 + Math.random() * 0.3),
          currentRadius * 0.6,
          depth + 1
        );
      }
    }

    const tipX = startX + Math.sin(angle) * Math.cos(pitch) * length;
    const tipY = startY + Math.sin(pitch) * length;
    const tipZ = startZ + Math.cos(angle) * Math.cos(pitch) * length;
    return { x: tipX, y: tipY, z: tipZ };
  }

  // Main trunk
  addBranch(0, 0, 0, 0, Math.PI * 0.47, 10, 0.9, 0);

  // Major branches
  const majorBranches = 7;
  for (let i = 0; i < majorBranches; i++) {
    const startHeight = 4 + Math.random() * 5;
    const angle = (i / majorBranches) * Math.PI * 2 + Math.random() * 0.4;
    const pitch = Math.PI * (0.15 + Math.random() * 0.25);
    const length = 4 + Math.random() * 4;
    const tip = addBranch(
      Math.sin(angle) * 0.3, startHeight, Math.cos(angle) * 0.3,
      angle, pitch, length, 0.35 + Math.random() * 0.2, 1
    );
    branchTips.push(tip);

    const subCount = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < subCount; j++) {
      const t = 0.3 + Math.random() * 0.6;
      const sx = Math.sin(angle) * 0.3 + Math.sin(angle) * Math.cos(pitch) * length * t;
      const sy = startHeight + Math.sin(pitch) * length * t;
      const sz = Math.cos(angle) * 0.3 + Math.cos(angle) * Math.cos(pitch) * length * t;
      const subTip = addBranch(
        sx, sy, sz,
        angle + (Math.random() - 0.5) * 1.8,
        Math.PI * (0.1 + Math.random() * 0.3),
        2 + Math.random() * 3,
        0.15 + Math.random() * 0.1, 2
      );
      branchTips.push(subTip);
    }
  }

  const trunkGeometry = new THREE.BufferGeometry();
  trunkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(trunkPositions, 3));
  trunkGeometry.setAttribute("color", new THREE.Float32BufferAttribute(trunkColors, 3));

  const trunkMaterial = new THREE.PointsMaterial({
    map: flatCircle,
    size: 0.1,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.5,
    opacity: 1.0,
    depthWrite: true,
  });

  const trunkParticles = new THREE.Points(trunkGeometry, trunkMaterial);
  scene.add(trunkParticles);

  // --- Leaf canopy ---
  const leafPositions: number[] = [];
  const leafColors: number[] = [];
  const leafSizes: number[] = [];
  const leafOriginalY: number[] = [];

  let currentPaletteIndex = 0;
  let leafPalette = PALETTES[0].map((c) => new THREE.Color(c));

  function addLeafCluster(cx: number, cy: number, cz: number, radius: number, count: number) {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.pow(Math.random(), 0.5);
      const x = cx + r * Math.sin(phi) * Math.cos(theta);
      const y = cy + r * Math.sin(phi) * Math.sin(theta) * 0.7;
      const z = cz + r * Math.cos(phi);
      if (y < 3) continue;
      leafPositions.push(x, y, z);
      const color = leafPalette[Math.floor(Math.random() * leafPalette.length)].clone();
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (z - cz) ** 2);
      if (distFromCenter < radius * 0.4) color.multiplyScalar(0.75);
      leafColors.push(color.r, color.g, color.b);
      leafSizes.push(1.5 + Math.random() * 7);
      leafOriginalY.push(y);
    }
  }

  branchTips.forEach((tip) => {
    addLeafCluster(tip.x, tip.y, tip.z, 2.5 + Math.random() * 1.5, 400);
  });
  const leafTotal = isMobile ? 5000 : 15000;
  addLeafCluster(0, 12, 0, 8, leafTotal - branchTips.length * 400);

  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute("position", new THREE.Float32BufferAttribute(leafPositions, 3));
  leafGeometry.setAttribute("color", new THREE.Float32BufferAttribute(leafColors, 3));
  leafGeometry.setAttribute("size", new THREE.Float32BufferAttribute(leafSizes, 1));

  const leafMaterial = new THREE.PointsMaterial({
    map: flatCircle,
    size: 0.45,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.3,
    opacity: 0.3,
    depthWrite: false,
  });

  const leafParticles = new THREE.Points(leafGeometry, leafMaterial);
  scene.add(leafParticles);

  // --- Falling leaves ---
  const fallingCount = isMobile ? 60 : 200;
  const fallingPositions = new Float32Array(fallingCount * 3);
  const fallingColors = new Float32Array(fallingCount * 3);
  const fallingSpeeds: number[] = [];
  const fallingSwayPhase: number[] = [];

  for (let i = 0; i < fallingCount; i++) {
    fallingPositions[i * 3] = (Math.random() - 0.5) * 20;
    fallingPositions[i * 3 + 1] = 5 + Math.random() * 18;
    fallingPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    const color = leafPalette[Math.floor(Math.random() * leafPalette.length)];
    fallingColors[i * 3] = color.r;
    fallingColors[i * 3 + 1] = color.g;
    fallingColors[i * 3 + 2] = color.b;
    fallingSpeeds.push(0.3 + Math.random() * 0.7);
    fallingSwayPhase.push(Math.random() * Math.PI * 2);
  }

  const fallingGeometry = new THREE.BufferGeometry();
  fallingGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fallingPositions, 3));
  fallingGeometry.setAttribute("color", new THREE.Float32BufferAttribute(fallingColors, 3));

  const fallingMaterial = new THREE.PointsMaterial({
    map: flatCircle,
    size: 0.35,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.3,
    opacity: 0.45,
    depthWrite: false,
  });

  const fallingLeaves = new THREE.Points(fallingGeometry, fallingMaterial);
  scene.add(fallingLeaves);

  // --- Ground particles ---
  const groundCount = isMobile ? 1500 : 5000;
  const groundPositions = new Float32Array(groundCount * 3);
  const groundColors = new Float32Array(groundCount * 3);

  for (let i = 0; i < groundCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 18;
    groundPositions[i * 3] = Math.cos(a) * r;
    groundPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
    groundPositions[i * 3 + 2] = Math.sin(a) * r;
    const base = 0.15 + Math.random() * 0.15;
    const green = 0.25 + Math.random() * 0.2;
    groundColors[i * 3] = base * 0.7;
    groundColors[i * 3 + 1] = green;
    groundColors[i * 3 + 2] = base * 0.3;
  }

  const groundGeometry = new THREE.BufferGeometry();
  groundGeometry.setAttribute("position", new THREE.Float32BufferAttribute(groundPositions, 3));
  groundGeometry.setAttribute("color", new THREE.Float32BufferAttribute(groundColors, 3));

  const groundMaterial = new THREE.PointsMaterial({
    size: 0.08,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.5,
    map: flatCircle,
    depthWrite: true,
  });

  const groundParticles = new THREE.Points(groundGeometry, groundMaterial);
  scene.add(groundParticles);

  // Ambient light
  scene.add(new THREE.AmbientLight(0xfff5e6, 0.8));

  // --- Morph state ---
  let morphing = false;
  let morphStartTime = 0;
  const morphDuration = 2.0;
  let leafStartCol: Float32Array | null = null;
  let leafTargetCol: Float32Array | null = null;
  let fallingStartCol: Float32Array | null = null;
  let fallingTargetCol: Float32Array | null = null;

  function easeInOutCubic(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function triggerMorph() {
    if (morphing) return;
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * PALETTES.length);
    } while (newIndex === currentPaletteIndex);
    currentPaletteIndex = newIndex;
    const newPalette = PALETTES[newIndex].map((c) => new THREE.Color(c));

    // Snapshot current leaf colors
    const lColArr = leafGeometry.attributes.color.array as Float32Array;
    leafStartCol = new Float32Array(lColArr);
    leafTargetCol = new Float32Array(lColArr.length);
    for (let i = 0; i < lColArr.length / 3; i++) {
      const color = newPalette[Math.floor(Math.random() * newPalette.length)];
      leafTargetCol[i * 3] = color.r;
      leafTargetCol[i * 3 + 1] = color.g;
      leafTargetCol[i * 3 + 2] = color.b;
    }

    // Snapshot falling leaf colors
    const fColArr = fallingGeometry.attributes.color.array as Float32Array;
    fallingStartCol = new Float32Array(fColArr);
    fallingTargetCol = new Float32Array(fColArr.length);
    for (let i = 0; i < fallingCount; i++) {
      const color = newPalette[Math.floor(Math.random() * newPalette.length)];
      fallingTargetCol[i * 3] = color.r;
      fallingTargetCol[i * 3 + 1] = color.g;
      fallingTargetCol[i * 3 + 2] = color.b;
    }

    leafPalette = newPalette;
    morphStartTime = timer.getElapsed();
    morphing = true;
  }

  // --- Auto palette cycle ---
  let autoCycleTimer: ReturnType<typeof setInterval> | null = null;
  function startAutoCycle() {
    if (autoCycleTimer) return;
    autoCycleTimer = setInterval(() => {
      if (isVisible) triggerMorph();
    }, 8000);
  }
  function stopAutoCycle() {
    if (autoCycleTimer) {
      clearInterval(autoCycleTimer);
      autoCycleTimer = null;
    }
  }

  // --- Animation ---
  const timer = new THREE.Timer();
  let animFrameId = 0;
  let isVisible = true;

  function animate() {
    animFrameId = requestAnimationFrame(animate);
    if (!isVisible) return;

    timer.update();
    const time = timer.getElapsed();
    const mRadSq = mouseRadius * mouseRadius;
    const mxW = mouseWorld.x, myW = mouseWorld.y, mzW = mouseWorld.z;

    // Sway canopy + mouse repulsion
    const leafPos = leafGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < leafPos.length / 3; i++) {
      const origY = leafOriginalY[i];
      if (origY === undefined) continue;
      leafPos[i * 3] += Math.sin(time * 0.8 + i * 0.01) * 0.001;
      leafPos[i * 3 + 1] = origY + Math.sin(time * 1.2 + i * 0.05) * 0.03;

      if (mouseActive) {
        const dx = leafPos[i * 3] - mxW;
        const dy = leafPos[i * 3 + 1] - myW;
        const dz = leafPos[i * 3 + 2] - mzW;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < mRadSq && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / mouseRadius) * mouseStrength;
          leafPos[i * 3] += (dx / dist) * force;
          leafPos[i * 3 + 1] += (dy / dist) * force;
          leafPos[i * 3 + 2] += (dz / dist) * force;
        }
      }
    }
    leafGeometry.attributes.position.needsUpdate = true;

    // Falling leaves
    const fallPos = fallingGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < fallingCount; i++) {
      fallPos[i * 3 + 1] -= fallingSpeeds[i] * 0.01;
      fallPos[i * 3] += Math.sin(time * 1.5 + fallingSwayPhase[i]) * 0.008;
      fallPos[i * 3 + 2] += Math.cos(time * 1.2 + fallingSwayPhase[i]) * 0.005;

      if (mouseActive) {
        const fdx = fallPos[i * 3] - mxW;
        const fdy = fallPos[i * 3 + 1] - myW;
        const fdz = fallPos[i * 3 + 2] - mzW;
        const fdistSq = fdx * fdx + fdy * fdy + fdz * fdz;
        if (fdistSq < mRadSq && fdistSq > 0.001) {
          const fdist = Math.sqrt(fdistSq);
          const fforce = (1 - fdist / mouseRadius) * mouseStrength * 1.5;
          fallPos[i * 3] += (fdx / fdist) * fforce;
          fallPos[i * 3 + 1] += (fdy / fdist) * fforce;
          fallPos[i * 3 + 2] += (fdz / fdist) * fforce;
        }
      }

      if (fallPos[i * 3 + 1] < 0) {
        fallPos[i * 3 + 1] = 12 + Math.random() * 6;
        fallPos[i * 3] = (Math.random() - 0.5) * 16;
        fallPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
    }
    fallingGeometry.attributes.position.needsUpdate = true;

    // Trunk mouse repulsion
    if (mouseActive) {
      const tPos = trunkGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < tPos.length / 3; i++) {
        const tdx = tPos[i * 3] - mxW;
        const tdy = tPos[i * 3 + 1] - myW;
        const tdz = tPos[i * 3 + 2] - mzW;
        const tdistSq = tdx * tdx + tdy * tdy + tdz * tdz;
        if (tdistSq < mRadSq && tdistSq > 0.001) {
          const tdist = Math.sqrt(tdistSq);
          const tforce = (1 - tdist / mouseRadius) * mouseStrength * 0.5;
          tPos[i * 3] += (tdx / tdist) * tforce;
          tPos[i * 3 + 1] += (tdy / tdist) * tforce;
          tPos[i * 3 + 2] += (tdz / tdist) * tforce;
        }
      }
      trunkGeometry.attributes.position.needsUpdate = true;
    }

    // Morph animation
    if (morphing && leafStartCol && leafTargetCol) {
      const elapsed = time - morphStartTime;
      const rawT = Math.min(elapsed / morphDuration, 1.0);
      const t = easeInOutCubic(rawT);

      const lCol = leafGeometry.attributes.color.array as Float32Array;
      for (let i = 0; i < lCol.length; i++) {
        lCol[i] = leafStartCol[i] + (leafTargetCol[i] - leafStartCol[i]) * t;
      }
      leafGeometry.attributes.color.needsUpdate = true;

      if (fallingStartCol && fallingTargetCol) {
        const fCol = fallingGeometry.attributes.color.array as Float32Array;
        for (let i = 0; i < fCol.length; i++) {
          fCol[i] = fallingStartCol[i] + (fallingTargetCol[i] - fallingStartCol[i]) * t;
        }
        fallingGeometry.attributes.color.needsUpdate = true;
      }

      if (rawT >= 1.0) {
        morphing = false;
        leafStartCol = null;
        leafTargetCol = null;
        fallingStartCol = null;
        fallingTargetCol = null;
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
  startAutoCycle();
  onReady();

  // --- Resize handler ---
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  // --- API ---
  return {
    morph: triggerMorph,
    setVisible: (v: boolean) => {
      isVisible = v;
    },
    dispose: () => {
      stopAutoCycle();
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      controls.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
      });
      flatCircle.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
  };
}

// --- React component ---
export default function ParticleTree() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Awaited<ReturnType<typeof createTreeScene>> | null>(null);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [sceneReady, setSceneReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // IntersectionObserver: init scene on first view, pause/resume on visibility
  useEffect(() => {
    if (reducedMotion || hasError) return;
    const el = containerRef.current;
    if (!el) return;

    let initialized = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !initialized) {
          initialized = true;
          createTreeScene(el, () => setSceneReady(true))
            .then((api) => {
              sceneRef.current = api;
            })
            .catch(() => setHasError(true));
        }
        if (sceneRef.current) {
          sceneRef.current.setVisible(entry.isIntersecting);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [reducedMotion, hasError]);

  const showFallback = reducedMotion || hasError;

  return (
    <section className="w-full bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d7a44]/30 to-transparent" />

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="text-center pt-28 pb-8 px-6"
      >
        <span className="text-[#3d7a44] font-semibold tracking-widest uppercase text-xs mb-5 block">
          Sustainability
        </span>
        <h2 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
          <SplitText text="Growing a" className="block" charDelay={0.03} duration={0.75} />
          <SplitText
            text="Greener Future"
            className="block font-serif italic text-[#3d7a44]"
            charDelay={0.04}
            duration={0.8}
            italic
          />
        </h2>
        <p className="text-gray-500 text-base mt-5 max-w-lg mx-auto">
          Every kitchen rescued is a step toward zero waste
        </p>
      </motion.div>

      {/* Canvas or fallback */}
      {showFallback ? (
        <div className="relative w-full h-[50vh] flex flex-col items-center justify-center">
          <div className="w-32 h-32 mb-8 opacity-40">
            <Image
              src="/assets/exkitchens_leaf_logo.png"
              alt=""
              width={128}
              height={128}
              className="object-contain"
            />
          </div>
          <p className="text-gray-400 text-sm tracking-widest uppercase">
            Sustainability in Every Detail
          </p>
        </div>
      ) : (
        <div className="relative w-full h-[60vh] md:h-[70vh]">
          <div
            ref={containerRef}
            className="particle-tree-container w-full h-full"
          />

          {/* Loading indicator */}
          {!sceneReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="spline-loader" />
            </div>
          )}

        </div>
      )}

      <div className="pb-12" />
    </section>
  );
}
