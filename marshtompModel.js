import { Ellipsoid } from '/Marshtomp/EllipsoidMarshtomp.js';
import { Cone } from '/Marshtomp/ConeMarshtomp.js';
import { Hyperboloid } from '/Marshtomp/HyperboloidMarshtomp.js';
import { Lathe } from '/Marshtomp/LatheMarshtomp.js';

export function createMarshtomp(GL, LIBS, SHADER_PROGRAM, locations){
    // ======================== OBJECTS ========================
    const badan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 1.1, b: 1.2, c: 0.8,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 40
    });

    const kepalaAtas = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 1.0, b: 0.8, c: 0.75,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 40,
        stack: 200,
        sectors: 200,
        y: 1.5,
    });

    const daguBawah = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 1.0, b: 0.81, c: 0.75,
        color: [173/255, 216/255, 230/255, 1],
        shininess: 35,
        stack: 200,
        sectors: 200,
        u_min: -Math.PI/2,
        u_max: -Math.PI/12,
        v_min: 0,
        v_max: Math.PI
    });

    const lingkaranPipiKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.5, b: 0.3, c: 0.5,
        color: [1, 150/255, 100/255, 1],
        shininess: 15,
        x: 0.7,
        rz: LIBS.degToRad(-90),
        ry: LIBS.degToRad(-15)
    });

    const lingkaranPipiKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.5, b: 0.3, c: 0.5,
        color: [1, 150/255, 100/255, 1],
        shininess: 15,
        x: -0.7,
        rz: LIBS.degToRad(90),
        ry: LIBS.degToRad(15)
    });

    const pipiKanan = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
        radius: 0.2,
        height: 0.9,
        color: [1, 150/255, 100/255, 1],
        shininess: 15,
        x: 0.95,
        rz: LIBS.degToRad(-90),
        ry: LIBS.degToRad(-15)
    });

    const pipiKiri = new Cone(GL, LIBS, SHADER_PROGRAM, locations, {
        radius: 0.2,
        height: 0.9,
        color: [1, 150/255, 100/255, 1],
        shininess: 15,
        x: -0.95,
        rz: LIBS.degToRad(90),
        ry: LIBS.degToRad(15)
    });

    const mataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.25, c: 0.05,
        color: [1, 150/255, 100/255, 1],
        shininess: 15,
        x: 0.4, y: 0.2, z: 0.63,
        rx: LIBS.degToRad(-16),
        ry: LIBS.degToRad(20)
    });

    const pupilKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.1, b: 0.12, c: 0.05,
        color: [0, 0, 0, 1],
        shininess: 5,
        z: 0.01
    });

    const kilauMataKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.05,
        color: [1, 1, 1, 1],
        shininess: 100,
        x: -0.03, y: 0.04, z: 0.02
    });

    const mataKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.25, c: 0.05,
        color: [1, 150/255, 100/255, 1],
        shininess: 15,
        x: -0.4, y: 0.2, z: 0.63,
        rx: LIBS.degToRad(-16),
        ry: LIBS.degToRad(-20)
    });

    const pupilKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.1, b: 0.12, c: 0.05,
        color: [0, 0, 0, 1],
        shininess: 5,
        z: 0.01
    });

    const kilauMataKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.05,
        color: [1, 1, 1, 1],
        shininess: 100,
        x: 0.03, y: 0.04, z: 0.02
    });

    const hidungKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.05, b: 0.015, c: 0.01,
        color: [0.1, 0.1, 0.1, 1],
        shininess: 5,
        x: 0.15, y: -0.05, z: 0.74,
        rz: LIBS.degToRad(45)
    });

    const hidungKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.05, b: 0.015, c: 0.01,
        color: [0.1, 0.1, 0.1, 1],
        shininess: 5,
        x: -0.15, y: -0.05, z: 0.74,
        rz: LIBS.degToRad(-45)
    });

    const senyum = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.87, b: 0.02, c: 0.54,
        color: [0.1, 0.1, 0.1, 1],
        shininess: 5,
        y: -0.2, z: 0.2
    });

    const perut = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.85, b: 0.8, c: 0.4,
        color: [210/255, 180/255, 140/255, 1],
        shininess: 15,
        z: 0.48, y: -0.1,
        rx: LIBS.degToRad(5)
    });

    const kakiKanan = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, c: 0.25, height: 1,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 10,
        x: 0.5, y: -1.5,
        u_min: 0, u_max: 0.7
    });

    const kakiKiri = new Hyperboloid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, c: 0.25, height: 1,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 10,
        x: -0.5, y: -1.5,
        u_min: 0, u_max: 0.7
    });

    const jariKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.06,
        color: [0, 0, 0, 1],
        shininess: 1,
        x: 0.08, y: 0.032, z: 0.2
    });

    const jariKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.06,
        color: [0, 0, 0, 1],
        shininess: 1,
        x: -0.08, y: 0.032, z: 0.2
    });

    const jariKiri1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.06,
        color: [0, 0, 0, 1],
        shininess: 1,
        x: 0.08, y: 0.032, z: 0.2
    });

    const jariKiri2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.04, b: 0.04, c: 0.06,
        color: [0, 0, 0, 1],
        shininess: 1,
        x: -0.08, y: 0.032, z: 0.2
    });

    const telapakKakiKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, b: 0.02, c: 0.25,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 10,
        y: 0
    });

    const telapakKakiKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.25, b: 0.02, c: 0.25,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 10,
        y: 0
    });

    const controlPointsLengan = [
        [0.2, 0.4, 0], [0.3, 0.5, 0], [0.4, -0.6, 0], [0.45, -1.4, 0]
    ];

    const lenganKanan = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: controlPointsLengan,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 15,
        x: 1.08, y: 0.2,
        rz: LIBS.degToRad(80),
        ry: LIBS.degToRad(90),
        rx: LIBS.degToRad(50),
        scaleX: 1, scaleZ: 0.4
    });

    const lenganKiri = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: controlPointsLengan,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 15,
        x: -1.08, y: 0.2,
        rz: LIBS.degToRad(-80),
        ry: LIBS.degToRad(-90),
        rx: LIBS.degToRad(50),
        scaleX: 1, scaleZ: 0.4
    });

    const telapakTanganKanan = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.45, b: 0.04, c: 0.18,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 10,
        y: -1.4
    });

    const telapakTanganKiri = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.45, b: 0.04, c: 0.18,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 10,
        y: -1.4
    });

    const jariTanganKanan1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 5,
        x: -0.26, y: -0.1
    });

    const jariTanganKanan2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.22, b: 0.3, c: 0.18,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 5,
        x: -0.02, y: -0.1
    });

    const jariTanganKanan3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 5,
        x: 0.26, y: -0.1
    });

    const jariTanganKiri1 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 5,
        x: -0.26, y: -0.1
    });

    const jariTanganKiri2 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.22, b: 0.3, c: 0.18,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 5,
        x: -0.02, y: -0.1
    });

    const jariTanganKiri3 = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.2, b: 0.3, c: 0.12,
        color: [85/255, 185/255, 235/255, 1],
        shininess: 5,
        x: 0.26, y: -0.1
    });

    const sirip = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.08, b: 1, c: 1.1,
        color: [60/255, 68/255, 82/255, 1],
        shininess: 8,
        u_min: 0, u_max: Math.PI,
        v_min: 0, v_max: Math.PI,
        x: 0, y: 0.45, z: 0.1,
        rx: LIBS.degToRad(-75)
    });

    const alasSirip = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 0.08, b: 0.01, c: 1.1,
        color: [60/255, 68/255, 82/255, 1],
        shininess: 8
    });

    const cpLeaf = [
        [0.1, 0.1, 0], [0.52, 0.1, 0], [0.32, 0.60, 0],
        [0.28, 0.90, 0], [0.22, 1.12, 0], [0.12, 1.32, 0], [0.02, 1.36, 0]
    ];

    const wingR = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: cpLeaf,
        color: [60/255, 68/255, 82/255, 1],
        shininess: 8,
        x: 0.45, y: -0.70, z: -1.15,
        ry: LIBS.degToRad(90),
        rx: LIBS.degToRad(10),
        rz: LIBS.degToRad(-10),
        scaleX: 1.5, scaleZ: 0.15
    });

    const wingL = new Lathe(GL, LIBS, SHADER_PROGRAM, locations, {
        controlPoints: cpLeaf,
        color: [60/255, 68/255, 82/255, 1],
        shininess: 8,
        x: -0.45, y: -0.70, z: -1.15,
        rx: LIBS.degToRad(10),
        ry: LIBS.degToRad(-90),
        rz: LIBS.degToRad(10),
        scaleX: 1.5, scaleZ: 0.15
    });

    // Shield hemisphere
    const shield = new Ellipsoid(GL, LIBS, SHADER_PROGRAM, locations, {
        a: 5, b: 5, c: 5,
        color: [0.4, 0.8, 1.0, 1.0],
        shininess: 150,
        stack: 32,
        sectors: 32,
        u_min: 0,
        u_max: Math.PI/2,
        v_min: 0,
        v_max: 2 * Math.PI
    });

    // Build scene graph
    badan.childs.push(wingR, wingL);
    mataKanan.childs.push(pupilKanan, kilauMataKanan);
    mataKiri.childs.push(pupilKiri, kilauMataKiri);
    sirip.childs.push(alasSirip);
    kepalaAtas.childs.push(
        daguBawah, lingkaranPipiKanan, pipiKanan,
        lingkaranPipiKiri, pipiKiri, mataKanan, mataKiri,
        hidungKanan, hidungKiri, senyum, sirip
    );
    telapakKakiKanan.childs.push(jariKanan1, jariKanan2);
    telapakKakiKiri.childs.push(jariKiri1, jariKiri2);
    kakiKanan.childs.push(telapakKakiKanan);
    kakiKiri.childs.push(telapakKakiKiri);
    telapakTanganKanan.childs.push(jariTanganKanan1, jariTanganKanan2, jariTanganKanan3);
    telapakTanganKiri.childs.push(jariTanganKiri1, jariTanganKiri2, jariTanganKiri3);
    lenganKanan.childs.push(telapakTanganKanan);
    lenganKiri.childs.push(telapakTanganKiri);
    badan.childs.push(kepalaAtas, perut, kakiKanan, kakiKiri, lenganKanan, lenganKiri, shield);

    badan.setup();

    //Return references untuk animation
    return{
        rootObject: badan,
        animatableParts:{
            badan,
            kepalaAtas,
            lenganKanan,
            lenganKiri,
            kakiKanan,
            kakiKiri,
            shield
        }
    };
}