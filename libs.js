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
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
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

    translateX: function (m, t) { m[12] += t; },
    translateY: function (m, t) { m[13] += t; },
    translateZ: function (m, t) { m[14] += t; },

    mul: function(out, a, b) {
        let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        let b0  = b[0], b1  = b[1], b2  = b[2], b3  = b[3];
        out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
        out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
        out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
        out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
        
        return out;
    },

    subtract: function(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    },

    cross: function(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    },

    normalize: function(v) {
        var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        if (len > 0.00001) {
            return [v[0]/len, v[1]/len, v[2]/len];
        } else {
            return [0,0,0];
        }
    },

    invert4: function(m){
        // Invers khusus matriks afine (rotasi+skala+translasi)
        const a00=m[0],a01=m[1],a02=m[2];
        const a10=m[4],a11=m[5],a12=m[6];
        const a20=m[8],a21=m[9],a22=m[10];
        const tx=m[12],ty=m[13],tz=m[14];

        const b01 =  a22*a11 - a12*a21;
        const b11 = -a22*a10 + a12*a20;
        const b21 =  a21*a10 - a11*a20;
        let det = a00*b01 + a01*b11 + a02*b21;
        det = 1.0/det;

        const r00 =  b01*det;
        const r01 = (-a22*a01 + a02*a21)*det;
        const r02 = ( a12*a01 - a02*a11)*det;
        const r10 =  b11*det;
        const r11 = ( a22*a00 - a02*a20)*det;
        const r12 = (-a12*a00 + a02*a10)*det;
        const r20 =  b21*det;
        const r21 = (-a21*a00 + a01*a20)*det;
        const r22 = ( a11*a00 - a01*a10)*det;

        return [
            r00, r01, r02, 0,
            r10, r11, r12, 0,
            r20, r21, r22, 0,
            -(r00*tx + r10*ty + r20*tz),
            -(r01*tx + r11*ty + r21*tz),
            -(r02*tx + r12*ty + r22*tz),
            1
        ];
    },

    transpose4: function(m){
        return[
            m[0],m[4],m[8],m[12],
            m[1],m[5],m[9],m[13],
            m[2],m[6],m[10],m[14],
            m[3],m[7],m[11],m[15]
        ]
    },

    getNormalMatrix: function(model){
        return this.transpose4(this.invert4(model));
    }

};