export class cone {
  GL=null; SHADER_PROGRAM=null;
  _position=null; _color=null; _normal=null; _MMatrix=null;
  OBJECT_VERTEX=null; OBJECT_FACES=null;
  vertex=[]; faces=[];
  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX     = LIBSMudkip.get_I4();
  MODEL_MATRIX    = LIBSMudkip.get_I4();
  childs=[];

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts={}) {
    this.GL=GL; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=_position; this._color=_color; this._normal=_normal; this._MMatrix=_Mmatrix;

    const radiusBottom = Math.max(1e-5, opts.radiusBottom ?? 0.22);
    const radiusTop    = Math.max(0,     opts.radiusTop    ?? 0.00);
    const height       = Math.max(1e-5,  opts.height       ?? 0.75);
    const segments     = Math.max(3,     opts.segments     ?? 32);
    const color        = opts.color ?? [1,1,1];

    this.bone = {
      name: opts.name ?? "cone",
      position: opts.position ?? [0,0,0],
      rotation: opts.rotation ?? [0,0,0],
      scale:    opts.scale    ?? [1,1,1],
    };

    this._buildCone({ radiusBottom, radiusTop, height, segments, color });
  }

  addChild(c){ this.childs.push(c); }

  _pushV(x, y, z, nx, ny, nz, c) {
    this.vertex.push(x, y, z, nx, ny, nz, c[0], c[1], c[2]);
  }

  _buildCone({ radiusBottom, radiusTop, height, segments, color }) {
    const v=[]; const idx=[];
    const x0 = 0.0;  
    const x1 = height; 
    const TWO_PI = Math.PI * 2;
    const slantH = Math.hypot(height, radiusBottom - radiusTop);
    const nxSlope = height / slantH;
    const nyzSlope = (radiusBottom - radiusTop) / slantH;

    for (let s=0; s<=segments; s++) {
      const a = (s / segments) * TWO_PI;
      const cy = Math.cos(a), sz = Math.sin(a);
      const nx = nyzSlope;     
      const ny = nxSlope * cy; 
      const nz = nxSlope * sz; 
      const nlen = Math.hypot(nx, ny, nz) || 1.0;
      const xTop = x1;
      const yTop = radiusTop * cy;
      const zTop = radiusTop * sz;
      const xBot = x0;
      const yBot = radiusBottom * cy;
      const zBot = radiusBottom * sz;

      v.push(xTop, yTop, zTop, nx/nlen, ny/nlen, nz/nlen, color[0], color[1], color[2]);
      v.push(xBot, yBot, zBot, nx/nlen, ny/nlen, nz/nlen, color[0], color[1], color[2]);
    }

    for (let s=0; s<segments; s++) {
      const i0 = s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      idx.push(i0, i1, i2, i2, i1, i3);
    }

    const baseC = v.length / 9;
    this._pushV(x0, 0, 0, -1, 0, 0, color);
    const baseS = v.length / 9;
    for (let s=0; s<=segments; s++) {
      const a=(s/segments)*TWO_PI, cy=Math.cos(a), sz=Math.sin(a);
      const bx = x0, by = radiusBottom*cy, bz = radiusBottom*sz;
      this._pushV(bx, by, bz, -1, 0, 0, color);
    }
    for (let s=0; s<segments; s++) idx.push(baseS+s+1, baseS+s, baseC);

    if (radiusTop > 0) {
      const topC = v.length / 9;
      this._pushV(x1, 0, 0, +1, 0, 0, color);
      const topS = v.length / 9;
      for (let s=0; s<=segments; s++) {
        const a=(s/segments)*TWO_PI, cy=Math.cos(a), sz=Math.sin(a);
        const tx = x1, ty = radiusTop*cy, tz = radiusTop*sz;
        this._pushV(tx, ty, tz, +1, 0, 0, color);
      }
      for (let s=0; s<segments; s++) idx.push(topC, topS+s, topS+s+1);
    }

    this.vertex=v; this.faces=idx;
  }

  updateBoneMatrix() {
    let m=LIBSMudkip.get_I4();
    LIBSMudkip.translateLocal(m, this.bone.position[0], this.bone.position[1], this.bone.position[2]);
    LIBSMudkip.rotateX(m, this.bone.rotation[0]);
    LIBSMudkip.rotateY(m, this.bone.rotation[1]);
    LIBSMudkip.rotateZ(m, this.bone.rotation[2]);
    LIBSMudkip.scale(m, this.bone.scale[0], this.bone.scale[1], this.bone.scale[2]);
    this.POSITION_MATRIX=m;
  }

  setup(){
    this.OBJECT_VERTEX=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);

    this.OBJECT_FACES=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);

    this.childs.forEach(c=>c.setup());
  }

  render(PARENT_MATRIX){
    const M=LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX=M;

    const GL = this.GL;
    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix  = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    const uLightDirection= GL.getUniformLocation(this.SHADER_PROGRAM, "lightDirection");
    const uLightColor    = GL.getUniformLocation(this.SHADER_PROGRAM, "lightColor");
    const uViewPos       = GL.getUniformLocation(this.SHADER_PROGRAM, "viewPos");

    GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);
    GL.uniform3f(uLightDirection, 0.5, 0.8, 0.3);
    GL.uniform3f(uLightColor, 1.0, 1.0, 1.0);
    GL.uniform3f(uViewPos, 0.0, 0.0, 3.0);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);

    this.childs.forEach(c=>c.render(this.MODEL_MATRIX));
  }
}
