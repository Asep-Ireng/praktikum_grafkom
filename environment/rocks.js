export class Rocks {
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
   *   opts.count: jumlah batu (default 20)
   *   opts.sizeRange: [min, max] ukuran (default [0.5, 2.5])
   *   opts.spreadArea: luas penyebaran (default 80)
   *   opts.color: [r,g,b] warna batu (default gray)
   *   opts.colorVariation: variasi warna (default 0.15)
   *   opts.segments: detail sphere (default 12)
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._MMatrix = _Mmatrix;

    // Config
    const count = opts.count || 20;
    const sizeRange = opts.sizeRange || [0.5, 2.5];
    const spreadArea = opts.spreadArea || 80;
    const baseColor = opts.color || [0.45, 0.45, 0.45]; // gray
    const colorVariation = opts.colorVariation || 0.15;
    const segments = Math.max(6, opts.segments || 12);
    const rings = Math.max(4, opts.rings || 10);

    this._buildRocks(count, sizeRange, spreadArea, baseColor, colorVariation, segments, rings);
  }

  // Simple noise function untuk random placement
  _noise(x, seed = 0) {
    const n = Math.sin(x * 12.9898 + seed * 43758.5453) * 43758.5453;
    return n - Math.floor(n);
  }

  _buildRocks(count, sizeRange, spreadArea, baseColor, colorVariation, segments, rings) {
    const vertices = [];
    const faces = [];

    // Generate base sphere vertices (akan di-reuse untuk semua rocks)
    const sphereVertices = [];
    for (let i = 0; i <= rings; i++) {
      const phi = (i / rings) * Math.PI; // 0 to PI
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2; // 0 to 2PI
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        const x = cosPhi * cosTheta;
        const y = sinPhi;
        const z = cosPhi * sinTheta;

        sphereVertices.push(x, y, z);
      }
    }

    // Generate each rock instance
    let vertexOffset = 0;
    for (let rockIdx = 0; rockIdx < count; rockIdx++) {
      // Random position
      const px = (this._noise(rockIdx * 2) - 0.5) * spreadArea;
      const pz = (this._noise(rockIdx * 3 + 1) - 0.5) * spreadArea;
      const py = 0; // on ground (bisa ditambah noise kalau mau)

      // Random size
      const sizeT = this._noise(rockIdx * 5 + 2);
      const size = sizeRange[0] + sizeT * (sizeRange[1] - sizeRange[0]);

      // Random deformation (bikin gak terlalu bulat sempurna)
      const deformX = 0.8 + this._noise(rockIdx * 7 + 3) * 0.4; // 0.8-1.2
      const deformY = 0.7 + this._noise(rockIdx * 11 + 4) * 0.5; // 0.7-1.2
      const deformZ = 0.8 + this._noise(rockIdx * 13 + 5) * 0.4; // 0.8-1.2

      // Color variation
      const colorNoise = (this._noise(rockIdx * 17 + 6) - 0.5) * colorVariation;
      const r = Math.max(0, Math.min(1, baseColor[0] + colorNoise));
      const g = Math.max(0, Math.min(1, baseColor[1] + colorNoise));
      const b = Math.max(0, Math.min(1, baseColor[2] + colorNoise));

      // Add vertices for this rock
      for (let i = 0; i < sphereVertices.length; i += 3) {
        const x = sphereVertices[i] * size * deformX + px;
        const y = sphereVertices[i + 1] * size * deformY + py;
        const z = sphereVertices[i + 2] * size * deformZ + pz;

        vertices.push(x, y, z);
        vertices.push(r, g, b);
      }

      // Add faces for this rock
      const rowLength = segments + 1;
      for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
          const first = vertexOffset + i * rowLength + j;
          const second = first + 1;
          const third = first + rowLength;
          const fourth = third + 1;

          faces.push(first, second, fourth);
          faces.push(first, fourth, third);
        }
      }

      vertexOffset += sphereVertices.length / 3;
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