import { SceneObject } from "./SceneObject.js";

export class ZubatTooth extends SceneObject {
  constructor(
    GL,
    _position,
    _color,
    _normal,
    segments,
    rings,
    bluntness = 0.0
  ) {
    super(GL, _position, _color, _normal);

    const toothColor = [0.98, 0.9, 0.85];
    const height = 0.35;
    const baseRadius = 0.2;
    const tipRadius = baseRadius * bluntness;

    // --- VERTEX GENERATION ---
    for (let j = 0; j <= rings; j++) {
      const y = (j / rings) * height;
      const t = j / rings;
      const parabolicCurve = Math.pow(1 - t, 2);
      const currentRadius =
        tipRadius + (baseRadius - tipRadius) * parabolicCurve;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        let x = Math.cos(angle) * currentRadius;
        const z = Math.sin(angle) * currentRadius;
        x *= 0.7;

        this.vertices.push(x, y, z);
        this.vertices.push(...toothColor);
        const normal = [x, 0.05 * (baseRadius - currentRadius), z];
        this.vertices.push(...normal);
      }
    }

    // --- FACE GENERATION ---
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segments; i++) {
        const idx1 = j * (segments + 1) + i;
        const idx2 = (j + 1) * (segments + 1) + i;
        const idx3 = idx1 + 1;
        const idx4 = idx2 + 1;
        this.faces.push(idx1, idx2, idx3);
        this.faces.push(idx2, idx4, idx3);
      }
    }

    // --- CAP BASE ---
    const baseCenterIndex = this.vertices.length / 9;
    this.vertices.push(0, 0, 0, ...toothColor, 0, -1, 0);
    for (let i = 0; i < segments; i++) {
      this.faces.push(i + 1, i, baseCenterIndex);
    }

    // --- CAP TIP ---
    const topCenterIndex = this.vertices.length / 9;
    this.vertices.push(0, height, 0, ...toothColor, 0, 1, 0);
    const topRingStartIndex = rings * (segments + 1);
    for (let i = 0; i < segments; i++) {
      this.faces.push(
        topRingStartIndex + i,
        topRingStartIndex + i + 1,
        topCenterIndex
      );
    }

    this.setup();
  }
}