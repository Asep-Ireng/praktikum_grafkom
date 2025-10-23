import { Ellipsoid } from '../Ellipsoid.js';
import { Cone } from '../Cone.js';
import { Hyperboloid } from '../Hyperboloid.js';
import { Lathe } from '../Lathe.js';
import { Fin } from '../Fin.js';
import { Cube } from './Cube.js';
import { Cylinder } from './Cylinder.js';
import { Arm } from './Arm.js';
import { FinSpline } from './FinSpline.js';
// import { FinCurve } from './FinCurve.js'; // opsional

function main() {
    const CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth; CANVAS.height = window.innerHeight;
    const GL = CANVAS.getContext("webgl", { antialias:true });
    if(!GL){ alert("WebGL context cannot be initialized"); return; }

    const shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix, Nmatrix;
        varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
        uniform vec3 u_lightPosition, u_cameraPosition;
        void main(void){
            vec3 worldPosition = (Mmatrix * vec4(position,1.0)).xyz;
            gl_Position = Pmatrix * Vmatrix * vec4(worldPosition,1.0);
            v_normal = (Nmatrix * vec4(normal,0.0)).xyz;
            v_surfaceToLight = u_lightPosition - worldPosition;
            v_surfaceToView  = u_cameraPosition - worldPosition;
        }`;

    const shader_fragment_source = `
        precision mediump float;
        varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
        uniform vec4 u_color;
        uniform float u_shininess;
        void main(void){
            vec3 n = normalize(v_normal);
            vec3 l = normalize(v_surfaceToLight);
            vec3 v = normalize(v_surfaceToView);
            vec3 h = normalize(l + v);
            float ndotl = max(dot(n,l), 0.0);
            float spec   = pow(max(dot(n,h), 0.0), u_shininess);
            float rim    = pow(1.0 - max(dot(n,v), 0.0), 2.0) * 0.35;
            vec3 ambient  = 0.22 * u_color.rgb;
            vec3 diffuse  = u_color.rgb * ndotl;
            vec3 specular = vec3(0.8) * spec;
            vec3 linear   = ambient + diffuse + specular + u_color.rgb * rim;
            vec3 srgb = pow(clamp(linear, 0.0, 1.0), vec3(1.0/2.2));
            gl_FragColor = vec4(srgb, u_color.a);
        }`;

    function compile_shader(src,type,label){
        const sh=GL.createShader(type); GL.shaderSource(sh,src); GL.compileShader(sh);
        if(!GL.getShaderParameter(sh, GL.COMPILE_STATUS)){ alert("ERROR IN "+label+" SHADER: "+GL.getShaderInfoLog(sh)); return null; }
        return sh;
    }
    const shader_vertex   = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    const shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");
    const SHADER_PROGRAM = GL.createProgram();
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
        _normal: GL.getAttribLocation(SHADER_PROGRAM, "normal")
    };
    GL.enableVertexAttribArray(locations._position);
    GL.enableVertexAttribArray(locations._normal);
    GL.useProgram(SHADER_PROGRAM);

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.1, 0.15, 0.2, 1.0);

    // ======================== OBJECT ========================
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
        radius:0.2,height:0.9,
        color:[255/255,150/255,100/255,1],
        shininess:10,
        x:0.95,
        rz:LIBS.degToRad(-90),
        ry:LIBS.degToRad(-15)
    });

    const pipiKiri = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
        radius:0.2,height:0.9,
        color:[1,150/255,100/255,1],
        shininess:10,
        x:-0.95,
        rz:LIBS.degToRad(90),
        ry:LIBS.degToRad(15)
    });

    const mataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.2,b:0.25,c:0.05,
        color:[1,150/255,100/255,1],
        shininess:10,
        x:0.4,y:0.2,z:0.63,
        rx:LIBS.degToRad(-16),
        ry:LIBS.degToRad(20)
    });
    const pupilKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.1,b:0.12,c:0.05,
        color:[0,0,0,1],
        shininess:5,
        z:0.01 
    });
    const kilauMataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.04,b:0.04,c:0.05,
        color:[1,1,1,1],
        shininess:100,
        x:-0.03,y:0.04,z:0.02 
    });

    const mataKiri  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
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
        a:0.05,b:0.015,c:0.01,
        color:[0.1,0.1,0.1,1],
        shininess:5,
        x:0.15,y:-0.05,z:0.74,
        rz:LIBS.degToRad(45) 
    });
    const hidungKiri  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.05,b:0.015,c:0.01,
        color:[0.1,0.1,0.1,1],
        shininess:5,
        x:-0.15,y:-0.05,z:0.74,
        rz:LIBS.degToRad(-45) 
    });

    const senyum = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.87,b:0.02,c:0.54,
        color:[0.1,0.1,0.1,1],
        shininess:5,
        y:-0.2,
        z:0.2 
    });

    const perut  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.85,b:0.8,c:0.4,
        color:[210/255,180/255,140/255,1],
        shininess:10,
        z:0.48,
        y:-0.1,
        rx:LIBS.degToRad(5) 
    });

    const kakiKanan = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.25,c:0.25,height:1,
        color:[85/255,185/255,235/255,1],shininess:10,
        x:0.5,y:-1.5,
        u_min:0,u_max:0.7
    });
    const kakiKiri = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
        a:0.25,c:0.25,height:1,
        color:[85/255,185/255,235/255,1],
        shininess:10,
        x:-0.5,y:-1.5,
        u_min:0,u_max:0.7
    });

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
        a:0.25,b:0.02,c:0.25,
        color:[85/255,185/255,235/255,1],shininess:10,
        y:0 
    });

    const telapakKakiKiri  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.25,b:0.02,c:0.25,
        color:[85/255,185/255,235/255,1],
        shininess:10,
        y:0 
    });

    const controlPointsLengan = [
        [0.2,0.4,0],[0.3,0.5,0],[0.4,-0.6,0],[0.45,-1.4,0]
    ];

    const lenganKanan = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints:controlPointsLengan,
        color:[85/255,185/255,235/255,1],shininess:10,
        x:1.08,y:0.2,
        rz:LIBS.degToRad(80),ry:LIBS.degToRad(90),rx:LIBS.degToRad(50),
        scaleX:1,scaleZ:0.4
    });
    const lenganKiri = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints:controlPointsLengan,
        color:[85/255,185/255,235/255,1],shininess:10,
        x:-1.08,y:0.2,
        rz: LIBS.degToRad(-80), ry: LIBS.degToRad(-90), rx:LIBS.degToRad(50),
        //rz:LIBS.degToRad(-50),ry:LIBS.degToRad(50),
        scaleX:1,scaleZ:0.4
    });

    const telapakTanganKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.45,b:0.04,c:0.18,
        color:[85/255,185/255,235/255,1],shininess:10,
        y:-1.4 
    });
    const telapakTanganKiri  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.45,b:0.04,c:0.18,
        color:[85/255,185/255,235/255,1],shininess:10,
        y:-1.4 
    });

    const jariTanganKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.2,b:0.3,c:0.12,
        color:[85/255,185/255,235/255,1],shininess:5,
        x:-0.26,y:-0.1 
    });
    const jariTanganKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.22,b:0.3,c:0.18,
        color:[85/255,185/255,235/255,1], shininess:5,
        x:-0.02,y:-0.1 
    });
    const jariTanganKanan3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.2,b:0.3,c:0.12,
        color:[85/255,185/255,235/255,1],shininess:5,
        x:0.26,y:-0.1 
    });
    const jariTanganKiri1  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.2,b:0.3,c:0.12,
        color:[85/255,185/255,235/255,1],shininess:5,
        x:-0.26,y:-0.1 
    });
    const jariTanganKiri2  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.22,b:0.3,c:0.18,
        color:[85/255,185/255,235/255,1],shininess:5,
        x:-0.02,y:-0.1 
    });
    const jariTanganKiri3  = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, { 
        a:0.2,b:0.3,c:0.12,
        color:[85/255,185/255,235/255,1],shininess:5,
        x:0.26,y:-0.1 
    });

    telapakTanganKanan.childs.push(jariTanganKanan1,jariTanganKanan2,jariTanganKanan3);
    telapakTanganKiri.childs.push(jariTanganKiri1,jariTanganKiri2,jariTanganKiri3);
    lenganKanan.childs.push(telapakTanganKanan); lenganKiri.childs.push(telapakTanganKiri);

   // R adalah “radius” di bidang r (horizontal) dan y (vertikal) profil lathe.
    // Untuk mohawk, r menentukan “ketebalan tampak depan”, y menentukan tinggi busur.
    const R = 0.15;              // ketebalan puncak sirip (sesuaikan 0.14–0.22)
    const K = 0.5522847498;      // 4/3 * tan(π/8) untuk Bezier lingkaran
    const d = 0.2;
    // Setengah lingkaran dari depan (y rendah) ke puncak (y tinggi):
    // Kuadran 1: dari sudut 0° → 90°
    // Kuadran 2: dari 90° → 180°
    const controlPointsSirip = [
        // // Q1: start di depan (r=R, y=0) menuju puncak (r=0, y=R)
        // [ R, 0.00, 0], [ R, K*R, 0], [ K*R, R, 0], [ 0.00, R, 0],
        // // Q2: dari puncak ke belakang (r=−R, y=0) — radius negatif memberi sisi “belakang”
        // [ -K*R, R, 0], [ -R, K*R, 0], [ -R, 0.00, 0]

        [ R, 0.00, 0], [ R, K*R, 0], [ K*R, R + 0.6*d, 0], [ 0.00, R + d, 0],
        [ -K*R, R + 0.6*d, 0], [ -R, K*R, 0], [ -R, 0.00, 0]
    ];
    // Sirip (Fin) – gunakan Fin revisi
    // const sirip = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
    //     controlPoints: controlPointsSirip,
    //     color: [60/255, 68/255, 82/255, 1.0], // Dark grey color
    //     shininess: 5.0,
    //     y:1.0,
    //     z: -0.35,
    //     ry: LIBS.degToRad(90),
    //     scaleX: 4,          // Make it slightly slimmer overall
    //     scaleZ: 0.5           // Make it very thin (like a fin)
    // });

    const sirip = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.08,        // lebar bilah (tampak depan)
        b: 1,        // ketebalan (depan–belakang, kecil = tipis)
        c: 1.1,        // tinggi “dome” sirip
        color: [60/255, 68/255, 82/255, 1.0],
        shininess: 8,
        u_min: 0,
        u_max: Math.PI,  // setengah ellipsoid SISI
        v_min: 0,
        v_max: Math.PI,
        x: 0.00, y: 0.45, z: 0.1,
        rx: LIBS.degToRad(-75), // dirikan ke atas
    });

   const alasSirip = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.08, b: 0.01, c: 1.1,    // pipih dan tinggi
        color: [60/255,68/255,82/255,1], shininess: 8,
        x: 0.00, y: 0, z: 0.00,
        //rx: LIBS.degToRad(-75)         // berdiri
    });
    // alasSirip.POSITION_MATRIX[13] += 0.01; // overlap tipis
    
    // function groove(y,z){
    //     return new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
    //         a:0.08, b:0.02, c:0.5,
    //         color:[52/255,60/255,72/255,1],
    //         shininess:6,
    //         x:0.00, y:y, z:z,
    //         rx: LIBS.degToRad(90),
    //         ry: LIBS.degToRad(90)
    //     });
    // }
    // const gr1=groove(0.80,0.03); gr1.POSITION_MATRIX[13]-=0.006;
    // const gr2=groove(0.84,0.00); gr2.POSITION_MATRIX[13]-=0.006;
    // const gr3=groove(0.88,-0.03); gr3.POSITION_MATRIX[13]-=0.006;
    // sirip.childs.push(gr1,gr2,gr3);

    const cpLeaf = [
        [0.1, 0.1, 0], [0.52, 0.1, 0], [0.32, 0.60, 0], [0.28, 0.90, 0],
        [0.22, 1.12, 0], [0.12, 1.32, 0], [0.02, 1.36, 0]
    ];

    const wingR = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: cpLeaf, color:[60/255,68/255,82/255,1], shininess:8,
        x: 0.45, y: -0.70, z: -1.15,
        ry: LIBS.degToRad(90),
        rx: LIBS.degToRad(10),
        rz: LIBS.degToRad(-10),
        scaleX: 1.5, scaleZ: 0.15       // tipis → kesan oval, bukan pita
    });
    const wingL = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: cpLeaf, color:[60/255,68/255,82/255,1], shininess:8,
        x: -0.45, y: -0.70, z: -1.15,
        rx: LIBS.degToRad(10), 
        ry: LIBS.degToRad(-90),
        rz: LIBS.degToRad(10),
        scaleX: 1.5, scaleZ: 0.15
    });

    function mohawkRib(y, z, r, h){
        const rib = new Cylinder(GL, LIBS, SHADER_PROGRAM, locations, {
            radius: r, height: h,
            segments: 32,
            color: [52/255,60/255,78/255,1],
            shininess: 7,
            x: 0.00, y: y, z:z,
            rx: LIBS.degToRad(90)
        });
        rib.POSITION_MATRIX[13] -= 0.008;
        return rib;
    }

    // sirip.childs.push(
    //     mohawkRib(0.78, 0.03, 0.15, 0.016),
    //     mohawkRib(9.84, -0.01, 0.13, 0.016),
    //     mohawkRib(0.90, -0.06, 0.11, 0.016)
    // );

    function wingStripe(x, y, z, rx, ry, r, h){
        const s = new Cylinder(GL, LIBS, SHADER_PROGRAM, locations, {
            radius: r, height: h, segments: 32,
            color: [52/255,60/255,78/255,1],
            shininess: 7,
            x, y, z, rx, ry
        });
        s.POSITION_MATRIX[12] += 0.004; // tanam ke permukaan panel sayap
        return s;
    }

    
    
    badan.childs.push(wingR, wingL);

    // Parenting
    mataKanan.childs.push(pupilKanan,kilauMataKanan);
    mataKiri.childs.push(pupilKiri,kilauMataKiri);
    
    sirip.childs.push(alasSirip);

    kepalaAtas.childs.push(daguBawah,lingkaranPipiKanan,pipiKanan,lingkaranPipiKiri,pipiKiri,
                            mataKanan,mataKiri,hidungKanan,hidungKiri,senyum, sirip);

    telapakKakiKanan.childs.push(jariKanan1, jariKanan2);
    telapakKakiKiri.childs.push(jariKiri1, jariKiri2);

    kakiKanan.childs.push(telapakKakiKanan); 
    kakiKiri.childs.push(telapakKakiKiri);

    badan.childs.push(kepalaAtas, perut, kakiKanan, kakiKiri, lenganKanan, lenganKiri);

    badan.setup();

    const PROJMATRIX = LIBS.get_projection(40, CANVAS.width/CANVAS.height, 1, 100);
    const VIEWMATRIX = LIBS.get_I4();
    // LIBS.translateZ(VIEWMATRIX, -cameraPosition[2]);

    //Kamera orbit (bebas geser)
    let camTheta = 0, camPhi = 0, camRadius = 0;

    function lookDirFromAngles(theta, phi){
        const cx = Math.sin(theta)*Math.cos(phi);
        const cy = Math.sin(phi);
        const cz = Math.cos(theta)*Math.cos(phi);
        return [cx, cy, cz];
    }
    function buildView(target){
        const dir = lookDirFromAngles(camTheta, camPhi);
        const eye = [
            target[0] - dir[0]*camRadius,
            target[1] - dir[1]*camRadius,
            target[2] - dir[2]*camRadius
        ];
        LIBS.set_I4(VIEWMATRIX);
        LIBS.lookAt(VIEWMATRIX, eye, target, [0,1,0]);
        GL.uniform3fv(locations._cameraPosition, eye);
    }

    let dragging=false, x_prev=0, y_prev=0;
    CANVAS.addEventListener("mousedown", e=> {dragging=true;x_prev=e.pageX;y_prev=e.pageY;e.preventDefault(); });
    ["mouseup", "mouseout"].forEach(ev=>CANVAS.addEventListener(ev, ()=> { dragging = false;}, false));
    CANVAS.addEventListener("mousemove", e => {
        if(!dragging)return;
        const dX=(e.pageX-x_prev)*2*Math.PI/CANVAS.width;
        const dY=(e.pageY-y_prev)*2*Math.PI/CANVAS.height;
        camTheta += dX;
        camPhi = Math.max(-1.2, Math.min(1.2, camPhi + dY));
        x_prev=e.pageX; y_prev=e.pageY; e.preventDefault();
    }, false);
    
    //State model & animasi
    let bodyRotY = 0;
    let bodyRotX = 0;
    let position = [0,0,-18];

    //State mesin
    const STATE = {RUNNING:0, IDLE:1, JUMP_BACK:2};
    let state = STATE.RUNNING;
    let jumpT = 0;
    const JumpDur = 0.7;            // durasi lompatan detik
    const JumpBackDist = 4.0;       // mundur sejauh ini saat lompatan
    const JumpHeight = 1.8;         // tinggi lengkung loncat
    const RunSpeed = 3.0;
    const StopOffset  = 5;          // toleransi jarak berhenti
    
    function forwardYZ(theta){
        return [ Math.sin(theta), 0, Math.cos(theta)];
    }
    function stopPointInFrontOfCamera(){
        // Titik berhenti = target kamera (posisi model saat ini dipakai sebagai target orbit)
        // lalu MAJU searah arah pandang kamera sejauh StopOffset
        const dir = lookDirFromAngles(camTheta, camPhi);
        return [
            position[0] + dir[0]*StopOffset,
            position[1] + dir[1]*StopOffset,
            position[2] + dir[2]*StopOffset
        ];
    }

    //keyboard: trigger lompat ke belakang
    window.addEventListener('keydown', (e)=>{
        if(e.code === 'Space' && state !== STATE.JUMP_BACK){
            state = STATE.JUMP_BACK;
            jumpT = 0;
        }
    });

    //Helper -> set tangan/kaki sesuai state
    function poseRunning(t){
        // Tangan: -100 derajat X; buka ±20 derajat Y; goyangan Z kecil
        const smallSwing = Math.sin(t * 2) * LIBS.degToRad(20);
        LIBS.set_I4(lenganKanan.MOVE_MATRIX);
        LIBS.rotateX(lenganKanan.MOVE_MATRIX, LIBS.degToRad(-100));
        LIBS.rotateY(lenganKanan.MOVE_MATRIX, LIBS.degToRad(20));
        LIBS.rotateZ(lenganKanan.MOVE_MATRIX, smallSwing);

        LIBS.set_I4(lenganKiri.MOVE_MATRIX);
        LIBS.rotateX(lenganKiri.MOVE_MATRIX, LIBS.degToRad(-100));
        LIBS.rotateY(lenganKiri.MOVE_MATRIX, LIBS.degToRad(-20));
        LIBS.rotateZ(lenganKiri.MOVE_MATRIX, -smallSwing);

        // Kaki swinging cepat: speed 20, amplitude 5 derajat
        const swing = 20.0, amp = 5;
        LIBS.set_I4(kakiKanan.MOVE_MATRIX);
        LIBS.rotateX(kakiKanan.MOVE_MATRIX, Math.sin(t * swing + Math.PI) * LIBS.degToRad(amp));
        LIBS.set_I4(kakiKiri.MOVE_MATRIX);
        LIBS.rotateX(kakiKiri.MOVE_MATRIX,  Math.sin(t * swing) * LIBS.degToRad(amp));
    }

    function poseIdle(){
        // Saat berhenti: kaki diam; tangan mengarah ke bawah (turun dari pose belakang)
        // Anda menginginkan tangan ke bawah: set rotasi X sekitar -10 s/d 0 derajat.
        LIBS.set_I4(lenganKanan.MOVE_MATRIX);
        LIBS.rotateX(lenganKanan.MOVE_MATRIX, LIBS.degToRad(-10));
        LIBS.rotateY(lenganKanan.MOVE_MATRIX, 0);

        LIBS.set_I4(lenganKiri.MOVE_MATRIX);
        LIBS.rotateX(lenganKiri.MOVE_MATRIX, LIBS.degToRad(-10));
        LIBS.rotateY(lenganKiri.MOVE_MATRIX, 0);

        // Kaki diam (MOVE_MATRIX identity)
        LIBS.set_I4(kakiKanan.MOVE_MATRIX);
        LIBS.set_I4(kakiKiri.MOVE_MATRIX);
    }

    function poseJump(tNorm){
        // Kaki diam selama lompatan (sesuai permintaan)
        LIBS.set_I4(kakiKanan.MOVE_MATRIX);
        LIBS.set_I4(kakiKiri.MOVE_MATRIX);

        // Tangan sedikit bergerak saat lompatan: ayunan Z kecil, X sedikit turun
        const zWobble = Math.sin(tNorm * Math.PI * 2.0) * LIBS.degToRad(10);
        const xLower  = LIBS.degToRad(-30); // agak turun saat jump

        LIBS.set_I4(lenganKanan.MOVE_MATRIX);
        LIBS.rotateX(lenganKanan.MOVE_MATRIX, xLower);
        LIBS.rotateZ(lenganKanan.MOVE_MATRIX,  zWobble);

        LIBS.set_I4(lenganKiri.MOVE_MATRIX);
        LIBS.rotateX(lenganKiri.MOVE_MATRIX, xLower);
        LIBS.rotateZ(lenganKiri.MOVE_MATRIX, -zWobble);
    }
    
    let lastTime = performance.now()/1000;

    function animate(){
        const now = performance.now()/1000;
        const dt = Math.sin(0.033, now-lastTime); //clamp 30 fps min
        lastTime = now;

        // 1) Update state & posisi
        if(state === STATE.RUNNING){
            // bergerak maju sampai mencapai titik berhenti di depan kamera
            const dirCam = lookDirFromAngles(camTheta, camPhi);
            const stopPt = stopPointInFrontOfCamera(); // target berhenti
            const toStop = [ stopPt[0]-position[0], 0, stopPt[2]-position[2] ];
            const dist   = Math.hypot(toStop[0], toStop[2]);
            if(dist > 0.03){
            const fwd = forwardYZ(bodyRotY);
            position[0] += fwd[0]*RunSpeed*dt;
            position[2] += fwd[2]*RunSpeed*dt;
            } else {
            state = STATE.IDLE;
            }
        } else if(state === STATE.JUMP_BACK){
            jumpT = Math.min(1, jumpT + dt/JumpDur);
            const fwd = forwardYZ(bodyRotY);
            const back = [-fwd[0], 0, -fwd[2]];
            const dx = back[0] * (JumpBackDist * dt/JumpDur);
            const dz = back[2] * (JumpBackDist * dt/JumpDur);
            position[0] += dx; position[2] += dz;
            const yBase = 0;
            position[1] = yBase + 4*JumpHeight*jumpT*(1-jumpT);
            if(jumpT >= 1){ position[1]=yBase; state=STATE.IDLE; }
        }

        // 2) Pose
        const t = now;
        if(state === STATE.RUNNING) poseRunning(t);
        else if(state === STATE.IDLE) poseIdle();
        else poseJump(jumpT);

        // 3) Transform badan: Translate dulu, lalu Rotate (hindari “berantakan”)
        LIBS.set_I4(badan.MOVE_MATRIX);
        if(LIBS.translate){ LIBS.translate(badan.MOVE_MATRIX, position[0], position[1], position[2]); }
        else { LIBS.translateX(badan.MOVE_MATRIX,position[0]); LIBS.translateY(badan.MOVE_MATRIX,position[1]); LIBS.translateZ(badan.MOVE_MATRIX,position[2]); }
        LIBS.rotateY(badan.MOVE_MATRIX, bodyRotY);
        LIBS.rotateX(badan.MOVE_MATRIX, bodyRotX);

        // 4) Kamera orbit fokus ke model
        buildView(position);

        // 5) Render
        GL.viewport(0,0,CANVAS.width,CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT|GL.DEPTH_BUFFER_BIT);
        GL.uniformMatrix4fv(locations._Pmatrix,false,PROJMATRIX);
        GL.uniformMatrix4fv(locations._Vmatrix,false,VIEWMATRIX);
        GL.uniform3fv(locations._lightPosition,[5,5,8]);
        badan.render(LIBS.get_I4(), LIBS.get_I4());
        GL.flush();

        requestAnimationFrame(animate);
    }
    animate();
}
window.addEventListener('load', main);
