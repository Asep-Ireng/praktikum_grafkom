// main.js

import { Ellipsoid } from '../Ellipsoid.js';
import { Cone } from '../Cone.js';
import { Hyperboloid } from '../Hyperboloid.js';
import { Lathe } from '../Lathe.js';
import { Fin } from '../Fin.js';
import { Cube } from './Cube.js';
import { Cylinder } from './Cylinder.js';
import { Arm } from './Arm.js';
import { FinCurve } from './FinCurve.js';

function main() {
    var CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix, Nmatrix;
        varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
        uniform vec3 u_lightPosition, u_cameraPosition;

        void main(void) {
            vec3 worldPosition = (Mmatrix * vec4(position, 1.0)).xyz;
            gl_Position = Pmatrix * Vmatrix * vec4(worldPosition, 1.0);
            v_normal = (Nmatrix * vec4(normal, 0.0)).xyz;
            v_surfaceToLight = u_lightPosition - worldPosition;
            v_surfaceToView = u_cameraPosition - worldPosition;
        }`;

    var shader_fragment_source = `
        precision mediump float;
        varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
        uniform vec4 u_color;
        uniform float u_shininess;

        void main(void) {
            vec3 n = normalize(v_normal);
            vec3 l = normalize(v_surfaceToLight);
            vec3 v = normalize(v_surfaceToView);
            vec3 h = normalize(l + v);

            float ndotl = max(dot(n, l), 0.0);
            float spec = pow(max(dot(n, h), 0.0), u_shininess);

            // Rim-light halus (accent di pinggir)
            float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0) * 0.35; // 0.35 bisa Anda adjust 0.25–0.45

            // Pencahayaan dalam ruang linear
            vec3 ambient = 0.22 * u_color.rgb; // sedikit lebih terang dari sebelumnya
            vec3 diffuse = u_color.rgb * ndotl;
            vec3 specular = vec3(0.8) * spec;
            vec3 linear = ambient + diffuse + specular + u_color.rgb * rim;

            // Konversi ke sRGB (gamma 2.2)
            vec3 srgb = pow(clamp(linear, 0.0, 1.0), vec3(1.0/2.2));
            gl_FragColor = vec4(srgb, u_color.a);
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

    const locations = {
        _Pmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix"),
        _Vmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix"),
        _Mmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix"),
        _Nmatrix: GL.getUniformLocation(SHADER_PROGRAM, "Nmatrix"),
        _u_color: GL.getUniformLocation(SHADER_PROGRAM, "u_color"),
        _shininess: GL.getUniformLocation(SHADER_PROGRAM, "u_shininess"),
        _lightPosition: GL.getUniformLocation(SHADER_PROGRAM, "u_lightPosition"),
        _cameraPosition: GL.getUniformLocation(SHADER_PROGRAM, "u_cameraPosition"),
        _position: GL.getAttribLocation(SHADER_PROGRAM, "position"),
        _normal: GL.getAttribLocation(SHADER_PROGRAM, "normal"),
    };
    
    GL.enableVertexAttribArray(locations._position);
    GL.enableVertexAttribArray(locations._normal);
    GL.useProgram(SHADER_PROGRAM);

    /*======================== MEMBUAT OBJECT MARSHTOMP ======================== */
    
    const badan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 1.1, b: 1.2, c: 0.8, // Lebih tinggi dari lebarnya
        color: [85/255, 185/255, 235/255, 1.0], // Warna biru yang sama dengan kepala
        shininess: 20.0    
    });

    const kepalaAtas = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 1.0, b: 0.8, c: 0.75,
        color: [85/255, 185/255, 235/255, 1.0],
        shininess: 30.0,
        stack: 200,
        sectors: 200,
        y: 1.5
    });

    const daguBawah = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 1.0, b: 0.81, c: 0.75, // Ukuran sama
        color: [173/255, 216/255, 230/255, 1.0],
        shininess: 30.0,
        stack: 200, sectors: 200,
        //gambar bagian bawah secara vertikal
        u_min: -Math.PI / 2,
        u_max: -Math.PI /12,
        //gambar bagian depan secara horizontal
        v_min: 0,
        v_max: Math.PI,

        //rx: LIBS.degToRad()
        
    });

    const lingkaranPipiKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.5, b: 0.3, c: 0.5, // Sedikit lebih kecil dari alas
        color: [255/255, 150/255, 100/255, 1.0], // Warna cokelat muda/krem
        shininess: 10.0,
        x: 0.7, // Posisi di antara alas dan cone
        y: 0.0,
        rz: LIBS.degToRad(-90), // Rotasi yang sama agar sejajar
        ry: LIBS.degToRad(-15)
    });

    const lingkaranPipiKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.5, b: 0.3, c: 0.5,
        color: [255/255, 150/255, 100/255, 1.0],
        shininess: 10.0,
        x: -0.7,
        y: 0.0,
        rz: LIBS.degToRad(90),
        ry: LIBS.degToRad(15)
    });

    const pipiKanan = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
        radius: 0.2, height: 0.9,
        color: [255/255, 150/255, 100/255, 1.0],
        shininess: 10.0,
        x: 0.95,
        y: 0.0,
        rz: LIBS.degToRad(-90),
        ry: LIBS.degToRad(-15)
    });

    const pipiKiri = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
        radius: 0.2, height: 0.9,
        color: [255/255, 150/255, 100/255, 1.0],
        shininess: 10.0,
        x: -0.95,
        y: 0.0,
        rz: LIBS.degToRad(90),
        ry: LIBS.degToRad(15)
    });
    
    const mataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.25, c: 0.05, // Sedikit lonjong ke atas
        color: [255/255, 150/255, 100/255, 1.0], // Warna iris oranye-peach
        shininess: 10.0,
        x: 0.4, y: 0.2, z: 0.63,
        rx: LIBS.degToRad(-16),
        ry: LIBS.degToRad(20)
    });
    const pupilKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.1, b: 0.12, c: 0.05,
        color: [0, 0, 0, 1.0], // Hitam
        shininess: 5.0,
        z: 0.01 // Sedikit di depan iris
    });
    const kilauMataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.05,
        color: [1.0, 1.0, 1.0, 1.0], // Putih
        shininess: 100.0,
        x: -0.03, y: 0.04, z: 0.02 // Posisi di pojok pupil
    });

    const mataKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.25, c: 0.05,
        color: [255/255, 150/255, 100/255, 1.0],
        shininess: 10.0,
        x: -0.4, y: 0.2, z: 0.63, // Posisi x negatif
        rx: LIBS.degToRad(-16),
        ry: LIBS.degToRad(-20),
    });
    const pupilKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.1, b: 0.12, c: 0.05,
        color: [0, 0, 0, 1.0],
        shininess: 5.0,
        z: 0.01
    });
    const kilauMataKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.05,
        color: [1.0, 1.0, 1.0, 1.0],
        shininess: 100.0,
        x: 0.03, y: 0.04, z: 0.02 // Posisi x positif (bercermin)
    });

    const hidungKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.05, b: 0.015, c: 0.01, // Sangat pipih
        color: [0.1, 0.1, 0.1, 1.0], // Abu-abu gelap
        shininess: 5.0,
        x: 0.15, y: -0.05, z: 0.74,
        rz: LIBS.degToRad(45) // Sedikit diputar
    });
    const hidungKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.05, b: 0.015, c: 0.01,
        color: [0.1, 0.1, 0.1, 1.0],
        shininess: 5.0,
        x: -0.15, y: -0.05, z: 0.74,
        rz: LIBS.degToRad(-45) // Diputar ke arah berlawanan
    });

    const senyum = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.87, b: 0.02, c: 0.54, // Lebar, sangat tipis, dan dalam
        color: [0.1, 0.1, 0.1, 1.0], // Warna gelap untuk garis senyum
        shininess: 5.0,
        y: -0.2, // Posisi di bawah tengah wajah
        z: 0.2,  // Posisi untuk memotong wajah
    });

    const perut = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.85, b: 0.8, c: 0.4, // Pipih dan lonjong
        color: [210/255, 180/255, 140/255, 1.0], // Warna krem/oranye muda
        shininess: 10.0,
        z: 0.48, // Posisikan di depan permukaan badan
        y: -0.1,
        rx: LIBS.degToRad(5)
    });

    const kakiKanan = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, c: 0.25, height: 1,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        x: 0.5, y: -1.5, z: 0,
        rx: LIBS.degToRad(0),
        u_min: 0, u_max: 0.7 // Menggambar separuh bagian bawah
    });

    const kakiKiri = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, c: 0.25, height: 1,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        x: -0.5, y: -1.5, z: 0,
        rx: LIBS.degToRad(0),
        u_min: 0, u_max: 0.7
    });

    // ▼▼▼ 4. SESUAIKAN POSISI JARI ▼▼▼
    const jariKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.04, b:0.04, c:0.06, color: [0, 0, 0, 1.0], shininess: 1.0,
        x: 0.08, y: 0.032, z: 0.2
    });
    const jariKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.04, b:0.04, c:0.06, color: [0, 0, 0, 1.0], shininess: 1.0,
        x: -0.08, y: 0.032, z: 0.2
    });

    const jariKiri1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.04, b:0.04, c:0.06, color: [0, 0, 0, 1.0], shininess: 1.0,
        x: 0.08, y: 0.032, z: 0.2
    });
    const jariKiri2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.04, b:0.04, c:0.06, color: [0, 0, 0, 1.0], shininess: 1.0,
        x: -0.08, y: 0.032, z: 0.2
    });

    const telapakKakiKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, b: 0.02, c: 0.25, // Radius 'a' dan 'c' sama dengan radius hyperboloid, 'b' sangat tipis
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        y: 0 // Posisikan tepat di bagian bawah kaki (y=0 lokal)
    });

    const telapakKakiKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, b: 0.02, c: 0.25,  
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        y: 0
    });

    const controlPointsLengan = [
        [0.2, 0.4, 0], [0.3, 0.5, 0], [0.4, -0.6, 0], [0.45, -1.4, 0]
    ];
    //Lengan kanan
    const lenganKanan = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: controlPointsLengan,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        x: 1.08, y: 0.2,
        rz: LIBS.degToRad(80), ry: LIBS.degToRad(90), rx: LIBS.degToRad(50),
        scaleX: 1.0, scaleZ: 0.4
    });
    const jariTanganKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12, // a,b,c adalah setengah dari sx,sy,sz sebelumnya untuk membuat kapsul
        color: [85/255, 185/255, 235/255, 1.0], shininess: 5.0,
        x: -0.26, y: -0.1, z: 0 // Posisi tetap sama
    });
    const jariTanganKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.22, b: 0.3, c: 0.18,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 5.0,
        x: -0.02, y: -0.1, z: 0
    });
    const jariTanganKanan3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 5.0,
        x: 0.26, y: -0.1, z: 0
    });

    const lenganKiri = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: controlPointsLengan,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        x: -1.15, y: 0.2,
        rz: LIBS.degToRad(-50), ry: LIBS.degToRad(50),
        scaleX: 1.0, scaleZ: 0.4
    });
    const jariTanganKiri1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a: 0.2, b: 0.3, c: 0.12, 
        color: [85/255, 185/255, 235/255, 1.0], shininess: 5.0, 
        x: -0.26, y: -0.1, z: 0 
    });
    const jariTanganKiri2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.22, b: 0.3, c: 0.18,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 5.0,
        x: -0.02, y: -0.1, z: 0
    });
    const jariTanganKiri3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 5.0,
        x: 0.26, y: -0.1, z: 0
    });

    const telapakTanganKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.45, b: 0.04, c: 0.18, // Dibuat pipih dan lonjong agar pas dengan ujung lengan
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        y: -1.4 // Posisikan di ujung lengan
    });

    const telapakTanganKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.45, b: 0.04, c: 0.18,
        color: [85/255, 185/255, 235/255, 1.0], shininess: 10.0,
        y: -1.4
    });
    
    const mohawk = new FinCurve(GL, LIBS, SHADER_PROGRAM, locations, {
        color: [60/255,68/255,82/255,1],
        shininess: 8,
        thickness: 0.10,
        samples: 52,
        ctrl: [
            [ 0.00, 0.00],
            [ 0.10, 0.30],
            [ 0.04, 1.30],
            [-0.02, 1.52]
        ],
        x: 0.00, y: 0.80, z: 0.00,
        rx: LIBS.degToRad(20) // condong ke belakang
    });

    // mohawk.POSITION_MATRIX[13] -= 0.02;

    // LIBS.rotateX(mohawk.POSITION_MATRIX, LIBS.degToRad(8));

    // 1. Atur bagian-bagian internal dari setiap komponen utama
    // a. Bagian-bagian mata adalah anak dari mata
    mataKanan.childs.push(pupilKanan);
    mataKanan.childs.push(kilauMataKanan);
    mataKiri.childs.push(pupilKiri);
    mataKiri.childs.push(kilauMataKiri);

    // b. Semua fitur wajah adalah anak dari kepala
    kepalaAtas.childs.push(daguBawah);
    kepalaAtas.childs.push(lingkaranPipiKanan);
    kepalaAtas.childs.push(pipiKanan);
    kepalaAtas.childs.push(lingkaranPipiKiri);
    kepalaAtas.childs.push(pipiKiri);
    kepalaAtas.childs.push(mataKanan);
    kepalaAtas.childs.push(mataKiri);
    kepalaAtas.childs.push(hidungKanan);
    kepalaAtas.childs.push(hidungKiri);
    kepalaAtas.childs.push(senyum);
    kepalaAtas.childs.push(mohawk);

    // c. Bagian-bagian kaki adalah anak dari paha
    // 1. Tempelkan jari ke telapak kaki
    telapakKakiKanan.childs.push(jariKanan1);
    telapakKakiKanan.childs.push(jariKanan2);

    telapakKakiKiri.childs.push(jariKiri1);
    telapakKakiKiri.childs.push(jariKiri2);

    // 2. Tempelkan telapak kaki ke kaki utama
    kakiKanan.childs.push(telapakKakiKanan);
    kakiKiri.childs.push(telapakKakiKiri);

    // TANGAN
    telapakTanganKanan.childs.push(jariTanganKanan1);
    telapakTanganKanan.childs.push(jariTanganKanan2);
    telapakTanganKanan.childs.push(jariTanganKanan3);

    telapakTanganKiri.childs.push(jariTanganKiri1);
    telapakTanganKiri.childs.push(jariTanganKiri2);
    telapakTanganKiri.childs.push(jariTanganKiri3);

    lenganKanan.childs.push(telapakTanganKanan);
    lenganKiri.childs.push(telapakTanganKiri);

    // 2. Tempelkan semua komponen utama ke 'badan' sebagai induk tertinggi
    badan.childs.push(kepalaAtas);
    badan.childs.push(perut);
    badan.childs.push(kakiKanan);
    badan.childs.push(kakiKiri);
    badan.childs.push(lenganKanan);
    badan.childs.push(lenganKiri);

    badan.setup();

    /*======================== PENGATURAN KAMERA & KONTROL ======================== */
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();
    const cameraPosition = [0, 0, 8];
    LIBS.translateZ(VIEWMATRIX, -cameraPosition[2]);

    var THETA = 0, PHI = 0, dX = 0, dY = 0;
    var drag = false;
    var x_prev, y_prev;
    var mouseDown = function(e){drag=true; x_prev=e.pageX, y_prev=e.pageY; e.preventDefault(); return false;};
    var mouseUp = function(e){drag=false;};
    var mouseMove = function(e){if(!drag){return false;} dX=(e.pageX-x_prev)*2*Math.PI/CANVAS.width, dY=(e.pageY-y_prev)*2*Math.PI/CANVAS.height; THETA+=dX; PHI+=dY; x_prev=e.pageX, y_prev=e.pageY; e.preventDefault();};
    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    /*========================= DRAWING LOOP ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.1, 0.15, 0.2, 1.0);
    
    var animate = function (time) {
        if (!drag) {
            dX *= 0.95; dY *= 0.95;
            THETA += dX; PHI += dY;
        }
        
        LIBS.set_I4(badan.MOVE_MATRIX);
        LIBS.rotateY(badan.MOVE_MATRIX, THETA);
        LIBS.rotateX(badan.MOVE_MATRIX, PHI);

        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        GL.uniformMatrix4fv(locations._Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(locations._Vmatrix, false, VIEWMATRIX);
        GL.uniform3fv(locations._lightPosition, [5.0, 5.0, 8.0]);
        GL.uniform3fv(locations._cameraPosition, cameraPosition);

        badan.render(LIBS.get_I4(), LIBS.get_I4());

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}

window.addEventListener('load', main);