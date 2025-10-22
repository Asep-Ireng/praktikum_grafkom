/**
 * Menghitung koefisien binomial C(n, k) atau 'n choose k'.
 * Diperlukan untuk Polinomial Bernstein.
 */
function combinations(n, k) {
    if (k < 0 || k > n) {
        return 0;
    }
    // Menggunakan loop untuk menghindari faktorial angka besar yang bisa jadi tidak akurat
    let res = 1;
    for (let i = 0; i < k; i++) {
        res = res * (n - i) / (i + 1);
    }
    return res;
}

/**
 * Menghitung Polinomial Bernstein.
 * Ini adalah "bobot" untuk setiap titik kontrol pada kurva Bézier.
 */
function bernsteinPolynomial(i, n, t) {
    return combinations(n, i) * (t ** i) * ((1 - t) ** (n - i));
}

/**
 * Fungsi BARU untuk menghasilkan titik-titik kurva Bézier murni.
 * @param {Array<number>} controlPointsFlat - Array titik kontrol format [x0, y0, x1, y1, ...].
 * @param {number} numPoints - Jumlah titik yang akan digambar untuk kurva.
 * @returns {Array<number>} - Array titik kurva format [x0, y0, x1, y1, ...].
 */
function generateBezier(controlPointsFlat, numPoints) {
    const curves = [];
    const n = (controlPointsFlat.length / 2) - 1; // Derajat kurva (jumlah titik - 1)

    if (n < 0) {
        return []; // Tidak ada titik kontrol, kembalikan array kosong
    }

    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1); // Parameter t dari 0.0 hingga 1.0

        let pointX = 0.0;
        let pointY = 0.0;

        for (let j = 0; j <= n; j++) {
            const bernsteinVal = bernsteinPolynomial(j, n, t);
            // Ambil koordinat x dan y dari array flat
            const cx = controlPointsFlat[j * 2];
            const cy = controlPointsFlat[j * 2 + 1];

            pointX += cx * bernsteinVal;
            pointY += cy * bernsteinVal;
        }
        curves.push(pointX, pointY);
    }
    return curves;
}


function main() {
    var CANVAS = document.getElementById("mycanvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec2 position;

        void main(void) {
            gl_Position = vec4(position, 0., 1.);
            gl_PointSize = 10.0;
        }`;


    var shader_fragment_source = `
        precision mediump float;
        uniform vec3 uColor;
        void main(void) {
            gl_FragColor = vec4(uColor, 1.);
        }`;

    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");


    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);

    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");

    GL.enableVertexAttribArray(_position);

    GL.useProgram(SHADER_PROGRAM);
    var uniform_color = GL.getUniformLocation(SHADER_PROGRAM, "uColor");

    /*======================== THE SHAPES ======================== */
    // Titik kontrol untuk kurva Bézier kubik (4 titik).
    var bezier_controlPoint = [
        -0.8, -0.8,   // P0
        -0.4,  0.8,   // P1
         0.4, -0.8,   // P2
         0.8,  0.8    // P3
    ];

    var CONTROL_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CONTROL_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(bezier_controlPoint), GL.STATIC_DRAW);

    // *** PERUBAHAN DI SINI ***
    // Panggil fungsi generateBezier baru. Parameter 'degree' tidak lagi diperlukan.
    var bezier_vertex = generateBezier(bezier_controlPoint, 100); // 100 adalah jumlah titik kurva

    var CURVE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(bezier_vertex), GL.STATIC_DRAW);

    /*========================= DRAWING ========================= */
    GL.clearColor(0.1, 0.1, 0.1, 1.0); // Warna background lebih gelap agar terlihat
    var animate = function () {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height); // Gunakan seluruh canvas
        GL.clear(GL.COLOR_BUFFER_BIT);

        // --- Gambar Kurva Bézier (warna kuning) ---
        GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 0, 0);
        GL.uniform3f(uniform_color, 1.0, 1.0, 0.0); // Kuning
        GL.drawArrays(GL.LINE_STRIP, 0, bezier_vertex.length / 2);

        // --- Gambar Titik Kontrol (warna merah) dan Garis Bantunya (warna biru) ---
        GL.bindBuffer(GL.ARRAY_BUFFER, CONTROL_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 0, 0);

        // Gambar garis bantu (biru)
        GL.uniform3f(uniform_color, 0.5, 0.5, 1.0); // Biru muda
        GL.drawArrays(GL.LINE_STRIP, 0, bezier_controlPoint.length / 2);

        // Gambar titik kontrol (merah)
        GL.uniform3f(uniform_color, 1.0, 0.0, 0.0); // Merah
        GL.drawArrays(GL.POINTS, 0, bezier_controlPoint.length / 2);


        GL.flush();
        // Hapus requestAnimationFrame agar tidak berulang jika tidak ada animasi
        // window.requestAnimationFrame(animate); 
    };
    
    // Panggil animate sekali saja karena tidak ada yang perlu dianimasikan
    animate(); 
}
window.addEventListener('load', main);