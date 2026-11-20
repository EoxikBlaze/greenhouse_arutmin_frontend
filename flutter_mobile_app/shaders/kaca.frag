#version 460 core
#include <flutter/runtime_effect.glsl>

// Refraksi tepi ala Liquid Glass untuk ImageFilter.shader (Impeller).
// Uniform pertama harus vec2 ukuran; sampler diisi mesin.
uniform vec2 u_size;
uniform float u_radius;      // radius sudut, px
uniform float u_depth;       // kedalaman lensa, px
uniform float u_refraction;  // 0..1
uniform float u_dispersion;  // 0..1
uniform float u_mode;        // 0 = kotak bulat, 1 = hanya tepi bawah, 2 = hanya tepi atas
uniform sampler2D u_texture;

out vec4 frag_color;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 ambil(vec2 piksel) {
  vec2 uv = clamp(piksel / u_size, vec2(0.001), vec2(0.999));
#ifdef IMPELLER_TARGET_OPENGLES
  uv.y = 1.0 - uv.y;
#endif
  return texture(u_texture, uv);
}

void main() {
  vec2 frag = FlutterFragCoord().xy;
  vec2 p = frag - 0.5 * u_size;
  vec2 b = 0.5 * u_size;
  float r = min(u_radius, min(b.x, b.y));
  float d;
  vec2 n;
  if (u_mode < 0.5) {
    d = sdRoundBox(p, b, r);                // negatif di dalam bentuk
    vec2 e = vec2(1.0, 0.0);
    n = vec2(
      sdRoundBox(p + e.xy, b, r) - sdRoundBox(p - e.xy, b, r),
      sdRoundBox(p + e.yx, b, r) - sdRoundBox(p - e.yx, b, r));
    n = n / max(length(n), 0.0001);
  } else if (u_mode < 1.5) {
    d = p.y - b.y;                          // tepi bawah saja
    n = vec2(0.0, 1.0);
  } else {
    d = -p.y - b.y;                         // tepi atas saja
    n = vec2(0.0, -1.0);
  }

  // 1 di tepi, 0 sedalam u_depth ke dalam.
  float k = 1.0 - clamp(-d / max(u_depth, 1.0), 0.0, 1.0);
  k = k * k;

  // Latar dibelokkan ke arah dalam, makin kuat di tepi.
  vec2 geser = -n * k * u_refraction * u_depth * 0.9;
  float s = u_dispersion * k * 0.18;

  float rr = ambil(frag + geser * (1.0 + s)).r;
  vec4 hijau = ambil(frag + geser);
  float bb = ambil(frag + geser * (1.0 - s)).b;
  frag_color = vec4(rr, hijau.g, bb, hijau.a);
}
