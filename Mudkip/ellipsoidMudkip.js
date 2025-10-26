export class ellipsoid {
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
  MOVE_MATRIX     = LIBSMudkip.get_I4();

  childs = [];

  /**
   * @param {WebGLRenderingContext} GL
   * @param {WebGLProgram} SHADER_PROGRAM
   * @param {GLuint} _position 
   * @param {GLuint} _color 
   * @param {GLuint} _normal
   * @param {WebGLUniformLocation} _Mmatrix
   * @param {Object} opts
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal; 
    this._MMatrix = _Mmatrix;
    
    const rx = opts.rx ?? 1.0;
    const ry = opts.ry ?? 1.0;
    const rz = opts.rz ?? 1.0;
    const segments = Math.max(3, opts.segments ?? 36);
    const rings    = Math.max(2, opts.rings ?? 24);
    const color = opts.color ?? null;

    this.bone = {
      name: opts.name ?? "unnamed",
      position: opts.position ?? [0, 0, 0],
      rotation: opts.rotation ?? [0, 0, 0],
      scale:    opts.scale ?? [1, 1, 1],
    };

    this._buildEllipsoid(rx, ry, rz, segments, rings, color);
  }

  _buildEllipsoid(rx, ry, rz, segments, rings, color) {
    const vertices = [];
    const faces = [];

    for (let i = 0; i <= rings; i++) {
      const u = -Math.PI / 2 + (i / rings) * Math.PI;
      const cu = Math.cos(u);
      const su = Math.sin(u);

      for (let j = 0; j <= segments; j++) {
        const v = (j / segments) * 2 * Math.PI; 
        const cv = Math.cos(v);
        const sv = Math.sin(v);

        const x = rx * cv * cu;
        const y = ry * su;
        const z = rz * sv * cu;

        let nx = x / (rx * rx);
        let ny = y / (ry * ry);
        let nz = z / (rz * rz);
        
        const nlen = Math.sqrt(nx*nx + ny*ny + nz*nz);
        if (nlen > 0) {
          nx /= nlen;
          ny /= nlen;
          nz /= nlen;
        }
        vertices.push(x, y, z);

  
        if (color) {
          vertices.push(color[0], color[1], color[2]);
        } else {
          vertices.push((x / (2 * rx)) + 0.5, (y / (2 * ry)) + 0.5, (z / (2 * rz)) + 0.5);
        }

        vertices.push(nx, ny, nz);
      }
    }

    const rowLength = segments + 1;
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const first = i * rowLength + j;
        const second = first + 1;
        const third = first + rowLength;
        const fourth = third + 1;

        faces.push(first, second, fourth);
        faces.push(first, fourth, third);
      }
    }

    this.vertex = vertices;
    this.faces = faces;
  }

  updateBoneMatrix() {
    let m = LIBSMudkip.get_I4();
    LIBSMudkip.translateLocal(m, this.bone.position[0], this.bone.position[1], this.bone.position[2]);
    LIBSMudkip.rotateX(m, this.bone.rotation[0]);
    LIBSMudkip.rotateY(m, this.bone.rotation[1]);
    LIBSMudkip.rotateZ(m, this.bone.rotation[2]);
    LIBSMudkip.scale(m, this.bone.scale[0], this.bone.scale[1], this.bone.scale[2]);

    this.POSITION_MATRIX = m;
  }

  setup() {
    this.OBJECT_VERTEX = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);

    this.OBJECT_FACES = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);

    this.childs.forEach(child => child.setup());
  }

  render(PARENT_MATRIX) {
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    this.GL.useProgram(this.SHADER_PROGRAM);
    this.GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    
    const stride = 36;
    this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, stride, 0);   
    this.GL.vertexAttribPointer(this._color,    3, this.GL.FLOAT, false, stride, 12);  
    this.GL.vertexAttribPointer(this._normal,   3, this.GL.FLOAT, false, stride, 24);

    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.drawElements(this.GL.TRIANGLES, this.faces.length, this.GL.UNSIGNED_SHORT, 0);

    this.childs.forEach(child => child.render(this.MODEL_MATRIX));
  }
}