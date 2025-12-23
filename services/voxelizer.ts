import * as THREE from 'three';

interface VoxelData {
  positions: number[];
  colors: number[];
}

/**
 * Converts a 2D image into a 3D voxel mesh
 * Takes a front-facing character image and creates depth by color/edge analysis
 */
export class Voxelizer {
  private resolution: number;
  
  constructor(resolution: number = 48) {
    this.resolution = resolution; // Higher resolution for better fidelity
  }

  /**
   * Load an image and convert it to voxel geometry
   */
  async imageToVoxels(imageUrl: string): Promise<THREE.Group> {
    const imageData = await this.loadImageData(imageUrl);
    const voxelData = this.processImage(imageData);
    return this.createVoxelMesh(voxelData);
  }

  private loadImageData(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = this.resolution;
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw image scaled to voxel resolution
        ctx.drawImage(img, 0, 0, size, size);
        resolve(ctx.getImageData(0, 0, size, size));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * Detect edges in the image for better depth estimation
   */
  private detectEdges(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const edges = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Sobel edge detection
        const getGray = (ox: number, oy: number) => {
          const i = ((y + oy) * width + (x + ox)) * 4;
          return (data[i] + data[i + 1] + data[i + 2]) / 3;
        };
        
        const gx = (
          -getGray(-1, -1) + getGray(1, -1) +
          -2 * getGray(-1, 0) + 2 * getGray(1, 0) +
          -getGray(-1, 1) + getGray(1, 1)
        );
        
        const gy = (
          -getGray(-1, -1) - 2 * getGray(0, -1) - getGray(1, -1) +
          getGray(-1, 1) + 2 * getGray(0, 1) + getGray(1, 1)
        );
        
        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy) / 255;
      }
    }
    
    return edges;
  }

  private processImage(imageData: ImageData): VoxelData {
    const { width, height, data } = imageData;
    const positions: number[] = [];
    const colors: number[] = [];
    
    // Detect edges for better depth estimation
    const edges = this.detectEdges(imageData);
    
    // First pass: find the character bounds
    let minX = width, maxX = 0, minY = height, maxY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = data[i + 3] / 255;
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        
        const isBackground = a < 0.3 || 
          (r > 0.85 && g > 0.85 && b > 0.85) ||
          (Math.abs(r - g) < 0.1 && Math.abs(g - b) < 0.1 && r > 0.7);
        
        if (!isBackground) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    console.log('Character bounds:', { minX, maxX, minY, maxY, charWidth: maxX - minX, charHeight: maxY - minY });
    
    const charWidth = maxX - minX;
    const charHeight = maxY - minY;
    const centerCharX = (minX + maxX) / 2;
    const centerCharY = (minY + maxY) / 2;
    
    // Process each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const a = data[i + 3] / 255;
        
        // Skip transparent or very light pixels (background)
        // More aggressive background detection for AI-generated images
        const isTransparent = a < 0.3;
        const isWhitish = r > 0.85 && g > 0.85 && b > 0.85;
        const isGrayish = Math.abs(r - g) < 0.1 && Math.abs(g - b) < 0.1 && r > 0.7;
        
        if (isTransparent || isWhitish || isGrayish) {
          continue;
        }
        
        // Calculate relative position within character bounds
        const relX = charWidth > 0 ? (x - centerCharX) / (charWidth / 2) : 0;
        const relY = charHeight > 0 ? (y - centerCharY) / (charHeight / 2) : 0;
        
        // Get edge strength at this pixel
        const edgeStrength = edges[y * width + x];
        
        // Calculate depth based on multiple factors
        const brightness = (r + g + b) / 3;
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        
        // Elliptical depth model - more depth in center, less at edges
        const distFromCenter = Math.sqrt(relX * relX * 0.7 + relY * relY * 0.3);
        
        // Base depth calculation
        // - Center pixels get more depth
        // - Brighter areas get slightly more depth (highlights)
        // - High saturation areas get more depth (colorful parts)
        // - Edge areas get less depth (silhouette edges)
        const baseDepth = 10;
        const centerBonus = (1 - Math.min(1, distFromCenter)) * 8;
        const brightnessBonus = brightness * 2;
        const saturationBonus = saturation * 3;
        const edgePenalty = edgeStrength * 4;
        
        const depth = Math.max(2, Math.round(
          baseDepth + centerBonus + brightnessBonus + saturationBonus - edgePenalty
        ));
        
        // Create voxels at this x,y with calculated depth
        const voxelX = x - width / 2;
        const voxelY = (height - y) - height / 2; // Flip Y
        
        // Create depth layers with elliptical cross-section
        for (let z = -Math.floor(depth / 2); z < Math.ceil(depth / 2); z++) {
          // Elliptical taper - creates rounder shape
          const zNorm = Math.abs(z) / (depth / 2);
          const ellipseFactor = Math.sqrt(1 - zNorm * zNorm);
          
          // Only add voxel if within elliptical bounds
          if (ellipseFactor > 0.3 || Math.abs(z) <= 1) {
            // Slight color variation for depth
            const depthShade = 1 - Math.abs(z) / depth * 0.15;
            positions.push(voxelX, voxelY, z);
            colors.push(
              Math.min(1, r * depthShade),
              Math.min(1, g * depthShade),
              Math.min(1, b * depthShade)
            );
          }
        }
      }
    }
    
    console.log('Voxels generated:', positions.length / 3);
    return { positions, colors };
  }

  private createVoxelMesh(voxelData: VoxelData): THREE.Group {
    const { positions, colors } = voxelData;
    const group = new THREE.Group();
    
    if (positions.length === 0) {
      console.warn('No voxels generated from image');
      return group;
    }

    const totalVoxels = positions.length / 3;
    const voxelSize = 0.1;
    
    // Use InstancedMesh for better performance
    const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
    const material = new THREE.MeshLambertMaterial({ vertexColors: false });
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, totalVoxels);
    instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    
    // Set up instance colors
    const instanceColors = new Float32Array(totalVoxels * 3);
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < totalVoxels; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      
      // Set position
      dummy.position.set(x * voxelSize, y * voxelSize, z * voxelSize);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      
      // Set color
      instanceColors[i * 3] = colors[i * 3];
      instanceColors[i * 3 + 1] = colors[i * 3 + 1];
      instanceColors[i * 3 + 2] = colors[i * 3 + 2];
    }
    
    // Apply instance colors
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    group.add(instancedMesh);
    
    console.log('InstancedMesh created with', totalVoxels, 'instances');
    
    // Add a simple shadow beneath
    const shadowSize = this.resolution * voxelSize * 0.4;
    const shadowGeometry = new THREE.CircleGeometry(shadowSize, 16);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -this.resolution * voxelSize / 2;
    group.add(shadow);
    
    // No additional scaling - voxelSize already determines size
    // The model will be roughly (resolution * voxelSize) units tall
    // With resolution=48 and voxelSize=0.1, that's ~4.8 units
    
    console.log('Voxel model size approx:', this.resolution * voxelSize, 'units');
    
    return group;
  }
}

// Singleton instance - higher resolution for better fidelity
export const voxelizer = new Voxelizer(48);

