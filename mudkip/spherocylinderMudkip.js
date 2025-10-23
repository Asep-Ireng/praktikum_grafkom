export class spherocylinder {
  GL = null; SHADER_PROGRAM = null;
  _position = null; _color = null; _normal = null; _MMatrix = null;
  OBJECT_VERTEX = null; OBJECT_FACES = null;
  vertex = []; faces = [];

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();
  childs = [];

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;

    const radius = opts.radius ?? 0.25;
    const height = opts.height ?? 1.0;
    const segments = Math.max(3, opts.segments ?? 36);
    const stacks = Math.max(1, opts.stacks ?? 1);
    const capRings = Math.max(2, opts.capRings ?? 12);
    const color = opts.color ?? [0.7, 0.7, 0.7];

    const capRxTop = opts.capRxTop ?? opts.capRx ?? radius;
    const capRyTop = opts.capRyTop ?? opts.capRy ?? radius;
    const capRzTop = opts.capRzTop ?? opts.capRz ?? radius;

    const capRxBottom = opts.capRxBottom ?? opts.capRx ?? radius;
    const capRyBottom = opts.capRyBottom ?? opts.capRy ?? radius;
    const capRzBottom = opts.capRzBottom ?? opts.capRz ?? radius;

    this.bone = {
      name: opts.name ?? "unnamed",
      position: opts.position ?? [0, 0, 0],
      rotation: opts.rotation ?? [0, 0, 0],
      scale: opts.scale ?? [1, 1, 1],
    };

    this._build(radius, height, segments, stacks, capRings, color,
      capRxTop, capRyTop, capRzTop,
      capRxBottom, capRyBottom, capRzBottom);
  }

  _pushV(x, y, z, nx, ny, nz, color) {
    this.vertex.push(x, y, z, nx, ny, nz, color[0], color[1], color[2]);
  }

  _build(radius, height, segments, stacks, capRings, color,
    capRxTop, capRyTop, capRzTop,
    capRxBottom, capRyBottom, capRzBottom) {

    const ringLen = segments + 1;
    const h2 = height * 0.5;

    for (let i = 0; i <= stacks; i++) {
      const t = i / stacks;
      const y = -h2 + t * height;
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        const x = radius * Math.cos(a);
        const z = radius * Math.sin(a);
        const len = Math.hypot(x, 0, z) || 1;
        this._pushV(x, y, z, x / len, 0, z / len, color);
      }
    }

    for (let i = 0; i < stacks; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * ringLen + j;
        const b = a + 1;
        const c = a + ringLen;
        const d = c + 1;
        this.faces.push(a, b, d, a, d, c);
      }
    }

    let prevBase = stacks * ringLen;
    for (let i = 1; i <= capRings; i++) {
      const u = (i / capRings) * (Math.PI / 2);
      const y = h2 + capRyTop * Math.sin(u);
      const r = capRxTop * Math.cos(u);
      const rowStart = this.vertex.length / 9;
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        const x = r * Math.cos(a);
        const z = capRzTop * Math.sin(a);
        const nx = x / capRxTop;
        const ny = Math.sin(u);
        const nz = z / capRzTop;
        const nlen = Math.hypot(nx, ny, nz) || 1;
        this._pushV(x, y, z, nx / nlen, ny / nlen, nz / nlen, color);
      }
      for (let j = 0; j < segments; j++) {
        const a = prevBase + j;
        const b = a + 1;
        const c = rowStart + j;
        const d = c + 1;
        this.faces.push(a, b, d, a, d, c);
      }
      prevBase = rowStart;
    }

    const topPole = this.vertex.length / 9;
    this._pushV(0, h2 + capRyTop, 0, 0, 1, 0, color);
    for (let j = 0; j < segments; j++) {
      const a = prevBase + j;
      const b = prevBase + j + 1;
      this.faces.push(a, b, topPole);
    }

    prevBase = 0;
    for (let i = 1; i <= capRings; i++) {
      const u = (i / capRings) * (Math.PI / 2);
      const y = -h2 - capRyBottom * Math.sin(u);
      const r = capRxBottom * Math.cos(u);
      const rowStart = this.vertex.length / 9;
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        const x = r * Math.cos(a);
        const z = capRzBottom * Math.sin(a);
        const nx = x / capRxBottom;
        const ny = -Math.sin(u);
        const nz = z / capRzBottom;
        const nlen = Math.hypot(nx, ny, nz) || 1;
        this._pushV(x, y, z, nx / nlen, ny / nlen, nz / nlen, color);
      }
      for (let j = 0; j < segments; j++) {
        const a = prevBase + j;
        const b = a + 1;
        const c = rowStart + j;
        const d = c + 1;
        this.faces.push(a, d, b, a, c, d);
      }
      prevBase = rowStart;
    }

    const botPole = this.vertex.length / 9;
    this._pushV(0, -h2 - capRyBottom, 0, 0, -1, 0, color);
    for (let j = 0; j < segments; j++) {
      const a = prevBase + j;
      const b = prevBase + j + 1;
      this.faces.push(a, botPole, b);
    }
  }

  updateBoneMatrix() {
    let m = LIBSMudkip.get_I4();
    LIBSMudkip.translateLocal(m, ...this.bone.position);
    LIBSMudkip.rotateX(m, this.bone.rotation[0]);
    LIBSMudkip.rotateY(m, this.bone.rotation[1]);
    LIBSMudkip.rotateZ(m, this.bone.rotation[2]);
    LIBSMudkip.scale(m, ...this.bone.scale);
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
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    const GL = this.GL;
    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    const uLightDirection = GL.getUniformLocation(this.SHADER_PROGRAM, "lightDirection");
    const uLightColor = GL.getUniformLocation(this.SHADER_PROGRAM, "lightColor");
    const uViewPos = GL.getUniformLocation(this.SHADER_PROGRAM, "viewPos");

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

    this.childs.forEach(c => c.render(this.MODEL_MATRIX));
  }

  setPoseTopPivot(rx = 0, rz = 0, ry = 0, height = null) {
    const shaft = (height ?? 1.0);
    const shift = -(shaft / 2);
    LIBSMudkip.set_I4(this.MOVE_MATRIX);
    LIBSMudkip.translateLocal(this.MOVE_MATRIX, 0, shift, 0);
    LIBSMudkip.rotateX(this.MOVE_MATRIX, rx);
    LIBSMudkip.rotateY(this.MOVE_MATRIX, ry);
    LIBSMudkip.rotateZ(this.MOVE_MATRIX, rz);
    LIBSMudkip.translateLocal(this.MOVE_MATRIX, 0, -shift, 0);
  }
}
