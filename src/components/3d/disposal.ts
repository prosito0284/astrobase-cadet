import * as THREE from 'three';

/**
 * Disposes a Three.js material and all associated texture maps.
 */
export function disposeMaterial(mat: THREE.Material): void {
  if (!mat) return;

  const matAny = mat as unknown as Record<string, unknown>;
  const textureKeys = [
    'map',
    'lightMap',
    'bumpMap',
    'normalMap',
    'specularMap',
    'roughnessMap',
    'metalnessMap',
    'alphaMap',
    'emissiveMap',
    'envMap',
    'clearcoatMap',
    'clearcoatRoughnessMap',
    'transmissionMap',
    'sheenColorMap',
    'sheenRoughnessMap',
    'iridescenceMap',
    'iridescenceThicknessMap',
  ];

  for (const key of textureKeys) {
    const tex = matAny[key];
    if (tex && typeof (tex as { dispose?: () => void }).dispose === 'function') {
      (tex as { dispose: () => void }).dispose();
    }
  }

  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

/**
 * Recursively traverses a Three.js Object3D, disposing all geometries,
 * materials, textures, and light shadow render targets.
 */
export function disposeThreeObject(obj: THREE.Object3D): void {
  if (!obj) return;

  obj.traverse((child) => {
    // Meshes, Points, Lines
    const childAny = child as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
      shadow?: { map?: { dispose?: () => void } };
    };

    if (childAny.geometry && typeof childAny.geometry.dispose === 'function') {
      childAny.geometry.dispose();
    }

    if (childAny.material) {
      if (Array.isArray(childAny.material)) {
        childAny.material.forEach((m) => disposeMaterial(m));
      } else {
        disposeMaterial(childAny.material);
      }
    }

    if (childAny.shadow?.map && typeof childAny.shadow.map.dispose === 'function') {
      childAny.shadow.map.dispose();
    }
  });

  while (obj.children.length > 0) {
    const child = obj.children[0];
    obj.remove(child);
    disposeThreeObject(child);
  }
}

/**
 * Safely disposes a Three.js WebGLRenderer, releasing shaders, buffers, and textures.
 * Does not remove React JSX-managed canvas elements from the DOM.
 */
export function disposeRenderer(renderer: THREE.WebGLRenderer | null): void {
  if (!renderer) return;

  try {
    renderer.dispose();
  } catch {
    // Ignore error if already disposed
  }

  try {
    if (typeof renderer.forceContextLoss === 'function') {
      renderer.forceContextLoss();
    }
  } catch {
    // Ignore error if context was already lost
  }
}

/**
 * Safely cancels a requestAnimationFrame ID.
 */
export function safeCancelAnimationFrame(rafId: number | null | undefined): void {
  if (rafId !== null && rafId !== undefined) {
    cancelAnimationFrame(rafId);
  }
}
