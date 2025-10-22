// ellipsoid.js
export class lingkaran {
  GL = null; SHADER_PROGRAM = null;

  _position = null;
  _color = null;
  _normal = null;
  _MMatrix = null;

  OBJECT_VERTEX = null;
  OBJECT_FACES = null;

  vertex = [];
  faces = [];

  POSITION_MATRIX = LIBS.get_I4(); // Mpos
  MOVE_MATRIX     = LIBS.get_I4(); // Mmove
  MODEL_MATRIX    = LIBS.get_I4();

  childs = [];

  /**
   * @param {WebGLRenderingContext} GL
   * @param {WebGLProgram} SHADER_PROGRAM
   * @param {GLuint} _position - attribute location for position
   * @param {GLuint} _color    - attribute location for color
   * @param {GLuint} _normal   - attribute location for normal
   * @param {WebGLUniformLocation} _Mmatrix - uniform location for model matrix
   * @param {Object} opts
   *  rx, ry, rz        : radii (default 1,1,1)
   *  segments (lon)    : default 36
   *  rings (lat)       : default 24
   *  color             : [r,g,b]
   *  phiStart/phiEnd   : latitude range (default -PI/2 .. PI/2)
   *  thetaStart/End    : longitude range (default 0 .. 2PI)
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    // simpan handle WebGL & lokasi atribut/uniform
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    // ---- parameter bentuk & opsi ----
    this.rx = opts.rx ?? 1;
    this.ry = opts.ry ?? 1;
    this.rz = opts.rz ?? 1;

    const segments = Math.max(3, opts.segments ?? 36);
    const rings    = Math.max(2, opts.rings ?? 24);
    const color    = opts.color ?? [1,1,1];

    // batas sudut
    this.phiStart   = opts.phiStart   ?? (-Math.PI/2);   // bawah
    this.phiEnd     = opts.phiEnd     ?? (+Math.PI/2);   // atas
    this.thetaStart = opts.thetaStart ?? 0.0;
    this.thetaEnd   = opts.thetaEnd   ?? (Math.PI * 2);

    this.bone = {
      name: opts.name ?? "unnamed",
      position: opts.position ?? [0,0,0],
      rotation: opts.rotation ?? [0,0,0],
      scale:    opts.scale ?? [1,1,1],
    };

    this._buildEllipsoid(this.rx, this.ry, this.rz, segments, rings, color);
  }

  _pushV(x, y, z, nx, ny, nz, c) {
    // pos(3) + normal(3) + color(3) = 9 floats
    this.vertex.push(x, y, z, nx, ny, nz, c[0], c[1], c[2]);
  }

  _buildEllipsoid(rx, ry, rz, segments, rings, color) {
    const vertices = [];
    const indices = [];

    for (let r = 0; r <= rings; r++) {
      const t   = r / rings;
      const phi = this.phiStart + t * (this.phiEnd - this.phiStart);  // [-π/2..π/2]
      const cphi = Math.cos(phi), sphi = Math.sin(phi);

      for (let s = 0; s <= segments; s++) {
        const u   = s / segments;
        const th  = this.thetaStart + u * (this.thetaEnd - this.thetaStart);
        const cth = Math.cos(th), sth = Math.sin(th);

        // posisi di ellipsoid
        const x = rx * cphi * cth;
        const y = ry * sphi;
        const z = rz * cphi * sth;

        // normal ellipsoid: n ∝ (x/rx², y/ry², z/rz²)
        let nx = x / (rx * rx);
        let ny = y / (ry * ry);
        let nz = z / (rz * rz);
        const nlen = Math.hypot(nx, ny, nz) || 1.0;
        nx /= nlen; ny /= nlen; nz /= nlen;

        this._pushV(x, y, z, nx, ny, nz, color);
      }
    }

    const cols = segments + 1;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segments; s++) {
        const i0 = r*cols + s;
        const i1 = i0 + 1;
        const i2 = i0 + cols;
        const i3 = i2 + 1;
        indices.push(i0, i2, i1,  i1, i2, i3);
      }
    }

    this.vertex = vertices.length ? vertices : this.vertex; // if used local buffer
    if (!vertices.length) {
      // if we pushed directly to this.vertex in _pushV, do nothing
    }
    this.faces  = indices;
  }

  updateBoneMatrix() {
    let m = LIBS.get_I4();
    LIBS.translateLocal(m, this.bone.position[0], this.bone.position[1], this.bone.position[2]);
    LIBS.rotateX(m, this.bone.rotation[0]);
    LIBS.rotateY(m, this.bone.rotation[1]);
    LIBS.rotateZ(m, this.bone.rotation[2]);
    LIBS.scale(m, this.bone.scale[0], this.bone.scale[1], this.bone.scale[2]);
    this.POSITION_MATRIX = m;
  }

  setup() {
    this.OBJECT_VERTEX = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);

    this.OBJECT_FACES = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);

    this.childs.forEach(c => c.setup());
  }

  render(PARENT_MATRIX) {
    // MODEL = Parent * Position * Move
    const M = LIBS.get_I4();
    LIBS.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBS.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    const GL = this.GL;
    GL.useProgram(this.SHADER_PROGRAM);

    // matrices & lighting
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    const normalMat3 = LIBS.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix  = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    const uLightDirection= GL.getUniformLocation(this.SHADER_PROGRAM, "lightDirection");
    const uLightColor    = GL.getUniformLocation(this.SHADER_PROGRAM, "lightColor");
    const uViewPos       = GL.getUniformLocation(this.SHADER_PROGRAM, "viewPos");

    GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);
    GL.uniform3f(uLightDirection, 0.5, 0.8, 0.3);
    GL.uniform3f(uLightColor, 1.0, 1.0, 1.0);
    GL.uniform3f(uViewPos, 0.0, 0.0, 3.0);

    // attributes: pos(3) + normal(3) + color(3) = stride 36
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);

    this.childs.forEach(c => c.render(this.MODEL_MATRIX));
  }
}
