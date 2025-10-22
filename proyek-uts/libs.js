
var LIBS = {
    degToRad: function (angle) {
        return (angle * Math.PI / 180);
    },


    get_projection: function (angle, a, zMin, zMax) {
        var tan = Math.tan(LIBS.degToRad(0.5 * angle)),
            A = -(zMax + zMin) / (zMax - zMin),
            B = (-2 * zMax * zMin) / (zMax - zMin);


        return [
            0.5 / tan, 0, 0, 0,
            0, 0.5 * a / tan, 0, 0,
            0, 0, A, -1,
            0, 0, B, 0
        ];
    },


    get_I4: function () {
        return [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
    },


    set_I4: function (m) {
        m[0] = 1, m[1] = 0, m[2] = 0, m[3] = 0,
            m[4] = 0, m[5] = 1, m[6] = 0, m[7] = 0,
            m[8] = 0, m[9] = 0, m[10] = 1, m[11] = 0,
            m[12] = 0, m[13] = 0, m[14] = 0, m[15] = 1;
    },


    rotateX: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv1 = m[1], mv5 = m[5], mv9 = m[9];
        m[1] = m[1] * c - m[2] * s;
        m[5] = m[5] * c - m[6] * s;
        m[9] = m[9] * c - m[10] * s;


        m[2] = m[2] * c + mv1 * s;
        m[6] = m[6] * c + mv5 * s;
        m[10] = m[10] * c + mv9 * s;
    },


    rotateY: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] + s * m[2];
        m[4] = c * m[4] + s * m[6];
        m[8] = c * m[8] + s * m[10];


        m[2] = c * m[2] - s * mv0;
        m[6] = c * m[6] - s * mv4;
        m[10] = c * m[10] - s * mv8;
    },


    rotateZ: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] - s * m[1];
        m[4] = c * m[4] - s * m[5];
        m[8] = c * m[8] - s * m[9];


        m[1] = c * m[1] + s * mv0;
        m[5] = c * m[5] + s * mv4;
        m[9] = c * m[9] + s * mv8;
    },


    translateZ: function (m, t) {
        m[14] += t;
    },
    translateX: function (m, t) {
        m[12] += t;
    },
    translateY: function (m, t) {
        m[13] += t;
    },


    set_position: function (m, x, y, z) {
        m[12] = x, m[13] = y, m[14] = z;
    },

    translateLocal : function (m, x, y, z) {
  m[12] += x * m[0] + y * m[4] + z * m[8];
  m[13] += x * m[1] + y * m[5] + z * m[9];
  m[14] += x * m[2] + y * m[6] + z * m[10];
},

// column-major (OpenGL-style) mat4 multiply: out = a * b
mul : function (out, a, b) {
  const a0 = a[0],  a1 = a[1],  a2 = a[2],  a3 = a[3];
  const a4 = a[4],  a5 = a[5],  a6 = a[6],  a7 = a[7];
  const a8 = a[8],  a9 = a[9],  a10 = a[10], a11 = a[11];
  const a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];

  const b0 = b[0],  b1 = b[1],  b2 = b[2],  b3 = b[3];
  const b4 = b[4],  b5 = b[5],  b6 = b[6],  b7 = b[7];
  const b8 = b[8],  b9 = b[9],  b10 = b[10], b11 = b[11];
  const b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

  out[0] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
  out[1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
  out[2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
  out[3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;

  out[4] = a0 * b4 + a4 * b5 + a8 * b6 + a12 * b7;
  out[5] = a1 * b4 + a5 * b5 + a9 * b6 + a13 * b7;
  out[6] = a2 * b4 + a6 * b5 + a10 * b6 + a14 * b7;
  out[7] = a3 * b4 + a7 * b5 + a11 * b6 + a15 * b7;

  out[8] = a0 * b8 + a4 * b9 + a8 * b10 + a12 * b11;
  out[9] = a1 * b8 + a5 * b9 + a9 * b10 + a13 * b11;
  out[10] = a2 * b8 + a6 * b9 + a10 * b10 + a14 * b11;
  out[11] = a3 * b8 + a7 * b9 + a11 * b10 + a15 * b11;

  out[12] = a0 * b12 + a4 * b13 + a8 * b14 + a12 * b15;
  out[13] = a1 * b12 + a5 * b13 + a9 * b14 + a13 * b15;
  out[14] = a2 * b12 + a6 * b13 + a10 * b14 + a14 * b15;
  out[15] = a3 * b12 + a7 * b13 + a11 * b14 + a15 * b15;
},

scale : function (m, sx, sy, sz) {
  m[0] *= sx;  m[1] *= sx;  m[2] *= sx;  m[3] *= sx;
  m[4] *= sy;  m[5] *= sy;  m[6] *= sy;  m[7] *= sy;
  m[8] *= sz;  m[9] *= sz;  m[10] *= sz; m[11] *= sz;
},

    composeTRS : function (t) {
  const m = LIBS.get_I4();
  // T then R then S (you can change order if needed)
  LIBS.translateLocal(m, t.position[0], t.position[1], t.position[2]);
  LIBS.rotateX(m, t.rotation[0]);
  LIBS.rotateY(m, t.rotation[1]);
  LIBS.rotateZ(m, t.rotation[2]);
  LIBS.scale(m, t.scale[0], t.scale[1], t.scale[2]);
  return m;
},
};

LIBS.multiply = function (a, b) {
  const out = this.get_I4();
  this.mul(out, a, b);
  return out;
};

LIBS.get_normal_matrix = function(M){
  const a00=M[0],a01=M[1],a02=M[2];
  const a10=M[4],a11=M[5],a12=M[6];
  const a20=M[8],a21=M[9],a22=M[10];
  let b00=a11*a22-a12*a21;
  let b01=a02*a21-a01*a22;
  let b02=a01*a12-a02*a11;
  let b10=a12*a20-a10*a22;
  let b11=a00*a22-a02*a20;
  let b12=a02*a10-a00*a12;
  let b20=a10*a21-a11*a20;
  let b21=a01*a20-a00*a21;
  let b22=a00*a11-a01*a10;
  let det=a00*b00+a01*b10+a02*b20;
  if(!det) return new Float32Array([1,0,0,0,1,0,0,0,1]);
  det=1.0/det;
  b00*=det; b01*=det; b02*=det;
  b10*=det; b11*=det; b12*=det;
  b20*=det; b21*=det; b22*=det;
  return new Float32Array([
    b00,b10,b20,
    b01,b11,b21,
    b02,b12,b22
  ]);
};