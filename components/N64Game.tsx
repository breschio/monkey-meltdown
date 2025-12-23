import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { audioService } from '../services/audioService';

// --- TYPES ---
type GameState = 'LODGE' | 'PLAYING' | 'LEVEL_COMPLETE' | 'GAMEOVER';

interface N64GameProps {
    generatedSpriteUrl?: string | null;
    isDemo?: boolean;
}

// --- CONSTANTS ---
const WORLD_SPEED_BASE = 0.5;
const SEGMENT_LENGTH = 50; // Length of one ground tile
const SEGMENT_COUNT = 3;   // Number of ground tiles to cycle
const PLAY_WIDTH = 18;     // Wider playable area
const TERRAIN_WIDTH = 100; // Geometry width

const COLORS = {
  snow: 0xffffff,
  tree: 0x1e3a18,
  trunk: 0x4a3728,
  rock: 0x6b7280,
  pizza: 0xffaa00,
  pepperoni: 0xcc0000,
  banana: 0xffeb3b,
  mango: 0xff9800,
  leaf: 0x22c55e,
  lodge: 0x8b4513,
  bowl: 0xffffff,
  pasta: 0xfef08a,
  meatball: 0x7f1d1d
};

// --- TERRAIN MATH ---
// Periodic noise function for seamless looping chunks
const getTerrainHeight = (x: number, z: number) => {
    // z is local coordinate [-25, 25]
    const zFreq1 = (Math.PI * 2) / SEGMENT_LENGTH;     

    // REDUCED AMPLITUDE for "Less Hills"
    // Previously * 3.5, now * 2.0 for gentler slopes
    const base = Math.sin(x * 0.1) * Math.cos(z * zFreq1) * 2.0; 
    
    // Less high-frequency noise (smoother surface)
    const detail = Math.cos(x * 0.2 + z * zFreq1 * 2.0) * 0.5;
    
    // Keep the bowl shape so player tends to stay on screen
    const bowl = Math.pow(Math.abs(x) / 22, 2) * 1.5;

    return base + detail + bowl - 2.5;
};

export const N64Game: React.FC<N64GameProps> = ({ generatedSpriteUrl, isDemo = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // React State (for UI)
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(60);
  
  // Refs for Game Loop
  const gameStateRef = useRef<GameState>('PLAYING');
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const spriteUrlRef = useRef<string | null | undefined>(generatedSpriteUrl);
  
  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const objectsRef = useRef<THREE.Group[]>([]);
  const groundSegmentsRef = useRef<THREE.Mesh[]>([]);
  const snowSystemRef = useRef<THREE.Points | null>(null);
  
  const reqRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Gameplay Refs
  const speedRef = useRef(WORLD_SPEED_BASE);
  const playerXRef = useRef(0);
  const isInvincibleRef = useRef(false);
  const gameActiveRef = useRef(false);
  
  // Input Refs
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Demo mode ref
  const isDemoRef = useRef(isDemo);
  const demoTimeRef = useRef(0);

  useEffect(() => { spriteUrlRef.current = generatedSpriteUrl; }, [generatedSpriteUrl]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { levelRef.current = level; }, [level]);

  // --- THREE.JS ASSETS ---

  const createGroundSegment = (index: number) => {
    const geometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, SEGMENT_LENGTH, 64, 48);
    
    const positionAttribute = geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i); // Local Z
        
        const height = getTerrainHeight(x, y);
        positionAttribute.setZ(i, height);
    }
    
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
        color: COLORS.snow,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -index * SEGMENT_LENGTH; 
    mesh.position.y = -1.5;
    
    return mesh;
  };

  const createSnowSystem = () => {
      const particleCount = 2000;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const velocities = [];

      for(let i=0; i<particleCount; i++) {
          positions[i*3] = (Math.random() - 0.5) * 120; 
          positions[i*3+1] = Math.random() * 40;        
          positions[i*3+2] = (Math.random() - 0.5) * 100;
          
          velocities.push({
              y: - (0.1 + Math.random() * 0.2),
              z: (0.2 + Math.random() * 0.1),
              x: (Math.random() - 0.5) * 0.1
          });
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 0.4,
          transparent: true,
          opacity: 0.6
      });

      const system = new THREE.Points(geometry, material);
      system.userData = { velocities };
      return system;
  };

  const createTree = () => {
    const group = new THREE.Group();
    
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.trunk });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75;
    group.add(trunk);

    const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.tree, flatShading: true });
    
    const bottomLayer = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.0, 7), leafMat);
    bottomLayer.position.y = 2.0;
    group.add(bottomLayer);
    
    const midLayer = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.5, 7), leafMat);
    midLayer.position.y = 3.5;
    group.add(midLayer);

    const topLayer = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 7), leafMat);
    topLayer.position.y = 4.8;
    group.add(topLayer);

    const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    snowCap.position.y = 5.4;
    group.add(snowCap);

    group.userData = { type: 'obstacle', hit: false };
    group.rotation.y = Math.random() * Math.PI;
    const s = 0.8 + Math.random() * 0.6;
    group.scale.set(s, s, s);
    return group;
  };

  const createRock = () => {
    const geo = new THREE.DodecahedronGeometry(0.8, 0); 
    const mat = new THREE.MeshStandardMaterial({ 
        color: COLORS.rock, 
        flatShading: true,
        roughness: 0.9 
    });
    const mesh = new THREE.Mesh(geo, mat);
    
    mesh.scale.set(1.5 + Math.random(), 1 + Math.random(), 1.5 + Math.random());
    mesh.position.y = 0.5;
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    
    const group = new THREE.Group();
    group.add(mesh);
    group.userData = { type: 'obstacle', hit: false };
    return group;
  };
  
  const createCollectible = (type: 'banana' | 'mango' | 'pizza' | 'spaghetti') => {
      const group = new THREE.Group();
      let label = '';
  
      if (type === 'banana') {
        // Curved Banana
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.4, -0.4, 0),
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.4, -0.4, 0)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.12, 6, false);
        const mat = new THREE.MeshLambertMaterial({ color: COLORS.banana });
        const mesh = new THREE.Mesh(tubeGeo, mat);
        
        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2);
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(-0.42, -0.35, 0);
        stem.rotation.z = Math.PI / 4;
        
        const bGroup = new THREE.Group();
        bGroup.add(mesh);
        bGroup.add(stem);
        bGroup.position.y = 0.5;
        bGroup.rotation.z = Math.PI / 1.2; // Angle it nicely
        group.add(bGroup);
        label = 'B';

      } else if (type === 'mango') {
        // Mango Body
        const geo = new THREE.SphereGeometry(0.4, 8, 8);
        geo.scale(1, 1.4, 0.8);
        const mat = new THREE.MeshLambertMaterial({ color: COLORS.mango, flatShading: true });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Leaf
        const leafGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
        leafGeo.scale(1, 1, 0.2);
        const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.leaf });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(0.1, 0.5, 0);
        leaf.rotation.z = -Math.PI / 6;

        const mGroup = new THREE.Group();
        mGroup.add(mesh);
        mGroup.add(leaf);
        mGroup.position.y = 0.6;
        group.add(mGroup);
        label = 'M';

      } else if (type === 'pizza') {
        // Pizza Slice (Triangular Prism / Flat Cone)
        const geo = new THREE.ConeGeometry(0.6, 1.2, 32, 1, true); // Open bottom cone? No, cylinder with 3 segments is a prism
        // Let's use a very flat Cone, masked as a slice
        // Or just a cylinder segment.
        // Simple N64 style: A thin wedge.
        const shape = new THREE.Shape();
        shape.moveTo(0,0);
        shape.lineTo(0.5, 1.0);
        shape.lineTo(-0.5, 1.0);
        shape.lineTo(0,0);
        
        const extrudeSettings = { depth: 0.1, bevelEnabled: false };
        const pizzaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const pizzaMat = new THREE.MeshLambertMaterial({ color: COLORS.pizza });
        const mesh = new THREE.Mesh(pizzaGeo, pizzaMat);
        mesh.rotation.x = Math.PI / 2; // Lay flat
        
        // Pepperoni
        const peppGeo = new THREE.CircleGeometry(0.12, 8);
        const peppMat = new THREE.MeshBasicMaterial({ color: COLORS.pepperoni });
        
        const p1 = new THREE.Mesh(peppGeo, peppMat); p1.position.set(0, 0.7, 0.11);
        const p2 = new THREE.Mesh(peppGeo, peppMat); p2.position.set(-0.2, 0.4, 0.11);
        const p3 = new THREE.Mesh(peppGeo, peppMat); p3.position.set(0.2, 0.4, 0.11);

        mesh.add(p1); mesh.add(p2); mesh.add(p3);

        const pGroup = new THREE.Group();
        pGroup.add(mesh);
        pGroup.position.y = 0.5;
        pGroup.rotation.x = Math.PI / 4; // Tilt it up
        group.add(pGroup);
        label = 'P';

      } else if (type === 'spaghetti') {
          // Bowl
          const bowlGeo = new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
          const bowlMat = new THREE.MeshLambertMaterial({ color: COLORS.bowl });
          const bowl = new THREE.Mesh(bowlGeo, bowlMat);
          bowl.rotation.x = Math.PI; // Upside down so opening is up
          
          // Noodles (Torus knot mess)
          const pastaGeo = new THREE.TorusKnotGeometry(0.25, 0.08, 32, 6, 2, 3);
          const pastaMat = new THREE.MeshStandardMaterial({ color: COLORS.pasta, roughness: 0.6 });
          const pasta = new THREE.Mesh(pastaGeo, pastaMat);
          pasta.scale.set(1, 0.5, 1);
          pasta.position.y = -0.1;
          
          // Meatballs
          const mbGeo = new THREE.SphereGeometry(0.12, 6, 6);
          const mbMat = new THREE.MeshLambertMaterial({ color: COLORS.meatball });
          const mb1 = new THREE.Mesh(mbGeo, mbMat); mb1.position.set(0.1, 0.1, 0.1);
          const mb2 = new THREE.Mesh(mbGeo, mbMat); mb2.position.set(-0.15, 0.15, -0.05);
          
          const sGroup = new THREE.Group();
          sGroup.add(bowl);
          // Add contents to a group that sits "inside" the bowl
          const contents = new THREE.Group();
          contents.add(pasta);
          contents.add(mb1);
          contents.add(mb2);
          contents.position.y = -0.2; // Adjust height inside bowl
          contents.rotation.x = Math.PI; // Flip back up
          
          sGroup.add(contents);
          sGroup.position.y = 0.8;
          group.add(sGroup);
          label = 'S';
      }
  
      // Floating label/billboard
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = type === 'pizza' ? '#ff0000' : '#ffff00';
        if (type === 'spaghetti') ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 32, 32);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.y = 1.5;
      sprite.scale.set(0.6, 0.6, 0.6);
      group.add(sprite);
  
      group.userData = { type: 'collectible', subtype: type, hit: false };
      return group;
  };

  // --- PLAYER & SCENE SETUP ---
  
  const createMonkey = () => {
    const group = new THREE.Group();
    // SCALE UP MONKEY
    group.scale.set(2, 2, 2); 

    const bodyMat = new THREE.MeshLambertMaterial({ color: '#ef4444' });
    const headMat = new THREE.MeshLambertMaterial({ color: '#8b4513' });
    
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 8), bodyMat);
    body.position.y = 0.6;
    group.add(body);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), headMat);
    head.position.y = 1.1;
    group.add(head);
    
    const skiGeo = new THREE.BoxGeometry(0.2, 0.05, 1.8);
    const skiMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const lSki = new THREE.Mesh(skiGeo, skiMat);
    lSki.position.set(-0.25, 0.05, 0);
    const rSki = new THREE.Mesh(skiGeo, skiMat);
    rSki.position.set(0.25, 0.05, 0);
    group.add(lSki);
    group.add(rSki);

    return group;
  };

  const createSpritePlayer = (url: string) => {
      const group = new THREE.Group();
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(url, (texture) => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.repeat.set(1/4, 1); // 4 frames: Front, Back, Back-Left, Back-Right
          texture.offset.x = 0; 
          
          const material = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(material);
          // SCALE UP SPRITE (Was 1.5, 2.8) -> Now significantly bigger
          sprite.scale.set(2.5, 4.5, 1);
          sprite.position.y = 2.0; 
          group.add(sprite);
      });
      // Shadow
      const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(1.0, 16),
          new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.05;
      group.add(shadow);
      return group;
  };

  const spawnObject = (zPos: number) => {
    if (!sceneRef.current) return;

    const rand = Math.random();
    let obj;
    // Wider spawn area based on PLAY_WIDTH
    const xPos = (Math.random() - 0.5) * (PLAY_WIDTH * 1.8); 

    if (rand < 0.40) obj = createTree();
    else if (rand < 0.60) obj = createRock();
    else if (rand < 0.75) obj = createCollectible('banana');
    else if (rand < 0.85) obj = createCollectible('pizza');
    else if (rand < 0.95) obj = createCollectible('mango');
    else obj = createCollectible('spaghetti');

    const localZ = zPos % SEGMENT_LENGTH;
    const h = getTerrainHeight(xPos, localZ);
    obj.position.set(xPos, h - 1.5, zPos); 
    
    if (obj.userData.type === 'obstacle') {
        obj.rotation.y = Math.random() * Math.PI * 2;
    }
    // Random rotation for collectibles too? No, keep them facing camera roughly or spinning
    if (obj.userData.type === 'collectible') {
        // Adding a spinner logic component later would be good, 
        // for now just initial random yaw
        obj.rotation.y = Math.random() * Math.PI; 
    }

    sceneRef.current.add(obj);
    objectsRef.current.push(obj);
  };

  const startGame = useCallback((targetLevel: number) => {
    gameStateRef.current = 'PLAYING';
    levelRef.current = targetLevel;
    scoreRef.current = 0;
    speedRef.current = WORLD_SPEED_BASE + (targetLevel * 0.1); 
    gameActiveRef.current = true;
    playerXRef.current = 0;
    
    setGameState('PLAYING');
    setScore(0);
    setTimeRemaining(60);
    
    objectsRef.current.forEach(obj => sceneRef.current?.remove(obj));
    objectsRef.current = [];
    
    const initialCount = targetLevel === 1 ? 5 : 12;
    for(let i=0; i<initialCount; i++) {
        spawnObject(-20 - (i * 15));
    }

    // Only play sounds in non-demo mode (music handled at App level)
    if (!isDemoRef.current) {
      audioService.resume();
      audioService.playJump();
    }
  }, []);

  // --- MAIN LOOP ---
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); 
    scene.fog = new THREE.Fog(0x87ceeb, 15, 80); 
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(30, 50, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Ground System
    groundSegmentsRef.current = [];
    for(let i=0; i<SEGMENT_COUNT; i++) {
        const seg = createGroundSegment(i);
        scene.add(seg);
        groundSegmentsRef.current.push(seg);
    }

    // Snow System
    const snow = createSnowSystem();
    scene.add(snow);
    snowSystemRef.current = snow;

    // Player
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);
    playerRef.current = playerGroup;

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            if (entry.target === mountRef.current && cameraRef.current && rendererRef.current) {
                const { width, height } = entry.contentRect;
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(width, height);
            }
        }
    });
    resizeObserver.observe(mountRef.current);
    resizeObserverRef.current = resizeObserver;

    // Animation Loop
    const animate = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        const player = playerRef.current;
        const currentGameState = gameStateRef.current;
        let speed = speedRef.current;
        
        // --- GROUND SCROLLING ---
        if (gameActiveRef.current) {
            groundSegmentsRef.current.forEach(seg => {
                seg.position.z += speed;
                if (seg.position.z > SEGMENT_LENGTH) {
                    seg.position.z -= SEGMENT_LENGTH * SEGMENT_COUNT;
                }
            });
        }

        // --- SNOW ANIMATION ---
        if (snowSystemRef.current && gameActiveRef.current) {
            const positions = snowSystemRef.current.geometry.attributes.position.array as Float32Array;
            const velocities = snowSystemRef.current.userData.velocities;
            for(let i=0; i < velocities.length; i++) {
                positions[i*3] += velocities[i].x; // X
                positions[i*3+1] += velocities[i].y; // Y
                positions[i*3+2] += velocities[i].z + speed; // Z

                if (positions[i*3+1] < 0) positions[i*3+1] = 40;
                if (positions[i*3+2] > 10) positions[i*3+2] = -50;
            }
            snowSystemRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // --- CAMERA & PLAYER ---
        if (currentGameState === 'PLAYING' && player) {
             const targetCamX = player.position.x * 0.5;
             // Camera higher to see big player
             cameraRef.current.position.lerp(new THREE.Vector3(targetCamX, 7.0, 16.0), 0.1);
             cameraRef.current.lookAt(targetCamX, 2.0, -10);

             if (spriteUrlRef.current) {
                 let spriteMesh: THREE.Sprite | null = null;
                 player.traverse((obj) => { if (obj instanceof THREE.Sprite) spriteMesh = obj; });
                 
                 if (spriteMesh && spriteMesh.material.map) {
                     const map = spriteMesh.material.map;
                     // 4 frames: Front(0), Back(1), Back-Left(2), Back-Right(3)
                     // Frame offsets: 0, 0.25, 0.5, 0.75
                     const rotation = player.rotation.z;
                     
                     if (rotation > 0.08) {
                       // Turning left -> show Back-Left (frame 2)
                       map.offset.x = 0.5;
                     } else if (rotation < -0.08) {
                       // Turning right -> show Back-Right (frame 3)
                       map.offset.x = 0.75;
                     } else {
                       // Going straight downhill -> show Back (frame 1)
                       map.offset.x = 0.25;
                     }
                     // Note: Front (frame 0, offset 0) not used during skiing gameplay
                 }
             }
        }

        // --- GAME LOGIC ---
        if (gameActiveRef.current && player) {
            
            // --- PHYSICS & CONTROLS ---
            
            const activeSeg = groundSegmentsRef.current.find(s => s.position.z > -SEGMENT_LENGTH/2 && s.position.z < SEGMENT_LENGTH * 1.5);
            
            let terrainHeight = 0;
            let slopeX = 0;
            let slopeZ = 0;

            if (activeSeg) {
                const localZ = -activeSeg.position.z;
                const px = player.position.x;
                
                terrainHeight = getTerrainHeight(px, localZ);
                
                const delta = 0.5;
                const hRight = getTerrainHeight(px + delta, localZ);
                const hLeft = getTerrainHeight(px - delta, localZ);
                const hDownhill = getTerrainHeight(px, localZ - delta);
                
                slopeX = (hRight - hLeft) / (2 * delta);
                slopeZ = (terrainHeight - hDownhill) / delta; 
            }

            let inputForce = 0;
            
            // Demo mode: auto-steer with smooth sine wave motion
            if (isDemoRef.current) {
              demoTimeRef.current += 0.02;
              inputForce = Math.sin(demoTimeRef.current * 0.8) * 0.6;
              // Add some variety
              inputForce += Math.sin(demoTimeRef.current * 1.7) * 0.3;
            } else {
              if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) inputForce -= 0.8;
              if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) inputForce += 0.8;
              if (isDraggingRef.current) {
                 // simple drag override
              }
            }

            const gravityForceX = -slopeX * 0.4;
            
            playerXRef.current += inputForce + gravityForceX;
            playerXRef.current = Math.max(-PLAY_WIDTH, Math.min(PLAY_WIDTH, playerXRef.current));

            player.position.x += (playerXRef.current - player.position.x) * 0.2;
            
            const targetY = terrainHeight - 1.5; 
            player.position.y += (targetY - player.position.y) * 0.3;
            if (player.position.y < targetY) player.position.y = targetY;

            player.rotation.z = -(inputForce * 0.5 + gravityForceX * 0.5); 

            const targetSpeed = WORLD_SPEED_BASE + (levelRef.current * 0.1) + (slopeZ * 0.2);
            speedRef.current += (targetSpeed - speedRef.current) * 0.05;
            if (speedRef.current < 0.2) speedRef.current = 0.2;


            // --- OBJECT LOGIC ---
            // Spawn Rate
            const spawnChance = 0.02 + (levelRef.current * 0.03);
            if (Math.random() < spawnChance * speedRef.current) {
                spawnObject(-80); 
            }

            for (let i = objectsRef.current.length - 1; i >= 0; i--) {
                const obj = objectsRef.current[i];
                obj.position.z += speedRef.current; 
                
                // Spin collectibles
                if (obj.userData.type === 'collectible') {
                    obj.rotation.y += 0.05;
                }

                // Collision
                const dx = Math.abs(obj.position.x - player.position.x);
                const dz = Math.abs(obj.position.z - player.position.z);
                
                // Hitbox slightly larger for bigger player
                if (!obj.userData.hit && dz < 2.0) {
                    if (dx < 2.0) {
                        obj.userData.hit = true;
                        
                        if (obj.userData.type === 'collectible') {
                            if (obj.userData.subtype === 'pizza') {
                                if (!isDemoRef.current) {
                                  audioService.playPenalty();
                                  setScore(s => Math.max(0, s - 50));
                                }
                                player.scale.y = 0.5; // Squash
                                setTimeout(() => { if(player) player.scale.y = 1; }, 200);
                            } else {
                                if (!isDemoRef.current) audioService.playCollect();
                                let val = 100;
                                if (obj.userData.subtype === 'spaghetti') {
                                    val = 1000;
                                    if (!isDemoRef.current) audioService.playPowerUp();
                                } else if (obj.userData.subtype === 'mango') {
                                    val = 500;
                                    if (!isDemoRef.current) audioService.playPowerUp();
                                    isInvincibleRef.current = true;
                                    setTimeout(() => isInvincibleRef.current = false, 5000);
                                }
                                if (!isDemoRef.current) setScore(s => s + val);
                            }
                            obj.visible = false;
                        } else if (obj.userData.type === 'obstacle') {
                            if (!isInvincibleRef.current) {
                                if (!isDemoRef.current) audioService.playCrash();
                                speedRef.current = 0.1; 
                            } else {
                                obj.scale.set(0.1, 0.1, 0.1);
                            }
                        }
                    }
                }
                
                if (obj.position.z > 20) {
                    sceneRef.current.remove(obj);
                    objectsRef.current.splice(i, 1);
                }
            }
            
            // Invincibility Flicker
            if (isInvincibleRef.current) {
                player.visible = Math.floor(Date.now() / 50) % 2 === 0;
            } else {
                player.visible = true;
            }
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
        reqRef.current = requestAnimationFrame(animate);
    };

    reqRef.current = requestAnimationFrame(animate);
    startGame(1);

    return () => {
        if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
        if (mountRef.current && rendererRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
        }
        if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  // Update Player Mesh on Prop Change
  useEffect(() => {
      if (!playerRef.current) return;
      while(playerRef.current.children.length > 0) playerRef.current.remove(playerRef.current.children[0]);
      const newMesh = generatedSpriteUrl ? createSpritePlayer(generatedSpriteUrl) : createMonkey();
      playerRef.current.add(newMesh);
  }, [generatedSpriteUrl]);

  // Timer (disabled in demo mode)
  useEffect(() => {
      if (gameState !== 'PLAYING' || isDemo) return;
      const timer = setInterval(() => {
          setTimeRemaining(prev => {
              if (prev <= 1) {
                  setGameState('LEVEL_COMPLETE');
                  gameActiveRef.current = false;
                  audioService.playJump();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(timer);
  }, [gameState, isDemo]);

  // Controls
  const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;
      keysPressed.current[e.key] = true;
  };
  const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;
      isDraggingRef.current = true;
      lastPointerXRef.current = e.clientX;
  };
  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDraggingRef.current || gameStateRef.current !== 'PLAYING') return;
      const delta = e.clientX - lastPointerXRef.current;
      playerXRef.current += delta * 0.05; // Sensitivity
      lastPointerXRef.current = e.clientX;
  };
  const handlePointerUp = () => isDraggingRef.current = false;

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${isDemo ? '' : 'rounded-xl border-4 border-gray-800 shadow-2xl'}`}>
      <div 
        ref={mountRef} 
        className={`w-full h-full ${isDemo ? 'pointer-events-none' : 'touch-none cursor-crosshair'}`}
        onPointerDown={isDemo ? undefined : handlePointerDown}
        onPointerMove={isDemo ? undefined : handlePointerMove}
        onPointerUp={isDemo ? undefined : handlePointerUp}
        onPointerLeave={isDemo ? undefined : handlePointerUp}
      />

      {/* HUD - hidden in demo mode */}
      {gameState === 'PLAYING' && !isDemo && (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
                <div className="bg-white/70 p-2 rounded-lg border-b-4 border-mm-purple backdrop-blur-sm shadow-lg">
                    <div className="text-xs text-mm-purple font-mono">SCORE</div>
                    <div className="text-2xl text-mm-deep font-black font-mono tracking-widest">{score.toString().padStart(6, '0')}</div>
                </div>
                <div className="bg-white/70 p-2 rounded-lg border-b-4 border-mm-pink text-center min-w-[80px] backdrop-blur-sm shadow-lg">
                    <div className="text-xs text-mm-pink font-mono">TIME</div>
                    <div className={`text-3xl font-black ${timeRemaining < 10 ? 'text-mm-pink animate-pulse' : 'text-mm-deep'}`}>{timeRemaining}</div>
                </div>
            </div>
        </div>
      )}

      {/* Level Complete Overlay - hidden in demo mode */}
      {gameState === 'LEVEL_COMPLETE' && !isDemo && (
         <div className="absolute inset-0 bg-gradient-to-br from-mm-purple/95 to-mm-pink/95 backdrop-blur flex flex-col items-center justify-center text-white p-8 text-center z-20 animate-fade-in">
            <h2 className="font-game text-5xl mb-2 text-mm-yellow drop-shadow-xl">COURSE CLEAR!</h2>
            <div className="w-full max-w-xs bg-white/20 rounded-xl p-4 mb-8 backdrop-blur-sm border border-white/30">
                <div className="flex justify-between text-sm font-mono mb-2">
                    <span className="text-white/80">SCORE</span>
                    <span className="text-white font-bold">{score}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                    <span className="text-white/80">LEVEL</span>
                    <span className="text-mm-mint font-bold">{level + 1}</span>
                </div>
            </div>
            <button 
                onClick={() => {
                    const nextLevel = level + 1;
                    setLevel(nextLevel);
                    startGame(nextLevel);
                }}
                className="px-8 py-4 bg-white text-mm-deep font-black rounded-full hover:bg-mm-light transition-transform hover:scale-105 shadow-xl text-lg uppercase tracking-wide"
            >
                Start Level {level + 1}
            </button>
         </div>
      )}
    </div>
  );
};