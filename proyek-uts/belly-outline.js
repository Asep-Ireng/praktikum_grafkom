// belly-outline.js — ribbon tipis mengikuti tepi BellyPatch (longitudinal)
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

export class BellyOutline {
  GL=null; SHADER_PROGRAM=null; _position=null; _color=null; _MMatrix=null;
  OBJECT_VERTEX=null; OBJECT_FACES=null; vertex=[]; faces=[];
  POSITION_MATRIX = LIBS.get_I4(); MOVE_MATRIX = LIBS.get_I4(); MODEL_MATRIX = LIBS.get_I4();

  /**
   * opts:
   *  side: "left" | "right"                      // tepi yang diikuti
   *  width: 0.03                                  // ketebalan garis (X)
   *  length: <samakan dg BellyPatch.length>       // sepanjang Z
   *  widthTop, widthBottom: <samakan dg BellyPatch> // trapezoid belly
   *  segments (>=2), stacks (>=2)                 // resolusi (ikuti BellyPatch)
   *  color: [r,g,b]
   *  bodyRx, bodyRy, bodyRz                       // dari BODY_CONFIG
   *  surfaceEpsilon: 0.04                         // anti z-fighting (offset normal)
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _MMatrix, opts={}) {
    this.GL=GL; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=_position; this._color=_color; this._MMatrix=_MMatrix;

    this.side = opts.side ?? "left";
    this.width = opts.width ?? 0.03;
    this.length = opts.length ?? 3.6;
    this.widthTop = opts.widthTop ?? 1.0;
    this.widthBottom = opts.widthBottom ?? 0.9;
    this.segments = Math.max(2, opts.segments ?? 16);
    this.stacks   = Math.max(2, opts.stacks   ?? 64);
    this.color    = opts.color ?? [0,0,0];

    this.bodyRx = opts.bodyRx ?? 1.2;
    this.bodyRy = opts.bodyRy ?? 1.0;
    this.bodyRz = opts.bodyRz ?? 1.7;
    this.surfaceEps = opts.surfaceEpsilon ?? 0.04;

    this._build();
  }

  _offsetNormal(x,y,z){
    let nx = x/(this.bodyRx*this.bodyRx),
        ny = y/(this.bodyRy*this.bodyRy),
        nz = z/(this.bodyRz*this.bodyRz);
    const L = Math.hypot(nx,ny,nz)||1.0;
    nx/=L; ny/=L; nz/=L;
    return [x+nx*this.surfaceEps, y+ny*this.surfaceEps, z+nz*this.surfaceEps];
  }

  _build(){
    const V=[]; const F=[];
    const col=this.color;

    for(let i=0;i<=this.stacks;i++){
      const w=i/this.stacks;                     // 0..1 (front->back)
      const z = this.length*(0.5 - w);

      // irisan ellipsoid pada z
      const k = 1.0 - (z*z)/(this.bodyRz*this.bodyRz);
      const ring = k>0 ? Math.sqrt(k) : 0.0;
      const maxX = this.bodyRx*ring*0.995;

      // lebar belly di baris ini
      const bellyW = this.widthTop*(1.0-w) + this.widthBottom*w;

      // posisi tepi belly (center->±bellyW/2), lalu buat ribbon tipis ke arah dalam
      const edgeSign = (this.side==="left") ? -1 : +1;
      const centerX  = edgeSign * (bellyW*0.5);
      const halfLine = this.width*0.5;

      // Dua kolom: luar & dalam (jadi ribbon tipis)
      const xs = [centerX - edgeSign*halfLine, centerX + edgeSign*halfLine];

      for(let j=0;j<2;j++){
        let x = clamp(xs[j], -maxX, maxX);

        // y permukaan underside: x^2/rx^2 + y^2/ry^2 + z^2/rz^2 = 1
        const a = (x*x)/(this.bodyRx*this.bodyRx) + (z*z)/(this.bodyRz*this.bodyRz);
        const under = 1.0 - a;
        const y = (under>0) ? (-this.bodyRy*Math.sqrt(under)) : 0.0;

        const [xf,yf,zf] = this._offsetNormal(x,y,z);
        V.push(xf,yf,zf, col[0],col[1],col[2]);
      }
    }

    // Faces: sambungkan 2 kolom ribbon sepanjang stacks
    // index baris: (i*2 + 0/1)
    for(let i=0;i<this.stacks;i++){
      const a0 = i*2, a1=a0+1, b0=a0+2, b1=a1+2;
      F.push(a0,b0,a1);
      F.push(a1,b0,b1);
    }

    this.vertex=V; this.faces=F;
  }

  setup(){
    this.OBJECT_VERTEX=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.vertex),this.GL.STATIC_DRAW);

    this.OBJECT_FACES=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.faces),this.GL.STATIC_DRAW);
  }

  render(PARENT_MATRIX){
    const M = LIBS.get_I4();
    LIBS.mul(M,PARENT_MATRIX,this.POSITION_MATRIX);
    LIBS.mul(M,M,this.MOVE_MATRIX);
    this.GL.useProgram(this.SHADER_PROGRAM);
    this.GL.uniformMatrix4fv(this._MMatrix,false,M);

    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.vertexAttribPointer(this._position,3,this.GL.FLOAT,false,24,0);
    this.GL.vertexAttribPointer(this._color,   3,this.GL.FLOAT,false,24,12);

    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);

    // tarik sedikit ke depan di depth buffer
    const wasCull = this.GL.isEnabled(this.GL.CULL_FACE);
    if (wasCull) this.GL.disable(this.GL.CULL_FACE);
    this.GL.enable(this.GL.POLYGON_OFFSET_FILL);
    this.GL.polygonOffset(-2.0,-2.0);

    this.GL.drawElements(this.GL.TRIANGLES,this.faces.length,this.GL.UNSIGNED_SHORT,0);

    this.GL.disable(this.GL.POLYGON_OFFSET_FILL);
    if (wasCull) this.GL.enable(this.GL.CULL_FACE);
  }
}
