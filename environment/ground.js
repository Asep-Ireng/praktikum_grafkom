/**
 * Helper function to generate consistent puddles using seeded random
 * @param {number} count - Number of puddles to generate
 * @param {number} groundRadius - Radius of the ground platform
 * @param {number} seed - Seed for random generation (same seed = same puddles)
 * @param {object} opts - Optional configuration
 * @returns {Array} Array of puddle objects {x, z, radius}
 */
export function createPuddles(count, groundRadius, seed = 12345, opts = {}) {
  const puddles = [];
  let currentSeed = seed;

  // Seeded random generator (same as Rock.js)
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  const minRadius = opts.minRadius ?? 0.8;
  const maxRadius = opts.maxRadius ?? 2.5;
  const minDistFromCenter = opts.minDistFromCenter ?? 3;  // Avoid center
  const maxDistFromCenter = opts.maxDistFromCenter ?? groundRadius * 0.8;  // Stay within ground
  const minDistBetweenPuddles = opts.minDistBetweenPuddles ?? 2.0;  // Space between puddles

  const maxAttempts = 100;

  for (let i = 0; i < count; i++) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Random position in polar coordinates
      const angle = seededRandom() * Math.PI * 2;
      const distance = minDistFromCenter + seededRandom() * (maxDistFromCenter - minDistFromCenter);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // Random radius
      const radius = minRadius + seededRandom() * (maxRadius - minRadius);

      // Check if too close to existing puddles
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

    // If couldn't place after max attempts, skip this puddle
    if (!placed) {
      console.warn(`Could not place puddle ${i + 1}/${count} after ${maxAttempts} attempts`);
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

    // Platform dimensions
    this.radius = opts.radius ?? 12;
    this.cliffHeight = opts.cliffHeight ?? 1.5;
    this.segments = Math.max(16, opts.segments ?? 64);
    this.radialSegments = Math.max(4, opts.radialSegments ?? 32);
    
    // Colors
    this.topColor = opts.topColor ?? [0.79, 0.66, 0.45];        // Sandy/mud
    this.puddleColor = opts.puddleColor ?? [0.55, 0.45, 0.33];  // Wet dark
    this.cliffColor = opts.cliffColor ?? [0.42, 0.36, 0.31];    // Dark brown
    this.bottomColor = opts.bottomColor ?? [0.29, 0.26, 0.22];  // Very dark
    
    // Surface variation
    this.noiseAmplitude = opts.noiseAmplitude ?? 0.15;
    this.noiseSeed = opts.noiseSeed ?? Math.random() * 1000;
    
    // Puddles (wet patches)
    this.puddles = opts.puddles ?? [
      { x: -5, z: 3, radius: 1.8 },
      { x: 6, z: -4, radius: 2.0 },
      { x: 0, z: 7, radius: 1.5 }
    ];

    this._buildIsland();
  }

  // Simple noise function (pseudo-perlin)
  _noise2D(x, z) {
    const seed = this.noiseSeed;
    const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1; // Returns -1 to 1
  }

  // Get height at position with multiple octaves
  _getHeightAt(x, z) {
    let height = 0;
    let amplitude = this.noiseAmplitude;
    let frequency = 1.0;
    
    // Multiple octaves for better noise
    for (let i = 0; i < 3; i++) {
      height += this._noise2D(x * frequency, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return height;
  }

  // Check if point is inside a puddle
  _isInPuddle(x, z) {
    for (const puddle of this.puddles) {
      const dx = x - puddle.x;
      const dz = z - puddle.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < puddle.radius * puddle.radius) {
        // Smooth falloff
        const dist = Math.sqrt(distSq);
        const factor = 1.0 - (dist / puddle.radius);
        return factor; // 0 = outside, 1 = center
      }
    }
    return 0;
  }

  // Get color at position (blend with puddle)
  _getColorAt(x, z) {
    const puddleFactor = this._isInPuddle(x, z);
    
    if (puddleFactor > 0) {
      // Blend between top color and puddle color
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

    // ==========================================
    // TOP SURFACE (with noise and puddles)
    // ==========================================
    const centerIdx = 0;
    const topY = 0;
    
    // Center vertex
    const centerHeight = this._getHeightAt(0, 0);
    const centerColor = this._getColorAt(0, 0);
    vertices.push(
      0, topY + centerHeight, 0,           // position
      0, 1, 0,                              // normal (up)
      centerColor[0], centerColor[1], centerColor[2]  // color
    );

    // Radial rings
    for (let ring = 1; ring <= this.radialSegments; ring++) {
      const t = ring / this.radialSegments;
      const r = this.radius * t;
      
      for (let seg = 0; seg < this.segments; seg++) {
        const angle = (seg / this.segments) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        
        // Height variation (less at edges for smooth transition)
        const edgeFalloff = 1.0 - t * 0.5; // Reduce noise near edges
        const height = this._getHeightAt(x, z) * edgeFalloff;
        const color = this._getColorAt(x, z);
        
        vertices.push(
          x, topY + height, z,
          0, 1, 0,
          color[0], color[1], color[2]
        );
      }
    }

    // Top surface faces
    // Center to first ring
    for (let seg = 0; seg < this.segments; seg++) {
      const nextSeg = (seg + 1) % this.segments;
      const a = 0; // center
      const b = 1 + seg;
      const c = 1 + nextSeg;
      faces.push(a, b, c);
    }

    // Ring to ring
    for (let ring = 0; ring < this.radialSegments - 1; ring++) {
      const ringStart = 1 + ring * this.segments;
      const nextRingStart = 1 + (ring + 1) * this.segments;
      
      for (let seg = 0; seg < this.segments; seg++) {
        const nextSeg = (seg + 1) % this.segments;
        
        const a = ringStart + seg;
        const b = ringStart + nextSeg;
        const c = nextRingStart + seg;
        const d = nextRingStart + nextSeg;
        
        faces.push(a, b, c);
        faces.push(b, d, c);
      }
    }

    // ==========================================
    // CLIFF SIDES (vertical walls)
    // ==========================================
    const topRingStart = 1 + (this.radialSegments - 1) * this.segments;
    const cliffTopStart = vertices.length / 9;
    
    // Top edge of cliff
    for (let seg = 0; seg < this.segments; seg++) {
      const angle = (seg / this.segments) * Math.PI * 2;
      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;
      
      // Normal pointing outward
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      
      vertices.push(
        x, topY, z,
        nx, 0, nz,
        this.cliffColor[0], this.cliffColor[1], this.cliffColor[2]
      );
    }

    // Bottom edge of cliff
    const cliffBottomStart = vertices.length / 9;
    const bottomY = topY - this.cliffHeight;
    
    for (let seg = 0; seg < this.segments; seg++) {
      const angle = (seg / this.segments) * Math.PI * 2;
      const x = Math.cos(angle) * this.radius;
      const z = Math.sin(angle) * this.radius;
      
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);
      
      vertices.push(
        x, bottomY, z,
        nx, 0, nz,
        this.bottomColor[0], this.bottomColor[1], this.bottomColor[2]
      );
    }

    // Cliff faces
    for (let seg = 0; seg < this.segments; seg++) {
      const nextSeg = (seg + 1) % this.segments;
      
      const a = cliffTopStart + seg;
      const b = cliffTopStart + nextSeg;
      const c = cliffBottomStart + seg;
      const d = cliffBottomStart + nextSeg;
      
      faces.push(a, b, c);
      faces.push(b, d, c);
    }

    // ==========================================
    // BOTTOM SURFACE (close the geometry)
    // ==========================================
    const bottomCenterIdx = vertices.length / 9;
    
    // Bottom center
    vertices.push(
      0, bottomY, 0,
      0, -1, 0,
      this.bottomColor[0], this.bottomColor[1], this.bottomColor[2]
    );

    // Bottom faces (fan from center)
    for (let seg = 0; seg < this.segments; seg++) {
      const nextSeg = (seg + 1) % this.segments;
      const a = bottomCenterIdx;
      const b = cliffBottomStart + seg;
      const c = cliffBottomStart + nextSeg;
      faces.push(a, c, b); // Reversed winding for bottom
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

    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
  }

  // Helper: Get character spawn positions (avoid puddles)
  getCharacterSlots(count = 4) {
    const slots = [];
    const angleStep = (Math.PI * 2) / count;
    const spawnRadius = this.radius * 0.5; // Inner half of platform
    
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * spawnRadius;
      const z = Math.sin(angle) * spawnRadius;
      const y = this._getHeightAt(x, z);
      
      slots.push([x, y, z]);
    }
    
    return slots;
  }
}