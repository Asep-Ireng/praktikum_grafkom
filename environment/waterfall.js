export class Waterfall {
  GL = null;
  SHADER_PROGRAM = null;

  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;

  // Rock walls
  rockVertex = [];
  rockFaces = [];
  ROCK_VERTEX_BUFFER = null;
  ROCK_FACES_BUFFER = null;

  // Water streams
  waterVertex = [];
  waterFaces = [];
  WATER_VERTEX_BUFFER = null;
  WATER_FACES_BUFFER = null;

  // Splash particles
  splashVertex = [];
  splashFaces = [];
  SPLASH_VERTEX_BUFFER = null;
  SPLASH_FACES_BUFFER = null;

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();

  // Animation
  waterOffset = 0;
  splashTime = 0;

  // Seeded random
  _seed = 54321;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    // Configuration
    this.position = opts.position ?? [0, 0, -25]; // Behind ground
    this.width = opts.width ?? 22;
    this.height = opts.height ?? 14;
    this.waterLevel = opts.waterLevel ?? -2.0; // Same as ocean

    // Water streams
    this.numStreams = opts.numStreams ?? 4;
    this.streamWidth = opts.streamWidth ?? 1.8;
    this.streamSpeed = opts.streamSpeed ?? 2.5;

    // Colors
    this.rockColor = opts.rockColor ?? [0.35, 0.30, 0.25]; // Brown-gray
    this.waterColor = opts.waterColor ?? [0.48, 0.78, 0.91]; // Light blue
    this.splashColor = opts.splashColor ?? [0.85, 0.95, 1.0]; // White-blue

    this._seed = opts.seed ?? 54321;

    // Build geometry
    this._generateRockFormations();
    this._generateWaterStreams();
    this._generateSplashEffects();
  }

  // Seeded random
  _seededRandom() {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }

  _random(min, max) {
    return min + this._seededRandom() * (max - min);
  }

  // =============================================
  // ROCK FORMATIONS (Left & Right Walls)
  // =============================================
  _generateRockFormations() {
  const vertices = [];
  const faces = [];

  // Left & Right walls (nempel ke air)
  this._buildRockWall(vertices, faces, -this.width / 2, 'left');
  this._buildRockWall(vertices, faces,  this.width / 2, 'right');

  // Back wall (3 batu besar di belakang air)
  this._buildBackRockWall(vertices, faces);

  this.rockVertex = vertices;
  this.rockFaces  = faces;
}

_buildRockWall(vertices, faces, xOffset, side) {
  const baseY = this.waterLevel;
  const topY  = baseY + this.height;

  // kalau kamu sudah punya _curtainHalfW dari versi curtain, gunakan agar nempel rapi:
  const innerEdge = (side === 'left') ? - (this._curtainHalfW ?? this.width*0.3) - 0.02
                                      :   (this._curtainHalfW ?? this.width*0.3) + 0.02;

  const numRocks = Math.floor(this._random(8, 12));
  let currentY = baseY;

  for (let i = 0; i < numRocks; i++) {
    const rockH = this._random(1.2, 2.5);
    const rockW = this._random(2.5, 4.0);
    const rockD = this._random(2.0, 3.5);

    const stickOut = (side === 'left') ? -this._random(0.2, 0.8) : this._random(0.2, 0.8);
    const rockX = innerEdge + stickOut;
    const rockY = currentY + rockH * 0.5;
    const rockZ = this.position[2] + this._random(-1.0, 1.0);

    const rotY = this._random(-0.35, 0.35);
    const colorVar = this._random(-0.05, 0.05);
    const rockColor = [
      Math.max(0, Math.min(1, this.rockColor[0] + colorVar)),
      Math.max(0, Math.min(1, this.rockColor[1] + colorVar)),
      Math.max(0, Math.min(1, this.rockColor[2] + colorVar)),
    ];

    this._addEllipsoidRock(vertices, faces, rockX, rockY, rockZ, rockW, rockH, rockD, rotY, colorVar, rockColor);
    currentY += rockH * 0.7;
    if (currentY > topY) break;
  }
}

_buildBackRockWall(vertices, faces) {
  const baseY = this.waterLevel;
  const zBack = this.position[2] - 2.5;       // sedikit di belakang air
  const numRocks = 3;
  const spanW = this.width * 0.75;
  const segW  = spanW / numRocks;

  for (let i = 0; i < numRocks; i++) {
    const rockX = -spanW/2 + i*segW + segW/2 + this._random(-0.5, 0.5);
    const rockY = baseY + this._random(2.5, 5.0);
    const rockZ = zBack + this._random(-0.6, 0.6);

    const rockW = segW * this._random(1.0, 1.3);
    const rockH = this.height * this._random(0.6, 0.9);
    const rockD = this._random(3.0, 4.5);

    const rotY = this._random(-0.4, 0.4);
    const colorVar = this._random(-0.05, 0.05);
    const rockColor = [
      Math.max(0, Math.min(1, this.rockColor[0] + colorVar)),
      Math.max(0, Math.min(1, this.rockColor[1] + colorVar)),
      Math.max(0, Math.min(1, this.rockColor[2] + colorVar)),
    ];

    this._addEllipsoidRock(vertices, faces, rockX, rockY, rockZ, rockW, rockH, rockD, rotY, colorVar, rockColor);
  }
}

  _addEllipsoidRock(vertices, faces, x, y, z, rx, ry, rz, rotY, noiseFactor, color) {
    const vertexOffset = vertices.length / 9;
    const segments = 12;
    const rings = 10;

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    // Generate ellipsoid
    for (let ring = 0; ring <= rings; ring++) {
      const v = ring / rings;
      const phi = v * Math.PI;

      for (let seg = 0; seg <= segments; seg++) {
        const u = seg / segments;
        const theta = u * Math.PI * 2;

        // Spherical to cartesian (ellipsoid)
        let lx = rx * Math.sin(phi) * Math.cos(theta);
        let ly = ry * Math.cos(phi);
        let lz = rz * Math.sin(phi) * Math.sin(theta);

        // Add deformation for organic look
        const noise = Math.sin(theta * 3 + phi * 2) * Math.cos(phi * 3) * 0.15;
        lx *= (1.0 + noise * noiseFactor);
        ly *= (1.0 + noise * noiseFactor * 0.5);
        lz *= (1.0 + noise * noiseFactor);

        // Rotate around Y
        const finalX = x + (lx * cosY - lz * sinY);
        const finalY = y + ly;
        const finalZ = z + (lx * sinY + lz * cosY);

        // Calculate normal
        let nx = lx / (rx * rx);
        let ny = ly / (ry * ry);
        let nz = lz / (rz * rz);
        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;

        // Rotate normal
        const finalNX = nx * cosY - nz * sinY;
        const finalNZ = nx * sinY + nz * cosY;

        vertices.push(
          finalX, finalY, finalZ,
          finalNX, ny, finalNZ,
          color[0], color[1], color[2]
        );
      }
    }

    // Generate faces
    for (let ring = 0; ring < rings; ring++) {
      for (let seg = 0; seg < segments; seg++) {
        const a = vertexOffset + ring * (segments + 1) + seg;
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;

        faces.push(a, c, b);
        faces.push(b, c, d);
      }
    }
  }

  // =============================================
  // WATER STREAMS (Animated Vertical Columns)
  // =============================================
  _generateWaterStreams() {
    const vertices = [];
    const faces = [];

    const baseY = this.waterLevel;
    const topY = baseY + this.height;
    const streamHeight = this.height;

    // Calculate stream positions (evenly spaced)
    const totalGap = this.width * 0.6; // Use 60% of width
    const spacing = totalGap / (this.numStreams + 1);

    for (let i = 0; i < this.numStreams; i++) {
      const streamX = -totalGap / 2 + spacing * (i + 1);
      const streamZ = this.position[2];

      this._addWaterStream(
        vertices,
        faces,
        streamX,
        streamZ,
        baseY,
        streamHeight,
        this.streamWidth + this._random(-0.3, 0.3) // Slight variation
      );
    }

    this.waterVertex = vertices;
    this.waterFaces = faces;
  }

  _addWaterStream(vertices, faces, x, z, baseY, height, width) {
    const vertexOffset = vertices.length / 9;
    const segments = 16; // Vertical segments for UV animation
    const sides = 12; // Circular cross-section

    // Generate cylindrical water stream
    for (let i = 0; i <= segments; i++) {
      const v = i / segments;
      const y = baseY + height * v;

      // UV coordinate for scrolling animation
      const uvY = v * 3; // Repeat texture 3 times vertically

      // Slight taper (wider at top, narrower at bottom)
      const radiusFactor = 1.0 - v * 0.15;
      const radius = (width / 2) * radiusFactor;

      for (let j = 0; j <= sides; j++) {
        const u = j / sides;
        const angle = u * Math.PI * 2;

        const lx = Math.cos(angle) * radius;
        const lz = Math.sin(angle) * radius;

        // Slight wave motion (will be enhanced in shader/animation)
        const wave = Math.sin(angle * 2) * 0.05 * v;

        const finalX = x + lx + wave;
        const finalY = y;
        const finalZ = z + lz;

        // Normal pointing outward
        const nx = Math.cos(angle);
        const nz = Math.sin(angle);

        // Color with slight transparency hint
        const alpha = 0.7; // Will handle in rendering
        const color = this.waterColor;

        vertices.push(
          finalX, finalY, finalZ,
          nx, 0, nz,
          color[0], color[1], color[2]
        );
      }
    }

    // Generate faces
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < sides; j++) {
        const a = vertexOffset + i * (sides + 1) + j;
        const b = a + 1;
        const c = a + (sides + 1);
        const d = c + 1;

        faces.push(a, b, c);
        faces.push(b, d, c);
      }
    }
  }

  // =============================================
  // SPLASH EFFECTS (Particles at Base)
  // =============================================
  _generateSplashEffects() {
    const vertices = [];
    const faces = [];

    const baseY = this.waterLevel + 0.05; // Slightly above water surface
    const numSplashZones = this.numStreams;

    const totalGap = this.width * 0.6;
    const spacing = totalGap / (numSplashZones + 1);

    for (let i = 0; i < numSplashZones; i++) {
      const splashX = -totalGap / 2 + spacing * (i + 1);
      const splashZ = this.position[2];

      // Create ripple circles
      this._addSplashRipple(vertices, faces, splashX, baseY, splashZ, 1.5);
    }

    this.splashVertex = vertices;
    this.splashFaces = faces;
  }

  _addSplashRipple(vertices, faces, x, y, z, radius) {
    const vertexOffset = vertices.length / 9;
    const segments = 24;

    // Center vertex
    vertices.push(
      x, y, z,
      0, 1, 0,
      this.splashColor[0], this.splashColor[1], this.splashColor[2]
    );

    // Ring vertices
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;

      vertices.push(
        x + rx, y, z + rz,
        0, 1, 0,
        this.splashColor[0], this.splashColor[1], this.splashColor[2]
      );
    }

    // Faces (fan from center)
    for (let i = 0; i < segments; i++) {
      const a = vertexOffset; // center
      const b = vertexOffset + 1 + i;
      const c = vertexOffset + 1 + ((i + 1) % segments);

      faces.push(a, b, c);
    }
  }

  // =============================================
  // ANIMATION UPDATE
  // =============================================
  updateAnimation(time) {
    this.waterOffset = (time * 0.001 * this.streamSpeed) % 1.0;
    this.splashTime = time * 0.001;

    // Update water vertex Y positions for flow animation
    // We'll simulate by offsetting UVs (done in render via MODEL_MATRIX manipulation)
    // Or update actual vertex positions here if needed
  }

  // =============================================
  // SETUP (Upload to GPU)
  // =============================================
  setup() {
    const GL = this.GL;

    // Rock walls
    this.ROCK_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.ROCK_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.rockVertex), GL.STATIC_DRAW);

    this.ROCK_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.ROCK_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.rockFaces), GL.STATIC_DRAW);

    // Water streams
    this.WATER_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.WATER_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.waterVertex), GL.STATIC_DRAW);

    this.WATER_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.WATER_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.waterFaces), GL.STATIC_DRAW);

    // Splash effects
    this.SPLASH_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.SPLASH_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.splashVertex), GL.STATIC_DRAW);

    this.SPLASH_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.SPLASH_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.splashFaces), GL.STATIC_DRAW);
  }

  // =============================================
  // RENDER
  // =============================================
  render(PARENT_MATRIX) {
    const GL = this.GL;
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    GL.useProgram(this.SHADER_PROGRAM);

    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

    // 1. Render Rock Walls (Opaque)
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.ROCK_VERTEX_BUFFER);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.ROCK_FACES_BUFFER);
    GL.drawElements(GL.TRIANGLES, this.rockFaces.length, GL.UNSIGNED_SHORT, 0);

    // 2. Render Water Streams (Semi-transparent)
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
    GL.depthMask(false); // Don't write to depth buffer for transparency

    // Animate water by translating model matrix slightly
    const animatedM = LIBSMudkip.get_I4();
    LIBSMudkip.mul(animatedM, M, LIBSMudkip.get_I4());
    // Simulate flow by scrolling - we can add Y translation oscillation
    // or handle UV scrolling in shader (current shader doesn't support UVs for this)
    // For now, subtle Y oscillation for "flowing" effect
    const flowOffset = Math.sin(this.waterOffset * Math.PI * 2) * 0.15;
    LIBSMudkip.translateY(animatedM, flowOffset);

    GL.uniformMatrix4fv(this._MMatrix, false, animatedM);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.WATER_VERTEX_BUFFER);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.WATER_FACES_BUFFER);
    GL.drawElements(GL.TRIANGLES, this.waterFaces.length, GL.UNSIGNED_SHORT, 0);

    // 3. Render Splash Effects (Very transparent, additive blend)
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE); // Additive blending for glow

    // Animate splash (pulsing)
    const splashScale = 1.0 + Math.sin(this.splashTime * 4) * 0.15;
    const splashM = LIBSMudkip.get_I4();
    LIBSMudkip.mul(splashM, M, LIBSMudkip.get_I4());
    LIBSMudkip.scale(splashM, splashScale, 1.0, splashScale);

    GL.uniformMatrix4fv(this._MMatrix, false, splashM);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.SPLASH_VERTEX_BUFFER);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.SPLASH_FACES_BUFFER);
    GL.drawElements(GL.TRIANGLES, this.splashFaces.length, GL.UNSIGNED_SHORT, 0);

    // Restore defaults
    GL.depthMask(true);
    GL.disable(GL.BLEND);
  }
}