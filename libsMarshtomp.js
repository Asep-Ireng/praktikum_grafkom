var LIBS = {
  degToRad: function (angle) { return (angle * Math.PI / 180); },
  get_projection: function (angle, a, zMin, zMax) {
    var tan = Math.tan(LIBS.degToRad(0.5 * angle)),
        A = -(zMax + zMin) / (zMax - zMin),
        B = (-2 * zMax * zMin) / (zMax - zMin);
    return [ 0.5 / tan,0,0,0, 0,0.5 * a / tan,0,0, 0,0,A,-1, 0,0,B,0 ];
  },
  get_I4: function () { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; },
  set_I4: function (m) { m[0]=1;m[1]=0;m[2]=0;m[3]=0;m[4]=0;m[5]=1;m[6]=0;m[7]=0;m[8]=0;m[9]=0;m[10]=1;m[11]=0;m[12]=0;m[13]=0;m[14]=0;m[15]=1; },
  rotateX: function (m, a){var c=Math.cos(a),s=Math.sin(a),mv1=m[1],mv5=m[5],mv9=m[9];m[1]=m[1]*c-m[2]*s;m[5]=m[5]*c-m[6]*s;m[9]=m[9]*c-m[10]*s;m[2]=m[2]*c+mv1*s;m[6]=m[6]*c+mv5*s;m[10]=m[10]*c+mv9*s;},
  rotateY: function (m, a){var c=Math.cos(a),s=Math.sin(a),mv0=m[0],mv4=m[4],mv8=m[8];m[0]=c*m[0]+s*m[2];m[4]=c*m[4]+s*m[6];m[8]=c*m[8]+s*m[10];m[2]=c*m[2]-s*mv0;m[6]=c*m[6]-s*mv4;m[10]=c*m[10]-s*mv8;},
  rotateZ: function (m, a){var c=Math.cos(a),s=Math.sin(a),mv0=m[0],mv4=m[4],mv8=m[8];m[0]=c*m[0]-s*m[1];m[4]=c*m[4]-s*m[5];m[8]=c*m[8]-s*m[9];m[1]=c*m[1]+s*mv0;m[5]=c*m[5]+s*mv4;m[9]=c*m[9]+s*mv8;},
  translateX: function (m,t){ m[12]+=t; }, translateY: function (m,t){ m[13]+=t; }, translateZ: function (m,t){ m[14]+=t; },
  mul: function(out,a,b){
    let a00=a[0],a01=a[1],a02=a[2],a03=a[3], a10=a[4],a11=a[5],a12=a[6],a13=a[7],
        a20=a[8],a21=a[9],a22=a[10],a23=a[11], a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    let b0=b[0],b1=b[1],b2=b[2],b3=b[3];
    out[0]=b0*a00+b1*a10+b2*a20+b3*a30; out[1]=b0*a01+b1*a11+b2*a21+b3*a31; out[2]=b0*a02+b1*a12+b2*a22+b3*a32; out[3]=b0*a03+b1*a13+b2*a23+b3*a33;
    b0=b[4];b1=b[5];b2=b[6];b3=b[7];
    out[4]=b0*a00+b1*a10+b2*a20+b3*a30; out[5]=b0*a01+b1*a11+b2*a21+b3*a31; out[6]=b0*a02+b1*a12+b2*a22+b3*a32; out[7]=b0*a03+b1*a13+b2*a23+b3*a33;
    b0=b[8];b1=b[9];b2=b[10];b3=b[11];
    out[8]=b0*a00+b1*a10+b2*a20+b3*a30; out[9]=b0*a01+b1*a11+b2*a21+b3*a31; out[10]=b0*a02+b1*a12+b2*a22+b3*a32; out[11]=b0*a03+b1*a13+b2*a23+b3*a33;
    b0=b[12];b1=b[13];b2=b[14];b3=b[15];
    out[12]=b0*a00+b1*a10+b2*a20+b3*a30; out[13]=b0*a01+b1*a11+b2*a21+b3*a31; out[14]=b0*a02+b1*a12+b2*a22+b3*a32; out[15]=b0*a03+b1*a13+b2*a23+b3*a33;
    return out;
  },
  subtract: function(a,b){ return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; },
  cross: function(a,b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; },
  normalize: function(v){ var L=Math.hypot(v[0],v[1],v[2]); return L>1e-5?[v[0]/L,v[1]/L,v[2]/L]:[0,0,0]; },
  invert4: function(m){
    const a00=m[0],a01=m[1],a02=m[2], a10=m[4],a11=m[5],a12=m[6], a20=m[8],a21=m[9],a22=m[10], tx=m[12],ty=m[13],tz=m[14];
    const b01=a22*a11-a12*a21, b11=-a22*a10+a12*a20, b21=a21*a10-a11*a20;
    let det=a00*b01+a01*b11+a02*b21; det=1.0/det;
    const r00=b01*det, r01=(-a22*a01+a02*a21)*det, r02=(a12*a01-a02*a11)*det;
    const r10=b11*det, r11=(a22*a00-a02*a20)*det, r12=(-a12*a00+a02*a10)*det;
    const r20=b21*det, r21=(-a21*a00+a01*a20)*det, r22=(a11*a00-a01*a10)*det;
    return [r00,r01,r02,0, r10,r11,r12,0, r20,r21,r22,0, -(r00*tx+r10*ty+r20*tz), -(r01*tx+r11*ty+r21*tz), -(r02*tx+r12*ty+r22*tz), 1];
  },
  transpose4: function(m){ return [m[0],m[4],m[8],m[12], m[1],m[5],m[9],m[13], m[2],m[6],m[10],m[14], m[3],m[7],m[11],m[15]]; },
  getNormalMatrix: function(modelMatrix){ 
    return [
      modelMatrix[0], modelMatrix[1], modelMatrix[2],
      modelMatrix[4], modelMatrix[5], modelMatrix[6],
      modelMatrix[8], modelMatrix[9], modelMatrix[10]
    ]; 
  },
  
  translate(M, x, y, z){
    const T = this.get_I4();
    this.translateX(T, x);
    this.translateY(T, y);
    this.translateZ(T, z);
    this.mul(M, M, T);
  },

  scale: function(M, sx, sy, sz) {
    const S = this.get_I4();
    S[0] = sx;
    S[5] = sy;
    S[10] = sz;
    this.mul(M, M, S);
  },

// lookAt sederhana (jika belum ada)
  lookAt(M, eye, target, up){
    // Hitung vektor z (direction dari target ke eye)
    const zAxis = [
      eye[0] - target[0],
      eye[1] - target[1],
      eye[2] - target[2]
    ];
    
    // Normalisasi z axis
    let zLen = Math.sqrt(zAxis[0]*zAxis[0] + zAxis[1]*zAxis[1] + zAxis[2]*zAxis[2]);
    if (zLen > 0.00001) {
      zAxis[0] /= zLen;
      zAxis[1] /= zLen;
      zAxis[2] /= zLen;
    }
    
    // Hitung vektor x (cross product dari up dan z)
    const xAxis = [
      up[1] * zAxis[2] - up[2] * zAxis[1],
      up[2] * zAxis[0] - up[0] * zAxis[2],
      up[0] * zAxis[1] - up[1] * zAxis[0]
    ];
    
    // Normalisasi x axis
    let xLen = Math.sqrt(xAxis[0]*xAxis[0] + xAxis[1]*xAxis[1] + xAxis[2]*xAxis[2]);
    if (xLen > 0.00001) {
      xAxis[0] /= xLen;
      xAxis[1] /= xLen;
      xAxis[2] /= xLen;
    }
    
    // Hitung vektor y (cross product dari z dan x)
    const yAxis = [
      zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1],
      zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2],
      zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0]
    ];
    
    // Isi view matrix
    M[0] = xAxis[0];
    M[1] = yAxis[0];
    M[2] = zAxis[0];
    M[3] = 0;
    
    M[4] = xAxis[1];
    M[5] = yAxis[1];
    M[6] = zAxis[1];
    M[7] = 0;
    
    M[8] = xAxis[2];
    M[9] = yAxis[2];
    M[10] = zAxis[2];
    M[11] = 0;
    
    M[12] = -(xAxis[0]*eye[0] + xAxis[1]*eye[1] + xAxis[2]*eye[2]);
    M[13] = -(yAxis[0]*eye[0] + yAxis[1]*eye[1] + yAxis[2]*eye[2]);
    M[14] = -(zAxis[0]*eye[0] + zAxis[1]*eye[1] + zAxis[2]*eye[2]);
    M[15] = 1;
  }
};

window.LIBSMarshtomp = LIBS;