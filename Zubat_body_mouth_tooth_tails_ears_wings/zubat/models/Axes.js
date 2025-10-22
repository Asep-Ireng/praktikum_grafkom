export class Axes {
  constructor(GL, _position, _color, _normal) {
    this.GL = GL;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;

    const vertices = [
      -20, 0, 0, 10, 0, 0, 20, 0, 0, 10, 0, 0, 0, -20, 0, 0, 10, 0, 0, 20, 0, 0,
      10, 0, 0, 0, -20, 0, 0, 10, 0, 0, 20, 0, 0, 10,
    ];

    const arrowRadius = 0.08;
    const arrowHeight = 0.2;
    const arrowSegments = 12;
    let arrowVertices = [];

    const generateArrowhead = (axis, color) => {
      const tip = [0, arrowHeight, 0];
      for (let i = 0; i < arrowSegments; i++) {
        const angle1 = (i / arrowSegments) * 2 * Math.PI;
        const angle2 = ((i + 1) / arrowSegments) * 2 * Math.PI;
        const p1 = [
          Math.cos(angle1) * arrowRadius,
          0,
          Math.sin(angle1) * arrowRadius,
        ];
        const p2 = [
          Math.cos(angle2) * arrowRadius,
          0,
          Math.sin(angle2) * arrowRadius,
        ];
        let v1 = [...tip];
        let v2 = [...p1];
        let v3 = [...p2];
        if (axis === "x") {
          v1 = [v1[1], -v1[0], v1[2]];
          v1[0] += 2;
          v2 = [v2[1], -v2[0], v2[2]];
          v2[0] += 2;
          v3 = [v3[1], -v3[0], v3[2]];
          v3[0] += 2;
        } else if (axis === "z") {
          v1 = [v1[0], -v1[2], v1[1]];
          v1[2] += 2;
          v2 = [v2[0], -v2[2], v2[1]];
          v2[2] += 2;
          v3 = [v3[0], -v3[2], v3[1]];
          v3[2] += 2;
        } else {
          v1[1] += 2;
          v2[1] += 2;
          v3[1] += 2;
        }
        arrowVertices.push(...v1, ...color);
        arrowVertices.push(...v2, ...color);
        arrowVertices.push(...v3, ...color);
      }
    };

    generateArrowhead("x", [1, 0, 0]);
    generateArrowhead("y", [0, 1, 0]);
    generateArrowhead("z", [0, 0, 1]);

    this.arrowVertexCount = arrowVertices.length / 6;
    const allVertices = [...vertices, ...arrowVertices];

    this.vertexBuffer = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.vertexBuffer);
    this.GL.bufferData(
      this.GL.ARRAY_BUFFER,
      new Float32Array(allVertices),
      this.GL.STATIC_DRAW
    );
  }

  render(GL, _Mmatrix, M_SCENE) {
    GL.uniformMatrix4fv(_Mmatrix, false, M_SCENE);
    GL.disableVertexAttribArray(this._normal);
    GL.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 4 * 6, 0);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 4 * 6, 4 * 3);
    GL.drawArrays(GL.LINES, 0, 6);
    GL.drawArrays(GL.TRIANGLES, 6, this.arrowVertexCount);
    GL.enableVertexAttribArray(this._normal);
  }
}