export class Fin {
  GL=null; 
  SHADER_PROGRAM=null; 
  _position=null; 
  _normal=null; 
  _Mmatrix=null; 
  _Nmatrix=null; 
  LIBS=null;
  _u_color=null;
  _shininess=null; 

  OBJECT_VERTEX=null; 
  OBJECT_NORMAL=null; 
  OBJECT_FACES=null;

  vertices=[]; 
  normals=[]; 
  indices=[]; 
  
  POSITION_MATRIX=null; 
  MOVE_MATRIX=null; 
  
  childs=[];
  
  constructor(GL, LIBS, SHADER_PROGRAM, locations, opts = {}) {
      this.GL=GL; 
      this.LIBS=LIBS; 
      this.SHADER_PROGRAM=SHADER_PROGRAM;
      this._position=locations._position; 
      this._normal=locations._normal;
      this._Mmatrix=locations._Mmatrix; 
      this._Nmatrix=locations._Nmatrix;
      this._u_color=locations._u_color; 
      this._shininess=locations._shininess;
      
      this.POSITION_MATRIX=this.LIBS.get_I4(); 
      this.MOVE_MATRIX=this.LIBS.get_I4();
      
      this.color=opts.color ?? [0.2,0.23,0.28,1]; 
      this.shininess=opts.shininess ?? 10;
      this.scaleX=opts.scaleX ?? 1; 
      this.scaleY=opts.scaleY ?? 1; 
      this.scaleZ=opts.scaleZ ?? 1; 
      this._thicknessOpt=opts.thickness;
      
      this.LIBS.translateX(this.POSITION_MATRIX, opts.x ?? 0);
      this.LIBS.translateY(this.POSITION_MATRIX, opts.y ?? 0);
      this.LIBS.translateZ(this.POSITION_MATRIX, opts.z ?? 0);
      this.LIBS.rotateX(this.POSITION_MATRIX, opts.rx ?? 0);
      this.LIBS.rotateY(this.POSITION_MATRIX, opts.ry ?? 0);
      this.LIBS.rotateZ(this.POSITION_MATRIX, opts.rz ?? 0);
      
      this._buildGeometry();
  }

  _buildGeometry(){
    const baseThickness=0.10; 
    const thickness=(this._thicknessOpt ?? baseThickness)*this.scaleZ;
    const profile=[[0.00,0.00],[0.12,0.28],[0.18,0.70],[0.14,1.05],[0.06,1.30],[0.00,1.45]];

    for(let i=0;i<profile.length;i++){ 
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY,  thickness/2); 
      this.normals.push(0,0,1); 
    }

    for(let i=0;i<profile.length;i++){ 
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY, -thickness/2); 
      this.normals.push(0,0,-1); 
    }

    const l_off=profile.length;
    
    for(let i=0;i<profile.length-2;i++){ 
      this.indices.push(0,i+1,i+2); 
      this.indices.push(l_off,l_off+i+2,l_off+i+1); 
    }

    const edgeNormal=(p0,p1,sign)=>{ 
      const t=[(p1[0]-p0[0])*this.scaleX,(p1[1]-p0[1])*this.scaleY,0]; 
      const b=[0,0,sign]; 
      return this.LIBS.normalize(this.LIBS.cross(b,t)); 
    };

    const boundaryStart=this.vertices.length/3;
    
    for(let i=0;i<profile.length;i++){
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY,  thickness/2); this.normals.push(0,0,1);
      this.vertices.push(profile[i][0]*this.scaleX, profile[i][1]*this.scaleY, -thickness/2); this.normals.push(0,0,-1);
    }
    
    for(let i=0;i<profile.length-1;i++){
      const p0=profile[i], p1=profile[i+1]; const rn=edgeNormal(p0,p1,+1), ln=edgeNormal(p0,p1,-1);
      const r0=boundaryStart+i*2, l0=r0+1, r1=boundaryStart+(i+1)*2, l1=r1+1;
      this.indices.push(r0,l0,l1, r0,l1,r1);
      this.normals[r0*3]=rn[0]; this.normals[r0*3+1]=rn[1]; this.normals[r0*3+2]=rn[2];
      this.normals[r1*3]=rn[0]; this.normals[r1*3+1]=rn[1]; this.normals[r1*3+2]=rn[2];
      this.normals[l0*3]=ln[0]; this.normals[l0*3+1]=ln[1]; this.normals[l0*3+2]=ln[2];
      this.normals[l1*3]=ln[0]; this.normals[l1*3+1]=ln[1]; this.normals[l1*3+2]=ln[2];
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
