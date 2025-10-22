import { SceneObject } from "./SceneObject.js";

export class ZubatLowerBody extends SceneObject {
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
    const radius = 1.0;

    // --- LEG DEFORMATION PARAMETERS ---
    const legTargetL = [-0.4, -10.5, -4.3];
    const legTargetR = [0.4, -10.5, -4.3];

    const legBaseCenterL = { x: -0.25, y: -0.4, z: -0.8 };
    const legBaseCenterR = { x: 0.25, y: -0.4, z: -0.8 };

    const legPullRadius = 0.2;
    const legPullSharpness = 3.0;

    // --- VERTEX GENERATION ---
    for (let latNumber = 0; latNumber <= latBands; latNumber++) {
      const theta = (latNumber * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let longNumber = 0; longNumber <= longBands; longNumber++) {
        const phi = (longNumber * 2 * Math.PI) / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        let final_x = x,
          final_y = y,
          final_z = z;

        // Final normal menggunakan normal asli dari bola
        let final_nx = x,
          final_ny = y,
          final_nz = z;

        if (y < 0 && z < 0) {
          let distFromBase, target, baseCenter;

          if (x < 0) {
            target = legTargetL;
            baseCenter = legBaseCenterL;
          } else {
            target = legTargetR;
            baseCenter = legBaseCenterR;
          }

          distFromBase = Math.sqrt(
            Math.pow(x - baseCenter.x, 2) +
              Math.pow(y - baseCenter.y, 2) +
              Math.pow(z - baseCenter.z, 2)
          );

          if (distFromBase < legPullRadius) {
            let pullFactor = 1.0 - distFromBase / legPullRadius;
            let pullAmount = Math.pow(pullFactor, legPullSharpness);

            final_x = x * (1.0 - pullAmount) + target[0] * pullAmount;
            final_y = y * (1.0 - pullAmount) + target[1] * pullAmount;
            final_z = z * (1.0 - pullAmount) + target[2] * pullAmount;
          }
        }

        const len = Math.sqrt(final_nx ** 2 + final_ny ** 2 + final_nz ** 2);
        this.vertices.push(
          radius * final_x,
          radius * final_y,
          radius * final_z
        );
        this.vertices.push(...bodyColor);
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
    const newScale = [0.8 * scaleFactor, 0.8 * scaleFactor, 0.85 * scaleFactor];
    LIBS.scale(scaleMatrix, newScale[0], newScale[1], newScale[2]);
    this.modelMatrix = scaleMatrix;
  }
}
