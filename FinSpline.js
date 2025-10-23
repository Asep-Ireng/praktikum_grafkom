// FinSpline.js — bilah mohawk dari spline (Catmull–Rom → Bezier), diekstrusi di Z
export class FinSpline {
  GL=null; LIBS=null; SHADER_PROGRAM=null;
  _position=null; _normal=null; _Mmatrix=null; _Nmatrix=null; _u_color=null; _shininess=null;
  POSITION_MATRIX=null; MOVE_MATRIX=null; childs=[];
  vertices=[]; normals=[]; indices=[];
  constructor(GL, LIBS, SHADER_PROGRAM, locations, opts={}){
    this.GL=GL; this.LIBS=LIBS; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position   = locations._position;
    this._normal     = locations._normal;
    this._Mmatrix    = locations._Mmatrix;
    this._Nmatrix    = locations._Nmatrix;
    this._u_color    = locations._u_color;
    this._shininess  = locations._shininess;

    this.POSITION_MATRIX=LIBS.get_I4();
    this.MOVE_MATRIX    =LIBS.get_I4();

    // Material
    this.color     = opts.color ?? [60/255,68/255,82/255,1];
    this.shininess = opts.shininess ?? 8.0;

    // Parameter bentuk
    this.thickness = opts.thickness ?? 0.12;     // tebal (total ekstrusi Z)
    this.samples   = opts.samples ?? 56;         // jumlah sampel sepanjang kurva
    this.scaleX    = opts.scaleX ?? 1.0;         // skala global lebar
    this.scaleY    = opts.scaleY ?? 1.0;         // skala global panjang
    this.scaleZ    = opts.scaleZ ?? 1.0;

    // Lebar sepanjang kurva (taper pangkal→ujung)
    this.width0 = opts.width0 ?? 1.00; // pangkal
    this.width1 = opts.width1 ?? 0.70; // tengah
    this.width2 = opts.width2 ?? 0.45; // ujung

    // Transform lokal
    LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
    LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
    LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
    LIBS.rotateX   (this.POSITION_MATRIX, opts.rx ?? 0);
    LIBS.rotateY   (this.POSITION_MATRIX, opts.ry ?? 0);
    LIBS.rotateZ   (this.POSITION_MATRIX, opts.rz ?? 0);

    // Kontrol spline: titik kontrol dari depan ke belakang kepala (tampak samping)
    // Susun dari foto: pangkal tegak, naik, lalu menyapu ke belakang dengan sedikit overhang.
    const ctrl = opts.ctrl ?? [
      [ 0.00, 0.00],  // pangkal (di puncak kepala)
      [ 0.12, 0.32],  // naik
      [ 0.05, 1.36],  // menuju belakang
      [-0.02, 1.56]   // sedikit overhang (ujung agak ke belakang)
    ];
    // Bila Anda ingin pakai Catmull–Rom dengan >4 titik, lewatkan array ctrl lebih panjang dan set opts.catmull=true.

    this._build(ctrl, !!opts.catmull);
  }

  _catmullToBezier(ctrl){
    // Konversi tiap segmen Catmull–Rom ke Bezier kubik
    // Asumsikan ctrl minimal 4 titik. α=0.5 (centripetal) cukup baik.
    const out=[];
    for(let i=0;i<ctrl.length-3;i++){
      const p0=ctrl[i], p1=ctrl[i+1], p2=ctrl[i+2], p3=ctrl[i+3];
      // basis konversi (uniform CR → Bezier)
      const b0=[ p1[0], p1[1] ];
      const b1=[ p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6 ];
      const b2=[ p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6 ];
      const b3=[ p2[0], p2[1] ];
      if(i===0) out.push(b0,b1,b2,b3); else out.push(b1,b2,b3);
    }
    return out; // deretan titik Bezier 3k+1
  }

  _bezierPt(t,p0,p1,p2,p3){
    const u=1-t, tt=t*t, uu=u*u, uuu=uu*u, ttt=tt*t;
    return [ uuu*p0[0] + 3*uu*t*p1[0] + 3*u*tt*p2[0] + ttt*p3[0],
             uuu*p0[1] + 3*uu*t*p1[1] + 3*u*tt*p2[1] + ttt*p3[1] ];
  }
  _bezierDer(t,p0,p1,p2,p3){
    const u=1-t;
    const dx=3*u*u*(p1[0]-p0[0]) + 6*u*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]);
    const dy=3*u*u*(p1[1]-p0[1]) + 6*u*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]);
    return [dx,dy];
  }
  _widthAlong(t){
    if(t<=0.5){ const k=t/0.5; return this.width0*(1-k)+this.width1*k; }
    const k=(t-0.5)/0.5; return this.width1*(1-k)+this.width2*k;
  }

  _build(ctrl, useCatmull){
    // Siapkan segmen Bezier
    let bez=[];
    if(useCatmull && ctrl.length>=4) bez=this._catmullToBezier(ctrl);
    else if(ctrl.length===4) bez=ctrl;
    else throw new Error("ctrl harus 4 titik (Bezier) atau ≥4 (Catmull–Rom).");

    const tHalf=(this.thickness*this.scaleZ)/2;
    this.vertices=[]; this.normals=[]; this.indices=[];
    const pts=[], ders=[];

    // Sampling semua segmen Bezier berurutan
    const segs=(bez.length-1)/3;
    for(let s=0;s<segs;s++){
      const p0=bez[s*4+0], p1=bez[s*4+1], p2=bez[s*4+2], p3=bez[s*4+3];
      const N = (s===segs-1)? this.samples : Math.floor(this.samples/segs);
      for(let i=0;i<=N;i++){
        const g = i/N;           // 0..1 pada segmen
        const t = (s + g)/segs;  // 0..1 menyeluruh
        const w = this._widthAlong(t);
        const [x,y]  = this._bezierPt(g,p0,p1,p2,p3);
        const [dx,dy]= this._bezierDer(g,p0,p1,p2,p3);
        pts .push([ x*this.scaleX*w,  y*this.scaleY ]);
        ders.push([ dx*this.scaleX*w, dy*this.scaleY ]);
      }
      if(s<segs-1) pts.pop(), ders.pop(); // hindari duplikasi titik sambungan
    }

    // Sisi ±Z planar
    for(let i=0;i<pts.length;i++){
      const [x,y]=pts[i];
      this.vertices.push(x,y, tHalf);  this.normals.push(0,0,1);
      this.vertices.push(x,y,-tHalf);  this.normals.push(0,0,-1);
    }
    for(let i=0;i<pts.length-1;i++){
      const a=i*2, b=a+2;
      this.indices.push(a, a+1, b); this.indices.push(a+1, b+1, b);
    }

    // Boundary dengan normal mengikuti kontur (p_u × p_v)
    const bStart=this.vertices.length/3;
    for(let i=0;i<pts.length;i++){
      const [x,y]=pts[i];
      this.vertices.push(x,y, tHalf); this.normals.push(0,0,1);
      this.vertices.push(x,y,-tHalf); this.normals.push(0,0,-1);
    }
    for(let i=0;i<pts.length-1;i++){
      const r0=bStart+i*2, r1=r0+2, l0=r0+1, l1=r1+1;
      const [dx,dy]=ders[i], tangent=[dx,dy,0];
      const binormP=[0,0,1], binormN=[0,0,-1];
      const rn=this.LIBS.normalize(this.LIBS.cross(binormP,tangent));
      const ln=this.LIBS.normalize(this.LIBS.cross(binormN,tangent));
      this.indices.push(r0,l0,l1, r0,l1,r1);
      this.normals[r0*3]=rn[0]; this.normals[r0*3+1]=rn[1]; this.normals[r0*3+2]=rn[2];
      this.normals[r1*3]=rn[0]; this.normals[r1*3+1]=rn[1]; this.normals[r1*3+2]=rn[2];
      this.normals[l0*3]=ln[0]; this.normals[l0*3+1]=ln[1]; this.normals[l0*3+2]=ln[2];
      this.normals[l1*3]=ln[0]; this.normals[l1*3+1]=ln[1]; this.normals[l1*3+2]=ln[2];
    }

    // Buffer
    this.OBJECT_VERTEX=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.vertices),this.GL.STATIC_DRAW);

    this.OBJECT_NORMAL=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_NORMAL);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.normals),this.GL.STATIC_DRAW);

    this.OBJECT_FACES=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.indices),this.GL.STATIC_DRAW);
  }

  setup(){ /* buffer sudah dibuat di _build */ }
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
