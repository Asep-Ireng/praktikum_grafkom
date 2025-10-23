const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

export class BellyPatch {
  GL=null; SHADER_PROGRAM=null;
  _position=null; _color=null; _normal=null; _MMatrix=null;
  OBJECT_VERTEX=null; OBJECT_FACES=null;
  vertex=[]; faces=[];
  POSITION_MATRIX = LIBS.get_I4();
  MOVE_MATRIX     = LIBS.get_I4();
  MODEL_MATRIX    = LIBS.get_I4();
  childs=[];

  constructor(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, opts={}) {
    this.GL=GL; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=_position; this._color=_color; this._normal=_normal;
    this._MMatrix=_Mmatrix;

    this.widthTop    = opts.widthTop ?? (opts.width ?? 0.8);
    this.widthBottom = opts.widthBottom ?? (opts.width ?? 0.8);
    this.height      = opts.height ?? 2.5;
    this.length      = opts.length ?? 3.0;
    this.segments    = Math.max(2, opts.segments ?? 20);
    this.stacks      = Math.max(2, opts.stacks ?? 30);
    this.color       = opts.color ?? [1,1,1];

    this.bodyRx = opts.bodyRx ?? 1.2;
    this.bodyRy = opts.bodyRy ?? 1.0;
    this.bodyRz = opts.bodyRz ?? 1.7;

    this.longitudinal = (opts.longitudinal ?? true);
    this.frontSide    = opts.frontSide ?? true;
    this.surfaceEps   = opts.surfaceEpsilon ?? 0.04;

    this.bone = {
      name: opts.name ?? "belly_patch",
      position: opts.position ?? [0,0,0],
      rotation: opts.rotation ?? [0,0,0],
      scale:    opts.scale ?? [1,1,1],
    };

    this._build();
  }

  addChild(c){ this.childs.push(c); }

  _n(x,y,z){
    let nx=x/(this.bodyRx*this.bodyRx), ny=y/(this.bodyRy*this.bodyRy), nz=z/(this.bodyRz*this.bodyRz);
    const L=Math.hypot(nx,ny,nz)||1; return [nx/L,ny/L,nz/L];
  }
  _off(x,y,z){ const [nx,ny,nz]=this._n(x,y,z); return [x+nx*this.surfaceEps, y+ny*this.surfaceEps, z+nz*this.surfaceEps]; }

  _build(){
    const V=[], F=[], col=this.color;

    if (this.longitudinal){
      for (let i=0;i<=this.stacks;i++){
        const w=i/this.stacks, z=this.length*(0.5-w);
        const k=1-(z*z)/(this.bodyRz*this.bodyRz), cu=k>0?Math.sqrt(k):0;
        const maxX=this.bodyRx*cu*0.995;
        const width=this.widthTop*(1-w)+this.widthBottom*w;

        for(let j=0;j<=this.segments;j++){
          const u=j/this.segments; let x=width*(u-0.5); x=clamp(x,-maxX,maxX);
          const a=(x*x)/(this.bodyRx*this.bodyRx)+(z*z)/(this.bodyRz*this.bodyRz);
          const under=1-a; const y= under>0? (-this.bodyRy*Math.sqrt(under)) : 0;
          const [nx,ny,nz]=this._n(x,y,z); const [xf,yf,zf]=this._off(x,y,z);
          V.push(xf,yf,zf, nx,ny,nz, col[0],col[1],col[2]);
        }
      }
    } else {
      for (let i=0;i<=this.stacks;i++){
        const v=i/this.stacks, y=this.height*(0.5-v);
        const d=1-(y*y)/(this.bodyRy*this.bodyRy), cu=Math.sqrt(Math.max(0,d));
        const maxX=this.bodyRx*cu*0.995;
        const width=this.widthTop*(1-v)+this.widthBottom*v;

        for(let j=0;j<=this.segments;j++){
          const u=j/this.segments; let x=width*(u-0.5); x=clamp(x,-maxX,maxX);
          let cphi=(this.bodyRx*cu>1e-6)? x/(this.bodyRx*cu) : 0; cphi=clamp(cphi,-1,1);
          const sphi=Math.sqrt(Math.max(0,1-cphi*cphi));
          let z=this.bodyRz*cu*sphi; if(!this.frontSide) z=-z;
          const [nx,ny,nz]=this._n(x,y,z); const [xf,yf,zf]=this._off(x,y,z);
          V.push(xf,yf,zf, nx,ny,nz, col[0],col[1],col[2]);
        }
      }
    }

    const cols=this.segments+1;
    for(let i=0;i<this.stacks;i++){
      for(let j=0;j<this.segments;j++){
        const a=i*cols+j, b=a+1, c=a+cols, d=c+1;
        F.push(a,c,b,  b,c,d);
      }
    }
    this.vertex=V; this.faces=F;
  }

  updateBoneMatrix(){
    let m=LIBS.get_I4();
    LIBS.translateLocal(m, ...this.bone.position);
    LIBS.rotateX(m, this.bone.rotation[0]);
    LIBS.rotateY(m, this.bone.rotation[1]);
    LIBS.rotateZ(m, this.bone.rotation[2]);
    LIBS.scale(m, ...this.bone.scale);
    this.POSITION_MATRIX=m;
  }

  setup(){
    this.OBJECT_VERTEX=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.vertex),this.GL.STATIC_DRAW);

    this.OBJECT_FACES=this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.faces),this.GL.STATIC_DRAW);

    this.childs.forEach(c=>c.setup());
  }

  render(PARENT_MATRIX){
    const GL=this.GL;

    const M=LIBS.get_I4();
    LIBS.mul(M,PARENT_MATRIX,this.POSITION_MATRIX);
    LIBS.mul(M,M,this.MOVE_MATRIX);
    this.MODEL_MATRIX=M;
console.assert(this._MMatrix instanceof WebGLUniformLocation, "Mmatrix bukan uniform location!", this._MMatrix);

    GL.useProgram(this.SHADER_PROGRAM);
    GL.uniformMatrix4fv(this._MMatrix,false,this.MODEL_MATRIX); 
    
    const uNormalMatrix = GL.getUniformLocation(this.SHADER_PROGRAM,"normalMatrix");
    const n3 = LIBS.get_normal_matrix(this.MODEL_MATRIX);
    GL.uniformMatrix3fv(uNormalMatrix,false,n3);

    GL.bindBuffer(GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    GL.vertexAttribPointer(this._position,3,GL.FLOAT,false,36,0);
    GL.vertexAttribPointer(this._normal,  3,GL.FLOAT,false,36,12);
    GL.vertexAttribPointer(this._color,   3,GL.FLOAT,false,36,24);
    GL.enableVertexAttribArray(this._normal);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);

    GL.enable(GL.POLYGON_OFFSET_FILL);
    GL.polygonOffset(-1,-1);
    GL.drawElements(GL.TRIANGLES,this.faces.length,GL.UNSIGNED_SHORT,0);
    GL.disable(GL.POLYGON_OFFSET_FILL);

    this.childs.forEach(c=>c.render(this.MODEL_MATRIX));
  }
}
