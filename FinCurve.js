// FinCurve.js — bilah mohawk dari kurva Bezier, diekstrusi tipis di Z
export class FinCurve {
  GL=null; SHADER_PROGRAM=null; LIBS=null;
  _position=null; _normal=null; _Mmatrix=null; _Nmatrix=null;
  _u_color=null; _shininess=null;
  OBJECT_VERTEX=null; OBJECT_NORMAL=null; OBJECT_FACES=null;
  vertices=[]; normals=[]; indices=[];
  POSITION_MATRIX=null; MOVE_MATRIX=null; childs=[];

  constructor(GL, LIBS, SHADER_PROGRAM, locations, opts = {}) {
    this.GL=GL; this.LIBS=LIBS; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=locations._position; this._normal=locations._normal;
    this._Mmatrix=locations._Mmatrix; this._Nmatrix=locations._Nmatrix;
    this._u_color=locations._u_color; this._shininess=locations._shininess;

    this.POSITION_MATRIX=this.LIBS.get_I4();
    this.MOVE_MATRIX=this.LIBS.get_I4();

    this.color     = opts.color     ?? [60/255,68/255,82/255,1];
    this.shininess = opts.shininess ?? 8.0;
    this.thickness = opts.thickness ?? 0.10;     // lebar bilah (ekstrusi total di Z)
    this.samples   = opts.samples   ?? 52;       // jumlah sampel sepanjang kurva
    this.scaleX    = opts.scaleX    ?? 1.0;
    this.scaleY    = opts.scaleY    ?? 1.0;
    this.scaleZ    = opts.scaleZ    ?? 1.0;

    // Transform lokal
    this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
    this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
    this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
    this.LIBS.rotateX   (this.POSITION_MATRIX, opts.rx ?? 0);
    this.LIBS.rotateY   (this.POSITION_MATRIX, opts.ry ?? 0);
    this.LIBS.rotateZ   (this.POSITION_MATRIX, opts.rz ?? 0);

    // Titik kontrol Bezier (X,Y) untuk profil mohawk
    const P = opts.ctrl ?? [
      [ 0.00, 0.00],  // pangkal
      [ 0.10, 0.30],  // naik
      [ 0.04, 1.30],  // menuju belakang
      [-0.02, 1.52]   // sedikit overhang
    ];
    this._build(P);
  }

  _bezier(t, p0,p1,p2,p3){
    const u=1-t, tt=t*t, uu=u*u, uuu=uu*u, ttt=tt*t;
    return [
      uuu*p0[0] + 3*uu*t*p1[0] + 3*u*tt*p2[0] + ttt*p3[0],
      uuu*p0[1] + 3*uu*t*p1[1] + 3*u*tt*p2[1] + ttt*p3[1]
    ];
  }
  _bezierDeriv(t, p0,p1,p2,p3){
    const u=1-t;
    const dx=3*u*u*(p1[0]-p0[0]) + 6*u*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]);
    const dy=3*u*u*(p1[1]-p0[1]) + 6*u*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]);
    return [dx,dy];
  }

  _build(P){
    this.vertices=[]; this.normals=[]; this.indices=[];
    const tHalf = (this.thickness*this.scaleZ)/2;

    const pts=[], ders=[];
    for(let i=0;i<=this.samples;i++){
      const t=i/this.samples;
      const [x,y]   = this._bezier(t, P[0],P[1],P[2],P[3]);
      const [dx,dy] = this._bezierDeriv(t, P[0],P[1],P[2],P[3]);
      pts .push([x*this.scaleX,  y*this.scaleY]);
      ders.push([dx*this.scaleX, dy*this.scaleY]);
    }

    // Dua sisi planar (±Z)
    for(let i=0;i<pts.length;i++){
      const [x,y]=pts[i];
      this.vertices.push(x,y, tHalf);  this.normals.push(0,0,1);
      this.vertices.push(x,y,-tHalf);  this.normals.push(0,0,-1);
    }
    // Faces sisi
    for(let i=0;i<pts.length-1;i++){
      const a=i*2, b=a+2;
      this.indices.push(a, a+1, b); this.indices.push(a+1, b+1, b);
    }

    // Vertex boundary untuk jahit tepi mengikuti kontur
    const bStart = this.vertices.length/3;
    for(let i=0;i<pts.length;i++){
      const [x,y]=pts[i];
      this.vertices.push(x,y, tHalf);  this.normals.push(0,0,1);
      this.vertices.push(x,y,-tHalf);  this.normals.push(0,0,-1);
    }
    // Jahit + set normal tepi dari p_u × p_v (tangent × binormal)
    for(let i=0;i<pts.length-1;i++){
      const r0=bStart + i*2, r1=r0+2;
      const l0=r0+1,        l1=r1+1;

      const [dx,dy]=ders[i];
      const tangent=[dx,dy,0];
      const binormP=[0,0,1], binormN=[0,0,-1];

      const rn = this.LIBS.normalize(this.LIBS.cross(binormP, tangent));
      const ln = this.LIBS.normalize(this.LIBS.cross(binormN, tangent));

      this.indices.push(r0,l0,l1, r0,l1,r1);

      this.normals[r0*3+0]=rn[0]; this.normals[r0*3+1]=rn[1]; this.normals[r0*3+2]=rn[2];
      this.normals[r1*3+0]=rn[0]; this.normals[r1*3+1]=rn[1]; this.normals[r1*3+2]=rn[2];
      this.normals[l0*3+0]=ln[0]; this.normals[l0*3+1]=ln[1]; this.normals[l0*3+2]=ln[2];
      this.normals[l1*3+0]=ln[0]; this.normals[l1*3+1]=ln[1]; this.normals[l1*3+2]=ln[2];
    }
  }

  setup(){
    this.OBJECT_VERTEX=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.vertices),this.GL.STATIC_DRAW);

    this.OBJECT_NORMAL=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_NORMAL);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.normals),this.GL.STATIC_DRAW);

    this.OBJECT_FACES=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.indices),this.GL.STATIC_DRAW);

    (this.childs||[]).forEach(c=>c.setup());
  }

  render(PARENT_MATRIX, PARENT_NORMAL_MATRIX){
    const MODEL=this.LIBS.get_I4();
    this.LIBS.mul(MODEL,PARENT_MATRIX,this.POSITION_MATRIX);
    this.LIBS.mul(MODEL,MODEL,this.MOVE_MATRIX);

    const NORMAL=this.LIBS.getNormalMatrix(MODEL);
    this.GL.uniformMatrix4fv(this._Mmatrix,false,MODEL);
    this.GL.uniformMatrix4fv(this._Nmatrix,false,NORMAL);
    this.GL.uniform4fv(this._u_color,this.color);
    this.GL.uniform1f(this._shininess,this.shininess);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.vertexAttribPointer(this._position,3,this.GL.FLOAT,false,0,0);
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_NORMAL);
    this.GL.vertexAttribPointer(this._normal,3,this.GL.FLOAT,false,0,0);
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    this.GL.drawElements(this.GL.TRIANGLES,this.indices.length,this.GL.UNSIGNED_SHORT,0);
  }
}
