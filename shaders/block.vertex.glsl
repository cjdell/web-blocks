attribute vec3 offset;
attribute vec4 data;

uniform float time;

varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vOffset;

varying float vType;
varying float vSide;
varying float vShade;
varying vec3 vColour;

float HueToRGB(float f1, float f2, float hue) {
  if (hue < 0.0)
    hue += 1.0;
  else if (hue > 1.0)
    hue -= 1.0;

  float res;

  if ((6.0 * hue) < 1.0)
    res = f1 + (f2 - f1) * 6.0 * hue;
  else if ((2.0 * hue) < 1.0)
    res = f2;
  else if ((3.0 * hue) < 2.0)
    res = f1 + (f2 - f1) * ((2.0 / 3.0) - hue) * 6.0;
  else
    res = f1;

  return res;
}

vec3 HSLToRGB(vec3 hsl) {
  vec3 rgb;

  if (hsl.y == 0.0) {
    rgb = vec3(hsl.z);  // Luminance
  } else {
    float f2;

    if (hsl.z < 0.5)
      f2 = hsl.z * (1.0 + hsl.y);
    else
      f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);

    float f1 = 2.0 * hsl.z - f2;

    rgb.r = HueToRGB(f1, f2, hsl.x + (1.0/3.0));
    rgb.g = HueToRGB(f1, f2, hsl.x);
    rgb.b = HueToRGB(f1, f2, hsl.x - (1.0/3.0));
  }

  return rgb;
}

void main() {
  vNormal = normal;
  vOffset = offset;

  float on = 1.0;

  if (on >= 1.0) {
    vec3 newPosition = position;

    vPos = (modelMatrix * vec4(newPosition, 1.0)).xyz;

    float type = data.x;
    float side = data.y;
    float shade = data.z;
    float colour = data.w;

    // Number of textures per cube
    float sideCount = 8.0;

    // Number block types
    float typeCount = 8.0;

    float isSide = 0.0;

    if (side == 0.0 || side == 1.0 || side == 4.0 || side == 5.0) {
      isSide = 1.0;
    }

    vUv.x = uv.x * (1.0 / sideCount) + isSide * (1.0 / sideCount);
    vUv.y = uv.y * (1.0 / typeCount) + type * (1.0 / typeCount);

    if (type == 3.0) {
        vPos.y += sin(time / 3.0) / 4.0 - 0.5;
    }

    if (type == 4.0) {
        // Webcam uses original coords
        vUv = uv;
    }

    // Rounding hack...
    vSide = side + 0.1;
    vType = type + 0.1;
    vShade = shade + 0.1;

    vec3 hsl = vec3(colour / 255.0, 1.0, 0.5);
    vColour = HSLToRGB(hsl);

    /*if (type == 1.0) {
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
