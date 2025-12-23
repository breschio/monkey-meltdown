import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { voxelizer } from '../services/voxelizer';

interface VoxelPreviewProps {
  imageUrl: string;
  onVoxelReady?: (group: THREE.Group) => void;
}

export const VoxelPreview: React.FC<VoxelPreviewProps> = ({ imageUrl, onVoxelReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera - positioned to see a ~5 unit tall model
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(300, 300);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Grid floor for reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x333333, 0x222222);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      // Rotate the voxel model
      if (voxelGroupRef.current) {
        voxelGroupRef.current.rotation.y += 0.01;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Load and voxelize the image
  useEffect(() => {
    if (!imageUrl || !sceneRef.current) return;

    const loadVoxels = async () => {
      // Remove existing voxel group
      if (voxelGroupRef.current && sceneRef.current) {
        sceneRef.current.remove(voxelGroupRef.current);
      }

      try {
        const voxelGroup = await voxelizer.imageToVoxels(imageUrl);
        
        // Position so it's centered and visible
        // Model is roughly 4.8 units tall (48 * 0.1), centered at origin
        voxelGroup.position.set(0, 0, 0);
        
        console.log('Voxel group added to scene, children:', voxelGroup.children.length);
        
        if (sceneRef.current) {
          sceneRef.current.add(voxelGroup);
          voxelGroupRef.current = voxelGroup;
          
          // Notify parent component with a clone for the game
          if (onVoxelReady) {
            onVoxelReady(voxelGroup.clone());
          }
        }
      } catch (error) {
        console.error('Failed to voxelize image:', error);
      }
    };

    loadVoxels();
  }, [imageUrl, onVoxelReady]);

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        className="w-[300px] h-[300px] rounded-lg overflow-hidden border-2 border-gray-700 mx-auto"
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-xs font-mono text-n64-green">
        3D VOXEL PREVIEW
      </div>
    </div>
  );
};

