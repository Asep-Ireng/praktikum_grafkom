export class Water {
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

  waveTime = 0;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    // Water dimensions (bigger than ground)
    this.size = opts.size ?? 100;              // Large plane size
    this.waterLevel = opts.waterLevel ?? -2.0; // Below ground level
    this.segments = Math.max(32, opts.segments ?? 64); // More segments = smoother waves
    
    // Colors - warna ocean
    this.shallowColor = opts.shallowColor ?? [0.40, 0.80, 1.00]; // Lighter blue near shore
    this.deepColor = opts.deepColor ?? [0.004, 0.482, 0.573];       // Darker blue far from center
    
    // Wave animation
    this.waveAmplitude = opts.waveAmplitude ?? 0.08;  // Wave height
    this.waveFrequency = opts.waveFrequency ?? 0.05;   // Wave speed
    this.waveScale = opts.waveScale ?? 0.5;           // Wave density
    
    // Fresnel effect (edges more reflective)
    this.fresnelPower = opts.fresnelPower ?? 2.0;

    this._buildWaterPlane();
  }

  // Simple 2D noise for waves
  _noise2D(x, z, time) {
    const seed1 = Math.sin(x * 3.14 + z * 2.71 + time * this.waveFrequency) * 43758.5453;
    const seed2 = Math.cos(x * 2.71 - z * 3.14 + time * this.waveFrequency * 0.7) * 12345.6789;
    return ((seed1 - Math.floor(seed1)) + (seed2 - Math.floor(seed2))) * 0.5 - 0.5;
  }

  // Get wave height at position
  _getWaveHeight(x, z, time = 0) {
    // Multiple wave layers for natural look
    let height = 0;
    
    // Large waves
    height += Math.sin(x * this.waveScale + time * this.waveFrequency) * 
              Math.cos(z * this.waveScale * 0.7 + time * this.waveFrequency * 0.8) * 
              this.waveAmplitude;
    
    // Medium waves
    height += Math.sin(x * this.waveScale * 2.3 - time * this.waveFrequency * 1.3) * 
              Math.cos(z * this.waveScale * 1.7 + time * this.waveFrequency * 1.1) * 
              this.waveAmplitude * 0.5;
    
    // Small ripples
    height += this._noise2D(x * this.waveScale * 5, z * this.waveScale * 5, time) * 
              this.waveAmplitude * 0.2;
    
    return height;
  }

  // Get color based on distance from center (depth gradient)
  _getColorAtPosition(x, z) {
    const distFromCenter = Math.sqrt(x * x + z * z);
    const maxDist = this.size * 0.7; // 70% of size
    
    // Fade from shallow to deep
    let t = Math.min(distFromCenter / maxDist, 1.0);
    t = t * t; // Ease out quadratic
    
    return [
      this.shallowColor[0] * (1 - t) + this.deepColor[0] * t,
      this.shallowColor[1] * (1 - t) + this.deepColor[1] * t,
      this.shallowColor[2] * (1 - t) + this.deepColor[2] * t
    ];
  }

  _buildWaterPlane() {
    const vertices = [];
    const faces = [];

    const halfSize = this.size / 2;
    const step = this.size / this.segments;

    // Create grid of vertices
    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const x = -halfSize + j * step;
        const z = -halfSize + i * step;
        const y = this.waterLevel;
        
        // Initial wave height (will be animated)
        const waveY = this._getWaveHeight(x, z, 0);
        
        // Color based on distance from center
        const color = this._getColorAtPosition(x, z);
        
        // Normal pointing up (will be recalculated for waves)
        const nx = 0;
        const ny = 1;
        const nz = 0;
        
        vertices.push(
          x, y + waveY, z,           // position
          nx, ny, nz,                // normal
          color[0], color[1], color[2] // color
        );
      }
    }

    // Create faces
    const cols = this.segments + 1;
    for (let i = 0; i < this.segments; i++) {
      for (let j = 0; j < this.segments; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        
        // Two triangles per quad
        faces.push(a, c, b);
        faces.push(b, c, d);
      }
    }

    this.vertex = vertices;
    this.faces = faces;
  }

  // Update wave animation
  updateWaves(time) {
    this.waveTime = time * 0.001; // Convert to seconds
    
    const halfSize = this.size / 2;
    const step = this.size / this.segments;
    const cols = this.segments + 1;

    // Update vertex positions for waves
    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = (i * cols + j) * 9; // 9 floats per vertex
        
        const x = this.vertex[idx];
        const z = this.vertex[idx + 2];
        
        // Calculate new wave height
        const waveY = this._getWaveHeight(x, z, this.waveTime);
        this.vertex[idx + 1] = this.waterLevel + waveY;
        
        // Calculate normal for lighting (approximate)
        const epsilon = 0.1;
        const hL = this._getWaveHeight(x - epsilon, z, this.waveTime);
        const hR = this._getWaveHeight(x + epsilon, z, this.waveTime);
        const hD = this._getWaveHeight(x, z - epsilon, this.waveTime);
        const hU = this._getWaveHeight(x, z + epsilon, this.waveTime);
        
        let nx = (hL - hR) / (2 * epsilon);
        let ny = 1.0;
        let nz = (hD - hU) / (2 * epsilon);
        
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        
        this.vertex[idx + 3] = nx;
        this.vertex[idx + 4] = ny;
        this.vertex[idx + 5] = nz;
      }
    }

    // Re-upload to GPU
    const GL = this.GL;
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.DYNAMIC_DRAW);
  }

  setup() {
    const GL = this.GL;

    this.OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.DYNAMIC_DRAW); // DYNAMIC for animation

    this.OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
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

    // Enable blending for semi-transparency
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
    
    // Disable depth write but keep depth test (water should be see-through)
    GL.depthMask(false);
    
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
    
    // Restore defaults
    GL.depthMask(true);
    GL.disable(GL.BLEND);
  }
}