import { SceneObject } from "./SceneObject.js";

export class ZubatWing extends SceneObject {
  constructor(GL, _position, _color, _normal) {
    super(GL, _position, _color, _normal);

    // =================================================================================
    // == KONTROL PARAMETER SAYAP ==
    // =================================================================================

    // -- WARNA --
    const BONE_COLOR = [0.45, 0.65, 1.0];
    const INNER_MEMBRANE_COLOR = [0.9, 0.45, 0.6]; // Warna dalam
    const OUTER_MEMBRANE_COLOR = [0.35, 0.55, 0.95]; // Warna luar

    // -- DETAIL & BENTUK --
    const SEGMENTS_PER_PART = 15;
    const TUBE_SEGMENTS = 12;
    const MEMBRANE_THICKNESS = 0.05; // Ketebalan membran

    const BONE_THICKNESS = {
      top: [0.15, 0.12, 0.08],
      mid: [0.08, 0.07, 0.05],
      connector: 0.09,
    };

    // -- Definisi Kurva Tulang Atas --
    this.topBoneCurve = {
      part1: {
        startPoint: [0.0, 0.0, -1.2],
        startHandle: [0.8, 1.8, 0.0],
        endPoint: [7.2, 3.2, 3.4],
        endHandle: [-1.3, 0.0, 0.4],
      },
      part2: {
        startPoint: [7.2, 3.2, 3.4],
        startHandle: [1.2, 0.8, -0.2],
        endPoint: [9.0, -3.0, 2],
        endHandle: [-0.5, 0.7, 0.2],
      },
    };
    // -- Definisi Kurva Tulang Tengah --
    this.midBoneCurve = {
      part1: {
        startPoint: [0.0, 0.0, -1.2],
        startHandle: [1.0, 0.1, 0.0],
        endPoint: [3, -1, -3],
        endHandle: [0, 0.8, 0.2],
      },
      part2: {
        startPoint: [3, -1, -3],
        startHandle: [15, 1, -15],
        endPoint: [9.0, -3.0, 2],
        endHandle: [5, -1.0, -4.2],
      },
    };

    this.controlPoints = [];

    // =================================================================================
    // == LOGIKA PEMBUATAN MESH ==
    // =================================================================================
    const calculateControlPoints = (curvePart) => {
      const p0 = curvePart.startPoint;
      const p3 = curvePart.endPoint;
      const p1 = [
        p0[0] + curvePart.startHandle[0],
        p0[1] + curvePart.startHandle[1],
        p0[2] + curvePart.startHandle[2],
      ];
      const p2 = [
        p3[0] + curvePart.endHandle[0],
        p3[1] + curvePart.endHandle[1],
        p3[2] + curvePart.endHandle[2],
      ];
      const points = [p0, p1, p2, p3];
      this.controlPoints.push(...points);
      return points;
    };

    const TOP_BONE_PART1_CP = calculateControlPoints(this.topBoneCurve.part1);
    const TOP_BONE_PART2_CP = calculateControlPoints(this.topBoneCurve.part2);
    const MID_BONE_PART1_CP = calculateControlPoints(this.midBoneCurve.part1);
    const MID_BONE_PART2_CP = calculateControlPoints(this.midBoneCurve.part2);

    const fullTopCenterline = this._generateCenterline(
      [TOP_BONE_PART1_CP, TOP_BONE_PART2_CP],
      SEGMENTS_PER_PART
    );
    const fullMidCenterline = this._generateCenterline(
      [MID_BONE_PART1_CP, MID_BONE_PART2_CP],
      SEGMENTS_PER_PART
    );

    this._generateTube(
      fullTopCenterline,
      TUBE_SEGMENTS,
      BONE_THICKNESS.top,
      BONE_COLOR
    );
    this._generateTube(
      fullMidCenterline,
      TUBE_SEGMENTS,
      BONE_THICKNESS.mid,
      BONE_COLOR
    );

    // Perbarui pemanggilan _generateMembrane
    this._generateMembrane(
      fullTopCenterline,
      fullMidCenterline,
      INNER_MEMBRANE_COLOR,
      OUTER_MEMBRANE_COLOR,
      MEMBRANE_THICKNESS
    );

    const connectorPath = [
      this.topBoneCurve.part1.endPoint,
      this.midBoneCurve.part1.endPoint,
    ];
    this._generateTube(
      connectorPath,
      TUBE_SEGMENTS,
      BONE_THICKNESS.connector,
      BONE_COLOR
    );

    this.setup();
  }

  getControlPoints() {
    return this.controlPoints;
  }

  // ... (Metode _generateCenterline, _subtractVectors, _normalizeVector, _crossProduct, _generateTube, _getPointOnBezierCurve tidak berubah)

  // =================================================================================
  // == PERBARUIAN METODE _generateMembrane ==
  // =================================================================================
  _generateMembrane(
    centerline1,
    centerline2,
    outerColor,
    innerColor,
    thickness
  ) {
    const baseVertexIndex = this.vertices.length / 9;
    const halfThickness = thickness / 2.0;

    // Buat dua set vertex: satu untuk luar, satu untuk dalam
    for (let i = 0; i < centerline1.length; i++) {
      const p1 = centerline1[i];
      const p2 = centerline2[i];
      const p3 = i + 1 < centerline1.length ? centerline1[i + 1] : p1;
      const vecA = this._subtractVectors(p2, p1);
      const vecB = this._subtractVectors(p3, p1);
      const normal = this._normalizeVector(this._crossProduct(vecA, vecB));

      // Vertex luar (biru), digeser keluar sepanjang normal
      this.vertices.push(
        p1[0] + normal[0] * halfThickness,
        p1[1] + normal[1] * halfThickness,
        p1[2] + normal[2] * halfThickness,
        ...outerColor,
        ...normal
      );
      this.vertices.push(
        p2[0] + normal[0] * halfThickness,
        p2[1] + normal[1] * halfThickness,
        p2[2] + normal[2] * halfThickness,
        ...outerColor,
        ...normal
      );

      // Vertex dalam (pink), digeser ke dalam (arah normal terbalik)
      this.vertices.push(
        p1[0] - normal[0] * halfThickness,
        p1[1] - normal[1] * halfThickness,
        p1[2] - normal[2] * halfThickness,
        ...innerColor,
        -normal[0],
        -normal[1],
        -normal[2]
      );
      this.vertices.push(
        p2[0] - normal[0] * halfThickness,
        p2[1] - normal[1] * halfThickness,
        p2[2] - normal[2] * halfThickness,
        ...innerColor,
        -normal[0],
        -normal[1],
        -normal[2]
      );
    }

    // Buat faces untuk kedua sisi
    for (let i = 0; i < centerline1.length - 1; i++) {
      // Index untuk 4 titik di setiap segmen (luar atas, luar bawah, dalam atas, dalam bawah)
      const outerTopLeft = baseVertexIndex + i * 4;
      const outerBotLeft = outerTopLeft + 1;
      const innerTopLeft = outerTopLeft + 2;
      const innerBotLeft = outerTopLeft + 3;

      const outerTopRight = outerTopLeft + 4;
      const outerBotRight = outerTopLeft + 5;
      const innerTopRight = outerTopLeft + 6;
      const innerBotRight = outerTopLeft + 7;

      // Faces untuk permukaan luar (biru)
      this.faces.push(outerTopLeft, outerBotLeft, outerTopRight);
      this.faces.push(outerBotLeft, outerBotRight, outerTopRight);

      // Faces untuk permukaan dalam (pink)
      // Dibuat dengan urutan terbalik agar terlihat dari dalam
      this.faces.push(innerTopLeft, innerTopRight, innerBotLeft);
      this.faces.push(innerBotLeft, innerTopRight, innerBotRight);
    }
  }
  _generateCenterline(parts, segmentsPerPart) {
    const centerline = [];
    for (let i = 0; i < parts.length; i++) {
      const controlPoints = parts[i];
      const start = i === 0 ? 0 : 1;
      for (let j = start; j <= segmentsPerPart; j++) {
        const t = j / segmentsPerPart;
        centerline.push(this._getPointOnBezierCurve(controlPoints, t));
      }
    }
    return centerline;
  }
  _subtractVectors(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }
  _normalizeVector(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
  }
  _crossProduct(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
  _generateTube(path, tubeSegments, thickness, color) {
    if (path.length < 2) return; // Guard clause for connector bone
    const baseVertexIndex = this.vertices.length / 9;
    const vertexCount = path.length;
    for (let i = 0; i < vertexCount; i++) {
      const point = path[i];
      const t = vertexCount > 1 ? i / (vertexCount - 1) : 0;
      let currentThickness;
      if (Array.isArray(thickness)) {
        if (t < 0.5)
          currentThickness =
            thickness[0] + (thickness[1] - thickness[0]) * (t * 2);
        else
          currentThickness =
            thickness[1] + (thickness[2] - thickness[1]) * ((t - 0.5) * 2);
      } else {
        currentThickness = thickness;
      }
      let tangent;
      if (i === 0) tangent = this._subtractVectors(path[i + 1], point);
      else if (i === vertexCount - 1)
        tangent = this._subtractVectors(point, path[i - 1]);
      else tangent = this._subtractVectors(path[i + 1], path[i - 1]);
      tangent = this._normalizeVector(tangent);
      const up = Math.abs(tangent[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0];
      const normal = this._normalizeVector(this._crossProduct(tangent, up));
      const binormal = this._normalizeVector(
        this._crossProduct(tangent, normal)
      );
      for (let j = 0; j <= tubeSegments; j++) {
        const angle = (j / tubeSegments) * 2 * Math.PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const circle_x = cos * currentThickness;
        const circle_y = sin * currentThickness;
        const vertex_x =
          point[0] + circle_x * normal[0] + circle_y * binormal[0];
        const vertex_y =
          point[1] + circle_x * normal[1] + circle_y * binormal[1];
        const vertex_z =
          point[2] + circle_x * normal[2] + circle_y * binormal[2];
        const normal_v = this._normalizeVector([
          vertex_x - point[0],
          vertex_y - point[1],
          vertex_z - point[2],
        ]);
        this.vertices.push(vertex_x, vertex_y, vertex_z, ...color, ...normal_v);
      }
    }
    for (let i = 0; i < vertexCount - 1; i++) {
      for (let j = 0; j < tubeSegments; j++) {
        const idx1 = baseVertexIndex + i * (tubeSegments + 1) + j;
        const idx2 = baseVertexIndex + (i + 1) * (tubeSegments + 1) + j;
        this.faces.push(idx1, idx2, idx1 + 1);
        this.faces.push(idx2, idx2 + 1, idx1 + 1);
      }
    }
  }
  _getPointOnBezierCurve(controlPoints, t) {
    const [p0, p1, p2, p3] = controlPoints;
    const c0 = Math.pow(1 - t, 3);
    const c1 = 3 * Math.pow(1 - t, 2) * t;
    const c2 = 3 * (1 - t) * Math.pow(t, 2);
    const c3 = Math.pow(t, 3);
    const x = c0 * p0[0] + c1 * p1[0] + c2 * p2[0] + c3 * p3[0];
    const y = c0 * p0[1] + c1 * p1[1] + c2 * p2[1] + c3 * p3[1];
    const z = c0 * p0[2] + c1 * p1[2] + c2 * p2[2] + c3 * p3[2];
    return [x, y, z];
  }
}
