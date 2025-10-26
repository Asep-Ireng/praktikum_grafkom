const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smoothstep = (t) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};

export class mudkipBody {
  GL = null; SHADER_PROGRAM = null;
  _position = null; _color = null; _normal = null; _MMatrix = null;
  OBJECT_VERTEX = null; OBJECT_FACES = null;
  vertex = []; faces = [];
  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX = LIBSMudkip.get_I4();
  childs = [];

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
    const rings = Math.max(2, opts.rings ?? 24);
    const color = opts.color ?? [0.7,0.7,0.7];
    const vertexColor = typeof opts.vertexColor === "function" ? opts.vertexColor : null;

    const flattenStartPhi = opts.flattenStartPhi ?? -0.25;
    const flattenStrength = clamp(opts.flattenStrength ?? 0.45, 0, 1);
    const flattenPlaneRatio = clamp(opts.flattenPlaneRatio ?? 0.85, 0, 1);
    const flattenSharpness = Math.max(0.5, opts.flattenSharpness ?? 1.0);
    const lateralTaper = clamp(opts.flattenLateralTaper ?? 0.18, 0, 0.6);

    this.bone = {
      name: opts.name ?? "body",
      position: opts.position ?? [0, 0, 0],
      rotation: opts.rotation ?? [0, 0, 0],
      scale: opts.scale ?? [1, 1, 1],
    };

    this._buildMudkipBody({
      rx, ry, rz, segments, rings, color, vertexColor,
      flattenStartPhi, flattenStrength, flattenPlaneRatio,
      flattenSharpness, lateralTaper
    });
  }

  _buildMudkipBody({
    rx, ry, rz, segments, rings, color, vertexColor,
    flattenStartPhi, flattenStrength, flattenPlaneRatio,
    flattenSharpness, lateralTaper
  }) {
    const verts = [], faces = [];
    const denom = flattenStartPhi + Math.PI / 2;
    const planeY = -ry * flattenPlaneRatio;

    for (let i = 0; i <= rings; i++) {
      const u = -Math.PI / 2 + (i / rings) * Math.PI;
      const cu = Math.cos(u), su = Math.sin(u);

      for (let j = 0; j <= segments; j++) {
        const v = (j / segments) * 2 * Math.PI;
        const cv = Math.cos(v), sv = Math.sin(v);

        let x = rx * cv * cu;
        let y = ry * su;
        let z = rz * sv * cu;

        if (u < flattenStartPhi && denom > 1e-6 && flattenStrength > 0) {
          const tRaw = (flattenStartPhi - u) / denom;
          const eased = smoothstep(Math.pow(tRaw, flattenSharpness));
          const s = flattenStrength * eased;
          if (s > 0) {
            const mixY = planeY * s + y * (1 - s);
            y = mixY;
            const lateralScale = 1 - lateralTaper * s;
            x *= lateralScale;
            z *= lateralScale;
          }
        }

        let c = color;
        if (vertexColor) {
          c = vertexColor({x,y,z,theta:v,phi:u,longitudeIndex:j,latitudeIndex:i,segments,rings});
        }
        if (!c) c = [x/(2*rx)+.5, y/(2*ry)+.5, z/(2*rz)+.5];

        const nx = x / (rx*rx);
        const ny = y / (ry*ry);
        const nz = z / (rz*rz);
        const len = Math.hypot(nx,ny,nz) || 1;
        const n = [nx/len, ny/len, nz/len];

        verts.push(x, y, z, n[0], n[1], n[2], c[0], c[1], c[2]);
      }
    }

    const row = segments + 1;
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i*row + j, b = a+1, c = a+row, d = c+1;
        faces.push(a,b,d, a,d,c);
      }
    }

    this.vertex = verts;
    this.faces = faces;
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

    this.childs.forEach(c=>c.setup());
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

    this.childs.forEach(c=>c.render(this.MODEL_MATRIX));
  }
}
