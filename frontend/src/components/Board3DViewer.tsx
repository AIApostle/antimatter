import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CircuitState } from '../types/eda';
import { getApiBase } from '../lib/apiConfig';

interface Board3DViewerProps {
  state: CircuitState;
  onSelectComponent?: (ref: string) => void;
}

export const THREE_D_BG_OPTIONS = [
  { id: 'dark', label: 'Dark', color: '#07080c' },
  { id: 'navy', label: 'Navy', color: '#030c1b' },
  { id: 'emerald', label: 'Green', color: '#04150d' },
  { id: 'slate', label: 'Slate', color: '#161a24' },
];

export const Board3DViewer: React.FC<Board3DViewerProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'bottom' | 'angle'>('iso');
  const [isLoadingGlb, setIsLoadingGlb] = useState<boolean>(true);
  const [isUsingNativeGlb, setIsUsingNativeGlb] = useState<boolean>(false);

  // Background color selection for 3D viewport
  const [activeBgId, setActiveBgId] = useState<string>(() => {
    return localStorage.getItem('antimatter_3d_bg') || 'dark';
  });
  const activeBg = THREE_D_BG_OPTIONS.find((b) => b.id === activeBgId) || THREE_D_BG_OPTIONS[0];

  // References for animation and camera control
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const boardGroupRef = useRef<THREE.Group | null>(null);

  // Update scene background color reactively
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(activeBg.color);
    }
  }, [activeBg]);

  // Mouse interaction state
  const isDraggingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Solder mask color palette mapping for fallback substrate
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

  // Fallback procedural board builder if GLB compilation is pending or encounters an error
  const buildFallbackBoard = useCallback(() => {
    const boardGroup = boardGroupRef.current;
    if (!boardGroup) return;

    while (boardGroup.children.length > 0) {
      boardGroup.remove(boardGroup.children[0]);
    }

    const bw = state.board.width || 50;
    const bh = state.board.height || 35;
    const thickness = state.board.thickness || 1.6;
    const maskColor = getMaskColor(state.board.mask_color || 'black');

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
  }, [state.board]);

  // Initialize Three.js Scene, Camera, Lights, and Animation Loop
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

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting setup for realistic PCB reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff8ee, 1.8);
    dirLight1.position.set(45, 55, 90);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x7fb4ff, 1.0);
    dirLight2.position.set(-50, -45, 45);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight3.position.set(0, 0, -80); // Under-board fill light for B.Cu traces
    scene.add(dirLight3);

    // Ground Grid & Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(240, 240);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.z = -15;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const gridHelper = new THREE.GridHelper(240, 36, 0x1a2333, 0x0c111a);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -14.9;
    scene.add(gridHelper);

    // 5. Board Group container for GLTF / GLB model
    const boardGroup = new THREE.Group();
    // Default isometric tilt
    boardGroup.rotation.set(-Math.PI / 5, 0, Math.PI / 6);
    scene.add(boardGroup);
    boardGroupRef.current = boardGroup;

    // 6. Animation render loop
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

  // Load genuine KiCad GLB model whenever CircuitState changes (revision, project_id, sexpr)
  useEffect(() => {
    let isCancelled = false;
    const boardGroup = boardGroupRef.current;
    if (!boardGroup) return;

    // Immediately render procedural fallback board so the view is never empty
    buildFallbackBoard();

    const projectId = state.project_id || 'antimatter';
    const rev = state.revision || 1;
    const glbUrl = `${getApiBase()}/projects/${projectId}/glb?rev=${rev}&t=${Date.now()}`;

    setIsLoadingGlb(true);

    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        if (isCancelled) return;

        const model = gltf.scene;
        if (!model) {
          setIsLoadingGlb(false);
          return;
        }

        // Measure raw bounding box
        const rawBox = new THREE.Box3().setFromObject(model);
        if (rawBox.isEmpty()) {
          console.warn('[Board3DViewer] GLB model is empty, keeping fallback board');
          setIsLoadingGlb(false);
          return;
        }

        const rawSize = rawBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);

        // CRITICAL FIX: KiCad exports glTF in METERS (e.g. 0.050 for 50mm board).
        // If max dimension is in meters (< 1.0), scale up by 1000 to convert to millimeters.
        if (maxDim > 0 && maxDim < 1.0) {
          model.scale.set(1000, 1000, 1000);
        }

        // Re-compute bounding box after scaling
        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // Enable double-sided rendering, shadows, and depth write for copper traces & pads
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m) => {
                m.side = THREE.DoubleSide;
                m.depthWrite = true;
              });
            }
          }
        });

        // Frame camera to comfortably encompass the board
        const scaledSize = scaledBox.getSize(new THREE.Vector3());
        const fitDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) || 50;
        if (cameraRef.current) {
          const dist = Math.max(60, fitDim * 1.55);
          cameraRef.current.position.set(0, -dist * 0.75, dist * 0.85);
          cameraRef.current.lookAt(0, 0, 0);
        }

        // Clear fallback elements and mount genuine KiCad GLB
        while (boardGroup.children.length > 0) {
          boardGroup.remove(boardGroup.children[0]);
        }
        boardGroup.add(model);
        setIsUsingNativeGlb(true);
        setIsLoadingGlb(false);
      },
      undefined,
      (err) => {
        if (isCancelled) return;
        console.warn('[Board3DViewer] Failed to load native KiCad GLB, keeping procedural substrate:', err);
        buildFallbackBoard();
        setIsUsingNativeGlb(false);
        setIsLoadingGlb(false);
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [state.project_id, state.revision, state.pcb_sexpr, buildFallbackBoard]);

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
    cameraRef.current.position.z = Math.max(15, Math.min(220, cameraRef.current.position.z + zoomFactor));
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

  const handleDownloadGlb = () => {
    const glbUrl = `${getApiBase()}/projects/${state.project_id}/glb`;
    const link = document.createElement('a');
    link.href = glbUrl;
    link.download = `${state.project_id}_3d_model.glb`;
    link.click();
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

      {/* Loading Indicator Overlay */}
      {isLoadingGlb && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(7, 8, 12, 0.45)', backdropFilter: 'blur(3px)', zIndex: 10 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              background: '#0d111a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              color: '#00e5ff',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(0,229,255,0.2)',
                borderTopColor: '#00e5ff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Exporting KiCad 3D GLB Geometry...</span>
          </div>
        </div>
      )}

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
        {/* Camera Views & Background Selector */}
        <div
          className="flex items-center"
          style={{
            background: 'rgba(14, 17, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #252b3d',
            borderRadius: '8px',
            padding: '4px 6px',
            gap: '6px',
            pointerEvents: 'auto',
          }}
        >
          {/* Preset Buttons */}
          <button
            onClick={() => setCameraPreset('iso')}
            className={`btn btn-ghost font-mono ${activePreset === 'iso' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            ISO
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`btn btn-ghost font-mono ${activePreset === 'top' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            TOP
          </button>
          <button
            onClick={() => setCameraPreset('bottom')}
            className={`btn btn-ghost font-mono ${activePreset === 'bottom' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 8px', fontSize: '11px' }}
          >
            BOT
          </button>

          {/* Divider */}
          <div style={{ width: '1px', height: '16px', background: '#252b3d', margin: '0 2px' }} />

          {/* Background color options */}
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>BG:</span>
          {THREE_D_BG_OPTIONS.map((opt) => {
            const isSel = opt.id === activeBg.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setActiveBgId(opt.id);
                  localStorage.setItem('antimatter_3d_bg', opt.id);
                }}
                title={`Set 3D background: ${opt.label}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: isSel ? '1px solid #00e5ff' : '1px solid #232b3e',
                  background: isSel ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: isSel ? '#00e5ff' : '#94a3b8',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: opt.color,
                    border: isSel ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.3)',
                    display: 'inline-block',
                  }}
                />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Engine Status & GLB Export */}
        <div
          className="flex items-center"
          style={{
            background: 'rgba(14, 17, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #252b3d',
            borderRadius: '8px',
            padding: '4px 8px',
            gap: '10px',
            pointerEvents: 'auto',
          }}
        >
          <span
            className="flex items-center font-mono"
            style={{
              fontSize: '11px',
              color: isUsingNativeGlb ? '#10b981' : '#eab308',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isUsingNativeGlb ? '#10b981' : '#eab308',
                boxShadow: isUsingNativeGlb ? '0 0 8px #10b981' : 'none',
              }}
            />
            {isUsingNativeGlb ? 'KiCad Native 3D (GLB)' : 'Interactive Preview'}
          </span>

          <button
            onClick={handleDownloadGlb}
            className="btn btn-ghost font-mono"
            style={{ padding: '4px 10px', fontSize: '11px', color: '#00e5ff' }}
            title="Download full 3D GLB model for Blender, FreeCAD or MCAD"
          >
            Download .glb
          </button>
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

export default Board3DViewer;
