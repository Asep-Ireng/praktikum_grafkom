// mudkip-tail.js
export class MudkipTail {
    GL = null;
    SHADER_PROGRAM = null;
    _position = null;
    _color = null;
    _MMatrix = null;

    OBJECT_VERTEX = null;
    OBJECT_FACES = null;
    LINES_VERTEX = null;

    vertex = [];
    faces = [];
    lines = [];
    lineSegmentCount = 0;
    numVerticalLines = 0;

    POSITION_MATRIX = LIBS.get_I4();
    MOVE_MATRIX = LIBS.get_I4();

    childs = [];

    constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;
        this._position = _position;
        this._color = _color;
        this._normal = _normal;
        this._MMatrix = _Mmatrix;

        // Control parameters
        this.length = opts.length || 0.8;
        this.baseHeight = opts.baseHeight || 0.15;
        this.tipHeight = opts.tipHeight || 0.65;
        this.baseWidth = opts.baseWidth || 0.03;
        this.tipWidth = opts.tipWidth || 0.08;
        this.segments = opts.segments || 32;
        this.slices = opts.slices || 32;
        this.curve = opts.curve || 0.0;
        this.color = opts.color || [0.88, 0.94, 0.98];

        this.generate();
    }

    // Cubic Bezier interpolation helper
    cubicBezier(t, p0, p1, p2, p3) {
        const oneMinusT = 1 - t;
        return oneMinusT * oneMinusT * oneMinusT * p0 +
               3 * oneMinusT * oneMinusT * t * p1 +
               3 * oneMinusT * t * t * p2 +
               t * t * t * p3;
    }

    // Fungsi kurva untuk spine ekor (centerline)
    spineCurve(t) {
        const x = 0;

        // Sedikit lengkung ke atas (minimal)
        const easeT = t * t * (3 - 2 * t); // smoothstep
        const y = easeT * this.curve * this.length * 0.3;

        // Ke belakang - semakin jauh dari badan
        const z = -t * this.length;

        return [x, y, z];
    }

    // Fungsi tinggi ekor DENGAN BEZIER - SMOOTH TEARDROP
    heightAt(t) {
        const u = Math.min(Math.max(t, 0.0), 1.0);
        const p0 = 0.10;
        const p1 = 0.75;
        const p2 = 1.25;
        const p3 = 0.02;
        const shape = this.cubicBezier(u, p0, p1, p2, p3);
        return this.tipHeight * Math.max(0, shape);
    }

    // Fungsi lebar/ketebalan ekor DENGAN BEZIER
    widthAt(t) {
        const u = Math.min(Math.max(t, 0.0), 1.0);
        const p0 = 0.08;
        const p1 = 0.60;
        const p2 = 1.00;
        const p3 = 0.03;
        const factor = this.cubicBezier(u, p0, p1, p2, p3);
        return this.baseWidth + (this.tipWidth - this.baseWidth) * Math.max(0, factor);
    }

    generate() {
        const vertices = [];
  const faces = [];

  for (let i = 0; i <= this.segments; i++) {
    const u = i / this.segments;

    const [sx, sy, sz] = this.spineCurve(u);
    const height = this.heightAt(u);
    const width  = this.widthAt(u);

    for (let j = 0; j <= this.slices; j++) {
      const v = j / this.slices;
      const angle = v * Math.PI * 2.0;

      // posisi titik di penampang (eliptik)
      const localX = Math.cos(angle) * height; // “tinggi” sirip (sumbu X lokal)
      const localY = Math.sin(angle) * width;  // “tebal” sirip (sumbu Y lokal)

      const x = sx + localX;
      const y = sy + localY;
      const z = sz;

      // ===== NORMAL lokal untuk penampang elips =====
      // grad F = (x/a^2, y/b^2, 0) pada (localX, localY)
      let nx = (height > 1e-6) ? (localX / (height*height)) : 0.0;
      let ny = (width  > 1e-6) ? (localY / (width*width))   : 0.0;
      let nz = 0.0;
      const len = Math.hypot(nx, ny, nz) || 1.0;
      nx /= len; ny /= len; // nz tetap 0

      // push: pos(3) + normal(3) + color(3)
      vertices.push(
        x, y, z,
        nx, ny, nz,
        this.color[0], this.color[1], this.color[2]
      );
    }
  }

  // indices sama seperti sebelumnya
  for (let i = 0; i < this.segments; i++) {
    for (let j = 0; j < this.slices; j++) {
      const a = i * (this.slices + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (this.slices + 1) + j;
      const d = c + 1;
      faces.push(a, b, c,  b, d, c);
    }
  }

  // ===== Tip cap (tutup ujung) — normal mengarah ke -Z =====
  {
    const uTip = 0.2;
    const [sx, sy, sz] = this.spineCurve(uTip);
    const tipPush = Math.min(0.08, this.length * 0.08);

    const tipIndex = (vertices.length / 9); // 9 float per vertex sekarang
    vertices.push(
      sx, sy, sz - tipPush,
      0, 0, -1,                          // normal
      this.color[0], this.color[1], this.color[2]
    );

    const ringCount = this.slices + 1;
    const baseStart = (this.segments) * ringCount;
    for (let j = 0; j < this.slices; j++) {
      const a = baseStart + j;
      const b = baseStart + j + 1;
      faces.push(a, b, tipIndex);
    }
  }

  this.vertex = vertices;
  this.faces = faces;
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
  const GL = this.GL;

  // compose model matrix
  const M = LIBS.get_I4();
  LIBS.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
  LIBS.mul(M, M, this.MOVE_MATRIX);
  this.MODEL_MATRIX = M;

  GL.useProgram(this.SHADER_PROGRAM);
  GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

  // kirim normalMatrix (mat3) untuk Phong
  const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
  const normalMat3 = LIBS.get_normal_matrix(this.MODEL_MATRIX);
  GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

  // ====== atribut: pos(3) + normal(3) + color(3) = 9 float → stride 36 ======
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