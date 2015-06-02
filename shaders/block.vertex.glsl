attribute vec3 offset;
attribute float data;

uniform sampler2D info;
uniform float time;

varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vOffset;
varying float vData;

varying float vType;
varying float vSide;
varying float vShade;

void main() {
  vNormal = normal;
  vUv = uv;
  vOffset = offset;
  vData = data;

  float on = 1.0;

  if (on >= 1.0) {
    vec3 newPosition = position;

    vPos = (modelMatrix * vec4(newPosition, 1.0)).xyz;

    vType = floor(mod(vData, 256.0));
    vSide = floor(mod(vData / 256.0, 256.0));
    vShade = floor(vData / 65536.0);

    if (vType == 3.0) {
        vPos.y += sin(time / 3.0) / 2.0 - 0.5;
    }

    /*if (vType == 1.0) {
        //vPos.x += sin((vPos.y + vPos.x) / 4.0 + time / 3.0) * 20.0;
        vPos.x += sin((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 5.0;
        vPos.y += cos((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 5.0;
        vPos.z += sin((vPos.z + vPos.x + vPos.y) / 4.0 + time / 3.0) * 5.0;
    }*/

    gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
  } else {
    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
  }
}
