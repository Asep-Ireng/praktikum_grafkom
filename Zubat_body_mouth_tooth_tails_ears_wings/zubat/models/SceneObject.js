export class SceneObject {
  constructor(GL, _position, _color, _normal) {
    if (this.constructor === SceneObject) {
      throw new Error(
        "SceneObject is an abstract class and cannot be instantiated directly."
      );
    }
    this.GL = GL;
    this._position = _position;
    this._color = _color;
    this._normal = _normal;

    this.vertices = [];
    this.faces = [];
    this.vertexBuffer = null;
    this.facesBuffer = null;
    this.modelMatrix = LIBS.get_I4();
  }

  setup() {
    this.vertexBuffer = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.vertexBuffer);
    this.GL.bufferData(
      this.GL.ARRAY_BUFFER,
      new Float32Array(this.vertices),
      this.GL.STATIC_DRAW
    );

    this.facesBuffer = this.GL.createBuffer();
    this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
    this.GL.bufferData(
      this.GL.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(this.faces),
      this.GL.STATIC_DRAW
    );
  }

  render(GL, _Mmatrix, parentMatrix) {
    const combinedMatrix = LIBS.multiply(parentMatrix, this.modelMatrix);
    GL.uniformMatrix4fv(_Mmatrix, false, combinedMatrix);

    GL.bindBuffer(this.GL.ARRAY_BUFFER, this.vertexBuffer);

    const stride = 4 * (3 + 3 + 3);
    GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, stride, 0);
    GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, stride, 4 * 3);
    GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, stride, 4 * 6);

    GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
    GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_INT, 0);
  }
}