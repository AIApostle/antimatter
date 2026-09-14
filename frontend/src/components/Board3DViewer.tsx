import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CircuitState, ComponentItem } from '../types/eda';

interface Board3DViewerProps {
  state: CircuitState;
  onSelectComponent?: (ref: string) => void;
}

export const Board3DViewer: React.FC<Board3DViewerProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'bottom' | 'angle'>('iso');
  const [showTraces, setShowTraces] = useState<boolean>(true);
  const [showComponents, setShowComponents] = useState<boolean>(true);

  // References for animation and camera control
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const boardGroupRef = useRef<THREE.Group | null>(null);

  // Mouse interaction state
  const isDraggingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Solder mask color palette mapping
  const getMaskColor = (colorName: string): number => {
    switch (colorName.toLowerCase()) {
      case 'green':
        return 0x0c542b;
      case 'blue':
        return 0x0c3d69;
      case 'purple':
        return 0x3d1c66;
      case 'red':
        return 0x7a1818;
      case 'black':
      default:
        return 0x111317;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080c);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -60, 75);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Clear any previous canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff6ea, 1.6);
    dirLight1.position.set(40, 50, 80);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8bc0ff, 0.9);
    dirLight2.position.set(-50, -40, 40);
    scene.add(dirLight2);

    // Subtle floor shadow plane
    const shadowGeo = new THREE.PlaneGeometry(160, 160);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.z = -2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(160, 32, 0x222a3d, 0x111624);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -1.9;
    scene.add(gridHelper);

    // 5. Board Group containing Substrate, Traces, Pads, and Components
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);
    boardGroupRef.current = boardGroup;

    // 6. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Re-build 3D PCB Geometry whenever CircuitState changes
  useEffect(() => {
    const boardGroup = boardGroupRef.current;
    if (!boardGroup) return;

    // Clear previous board elements
    while (boardGroup.children.length > 0) {
      boardGroup.remove(boardGroup.children[0]);
    }

    const bw = state.board.width || 50;
    const bh = state.board.height || 35;
    const thickness = state.board.thickness || 1.6;
    const maskColor = getMaskColor(state.board.mask_color || 'black');
    const isEnig = state.board.finish === 'ENIG';

    // Board Substrate (FR4 + Solder Mask) with rounded corners
    const shape = new THREE.Shape();
    const r = Math.min(state.board.corner_radius || 2.5, bw / 4, bh / 4);
    const hw = bw / 2;
    const hh = bh / 2;

    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };

    const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    boardGeo.center();

    // Solder Mask Material using MeshPhysicalMaterial
    const maskMat = new THREE.MeshPhysicalMaterial({
      color: maskColor,
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.3,
      clearcoatRoughness: 0.15,
    });

    const boardMesh = new THREE.Mesh(boardGeo, maskMat);
    boardMesh.castShadow = true;
    boardMesh.receiveShadow = true;
    boardGroup.add(boardMesh);

    // Gold / ENIG / HASL Pad Material
    const padMat = new THREE.MeshStandardMaterial({
      color: isEnig ? 0xd4af37 : 0xc0c4cc, // Gold vs Silver
      metalness: 0.9,
      roughness: 0.2,
    });

    // Top Copper Trace Material
    const traceMat = new THREE.MeshStandardMaterial({
      color: 0xcc7a00,
      metalness: 0.8,
      roughness: 0.3,
    });

    // Bottom Copper Trace Material
    const bottomTraceMat = new THREE.MeshStandardMaterial({
      color: 0x4a7cff,
      metalness: 0.8,
      roughness: 0.3,
    });

    const zTop = thickness / 2 + 0.05;
    const zBottom = -thickness / 2 - 0.05;

    // 1. Render Traces
    if (showTraces && state.tracks) {
      state.tracks.forEach((track) => {
        const sx = track.start[0] - hw;
        const sy = track.start[1] - hh;
        const ex = track.end[0] - hw;
        const ey = track.end[1] - hh;
        const dx = ex - sx;
        const dy = ey - sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len <= 0.01) return;

        const trackGeo = new THREE.BoxGeometry(track.width || 0.3, len, 0.04);
        const isTop = track.layer !== 'B.Cu';
        const tMesh = new THREE.Mesh(trackGeo, isTop ? traceMat : bottomTraceMat);
        tMesh.position.set((sx + ex) / 2, (sy + ey) / 2, isTop ? zTop : zBottom);
        tMesh.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
        boardGroup.add(tMesh);
      });
    }

    // 2. Render Component Footprints, Pads, and 3D Packages
    if (showComponents && state.components) {
      Object.values(state.components).forEach((comp: ComponentItem) => {
        const cx = comp.x - hw;
        const cy = comp.y - hh;
        const rotRad = (comp.rotation * Math.PI) / 180;

        const compGroup = new THREE.Group();
        compGroup.position.set(cx, cy, zTop);
        compGroup.rotation.z = rotRad;

        // Render Component Pads
        if (comp.pins) {
          Object.values(comp.pins).forEach((pin) => {
            const px = pin.x_offset || 0;
            const py = pin.y_offset || 0;
            const padGeo = new THREE.BoxGeometry(1.2, 1.4, 0.06);
            const padMesh = new THREE.Mesh(padGeo, padMat);
            padMesh.position.set(px, py, 0.02);
            compGroup.add(padMesh);
          });
        }

        // Render 3D Component Models based on part type
        const valLower = (comp.value || '').toLowerCase();
        const refUpper = (comp.ref || '').toUpperCase();

        if (refUpper.startsWith('R') || refUpper.startsWith('C')) {
          // 0805 / 0603 SMD Passive
          const bodyColor = refUpper.startsWith('C') ? 0xb58d63 : 0x1a1a1a;
          const bodyGeo = new THREE.BoxGeometry(1.4, 1.0, 0.7);
          const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
          const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
          bodyMesh.position.z = 0.35;
          bodyMesh.castShadow = true;
          compGroup.add(bodyMesh);

          // Metal end terminations
          const capGeo = new THREE.BoxGeometry(0.35, 1.02, 0.72);
          const capMat = new THREE.MeshStandardMaterial({ color: 0xd0d5dd, metalness: 0.85, roughness: 0.2 });
          const cap1 = new THREE.Mesh(capGeo, capMat);
          cap1.position.set(-0.7, 0, 0.35);
          const cap2 = new THREE.Mesh(capGeo, capMat);
          cap2.position.set(0.7, 0, 0.35);
          compGroup.add(cap1, cap2);

        } else if (refUpper.startsWith('D')) {
          // SMD LED 0805
          const ledGeo = new THREE.BoxGeometry(1.6, 1.0, 0.7);
          const isBlue = valLower.includes('blue');
          const isRed = valLower.includes('red');
          const ledColor = isBlue ? 0x00e5ff : (isRed ? 0xff3b5c : 0x10b981);

          const ledMat = new THREE.MeshPhysicalMaterial({
            color: ledColor,
            roughness: 0.1,
            transmission: 0.7,
            opacity: 0.9,
            transparent: true,
            emissive: ledColor,
            emissiveIntensity: 0.5,
          });
          const ledMesh = new THREE.Mesh(ledGeo, ledMat);
          ledMesh.position.z = 0.35;
          compGroup.add(ledMesh);

        } else if (valLower.includes('ams1117') || valLower.includes('ldo') || valLower.includes('regulator')) {
          // SOT-223 Voltage Regulator
          const icBodyGeo = new THREE.BoxGeometry(6.5, 3.5, 1.6);
          const icMat = new THREE.MeshStandardMaterial({ color: 0x1e2229, roughness: 0.6 });
          const icMesh = new THREE.Mesh(icBodyGeo, icMat);
          icMesh.position.z = 0.8;
          icMesh.castShadow = true;
          compGroup.add(icMesh);

          // Metal cooling tab
          const tabGeo = new THREE.BoxGeometry(3.2, 2.0, 0.3);
          const tabMesh = new THREE.Mesh(tabGeo, padMat);
          tabMesh.position.set(0, 2.2, 0.15);
          compGroup.add(tabMesh);

        } else if (valLower.includes('usb')) {
          // USB-C Receptacle
          const shieldGeo = new THREE.BoxGeometry(8.9, 7.3, 3.1);
          const shieldMat = new THREE.MeshStandardMaterial({ color: 0xc4cacf, metalness: 0.9, roughness: 0.15 });
          const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
          shieldMesh.position.z = 1.55;
          shieldMesh.castShadow = true;
          compGroup.add(shieldMesh);

          // Center tongue slot
          const slotGeo = new THREE.BoxGeometry(7.0, 4.0, 1.2);
          const slotMat = new THREE.MeshBasicMaterial({ color: 0x0a0c10 });
          const slotMesh = new THREE.Mesh(slotGeo, slotMat);
          slotMesh.position.set(0, -1.8, 1.55);
          compGroup.add(slotMesh);

        } else if (valLower.includes('esp32')) {
          // ESP32-C3 / Wireless Module
          const modGeo = new THREE.BoxGeometry(18.0, 20.0, 2.8);
          const modMat = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.85, roughness: 0.25 });
          const modMesh = new THREE.Mesh(modGeo, modMat);
          modMesh.position.z = 1.4;
          modMesh.castShadow = true;
          compGroup.add(modMesh);

          // Antenna Keepout Area (black PCB edge)
          const antGeo = new THREE.BoxGeometry(18.0, 5.0, 0.2);
          const antMat = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.7 });
          const antMesh = new THREE.Mesh(antGeo, antMat);
          antMesh.position.set(0, 7.5, 1.4);
          compGroup.add(antMesh);

        } else {
          // Generic IC or Header
          const genGeo = new THREE.BoxGeometry(8.0, 4.0, 2.0);
          const genMat = new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.5 });
          const genMesh = new THREE.Mesh(genGeo, genMat);
          genMesh.position.z = 1.0;
          genMesh.castShadow = true;
          compGroup.add(genMesh);
        }

        boardGroup.add(compGroup);
      });
    }
  }, [state, showTraces, showComponents]);

  // Mouse Orbit & Pan Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = e.button === 0; // Left click = orbit
    isPanningRef.current = e.button === 2 || e.button === 1; // Right/middle click = pan
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current && !isPanningRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    if (isDraggingRef.current && boardGroupRef.current) {
      boardGroupRef.current.rotation.z += deltaX * 0.008;
      boardGroupRef.current.rotation.x += deltaY * 0.008;
    } else if (isPanningRef.current && cameraRef.current) {
      cameraRef.current.position.x -= deltaX * 0.06;
      cameraRef.current.position.y += deltaY * 0.06;
    }

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    e.preventDefault();
    const zoomFactor = e.deltaY * 0.05;
    cameraRef.current.position.z = Math.max(20, Math.min(200, cameraRef.current.position.z + zoomFactor));
  };

  // Camera Presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'bottom' | 'angle') => {
    setActivePreset(preset);
    if (!boardGroupRef.current || !cameraRef.current) return;

    if (preset === 'top') {
      boardGroupRef.current.rotation.set(0, 0, 0);
      cameraRef.current.position.set(0, 0, 85);
    } else if (preset === 'bottom') {
      boardGroupRef.current.rotation.set(Math.PI, 0, 0);
      cameraRef.current.position.set(0, 0, 85);
    } else if (preset === 'angle') {
      boardGroupRef.current.rotation.set(Math.PI / 4, 0, -Math.PI / 6);
      cameraRef.current.position.set(0, -45, 60);
    } else {
      // Isometric Default
      boardGroupRef.current.rotation.set(-Math.PI / 5, 0, Math.PI / 6);
      cameraRef.current.position.set(0, -60, 75);
    }
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div className="relative w-full h-full overflow-hidden eda-grid-bg" style={{ position: 'relative' }}>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Floating Precision 3D HUD Controls */}
      <div
        className="absolute flex items-center justify-between"
        style={{
          bottom: '16px',
          left: '16px',
          right: '16px',
          pointerEvents: 'none',
        }}
      >
        {/* Camera Views Selector */}
        <div
          className="flex items-center"
          style={{
            background: 'rgba(14, 17, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #252b3d',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={() => setCameraPreset('iso')}
            className={`btn btn-ghost font-mono ${activePreset === 'iso' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            ISO 3D
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`btn btn-ghost font-mono ${activePreset === 'top' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            TOP (F.Cu)
          </button>
          <button
            onClick={() => setCameraPreset('bottom')}
            className={`btn btn-ghost font-mono ${activePreset === 'bottom' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            BOTTOM (B.Cu)
          </button>
        </div>

        {/* Layer & Geometry Toggles */}
        <div
          className="flex items-center"
          style={{
            background: 'rgba(14, 17, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #252b3d',
            borderRadius: '8px',
            padding: '4px 8px',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          <label className="flex items-center font-mono" style={{ fontSize: '11px', gap: '5px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTraces}
              onChange={(e) => setShowTraces(e.target.checked)}
              style={{ accentColor: '#00e5ff' }}
            />
            Copper Traces
          </label>
          <label className="flex items-center font-mono" style={{ fontSize: '11px', gap: '5px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showComponents}
              onChange={(e) => setShowComponents(e.target.checked)}
              style={{ accentColor: '#00e5ff' }}
            />
            3D Components
          </label>
        </div>
      </div>

      {/* Real-time Dimensions & Substrate Overlay */}
      <div
        className="absolute"
        style={{
          top: '16px',
          right: '16px',
          background: 'rgba(14, 17, 24, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid #252b3d',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: '#94a3b8',
        }}
      >
        <div style={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '2px' }}>
          {state.board.width} × {state.board.height} mm
        </div>
        <div>Substrate: FR-4 (1.6mm)</div>
        <div style={{ textTransform: 'capitalize' }}>
          Mask: <span style={{ color: '#00e5ff' }}>{state.board.mask_color}</span> | Finish: {state.board.finish}
        </div>
      </div>
    </div>
  );
};
