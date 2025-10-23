// environment/foliage.js
export class Foliage {
  GL=null; SHADER_PROGRAM=null;
  _position=null; _color=null; _normal=null; _MMatrix=null;

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX     = LIBSMudkip.get_I4();
  MODEL_MATRIX    = LIBSMudkip.get_I4();

  OBJECT_VERTEX=null; OBJECT_FACES=null;
  vertex=[]; faces=[];

  _seed=13579;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _MMatrix, opts={}){
    this.GL=GL; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=_position; this._color=_color; this._normal=_normal; this._MMatrix=_MMatrix;

    // area scatter (sekitar air terjun)
    this.center   = opts.center ?? [0, -1.9, -23.6];
    this.radius   = opts.radius ?? 6.0;      // sebaran
    this.count    = opts.count  ?? 8;        // jumlah rumpun
    this.seed     = opts.seed   ?? 13579;

    // warna hijau lembap
    this.colors = opts.colors ?? [
      [0.20,0.45,0.28],
      [0.18,0.50,0.32],
      [0.24,0.55,0.30]
    ];

    this._seed=this.seed;
    this._build();
  }

  _rand(){ this._seed = (this._seed*9301 + 49297) % 233280; return this._seed/233280; }
  _r(min,max){ return min + (max-min)*this._rand(); }

  _addHemisphere(x,y,z, rx,ry,rz, color){
    const segments=10, rings=7;
    const vOff = this.vertex.length/9;

    for(let r=0;r<=rings;r++){
      const v = r/rings;
      const phi = v * Math.PI/2.0; // 0..pi/2 (hemisphere)
      for(let s=0;s<=segments;s++){
        const u=s/segments;
        const th=u*2*Math.PI;

        let lx = rx * Math.sin(phi)*Math.cos(th);
        let ly = ry * Math.cos(phi);          // hemisphere atas
        let lz = rz * Math.sin(phi)*Math.sin(th);

        // normal kira-kira
        let nx = lx/(rx*rx), ny=ly/(ry*ry), nz=lz/(rz*rz);
        const nlen = Math.hypot(nx,ny,nz)||1; nx/=nlen; ny/=nlen; nz/=nlen;

        // posisi akhir
        this.vertex.push(x+lx, y+ly, z+lz,  nx,ny,nz,  color[0],color[1],color[2]);
      }
    }
    for(let r=0;r<rings;r++){
      for(let s=0;s<segments;s++){
        const a=vOff + r*(segments+1)+s;
        const b=a+1, c=a+(segments+1), d=c+1;
        this.faces.push(a,c,b,  b,c,d);
      }
    }
  }

  _build(){
    // bikin beberapa rumpun: setiap rumpun = 1 basis + 2–3 dome kecil di atasnya
    for(let i=0;i<this.count;i++){
      const ang = this._r(0,Math.PI*2);
      const rad = this._r(this.radius*0.35, this.radius);
      const x = this.center[0] + Math.cos(ang)*rad;
      const z = this.center[2] + Math.sin(ang)*rad;
      const y = this.center[1] + this._r(-0.1, 0.15); // sedikit variasi tinggi

      const baseC = this.colors[Math.floor(this._r(0,this.colors.length))];
      const c1=[baseC[0]*1.00, baseC[1]*1.00, baseC[2]*1.00];
      const c2=[baseC[0]*0.92, baseC[1]*0.98, baseC[2]*0.92];
      const c3=[baseC[0]*0.85, baseC[1]*0.90, baseC[2]*0.85];

      // basis lebar
      this._addHemisphere(x, y, z,  this._r(0.7,1.2), this._r(0.35,0.55), this._r(0.7,1.2), c1);
      // dome kiri-kanan
      this._addHemisphere(x+this._r(-0.6,-0.2), y+this._r(0.25,0.45), z+this._r(-0.2,0.2),  this._r(0.35,0.65), this._r(0.25,0.45), this._r(0.35,0.65), c2);
      this._addHemisphere(x+this._r(0.2,0.6),   y+this._r(0.25,0.45), z+this._r(-0.2,0.2),  this._r(0.35,0.65), this._r(0.25,0.45), this._r(0.35,0.65), c3);
    }
  }

  setup(){
    const GL=this.GL;
    this.OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,new Float32Array(this.vertex),GL.STATIC_DRAW);

    this.OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.faces),GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX){
    const GL=this.GL;
    const M=LIBSMudkip.get_I4();
    LIBSMudkip.mul(M,PARENT_MATRIX,this.POSITION_MATRIX);
    LIBSMudkip.mul(M,M,this.MOVE_MATRIX);
    this.MODEL_MATRIX=M;

    GL.useProgram(this.SHADER_PROGRAM);
    const n3 = LIBSMudkip.get_normal_matrix(this.MODEL_MATRIX);
    GL.uniformMatrix3fv(this.GL.getUniformLocation(this.SHADER_PROGRAM,"normalMatrix"),false,n3);
    GL.uniformMatrix4fv(this._MMatrix,false,this.MODEL_MATRIX);

    GL.bindBuffer(GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position,3,GL.FLOAT,false,36,0);
    GL.vertexAttribPointer(this._normal,  3,GL.FLOAT,false,36,12);
    GL.vertexAttribPointer(this._color,   3,GL.FLOAT,false,36,24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    GL.drawElements(GL.TRIANGLES,this.faces.length,GL.UNSIGNED_SHORT,0);
  }
}
