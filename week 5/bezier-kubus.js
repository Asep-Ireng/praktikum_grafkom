function combinations(n, k) {
    if (k < 0 || k > n) return 0;
    let res = 1;
    for (let i = 0; i < k; i++) res = res * (n - i) / (i + 1);
    return res;
}
function bernsteinPolynomial(i, n, t) {
    return combinations(n, i) * (t ** i) * ((1 - t) ** (n - i));
}
// Evaluasi Bézier pada t (0..1) mengembalikan [x, y]
function evaluateBezier(controlPointsFlat, t) {
    const n = (controlPointsFlat.length / 2) - 1;
    let x = 0, y = 0;
    for (let i = 0; i <= n; i++) {
        const b = bernsteinPolynomial(i, n, t);
        x += controlPointsFlat[i * 2] * b;
        y += controlPointsFlat[i * 2 + 1] * b;
    }
    return [x, y];
}
// (opsional) generate array titik untuk debugging/men-draw seluruh kurva
function generateBezier(controlPointsFlat, numPoints) {
    const curves = [];
    const n = (controlPointsFlat.length / 2) - 1;
    if (n < 0) return [];
    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        let pointX = 0.0, pointY = 0.0;
        for (let j = 0; j <= n; j++) {
            const bernsteinVal = bernsteinPolynomial(j, n, t);
            const cx = controlPointsFlat[j * 2];
            const cy = controlPointsFlat[j * 2 + 1];
            pointX += cx * bernsteinVal;
            pointY += cy * bernsteinVal;
        }
        curves.push(pointX, pointY);
    }
    return curves;
}

// ===================== main (gabungan cube + bezier) =====================
function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*===================== GET WEBGL CONTEXT ===================== */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= SHADERS (cube) ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        attribute vec3 color;
        varying vec3 vColor;

        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color;
        }`;

    var shader_fragment_source = `
        precision mediump float;
        varying vec3 vColor;
        uniform float greyScality;

        void main(void) {
            float greyScaleValue = (vColor.r + vColor.b + vColor.g) / 3.0;
            vec3 greyScaleColor = vec3(greyScaleValue, greyScaleValue, greyScaleValue);
            vec3 color = mix(vColor, greyScaleColor, greyScality);
            gl_FragColor = vec4(color, 1.0);
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

    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    var _greyscality = GL.getUniformLocation(SHADER_PROGRAM, "greyScality");

    GL.useProgram(SHADER_PROGRAM);

    /*======================== CUBE DATA ======================== */
    var cube_vertex = [
        -1, -1, -1, 0, 0, 0,
        1, -1, -1, 1, 0, 0,
        1,  1, -1, 1, 1, 0,
        -1,  1, -1, 0, 1, 0,
        -1, -1,  1, 0, 0, 1,
        1, -1,  1, 1, 0, 1,
        1,  1,  1, 1, 1, 1,
        -1,  1,  1, 0, 1, 1
    ];

    var cube_faces = [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        0, 3, 7, 0, 4, 7,
        1, 2, 6, 1, 5, 6,
        2, 3, 6, 3, 7, 6,
        0, 1, 5, 0, 4, 5
    ];

    var CUBE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(cube_vertex), GL.STATIC_DRAW);

    var CUBE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube_faces), GL.STATIC_DRAW);

    /*======================== PROJECTION / VIEW / MOVE ========================= */
    // LIBS harus tersedia (kode awalmu menggunakan LIBS)
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();
    LIBS.translateZ(VIEWMATRIX, -6);

    /*======================== INTERACTION ========================= */
    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var FRICTION = 0.05;
    var dX = 0, dY = 0;

    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX; y_prev = e.pageY;
        e.preventDefault(); return false;
    };
    var mouseUp = function (e) { drag = false; };
    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX; PHI += dY;
        x_prev = e.pageX; y_prev = e.pageY;
        e.preventDefault();
    };
    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    var SPEED = 0.05;
    var keyDown = function (e) {
        if (e.key === 'w') dY -= SPEED;
        else if (e.key === 'a') dX -= SPEED;
        else if (e.key === 's') dY += SPEED;
        else if (e.key === 'd') dX += SPEED;
    };
    window.addEventListener("keydown", keyDown, false);

    /*======================== BEZIER CONTROL POINTS ========================= */
    // Titik kontrol dalam ruang clip-ish (-1..1) -- bisa diubah
    var bezier_controlPoint = [
        -0.8, -0.8,   // P0
        -0.4,  0.8,   // P1
         0.4, -0.8,   // P2
         0.8,  0.8    // P3
    ];
    // Buat juga array kurva untuk digambar (opsional, debug)
    var bezier_vertex = generateBezier(bezier_controlPoint, 200); // banyak titik

    /*========================= DRAWING SETUP ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.0, 0.0, 0.0, 1.0);
    GL.clearDepth(1.0);

    // Buffer untuk menggambar kurva (agar terlihat)
    // Kita akan menggunakan shader sederhana (reuse attribute position in same program)
    // untuk menggambar garis kurva kita tetap bisa memakai atribut 'position' vertex 2D jika kita
    // mengkonversi ke vec3 dengan z=0 di CPU
    var CURVE_BUFFER = GL.createBuffer();
    // Konversi bezier_vertex (flat 2D) -> float32 vec3 (x,y,z)
    var curve3 = new Float32Array(bezier_vertex.length / 2 * 3);
    for (var i = 0, j = 0; i < bezier_vertex.length; i += 2, j += 3) {
        curve3[j] = bezier_vertex[i];
        curve3[j + 1] = bezier_vertex[i + 1];
        curve3[j + 2] = 0.0;
    }
    GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, curve3, GL.STATIC_DRAW);

    var time_prev = 0;
    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        var dt = time - time_prev;
        time_prev = time;

        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

        // ======= Hitung posisi kubus pada kurva Bézier berdasarkan waktu =======
        // speedT = seberapa cepat melewati kurva; ubah sesuai kebutuhan
        var speedT = 0.00015; // nilai kecil => lebih lambat
        var t = (time * speedT) % 1.0; // parameter t di [0,1)
        // pos sekarang
        var pos = evaluateBezier(bezier_controlPoint, t);
        // sedikit skala agar terlihat di ruang 3D (karena PROJMATRIX dan cam z=-6)
        var WORLD_SCALE_X = 3.0;
        var WORLD_SCALE_Y = 2.0;
        var worldX = pos[0] * WORLD_SCALE_X;
        var worldY = pos[1] * WORLD_SCALE_Y;

        // Tangent (arah) untuk orientasi kubus:
        // ambil t2 sedikit di depan t untuk aproksimasi tangent
        var dt_for_tan = 0.001;
        var t2 = (t + dt_for_tan) % 1.0;
        var pos2 = evaluateBezier(bezier_controlPoint, t2);
        var worldX2 = pos2[0] * WORLD_SCALE_X;
        var worldY2 = pos2[1] * WORLD_SCALE_Y;
        var dx = worldX2 - worldX;
        var dy = worldY2 - worldY;
        var angleZ = Math.atan2(dy, dx); // rotasi di bidang XY supaya kubus "menghadap" arah kurva

        // ======= Bangun MOVEMATRIX berdasarkan posisi dan orientasi =======
        LIBS.set_I4(MOVEMATRIX); // reset
        var tmp = LIBS.get_I4();

        // 1) translasi ke posisi pada kurva
        LIBS.translateX(tmp, worldX); MOVEMATRIX = LIBS.multiply(MOVEMATRIX, tmp);
        tmp = LIBS.get_I4();

        LIBS.translateY(tmp, worldY); MOVEMATRIX = LIBS.multiply(MOVEMATRIX, tmp);
        tmp = LIBS.get_I4();

        // 2) rotasi supaya menghadap arah kurva (rotasi Z)
        LIBS.rotateZ(tmp, angleZ);
        MOVEMATRIX = LIBS.multiply(MOVEMATRIX, tmp);
        tmp = LIBS.get_I4();

        // 3) ekstra rotasi dari input user (THETA/PHI) agar masih bisa diputar
        // rotasi Y untuk THETA
        LIBS.rotateY(tmp, THETA);
        MOVEMATRIX = LIBS.multiply(MOVEMATRIX, tmp);
        tmp = LIBS.get_I4();

        // rotasi X untuk PHI
        LIBS.rotateX(tmp, PHI);
        MOVEMATRIX = LIBS.multiply(MOVEMATRIX, tmp);
        tmp = LIBS.get_I4();

        // 4) skala kecil agar kubus tidak terlalu besar (opsional)
        // jika LIBS punya scale, gunakan; jika tidak, kubus default ukuran 2,2,2 sudah oke

        // ======= Gambar kubus =======
        GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 4 * 3);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);
        GL.uniform1f(_greyscality, 0.2);
        GL.drawElements(GL.TRIANGLES, cube_faces.length, GL.UNSIGNED_SHORT, 0);

        // ======= (Optional) gambar kurva sebagai referensi =======
        // Kita reuse attribute _position (vec3) sehingga pointer harus cocok (stride 3 floats)
        GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_BUFFER);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        // Untuk menggambar kurva, ingin override warna -> kita can set greyScality high so colors go grey,
        // tetapi shader mengandalkan attribute color yang sekarang tidak dikirim. Simpler: sementara set greyscality=1.0
        // dan berharap vertex color default -> agar kurva terlihat lebih terang. (Jika ingin warna spesifik,
        // perlu shader terpisah; untuk kesederhanaan kita pakai greyscality=1)
        GL.uniform1f(_greyscality, 1.0);
        // Draw garis sebagai TRIANGLEs? tidak — kita akan memanggil drawArrays tapi perlu attribute 'color' valid.
        // Untuk menghindari shader masalah, kita menggambar kurva sebagai POINTS dengan posisi saja:
        // Namun shader mengharuskan attribute 'color' ada — karena kita enabled _color sebelumnya dan pointer untuk color
        // saat bind CUBE_VERTEX menunjuk ke buffer yang lain. Untuk menghindari konflik, kita akan disable atribut color sebelum menggambar kurva.
        GL.disableVertexAttribArray(_color);
        // menggambar garis strip: karena warna tidak disediakan, shader mungkin crash; safest approach: skip drawing curve if shader needs colors.
        // Untuk tujuan referensi, kita will draw points (but color attribute still missing). To avoid errors, re-enable dummy color pointer:
        // create small temporary color buffer filled with white
        var tmpColorData = new Float32Array(curve3.length / 3 * 3);
        for (var i = 0; i < tmpColorData.length; i++) tmpColorData[i] = 1.0;
        var TMP_COLOR_BUF = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, TMP_COLOR_BUF);
        GL.bufferData(GL.ARRAY_BUFFER, tmpColorData, GL.STATIC_DRAW);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 0, 0);
        GL.enableVertexAttribArray(_color);

        // sekarang gambar LINE_STRIP
        GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_BUFFER);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        // kecilkan greyscality agar warna sedikit muncul
        GL.uniform1f(_greyscality, 0.0); // pakai "warna" (kami set color buffer putih)
        GL.drawArrays(GL.LINE_STRIP, 0, curve3.length / 3);

        // bersihkan buffer warna sementara (tidak strictly necessary)
        GL.deleteBuffer(TMP_COLOR_BUF);

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}

window.addEventListener('load', main);