export function createPuddles(count, groundRadius, seed = 12345, opts = {}) {
  const puddles = [];
  let currentSeed = seed;
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  const minRadius = opts.minRadius ?? 1.5;
  const maxRadius = opts.maxRadius ?? 4.0;
  const minDistFromCenter = opts.minDistFromCenter ?? 5;
  const maxDistFromCenter = opts.maxDistFromCenter ?? groundRadius * 0.75;
  const minDistBetweenPuddles = opts.minDistBetweenPuddles ?? 4.0;
  const maxAttempts = 100;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = seededRandom() * Math.PI * 2;
      const distance = minDistFromCenter + seededRandom() * (maxDistFromCenter - minDistFromCenter);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const radius = minRadius + seededRandom() * (maxRadius - minRadius);
      let tooClose = false;
      for (const existing of puddles) {
        const dx = x - existing.x;
        const dz = z - existing.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < (radius + existing.radius + minDistBetweenPuddles)) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        puddles.push({ x, z, radius });
        placed = true;
        break;
      }
    }
  }
  return puddles;
}

export class Ground {
  GL = null;
  SHADER_PROGRAM = null;
  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;
  OBJECT_VERTEX = null;
  OBJECT_FACES = null;
  vertex = [];
  faces = [];
  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    this.baseRadius = opts.radius ?? 65;
    this.cliffHeight = opts.cliffHeight ?? 2.5;
    this.segments = Math.max(64, opts.segments ?? 128);
    this.radialSegments = Math.max(16, opts.radialSegments ?? 48);
    this.topColor = opts.topColor ?? [0.82, 0.74, 0.55];
    this.puddleColor = opts.puddleColor ?? [0.45, 0.40, 0.35];
    this.cliffColor = opts.cliffColor ?? [0.35, 0.30, 0.25];
    this.bottomColor = opts.bottomColor ?? [0.20, 0.18, 0.15];
    this.noiseAmplitude = opts.noiseAmplitude ?? 0.8;
    this.noiseSeed = opts.noiseSeed ?? Math.random() * 1000;
    this.puddles = opts.puddles ?? [];

    this._buildIsland();
  }

  _noise2D(x, z) {
    const seed = this.noiseSeed;
    const n = Math.sin(x * 0.1 + z * 0.1 + seed) * 100.0 + Math.sin(x * 0.3 + z * 0.3) * 50;
    return (n - Math.floor(n)); 
  }

  _getHeightAt(x, z) {
    let height = 0;
    height += Math.sin(x * 0.15 + this.noiseSeed) * Math.cos(z * 0.15) * this.noiseAmplitude;
    height += Math.sin(x * 0.5 + z * 0.3) * (this.noiseAmplitude * 0.3);
    return Math.max(0, height);
  }

  _getRadiusAtAngle(angle) {
    const seed = this.noiseSeed;
    const variation = Math.sin(angle * 3 + seed) * 4.0 + Math.sin(angle * 7 - seed) * 2.0 + Math.cos(angle * 13) * 1.0;
    return this.baseRadius + variation;
  }

  _isInPuddle(x, z) {
    for (const puddle of this.puddles) {
      const dx = x - puddle.x;
      const dz = z - puddle.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < puddle.radius * puddle.radius) {
        const dist = Math.sqrt(distSq);
        return 1.0 - (dist / puddle.radius);
      }
    }
    return 0;
  }

  _getColorAt(x, z) {
    const puddleFactor = this._isInPuddle(x, z);
    if (puddleFactor > 0) {
      return [
        this.topColor[0] * (1 - puddleFactor) + this.puddleColor[0] * puddleFactor,
        this.topColor[1] * (1 - puddleFactor) + this.puddleColor[1] * puddleFactor,
        this.topColor[2] * (1 - puddleFactor) + this.puddleColor[2] * puddleFactor
      ];
    }
    return this.topColor;
  }

  _buildIsland() {
    const vertices = [];
    const faces = [];
    const topY = 0;
    
    vertices.push(0, topY + this._getHeightAt(0,0), 0, 0, 1, 0, ...this._getColorAt(0,0));

    for (let ring = 1; ring <= this.radialSegments; ring++) {
      const t = ring / this.radialSegments;
      for (let seg = 0; seg < this.segments; seg++) {
        const angle = (seg / this.segments) * Math.PI * 2;
        const currentMaxRadius = this._getRadiusAtAngle(angle);
        const r = currentMaxRadius * t;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const edgeFalloff = 1.0 - Math.pow(t, 4); 
        const height = this._getHeightAt(x, z) * edgeFalloff;
        const color = this._getColorAt(x, z);
        vertices.push(x, topY + height, z, 0, 1, 0, ...color);
      }
    }

    for (let seg = 0; seg < this.segments; seg++) {
      const nextSeg = (seg + 1) % this.segments;
      faces.push(0, 1 + seg, 1 + nextSeg);
    }
    for (let ring = 0; ring < this.radialSegments - 1; ring++) {
      const rStart = 1 + ring * this.segments;
      const nStart = 1 + (ring + 1) * this.segments;
      for (let seg = 0; seg < this.segments; seg++) {
        const next = (seg + 1) % this.segments;
        faces.push(rStart + seg, rStart + next, nStart + seg);
        faces.push(rStart + next, nStart + next, nStart + seg);
      }
    }

    const topEdgeStart = 1 + (this.radialSegments - 1) * this.segments;
    const cliffTopStart = vertices.length / 9;

    for (let seg = 0; seg < this.segments; seg++) {
      const angle = (seg / this.segments) * Math.PI * 2;
      const r = this._getRadiusAtAngle(angle);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      vertices.push(x, topY, z, Math.cos(angle), 0, Math.sin(angle), ...this.cliffColor);
    }

    const cliffBottomStart = vertices.length / 9;
    const bottomY = topY - this.cliffHeight;
    for (let seg = 0; seg < this.segments; seg++) {
      const angle = (seg / this.segments) * Math.PI * 2;
      const r = this._getRadiusAtAngle(angle);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      vertices.push(x, bottomY, z, Math.cos(angle), 0, Math.sin(angle), ...this.bottomColor);
    }

    for (let seg = 0; seg < this.segments; seg++) {
      const next = (seg + 1) % this.segments;
      faces.push(cliffTopStart + seg, cliffTopStart + next, cliffBottomStart + seg);
      faces.push(cliffTopStart + next, cliffBottomStart + next, cliffBottomStart + seg);
    }

    this.vertex = vertices;
    this.faces = faces;
  }

  setup() {
    this.OBJECT_VERTEX = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);
    this.OBJECT_FACES = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX) {
    const GL = this.GL;
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);
    
    // IMPORTANT: Send normal matrix for the new shader
    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    if(uNormalMatrix) GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
  }
}