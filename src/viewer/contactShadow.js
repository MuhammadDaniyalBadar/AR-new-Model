import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';

let texture = null;

function shadowTexture() {
  if (texture) return texture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(20,28,18,0.55)');
  g.addColorStop(0.45, 'rgba(20,28,18,0.25)');
  g.addColorStop(1, 'rgba(20,28,18,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A soft blob shadow under the dish. Far cheaper than real shadow maps on
 * phones and reads well in both the viewer and AR.
 */
export function createContactShadow(width, depth, opacity = 0.8) {
  const mesh = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(width, depth, 1);
  mesh.position.y = 0.0005;
  mesh.renderOrder = -1;
  mesh.name = '__contact_shadow';
  return mesh;
}
