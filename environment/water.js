export class Water {
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
  MOVE_MATRIX = LIBSMudkip.get_I4();
  MODEL_MATRIX = LIBSMudkip.get_I4();
  waveTime = 0;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;
    this._MMatrix = _Mmatrix;
    this.size = opts.size ?? 600;
    this.waterLevel = opts.waterLevel ?? -2.2; 
    this.segments = Math.max(64, opts.segments ?? 128);
    this.shallowColor = opts.shallowColor ?? [0.2, 0.7, 0.85];
    this.deepColor = opts.deepColor ?? [0.05, 0.2, 0.45];
    this.waveAmplitude = opts.waveAmplitude ?? 0.35; 
    this.waveFrequency = opts.waveFrequency ?? 0.8;
    this.waveScale = opts.waveScale ?? 0.15; 
    this._buildWaterPlane();
  }

  _getWaveHeight(x, z, time = 0) {
    let height = 0;
    height += Math.sin(x * this.waveScale + time * this.waveFrequency) * Math.cos(z * this.waveScale * 0.8 + time * this.waveFrequency * 0.9) * this.waveAmplitude;
    height += Math.sin(x * this.waveScale * 3.0 + time) * 0.1;
    return height;
  }

  _getColorAtPosition(x, z) {
    const dist = Math.sqrt(x * x + z * z);
    let t = Math.min(Math.max((dist - 40) / 100, 0.0), 1.0);
    return [
      this.shallowColor[0] * (1 - t) + this.deepColor[0] * t,
      this.shallowColor[1] * (1 - t) + this.deepColor[1] * t,
      this.shallowColor[2] * (1 - t) + this.deepColor[2] * t
    ];
  }

  _buildWaterPlane() {
    const vertices = [];
    const faces = [];
    const halfSize = this.size / 2;
    const step = this.size / this.segments;

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const x = -halfSize + j * step;
        const z = -halfSize + i * step;
        const y = this.waterLevel;
        const color = this._getColorAtPosition(x, z);
        vertices.push(x, y, z, 0, 1, 0, color[0], color[1], color[2]);
      }
    }

    const cols = this.segments + 1;
    for (let i = 0; i < this.segments; i++) {
      for (let j = 0; j < this.segments; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        faces.push(a, c, b);
        faces.push(b, c, d);
      }
    }
    this.vertex = vertices;
    this.faces = faces;
  }

  updateWaves(time) {
    this.waveTime = time * 0.001;
    const cols = this.segments + 1;
    const GL = this.GL;

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = (i * cols + j) * 9;
        const x = this.vertex[idx];
        const z = this.vertex[idx + 2];
        
        const waveY = this._getWaveHeight(x, z, this.waveTime);
        this.vertex[idx + 1] = this.waterLevel + waveY;
        
        const d = 0.5;
        const hx = this._getWaveHeight(x + d, z, this.waveTime) - waveY;
        const hz = this._getWaveHeight(x, z + d, this.waveTime) - waveY;
        let nx = -hx;
        let ny = 1.0; 
        let nz = -hz;
        const len = Math.hypot(nx, ny, nz);
        
        this.vertex[idx + 3] = nx/len;
        this.vertex[idx + 4] = ny/len;
        this.vertex[idx + 5] = nz/len;
      }
    }
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.DYNAMIC_DRAW);
  }

  setup() {
    const GL = this.GL;
    this.OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.DYNAMIC_DRAW);
    this.OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX) {
    const GL = this.GL;
    const M = LIBSMudkip.get_I4();
    LIBSMudkip.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBSMudkip.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);
    
    const normalMat3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "normalMatrix");
    if(uNormalMatrix) GL.uniformMatrix3fv(uNormalMatrix, false, normalMat3);

    GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 36, 0);
    GL.vertexAttribPointer(this._normal,   3, GL.FLOAT, false, 36, 12);
    GL.vertexAttribPointer(this._color,    3, GL.FLOAT, false, 36, 24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
    GL.depthMask(false);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
    GL.depthMask(true);
    GL.disable(GL.BLEND);
  }
}