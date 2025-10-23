export class Ground {
  GL = null;
  SHADER_PROGRAM = null;
  _position = null;
  _color = null;
  _MMatrix = null;

  OBJECT_VERTEX = null;
  OBJECT_FACES = null;

  vertex = [];
  faces = [];

  POSITION_MATRIX = LIBS.get_I4();
  MOVE_MATRIX = LIBS.get_I4();

  childs = [];

  /**
   * @param {WebGLRenderingContext} GL
   * @param {WebGLProgram} SHADER_PROGRAM
   * @param {GLuint} _position
   * @param {GLuint} _color
   * @param {WebGLUniformLocation} _Mmatrix
   * @param {Object} opts
   *   opts.size: ukuran ground (default 100)
   *   opts.segments: detail grid (default 50)
   *   opts.muddyColor: [r,g,b] warna lumpur
   *   opts.puddleColor: [r,g,b] warna genangan
   *   opts.heightVariation: ketinggian noise (default 0.5)
   *   opts.puddleCount: jumlah puddles (default 10)
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._MMatrix = _Mmatrix;

    // Config
    const size = opts.size || 100;
    const segments = Math.max(10, opts.segments || 50);
    const muddyColor = opts.muddyColor || [0.45, 0.35, 0.25]; // coklat lumpur
    const puddleColor = opts.puddleColor || [0.25, 0.4, 0.55]; // biru kehijauan
    const heightVariation = opts.heightVariation || 0.5;
    const puddleCount = opts.puddleCount || 12;

    this._buildGround(size, segments, muddyColor, puddleColor, heightVariation, puddleCount);
  }

  // Simple noise function (pseudo-random)
  _noise(x, z, seed = 0) {
    const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 43758.5453) * 43758.5453;
    return n - Math.floor(n);
  }

  _buildGround(size, segments, muddyColor, puddleColor, heightVariation, puddleCount) {
    const vertices = [];
    const faces = [];
    const halfSize = size / 2;

    // Generate puddle positions (random)
    const puddles = [];
    for (let i = 0; i < puddleCount; i++) {
      puddles.push({
        x: (this._noise(i, i * 2) - 0.5) * size * 0.8,
        z: (this._noise(i * 3, i * 4) - 0.5) * size * 0.8,
        radius: 2 + this._noise(i * 5, i * 6) * 4, // radius 2-6
      });
    }

    // Generate grid
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const x = (i / segments - 0.5) * size;
        const z = (j / segments - 0.5) * size;

        // Height variation (simple noise)
        const noiseVal = this._noise(x * 0.1, z * 0.1);
        const noiseVal2 = this._noise(x * 0.05, z * 0.05, 1);
        const y = (noiseVal * 0.5 + noiseVal2 * 0.5 - 0.5) * heightVariation;

        // Check if in puddle
        let inPuddle = false;
        let puddleStrength = 0;
        for (const puddle of puddles) {
          const dx = x - puddle.x;
          const dz = z - puddle.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < puddle.radius) {
            inPuddle = true;
            puddleStrength = Math.max(puddleStrength, 1 - dist / puddle.radius);
          }
        }

        // Interpolate color
        let r, g, b;
        if (inPuddle) {
          // Smooth blend ke puddle color
          r = muddyColor[0] * (1 - puddleStrength) + puddleColor[0] * puddleStrength;
          g = muddyColor[1] * (1 - puddleStrength) + puddleColor[1] * puddleStrength;
          b = muddyColor[2] * (1 - puddleStrength) + puddleColor[2] * puddleStrength;
        } else {
          // Slight variation untuk muddy texture
          const variation = noiseVal * 0.1 - 0.05;
          r = Math.max(0, Math.min(1, muddyColor[0] + variation));
          g = Math.max(0, Math.min(1, muddyColor[1] + variation));
          b = Math.max(0, Math.min(1, muddyColor[2] + variation));
        }

        vertices.push(x, y, z);
        vertices.push(r, g, b);
      }
    }

    // Generate faces
    const rowLength = segments + 1;
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const first = i * rowLength + j;
        const second = first + 1;
        const third = first + rowLength;
        const fourth = third + 1;

        // Two triangles per quad
        faces.push(first, third, second);
        faces.push(second, third, fourth);
      }
    }

    this.vertex = vertices;
    this.faces = faces;
  }

  setup() {
    this.OBJECT_VERTEX = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(
      this.GL.ARRAY_BUFFER,
      new Float32Array(this.vertex),
      this.GL.STATIC_DRAW
    );

    this.OBJECT_FACES = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(
      this.GL.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(this.faces),
      this.GL.STATIC_DRAW
    );

    this.childs.forEach(child => child.setup());
  }

  render(PARENT_MATRIX) {
    const M = LIBS.get_I4();
    LIBS.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBS.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    this.GL.useProgram(this.SHADER_PROGRAM);
    this.GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 24, 0);
    this.GL.vertexAttribPointer(this._color, 3, this.GL.FLOAT, false, 24, 12);

    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.drawElements(
      this.GL.TRIANGLES,
      this.faces.length,
      this.GL.UNSIGNED_SHORT,
      0
    );

    this.childs.forEach(child => child.render(this.MODEL_MATRIX));
  }
}