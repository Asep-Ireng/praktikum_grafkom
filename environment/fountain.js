// fountain.js - Simple Waterfall Effect
export class Fountain {
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

  // Animation state
  animTime = 0;

  /**
   * @param {WebGLRenderingContext} GL
   * @param {WebGLProgram} SHADER_PROGRAM
   * @param {GLuint} _position
   * @param {GLuint} _color
   * @param {WebGLUniformLocation} _Mmatrix
   * @param {Object} opts
   *   opts.height: tinggi air terjun (default 10)
   *   opts.width: lebar air terjun (default 2)
   *   opts.segments: detail vertical (default 20)
   *   opts.waterColor: [r,g,b] warna air
   *   opts.flowSpeed: kecepatan aliran (default 1.0)
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._MMatrix = _Mmatrix;

    // Config
    this.height = opts.height || 10;
    this.width = opts.width || 2;
    this.segments = Math.max(10, opts.segments || 20);
    this.waterColor = opts.waterColor || [0.2, 0.5, 0.8]; // biru air
    this.flowSpeed = opts.flowSpeed || 1.0;

    this._buildFountain();
  }

  _buildFountain() {
    const vertices = [];
    const faces = [];

    // Vertical strips untuk waterfall effect
    const strips = 3; // 3 strips bersebelahan
    
    for (let strip = 0; strip < strips; strip++) {
      const offsetX = (strip - 1) * (this.width / (strips - 1));

      for (let i = 0; i <= this.segments; i++) {
        const t = i / this.segments;
        const y = this.height * (1 - t); // top to bottom

        // Slight wave untuk visual interest
        const wave = Math.sin(i * 0.5) * 0.1;
        const x = offsetX + wave;
        const z = 0;

        // Color variation (lebih terang di atas, gelap di bawah)
        const brightness = 0.7 + t * 0.3; // 0.7 to 1.0
        const r = this.waterColor[0] * brightness;
        const g = this.waterColor[1] * brightness;
        const b = this.waterColor[2] * brightness;

        // Left edge
        vertices.push(x - this.width * 0.15, y, z);
        vertices.push(r, g, b);

        // Right edge
        vertices.push(x + this.width * 0.15, y, z);
        vertices.push(r, g, b);
      }

      // Faces untuk strip ini
      const stripOffset = strip * (this.segments + 1) * 2;
      for (let i = 0; i < this.segments; i++) {
        const base = stripOffset + i * 2;
        const a = base;
        const b = base + 1;
        const c = base + 2;
        const d = base + 3;

        faces.push(a, c, b);
        faces.push(b, c, d);
      }
    }

    // Add splash pool at bottom (circle)
    const poolSegments = 16;
    const poolRadius = this.width * 0.8;
    const poolY = 0;
    const centerIdx = vertices.length / 6;

    // Center vertex
    vertices.push(0, poolY, 0);
    vertices.push(
      this.waterColor[0] * 0.6,
      this.waterColor[1] * 0.6,
      this.waterColor[2] * 0.6
    );

    // Ring vertices
    for (let i = 0; i <= poolSegments; i++) {
      const angle = (i / poolSegments) * Math.PI * 2;
      const x = Math.cos(angle) * poolRadius;
      const z = Math.sin(angle) * poolRadius;

      vertices.push(x, poolY, z);
      vertices.push(
        this.waterColor[0] * 0.5,
        this.waterColor[1] * 0.5,
        this.waterColor[2] * 0.5
      );
    }

    // Pool faces
    for (let i = 0; i < poolSegments; i++) {
      faces.push(centerIdx, centerIdx + i + 1, centerIdx + i + 2);
    }

    this.vertex = vertices;
    this.faces = faces;
  }

  // Update animation (call dari main loop)
  updateAnimation(deltaTime) {
    this.animTime += deltaTime * this.flowSpeed;

    // Animasi bisa ditambah nanti (vertex shader animation lebih smooth)
    // Untuk sekarang, static mesh sudah cukup
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

    // Enable blending untuk transparency effect
    const wasBlending = this.GL.isEnabled(this.GL.BLEND);
    if (!wasBlending) {
      this.GL.enable(this.GL.BLEND);
      this.GL.blendFunc(this.GL.SRC_ALPHA, this.GL.ONE_MINUS_SRC_ALPHA);
    }

    this.GL.drawElements(
      this.GL.TRIANGLES,
      this.faces.length,
      this.GL.UNSIGNED_SHORT,
      0
    );

    if (!wasBlending) {
      this.GL.disable(this.GL.BLEND);
    }

    this.childs.forEach(child => child.render(this.MODEL_MATRIX));
  }
}