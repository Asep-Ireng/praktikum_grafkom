// environment/mist.js
export class Mist {
  GL=null; SHADER_PROGRAM=null;
  _position=null; _color=null; _normal=null; _MMatrix=null;

  POSITION_MATRIX = LIBSMudkip.get_I4();
  MOVE_MATRIX     = LIBSMudkip.get_I4();
  MODEL_MATRIX    = LIBSMudkip.get_I4();

  OBJECT_VERTEX=null; OBJECT_FACES=null;
  vertex=[]; faces=[];

  // data untuk animasi
  _rings=[];
  _t=0;

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _MMatrix, opts={}) {
    this.GL=GL; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=_position; this._color=_color; this._normal=_normal; this._MMatrix=_MMatrix;

    // pusat mist (biasanya tepat di bawah air terjun)
    this.center = opts.center ?? [0, -2.0, -25];
    this.baseY  = opts.baseY  ?? (this.center[1] + 0.05);

    // bentuk & jumlah
    this.rings            = Math.max(2, opts.rings ?? 3);
    this.vertsPerRing     = Math.max(12, opts.vertsPerRing ?? 32);
    this.radiusStart      = opts.radiusStart ?? 1.2;
    this.radiusEnd        = opts.radiusEnd   ?? 2.8;
    this.heightJitter     = opts.heightJitter ?? 0.12;

    // animasi
    this.speed            = opts.speed ?? 0.6;      // kecepatan membesar
    this.fadeExp          = opts.fadeExp ?? 1.6;    // kurva memudar
    this.jitter           = opts.jitter ?? 0.25;    // riak kecil

    // warna (pakai additive blend nanti)
    this.color = opts.color ?? [0.85, 0.95, 1.0];

    this._build();
  }

  _build(){
    const V=[]; const F=[];
    const cx=this.center[0], cy=this.baseY, cz=this.center[2];

    for(let r=0; r<this.rings; r++){
      // setiap ring punya fase awal berbeda biar staggered
      const phase = r/this.rings;
      this._rings.push({phase});

      // buat satu disk (tri fan) — posisi akan dianimasikan tiap frame
      const centerIdx = V.length / 9;
      V.push(cx, cy, cz,   0,1,0,   this.color[0]*0.6, this.color[1]*0.7, this.color[2]*0.8);

      for(let i=0;i<=this.vertsPerRing;i++){
        const a = (i/this.vertsPerRing)*Math.PI*2;
        const x = cx + Math.cos(a)*this.radiusStart;
        const z = cz + Math.sin(a)*this.radiusStart;
        const y = cy + (Math.random()*2-1)*this.heightJitter;

        // normal ke atas (supaya dapet diffuse lembut)
        V.push(x, y, z,   0,1,0,   this.color[0], this.color[1], this.color[2]);
      }

      // faces (fan)
      for(let i=0;i<this.vertsPerRing;i++){
        F.push(centerIdx, centerIdx+1+i, centerIdx+1+((i+1)%this.vertsPerRing));
      }
    }

    this.vertex=V; this.faces=F;
  }

  update(timeMs){
    this._t = timeMs*0.001*this.speed;

    const cx=this.center[0], cy=this.baseY, cz=this.center[2];
    const stride=9;
    let basePtr=0;

    for(let r=0;r<this.rings;r++){
      // index awal untuk ring r (1 pusat + N keliling)
      const centerIdx = basePtr;
      // skala radial 0..1 lalu wrap
      let s = (this._t + this._rings[r].phase) % 1.0;
      // easing kuadrat biar keluar pelan, besar di tengah, pudar di ujung
      const scale = this.radiusStart + (this.radiusEnd - this.radiusStart) * s;
      const fade  = Math.pow(1.0 - s, this.fadeExp);   // 1→0

      // pusat (hanya brighten)
      this.vertex[centerIdx+6] = this.color[0]*0.5*fade;
      this.vertex[centerIdx+7] = this.color[1]*0.6*fade;
      this.vertex[centerIdx+8] = this.color[2]*0.7*fade;

      // update keliling
      for(let i=0;i<=this.vertsPerRing;i++){
        const vi = (basePtr + (i+1)*stride);
        const a  = (i/this.vertsPerRing)*Math.PI*2;

        const ripple = Math.sin(a*6.0 + this._t*2.0 + r*0.9)*this.jitter*0.08;
        const x = cx + Math.cos(a)*(scale + ripple);
        const z = cz + Math.sin(a)*(scale + ripple);
        const y = cy + Math.sin(a*3.0 + this._t*1.7)*this.heightJitter*0.6;

        this.vertex[vi+0]=x;
        this.vertex[vi+1]=y;
        this.vertex[vi+2]=z;

        // brighten sesuai fade
        this.vertex[vi+6]=this.color[0]*fade*0.75;
        this.vertex[vi+7]=this.color[1]*fade*0.85;
        this.vertex[vi+8]=this.color[2]*fade*0.95;
      }

      // loncat ke ring berikutnya (1 + vertsPerRing) * stride
      basePtr += (1 + (this.vertsPerRing+1)) * stride;
    }

    // upload
    const GL=this.GL;
    GL.bindBuffer(GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,new Float32Array(this.vertex),GL.DYNAMIC_DRAW);
  }

  setup(){
    const GL=this.GL;
    this.OBJECT_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,new Float32Array(this.vertex),GL.DYNAMIC_DRAW);

    this.OBJECT_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.faces),GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX){
    const GL=this.GL;
    const M = LIBSMudkip.get_I4();
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

    // additive glow + no depth write → tampak seperti kabut lembut
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE); // additive
    GL.depthMask(false);

    GL.drawElements(GL.TRIANGLES,this.faces.length,GL.UNSIGNED_SHORT,0);

    GL.depthMask(true);
    GL.disable(GL.BLEND);
  }
}
