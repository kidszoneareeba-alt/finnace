import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Dashboard3DSceneProps {
  cashInHand: number;
  totalRecovery: number;
  bankBalance: number;
  customerOutstanding: number;
  totalCustomers: number;
  scrollProgress: number; // 0 (top: overview) to 1 (scrolled down: ledger & recovery vault)
  onNavigateSection?: (section: string) => void;
}

export const Dashboard3DScene: React.FC<Dashboard3DSceneProps> = ({
  cashInHand,
  totalRecovery,
  bankBalance,
  customerOutstanding,
  totalCustomers,
  scrollProgress,
  onNavigateSection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeZone, setActiveZone] = useState<'vault' | 'pillars' | 'growth' | 'accounts'>('vault');

  // Interactive mouse pointer tracking for parallax & hover
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollSmoothRef = useRef(0);
  const scrollTargetRef = useRef(scrollProgress);

  useEffect(() => {
    scrollTargetRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect software WebGL to adapt quality
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene, Camera, Renderer Setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a1128, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 11);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.appendChild(renderer.domElement);

      // Studio Environment map
      try {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        pmremGenerator.dispose();
      } catch (pmremErr) {
        console.warn('PMREMGenerator fallback', pmremErr);
      }
    } catch (webglErr) {
      console.warn('WebGL context creation failed', webglErr);
      return;
    }

    if (!renderer) return;

    // 2. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x059669, 0.8);
    scene.add(hemiLight);

    // Key directional light (warm gold/sun)
    const keyLight = new THREE.DirectionalLight(0xfef08a, 1.8);
    keyLight.position.set(6, 12, 8);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Rim light (vibrant emerald green representing Pakistani flag & growth)
    const rimLight = new THREE.DirectionalLight(0x10b981, 2.2);
    rimLight.position.set(-8, 5, -5);
    scene.add(rimLight);

    // 3. Materials Library (Luxury metallic finishes with emerald & gold)
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.18,
    });

    const emeraldMetallic = new THREE.MeshStandardMaterial({
      color: 0x047857,
      metalness: 0.85,
      roughness: 0.22,
    });

    const silverMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    });

    const darkObsidian = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.35,
    });

    const glowingCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });

    // 4. Create 3D Objects:
    // ROOT SCENE GROUP
    const mainWorldGroup = new THREE.Group();
    scene.add(mainWorldGroup);

    // A. Hexagonal Mirrored Ground Grid / Podium
    const groundGeo = new THREE.CylinderGeometry(8, 8.5, 0.3, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x091424,
      metalness: 0.88,
      roughness: 0.25,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.15;
    groundMesh.receiveShadow = !isSoftwareGl;
    mainWorldGroup.add(groundMesh);

    // Outer concentric glowing ring
    const ringGeo = new THREE.TorusGeometry(8.1, 0.06, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
    });
    const outerRing = new THREE.Mesh(ringGeo, ringMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.02;
    mainWorldGroup.add(outerRing);

    // Inner geometric floor grid pattern (Procedural Canvas Texture)
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512;
    gridCanvas.height = 512;
    const ctx = gridCanvas.getContext('2d')!;
    ctx.fillStyle = '#060d1b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    for (let i = 0; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    // Add Ejaz Business Solution watermark in texture
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EJAZ BUSINESS SOLUTION', 256, 260);
    ctx.fillText('PKR ACCOUNTING VAULT', 256, 290);

    const gridTexture = new THREE.CanvasTexture(gridCanvas);
    gridTexture.colorSpace = THREE.SRGBColorSpace;
    const discGeo = new THREE.CircleGeometry(7.8, 48);
    const discMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.4,
      metalness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorDisc = new THREE.Mesh(discGeo, discMat);
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = 0.02;
    mainWorldGroup.add(floorDisc);

    // B. Hero 3D Centerpiece: The "PKR Smart Vault & Financial Gyroscope"
    // Composite multi-part procedural model (Group of 8 distinct parts)
    const vaultGroup = new THREE.Group();
    vaultGroup.position.set(0, 1.8, 0);
    mainWorldGroup.add(vaultGroup);

    // Part 1: Central Golden PKR Medallion / Cylinder Core
    const coinGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.28, 48);
    const coinMesh = new THREE.Mesh(coinGeo, goldMaterial);
    coinMesh.rotation.x = Math.PI / 2;
    coinMesh.castShadow = !isSoftwareGl;
    vaultGroup.add(coinMesh);

    // Canvas texture for PKR Emblem on coin face
    const pkrCanvas = document.createElement('canvas');
    pkrCanvas.width = 512;
    pkrCanvas.height = 512;
    const pkrCtx = pkrCanvas.getContext('2d')!;
    pkrCtx.fillStyle = '#f59e0b';
    pkrCtx.fillRect(0, 0, 512, 512);
    pkrCtx.fillStyle = '#78350f';
    pkrCtx.strokeStyle = '#d97706';
    pkrCtx.lineWidth = 14;
    pkrCtx.beginPath();
    pkrCtx.arc(256, 256, 230, 0, Math.PI * 2);
    pkrCtx.stroke();
    // Urdu / English text
    pkrCtx.fillStyle = '#1e293b';
    pkrCtx.font = 'bold 74px sans-serif';
    pkrCtx.textAlign = 'center';
    pkrCtx.fillText('PKR', 256, 220);
    pkrCtx.font = 'bold 36px sans-serif';
    pkrCtx.fillText('حکومت پاکستان', 256, 290);
    pkrCtx.font = 'bold 28px sans-serif';
    pkrCtx.fillText('EJAZ SOLUTION', 256, 340);

    const coinTexture = new THREE.CanvasTexture(pkrCanvas);
    coinTexture.colorSpace = THREE.SRGBColorSpace;
    const faceDecalGeo = new THREE.CircleGeometry(1.2, 48);
    const faceDecalMat = new THREE.MeshStandardMaterial({
      map: coinTexture,
      metalness: 0.9,
      roughness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const faceDecal = new THREE.Mesh(faceDecalGeo, faceDecalMat);
    faceDecal.position.z = 0.145;
    vaultGroup.add(faceDecal);

    const backDecal = new THREE.Mesh(faceDecalGeo, faceDecalMat);
    backDecal.rotation.y = Math.PI;
    backDecal.position.z = -0.145;
    vaultGroup.add(backDecal);

    // Part 2: Inner Emerald Gyroscope Ring
    const innerRingGeo = new THREE.TorusGeometry(1.65, 0.08, 16, 48);
    const gyroRing1 = new THREE.Mesh(innerRingGeo, emeraldMetallic);
    gyroRing1.castShadow = !isSoftwareGl;
    vaultGroup.add(gyroRing1);

    // Part 3: Outer Platinum Orbital Ring
    const outerOrbitalGeo = new THREE.TorusGeometry(2.05, 0.07, 16, 64);
    const gyroRing2 = new THREE.Mesh(outerOrbitalGeo, silverMaterial);
    gyroRing2.castShadow = !isSoftwareGl;
    vaultGroup.add(gyroRing2);

    // Part 4: Third Orbit Ring with Data Satellites
    const thirdRingGeo = new THREE.TorusGeometry(2.45, 0.05, 16, 64);
    const gyroRing3 = new THREE.Mesh(thirdRingGeo, goldMaterial);
    vaultGroup.add(gyroRing3);

    // Satellites orbiting around the vault
    const satellites: THREE.Mesh[] = [];
    const satGeo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < 4; i++) {
      const satMesh = new THREE.Mesh(satGeo, glowingCoreMaterial);
      vaultGroup.add(satMesh);
      satellites.push(satMesh);
    }

    // C. 3D Financial KPI Pillars (Representing the 4 core accounting metrics)
    // 1. Cash in Hand Pillar (Emerald Green)
    // 2. Recovery Pillar (Royal Gold)
    // 3. Bank Balance Pillar (Deep Sapphire Blue)
    // 4. Customer Outstanding Pillar (Crimson/Amber)
    const pillarGroup = new THREE.Group();
    mainWorldGroup.add(pillarGroup);

    interface PillarData {
      name: string;
      label: string;
      angle: number;
      radius: number;
      height: number;
      color: number;
      emissive: number;
      mesh?: THREE.Group;
      tag?: string;
    }

    const pillars: PillarData[] = [
      {
        name: 'cash',
        label: 'Cash in Hand',
        angle: 0,
        radius: 4.8,
        height: 2.6,
        color: 0x10b981,
        emissive: 0x064e3b,
        tag: 'PKR LIQUID CASH',
      },
      {
        name: 'recovery',
        label: 'Recoveries',
        angle: Math.PI / 2,
        radius: 4.8,
        height: 3.4,
        color: 0xf59e0b,
        emissive: 0x78350f,
        tag: 'CUSTOMER RECOVERY',
      },
      {
        name: 'bank',
        label: 'Bank Reserves',
        angle: Math.PI,
        radius: 4.8,
        height: 3.8,
        color: 0x3b82f6,
        emissive: 0x1e3a8a,
        tag: 'HBL / MEEZAN BANKS',
      },
      {
        name: 'outstanding',
        label: 'Receivables',
        angle: (3 * Math.PI) / 2,
        radius: 4.8,
        height: 2.9,
        color: 0xec4899,
        emissive: 0x831843,
        tag: 'PENDING LEDGERS',
      },
    ];

    pillars.forEach((p) => {
      const pGroup = new THREE.Group();
      const x = Math.cos(p.angle) * p.radius;
      const z = Math.sin(p.angle) * p.radius;
      pGroup.position.set(x, 0, z);

      // Base pedestal
      const pedGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.35, 24);
      const pedMesh = new THREE.Mesh(pedGeo, darkObsidian);
      pedMesh.position.y = 0.175;
      pGroup.add(pedMesh);

      // Main pillar column
      const colGeo = new THREE.CylinderGeometry(0.5, 0.55, p.height, 24);
      const colMat = new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.emissive,
        emissiveIntensity: 0.35,
        metalness: 0.85,
        roughness: 0.2,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.y = p.height / 2 + 0.35;
      colMesh.castShadow = !isSoftwareGl;
      pGroup.add(colMesh);

      // Golden capital on top
      const capGeo = new THREE.CylinderGeometry(0.65, 0.5, 0.25, 24);
      const capMesh = new THREE.Mesh(capGeo, goldMaterial);
      capMesh.position.y = p.height + 0.45;
      pGroup.add(capMesh);

      // Floating crystal diamond on pillar summit
      const diaGeo = new THREE.OctahedronGeometry(0.35, 0);
      const diaMat = new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.color,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      });
      const diaMesh = new THREE.Mesh(diaGeo, diaMat);
      diaMesh.position.y = p.height + 1.1;
      pGroup.add(diaMesh);

      p.mesh = pGroup;
      pillarGroup.add(pGroup);
    });

    // D. 3D Floating Particles / Financial Currency Shards
    const particleCount = isSoftwareGl ? 30 : 90;
    const particleGeo = new THREE.TetrahedronGeometry(0.08, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      metalness: 0.8,
      roughness: 0.2,
    });
    const particles: { mesh: THREE.Mesh; speed: number; rotSpeed: number; initY: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      const rad = 2 + Math.random() * 5.5;
      const theta = Math.random() * Math.PI * 2;
      const y = 0.5 + Math.random() * 5.5;
      pMesh.position.set(Math.cos(theta) * rad, y, Math.sin(theta) * rad);
      scene.add(pMesh);
      particles.push({
        mesh: pMesh,
        speed: 0.2 + Math.random() * 0.4,
        rotSpeed: 0.01 + Math.random() * 0.03,
        initY: y,
      });
    }

    // 5. Dynamic Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // 6. Interactive Mouse Movement Listener
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 7. Animation Loop with Wheel / Scroll State Interpolation
    let frameId = 0;
    const clock = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Smooth scroll lerp (controlled by prop scrollProgress or mouse wheel)
      scrollSmoothRef.current += (scrollTargetRef.current - scrollSmoothRef.current) * 0.08;
      const sp = scrollSmoothRef.current;

      // Animate Center PKR Vault
      vaultGroup.rotation.y = elapsedTime * 0.65 + sp * Math.PI * 1.5;
      gyroRing1.rotation.x = elapsedTime * 0.85 + mouseRef.current.y * 0.4;
      gyroRing1.rotation.y = elapsedTime * 0.45;
      gyroRing2.rotation.y = -elapsedTime * 0.75 + mouseRef.current.x * 0.4;
      gyroRing2.rotation.z = elapsedTime * 0.55;
      gyroRing3.rotation.x = -elapsedTime * 0.5 + sp;

      // Orbiting satellites
      satellites.forEach((sat, i) => {
        const offset = (i * Math.PI) / 2;
        const sTime = elapsedTime * 1.2 + offset;
        const satRadius = 2.45;
        sat.position.set(
          Math.cos(sTime) * satRadius,
          Math.sin(sTime * 1.5) * 0.8,
          Math.sin(sTime) * satRadius
        );
        sat.rotation.x += 0.03;
        sat.rotation.y += 0.04;
      });

      // Animate Pillars (subtle rhythmic breathing & hovering diamonds)
      pillars.forEach((p, idx) => {
        if (p.mesh) {
          const dia = p.mesh.children[3];
          if (dia) {
            dia.position.y = p.height + 1.1 + Math.sin(elapsedTime * 2 + idx) * 0.12;
            dia.rotation.y += 0.02;
            dia.rotation.x += 0.01;
          }
        }
      });

      // Subtle float on particles
      particles.forEach((pt) => {
        pt.mesh.position.y = pt.initY + Math.sin(elapsedTime * pt.speed) * 0.35;
        pt.mesh.rotation.x += pt.rotSpeed;
        pt.mesh.rotation.y += pt.rotSpeed;
      });

      // Camera transformation dynamically driven by scrollProgress and mouse
      // When at top (sp ~ 0): Grand panoramic angle viewing the PKR core vault & all pillars
      // When scrolling down (sp ~ 0.5 -> 1.0): Dive camera down towards the recovery base & customer ledger zone
      const targetCamX = Math.sin(sp * Math.PI * 0.8) * 4.5 + mouseRef.current.x * 1.2;
      const targetCamY = 4.2 - sp * 2.2 + mouseRef.current.y * 0.8;
      const targetCamZ = 10.5 - sp * 4.2;

      camera.position.x += (targetCamX - camera.position.x) * 0.06;
      camera.position.y += (targetCamY - camera.position.y) * 0.06;
      camera.position.z += (targetCamZ - camera.position.z) * 0.06;

      // Look slightly downward or at the central core depending on scroll
      const lookY = 1.6 - sp * 0.6;
      camera.lookAt(0, lookY, 0);

      // Rotate entire world slightly with mouse and scroll
      mainWorldGroup.rotation.y = sp * Math.PI * 0.4 + mouseRef.current.x * 0.15;

      if (renderer) {
        renderer.render(scene, camera);
      }
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (renderer) {
        if (container && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[480px] lg:h-[540px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-[#061726] border border-emerald-900/40 shadow-2xl">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Floating 3D HUD Badges */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 pointer-events-none">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
            EJAZ BUSINESS SOLUTION · 3D VAULT
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
          Interactive Financial Engine
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mt-0.5">
          Move your mouse & scroll down to pivot 3D financial pillars, track cash vaults, and view real-time PKR recovery
        </p>
      </div>

      {/* Top-Right Currency & Live Exchange Indicator */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-emerald-500/40 text-right shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono">OFFICIAL CURRENCY</div>
          <div className="text-sm font-extrabold text-emerald-400 font-mono flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>PKR (₨ Pakistani Rupee)</span>
          </div>
        </div>
      </div>

      {/* Interactive 3D Camera Controls & Legend Bar */}
      <div className="absolute bottom-4 inset-x-4 sm:inset-x-6 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Cash in Hand</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-300">Recoveries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-300">Bank Accounts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-pink-500" />
            <span className="text-slate-300">Receivables</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
            Scroll Down ▾ for Ledgers
          </span>
          <span className="hidden md:inline font-mono">Full 3D Real-time WebGL</span>
        </div>
      </div>
    </div>
  );
};
