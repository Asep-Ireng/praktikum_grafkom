// eye-disc.js
export class EyeDisc {
  GL = null; SHADER_PROGRAM = null;
  _position = null; _color = null; _MMatrix = null;

  OBJECT_VERTEX = null;
  OBJECT_FACES  = null;

  vertex = [];
  faces  = [];

  POSITION_MATRIX = LIBS.get_I4();
  MOVE_MATRIX     = LIBS.get_I4();
  childs = [];

  /**
   * opts:
   * - r: radius (default 0.18)
   * - segments: jumlah segmen melingkar (default 32)
   * - color: [r,g,b] 0..1
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, opts = {}) {
    this.GL = GL; this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position; this._color = _color; this._MMatrix = _Mmatrix;

    const r = opts.r ?? 0.18;
    const segments = Math.max(8, opts.segments ?? 32);
    const color = opts.color ?? [0,0,0];

    this._buildDisc(r, segments, color);
  }

  _buildDisc(r, segments, color) {
    const v = []; const idx = [];

    // pusat
    v.push(0, 0, 0,  color[0], color[1], color[2]);
    // ring
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2.0;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      v.push(x, y, 0,  color[0], color[1], color[2]);
    }

    // triangle fan: 0 = pusat, 1..segments+1 ring
    for (let i = 1; i <= segments; i++) {
      idx.push(0, i, i+1);
    }

    this.vertex = v;
    this.faces  = idx;
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
    const M = LIBS.get_I4();
    LIBS.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBS.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    this.GL.useProgram(this.SHADER_PROGRAM);
    this.GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 24, 0);
    this.GL.vertexAttribPointer(this._color,    3, this.GL.FLOAT, false, 24, 12);

    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.drawElements(this.GL.TRIANGLES, this.faces.length, this.GL.UNSIGNED_SHORT, 0);

    this.childs.forEach(c => c.render(this.MODEL_MATRIX));
  }
}
