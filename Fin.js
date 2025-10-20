// Fin.js (fixed: bind this for edgeNormal, curved profile, stitched edge normals)
export class Fin {
  GL=null; SHADER_PROGRAM=null; _position=null; _normal=null; _Mmatrix=null; _Nmatrix=null; LIBS=null;
  OBJECT_VERTEX=null; OBJECT_NORMAL=null; OBJECT_FACES=null;
  vertices=[]; normals=[]; indices=[];
  POSITION_MATRIX=null; MOVE_MATRIX=null;
  childs=[];

  constructor(GL, LIBS, SHADER_PROGRAM, locations, opts = {}) {
    this.GL = GL; this.LIBS = LIBS; this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = locations._position; this._normal = locations._normal;
    this._Mmatrix = locations._Mmatrix; this._Nmatrix = locations._Nmatrix;
    this._u_color = locations._u_color; this._shininess = locations._shininess;

    this.POSITION_MATRIX = this.LIBS.get_I4();
    this.MOVE_MATRIX     = this.LIBS.get_I4();

    this.color     = opts.color     ?? [0.2, 0.23, 0.28, 1.0];
    this.shininess = opts.shininess ?? 10.0;

    this.scaleX = opts.scaleX ?? 1.0;
    this.scaleY = opts.scaleY ?? 1.0;
    this.scaleZ = opts.scaleZ ?? 1.0;
    this._thicknessOpt = opts.thickness;

    this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
    this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
    this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
    this.LIBS.rotateX   (this.POSITION_MATRIX, opts.rx ?? 0);
    this.LIBS.rotateY   (this.POSITION_MATRIX, opts.ry ?? 0);
    this.LIBS.rotateZ   (this.POSITION_MATRIX, opts.rz ?? 0);

    this._buildGeometry();
  }

  _buildGeometry(){
    const baseThickness = 0.10;
    const thickness = (this._thicknessOpt ?? baseThickness) * this.scaleZ;

    const profile = [
        [ 0.00, 0.00],  // pangkal
        [ 0.10, 0.30],  // naik
        [ 0.16, 0.75],  // puncak depan
        [ 0.12, 1.10],  // mulai ke belakang
        [ 0.04, 1.35],  // mendekati puncak kepala
        [-0.02, 1.48],  // sedikit overhang ke belakang
        [-0.06, 1.52]   // ekor tipis ke belakang kepala
    ];

    // dua sisi planar
    for(let i=0;i<profile.length;i++){
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY,  thickness/2);
      this.normals .push(0,0,1);
    }
    for(let i=0;i<profile.length;i++){
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY, -thickness/2);
      this.normals .push(0,0,-1);
    }
    const l_off = profile.length;

    for(let i=0;i<profile.length-2;i++){
      this.indices.push(0, i+1, i+2);                 // kanan
      this.indices.push(l_off, l_off+i+2, l_off+i+1); // kiri (winding balik)
    }

    // fungsi normal tepi; HARUS pakai this dari instance Fin
    const edgeNormal = (p0, p1, sign) => {
      const t = [ (p1[0]-p0[0])*this.scaleX, (p1[1]-p0[1])*this.scaleY, 0 ];
      const b = [ 0, 0, sign ];
      return this.LIBS.normalize(this.LIBS.cross(b, t));
    };

    // vertex boundary tambahan
    const boundaryStart = this.vertices.length/3;
    for(let i=0;i<profile.length;i++){
      // kanan
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY,  thickness/2);
      this.normals .push(0,0,1);
      // kiri
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY, -thickness/2);
      this.normals .push(0,0,-1);
    }

    // stitch boundary + tulis normal tepi
    for(let i=0;i<profile.length-1;i++){
      const p0 = profile[i], p1 = profile[i+1];
      const rn = edgeNormal(p0, p1, +1);
      const ln = edgeNormal(p0, p1, -1);

      const r0 = boundaryStart + i*2;
      const l0 = r0 + 1;
      const r1 = boundaryStart + (i+1)*2;
      const l1 = r1 + 1;

      this.indices.push(r0, l0, l1,  r0, l1, r1);

      // kanan
      this.normals[r0*3+0]=rn[0]; this.normals[r0*3+1]=rn[1]; this.normals[r0*3+2]=rn[2];
      this.normals[r1*3+0]=rn[0]; this.normals[r1*3+1]=rn[1]; this.normals[r1*3+2]=rn[2];
      // kiri
      this.normals[l0*3+0]=ln[0]; this.normals[l0*3+1]=ln[1]; this.normals[l0*3+2]=ln[2];
      this.normals[l1*3+0]=ln[0]; this.normals[l1*3+1]=ln[1]; this.normals[l1*3+2]=ln[2];
    }
  }

  setup(){
    this.OBJECT_VERTEX = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertices), this.GL.STATIC_DRAW);

    this.OBJECT_NORMAL = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_NORMAL);
    this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.normals), this.GL.STATIC_DRAW);

    this.OBJECT_FACES = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), this.GL.STATIC_DRAW);

    this.childs.forEach(child => child.setup());
  }

  render(PARENT_MATRIX, PARENT_NORMAL_MATRIX){
    const MODEL_MATRIX = this.LIBS.get_I4();
    this.LIBS.mul(MODEL_MATRIX, PARENT_MATRIX, this.POSITION_MATRIX);
    this.LIBS.mul(MODEL_MATRIX, MODEL_MATRIX, this.MOVE_MATRIX);

    const NORMAL_MATRIX = this.LIBS.getNormalMatrix(MODEL_MATRIX);

    this.GL.uniformMatrix4fv(this._Mmatrix, false, MODEL_MATRIX);
    this.GL.uniformMatrix4fv(this._Nmatrix, false, NORMAL_MATRIX);
    this.GL.uniform4fv(this._u_color, this.color);
    this.GL.uniform1f(this._shininess, this.shininess);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
    this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 0, 0);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_NORMAL);
    this.GL.vertexAttribPointer(this._normal, 3, this.GL.FLOAT, false, 0, 0);

    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
    this.GL.drawElements(this.GL.TRIANGLES, this.indices.length, this.GL.UNSIGNED_SHORT, 0);

    this.childs.forEach(child => child.render(MODEL_MATRIX, NORMAL_MATRIX));
  }
}
