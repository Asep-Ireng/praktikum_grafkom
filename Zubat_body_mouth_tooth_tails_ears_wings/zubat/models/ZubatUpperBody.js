import { SceneObject } from "./SceneObject.js";

export class ZubatUpperBody extends SceneObject {
  constructor(
    GL,
    _position,
    _color,
    _normal,
    scaleFactor,
    latBands,
    longBands
  ) {
    super(GL, _position, _color, _normal);

    const bodyColor = [0.35, 0.55, 0.95];
    const mouthColor = [0.1, 0.1, 0.2];
    const radius = 1.0;

    // --- MOUTH PARAMETERS ---
    const mouthSurfaceCenter = { y: -0.1, x: 0.0 };
    const mouthDepth = 0.4;
    const mouthSharpness = 1.1;
    const controlPoints = [
      { angle: 45, radii: { x: 0.6, y: 0.5 }, pullTarget: [1.5, 1.5, -0.1] },
      { angle: 135, radii: { x: 0.6, y: 0.5 }, pullTarget: [-1.6, 1.5, -0.1] },
      { angle: 225, radii: { x: 0.6, y: 0.7 }, pullTarget: [-0.6, -1.7, 0.0] },
      { angle: 315, radii: { x: 0.6, y: 0.7 }, pullTarget: [0.6, -1.7, 0.0] },
      { angle: 0, radii: { x: 0.6, y: 0.8 }, pullTarget: [1.6, -0.8, -0.05] },
      { angle: 90, radii: { x: 0.5, y: 0.5 }, pullTarget: [1.5, 1.5, -0.15] },
      {
        angle: 180,
        radii: { x: 0.6, y: 0.8 },
        pullTarget: [-1.6, -0.8, -0.05],
      },
      { angle: 270, radii: { x: 0.5, y: 0.35 }, pullTarget: [0, -1, 0.05] },
    ];

    // --- Kalkulasi posisi ---
    const mouthProcessedPoints = controlPoints
      .map((p) => ({ ...p, angleRad: p.angle * (Math.PI / 180) }))
      .sort((a, b) => a.angleRad - b.angleRad);
    const TWO_PI = 2 * Math.PI;

    // --- VERTEX GENERATION ---
    for (let latNumber = 0; latNumber <= latBands; latNumber++) {
      const theta = (latNumber * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let longNumber = 0; longNumber <= longBands; longNumber++) {
        const phi = (longNumber * 2 * Math.PI) / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        let x = cosPhi * sinTheta;
        let y = cosTheta;
        let z = sinPhi * sinTheta;
        let final_x = x;
        let final_y = y;
        let final_z = z;
        let final_nx = x;
        let final_ny = y;
        let final_nz = z;
        let finalColor = bodyColor;

        // --- MOUTH LOGIC ---
        if (z > 0.3) {
          const distX = x - mouthSurfaceCenter.x;
          const distY = y - mouthSurfaceCenter.y;
          let vertexAngle = Math.atan2(distY, distX);
          if (vertexAngle < 0) vertexAngle += TWO_PI;
          let prevPoint = mouthProcessedPoints[mouthProcessedPoints.length - 1];
          let nextPoint = mouthProcessedPoints[0];
          for (let i = 0; i < mouthProcessedPoints.length; i++) {
            if (vertexAngle >= mouthProcessedPoints[i].angleRad) {
              prevPoint = mouthProcessedPoints[i];
              nextPoint =
                mouthProcessedPoints[(i + 1) % mouthProcessedPoints.length];
            }
          }
          let angleDiff = nextPoint.angleRad - prevPoint.angleRad;
          if (angleDiff < 0) angleDiff += TWO_PI;
          let t = (vertexAngle - prevPoint.angleRad) / angleDiff;
          if (t < 0 || t > 1) t = 0;
          const targetRadiusX =
            prevPoint.radii.x * (1 - t) + nextPoint.radii.x * t;
          const targetRadiusY =
            prevPoint.radii.y * (1 - t) + nextPoint.radii.y * t;
          const insideFactor =
            Math.pow(distX / targetRadiusX, 2) +
            Math.pow(distY / targetRadiusY, 2);

          if (insideFactor < 1.0) {
            const targetPullX =
              prevPoint.pullTarget[0] * (1 - t) + nextPoint.pullTarget[0] * t;
            const targetPullY =
              prevPoint.pullTarget[1] * (1 - t) + nextPoint.pullTarget[1] * t;
            const targetPullZ =
              prevPoint.pullTarget[2] * (1 - t) + nextPoint.pullTarget[2] * t;
            let indentFactor = 1.0 - Math.sqrt(insideFactor);
            indentFactor = Math.pow(indentFactor, mouthSharpness);
            const pullAmount = mouthDepth * indentFactor;
            final_x = x * (1.0 - pullAmount) + targetPullX * pullAmount;
            final_y = y * (1.0 - pullAmount) + targetPullY * pullAmount;
            final_z = z * (1.0 - pullAmount) + targetPullZ * pullAmount;
            final_nx = final_x - targetPullX;
            final_ny = final_y - targetPullY;
            final_nz = final_z - targetPullZ;
            finalColor = mouthColor;
          }
        }

        const len =
          Math.sqrt(final_nx ** 2 + final_ny ** 2 + final_nz ** 2) || 1;
        this.vertices.push(
          radius * final_x,
          radius * final_y,
          radius * final_z
        );
        this.vertices.push(...finalColor);
        this.vertices.push(final_nx / len, final_ny / len, final_nz / len);
      }
    }

    // --- FACE GENERATION ---
    for (let i = 0; i < latBands; i++) {
      for (let j = 0; j < longBands; j++) {
        const first = i * (longBands + 1) + j;
        const second = first + longBands + 1;
        this.faces.push(first, second, first + 1);
        this.faces.push(second, second + 1, first + 1);
      }
    }

    // --- SETUP AND TRANSFORMATION ---
    this.setup();
    const scaleMatrix = LIBS.get_I4();
    const newScale = [0.7 * scaleFactor, 0.6 * scaleFactor, 0.7 * scaleFactor];
    LIBS.scale(scaleMatrix, newScale[0], newScale[1], newScale[2]);
    const rotationMatrix = LIBS.get_I4();
    LIBS.rotateX(rotationMatrix, -0.15);
    const translationMatrix = LIBS.get_I4();
    LIBS.translateY(translationMatrix, 0.5 * scaleFactor);
    LIBS.translateZ(translationMatrix, 0.2 * scaleFactor);
    this.modelMatrix = LIBS.multiply(
      translationMatrix,
      LIBS.multiply(rotationMatrix, scaleMatrix)
    );
  }
}