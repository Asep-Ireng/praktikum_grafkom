export class Sky {
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
   *   opts.topColor: [r,g,b] - warna langit atas
   *   opts.bottomColor: [r,g,b] - warna langit bawah
   *   opts.size: scale of sky sphere (default 50)
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._MMatrix = _Mmatrix;

    // Config
    const topColor = opts.topColor || [135/255, 206/255, 250/255]; // Sky Blue
    const bottomColor = opts.bottomColor || [200/255, 230/255, 255/255]; // Light Blue
    const size = opts.size || 50; // very large sphere
    const segments = Math.max(8, opts.segments || 24);
    const rings = Math.max(4, opts.rings || 16);

    this._buildSky(topColor, bottomColor, size, segments, rings);
  }

  _buildSky(topColor, bottomColor, size, segments, rings) {
    const vertices = [];
    const faces = [];

    // Generate hemisphere (hanya atas, tidak perlu bawah)
    for (let i = 0; i <= rings; i++) {
      const phi = (i / rings) * (Math.PI / 2); // 0 to PI/2 (hemisphere atas)
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      // Interpolasi warna dari top ke bottom
      const t = i / rings; // 0 (top) to 1 (bottom/horizon)
      const r = topColor[0] * (1 - t) + bottomColor[0] * t;
      const g = topColor[1] * (1 - t) + bottomColor[1] * t;
      const b = topColor[2] * (1 - t) + bottomColor[2] * t;

      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2; // 0 to 2PI
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        // Posisi vertex (sphere)
        const x = size * cosPhi * cosTheta;
        const y = size * sinPhi;
        const z = size * cosPhi * sinTheta;

        vertices.push(x, y, z);
        vertices.push(r, g, b);
      }
    }

    // Generate faces
    const rowLength = segments + 1;
    for (let i = 0; i < rings; i++) {
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

    // Render sky dengan depth tricks
    // Sky harus rendered first tapi dengan depth = 1.0 (far plane)
    const wasDepthMask = this.GL.getParameter(this.GL.DEPTH_WRITEMASK);
    this.GL.depthMask(false); // jangan write ke depth buffer
    this.GL.drawElements(
      this.GL.TRIANGLES,
      this.faces.length,
      this.GL.UNSIGNED_SHORT,
      0
    );
    this.GL.depthMask(wasDepthMask); // restore

    this.childs.forEach(child => child.render(this.MODEL_MATRIX));
  }
}