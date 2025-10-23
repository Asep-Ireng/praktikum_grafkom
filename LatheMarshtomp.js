export class Lathe {
  GL=null; SHADER_PROGRAM=null; _position=null; _normal=null; _Mmatrix=null; _Nmatrix=null; LIBS=null;
  _u_color=null; _shininess=null; OBJECT_VERTEX=null; OBJECT_NORMAL=null; OBJECT_FACES=null;
  vertices=[]; normals=[]; indices=[]; POSITION_MATRIX=null; MOVE_MATRIX=null; childs=[];
  constructor(GL, LIBS, SHADER_PROGRAM, locations, opts={}){
    this.GL=GL; this.LIBS=LIBS; this.SHADER_PROGRAM=SHADER_PROGRAM;
    this._position=locations._position; this._normal=locations._normal;
    this._Mmatrix=locations._Mmatrix; this._Nmatrix=locations._Nmatrix;
    this._u_color=locations._u_color; this._shininess=locations._shininess;
    this.POSITION_MATRIX=this.LIBS.get_I4(); this.MOVE_MATRIX=this.LIBS.get_I4();
    const controlPoints = opts.controlPoints ?? [[0.5,1,0],[0.5,0,0]];
    const segments = opts.segments ?? 32; const profileSegments = opts.profileSegments ?? 32;
    this.color=opts.color ?? [0.5,0.5,0.5,1]; this.shininess=opts.shininess ?? 10;
    this.scaleX=opts.scaleX ?? 1; this.scaleZ=opts.scaleZ ?? 1;
    this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
    this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
    this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
    this.LIBS.rotateX(this.POSITION_MATRIX, opts.rx ?? 0);
    this.LIBS.rotateY(this.POSITION_MATRIX, opts.ry ?? 0);
    this.LIBS.rotateZ(this.POSITION_MATRIX, opts.rz ?? 0);
    this._buildGeometry(controlPoints, segments, profileSegments);
  }
  _getBezierPoint(t, p0,p1,p2,p3){
    const u=1-t, tt=t*t, uu=u*u, uuu=uu*u, ttt=tt*t;
    return [ uuu*p0[0] + 3*uu*t*p1[0] + 3*u*tt*p2[0] + ttt*p3[0],
             uuu*p0[1] + 3*uu*t*p1[1] + 3*u*tt*p2[1] + ttt*p3[1], 0 ];
  }
  _getBezierDeriv(t, p0,p1,p2,p3){
    const u=1-t;
    const dx=3*u*u*(p1[0]-p0[0]) + 6*u*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]);
    const dy=3*u*u*(p1[1]-p0[1]) + 6*u*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]);
    return [dx,dy];
  }
  _buildGeometry(controlPoints, segments, profileSegments){
    const profilePoints=[]; const profileDerivs=[];
    for(let i=0;i<controlPoints.length-3;i+=3){
      for(let j=0;j<=profileSegments;j++){
        const t=j/profileSegments;
        profilePoints.push(this._getBezierPoint(t, controlPoints[i],controlPoints[i+1],controlPoints[i+2],controlPoints[i+3]));
        profileDerivs.push(this._getBezierDeriv(t, controlPoints[i],controlPoints[i+1],controlPoints[i+2],controlPoints[i+3]));
      }
    }
    for(let i=0;i<profilePoints.length;i++){
      const r0=profilePoints[i][0], y0=profilePoints[i][1];
      const dr=profileDerivs[i][0], dy=profileDerivs[i][1];
      for(let j=0;j<=segments;j++){
        const u=(j/segments)*2*Math.PI, cu=Math.cos(u), su=Math.sin(u);
        const x = r0*this.scaleX*cu, y=y0, z=r0*this.scaleZ*su;
        this.vertices.push(x,y,z);
        const pu=[-r0*this.scaleX*su, 0, r0*this.scaleZ*cu];
        const pv=[ dr*this.scaleX*cu, dy, dr*this.scaleZ*su ];
        const nx = pu[1]*pv[2] - pu[2]*pv[1];
        const ny = pu[2]*pv[0] - pu[0]*pv[2];
        const nz = pu[0]*pv[1] - pu[1]*pv[0];
        const L=Math.hypot(nx,ny,nz)||1; this.normals.push(nx/L,ny/L,nz/L);
      }
    }
    for(let i=0;i<profilePoints.length-1;i++){
      for(let j=0;j<segments;j++){
        const first=i*(segments+1)+j; const second=first+segments+1;
        this.indices.push(first, second, first+1); this.indices.push(second, second+1, first+1);
      }
    }
  }
  setup(){
    this.OBJECT_VERTEX=this.GL.createBuffer(); this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.vertices),this.GL.STATIC_DRAW);
    this.OBJECT_NORMAL=this.GL.createBuffer(); this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_NORMAL);
    this.GL.bufferData(this.GL.ARRAY_BUFFER,new Float32Array(this.normals),this.GL.STATIC_DRAW);
    this.OBJECT_FACES=this.GL.createBuffer(); this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES);
    this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER,new Uint16Array(this.indices),this.GL.STATIC_DRAW);
    (this.childs||[]).forEach(c=>c.setup());
  }
  render(PARENT_MATRIX, PARENT_NORMAL_MATRIX){
    const MODEL=this.LIBS.get_I4(); this.LIBS.mul(MODEL,PARENT_MATRIX,this.POSITION_MATRIX); this.LIBS.mul(MODEL,MODEL,this.MOVE_MATRIX);
    const NORMAL=this.LIBS.getNormalMatrix(MODEL);
    this.GL.uniformMatrix4fv(this._Mmatrix,false,MODEL); this.GL.uniformMatrix4fv(this._Nmatrix,false,NORMAL);
    this.GL.uniform4fv(this._u_color,this.color); this.GL.uniform1f(this._shininess,this.shininess);
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_VERTEX); this.GL.vertexAttribPointer(this._position,3,this.GL.FLOAT,false,0,0);
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER,this.OBJECT_NORMAL); this.GL.vertexAttribPointer(this._normal,3,this.GL.FLOAT,false,0,0);
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER,this.OBJECT_FACES); this.GL.drawElements(this.GL.TRIANGLES,this.indices.length,this.GL.UNSIGNED_SHORT,0);
    (this.childs||[]).forEach(c=>c.render(MODEL,NORMAL));
  }
}
