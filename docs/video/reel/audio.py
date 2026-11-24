# Music + SFX for the GARAP reel (no voiceover: the owner records VO later from the subtitles).
# All sound is synthesised here; nothing is downloaded. Writes audio/mix.wav (120 s, 44.1 kHz stereo).
import numpy as np, soundfile as sf
from scipy import signal
SR, DUR = 44100, 120.0
N = int(DUR * SR)
rng = np.random.default_rng(7)
T = lambda n: np.arange(n) / SR
def lp(x, f): b, a = signal.butter(2, f / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f): b, a = signal.butter(2, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, lo, hi): b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def place(buf, x, at, g=1.0):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf): buf[i:j] += x[:j - i] * g
def fade(x, a=.005, r=.05):
    n = len(x); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * e

# ---------------- SFX (soft, under the future voice) ----------------
def tick():  n = int(.05 * SR); t = T(n); return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 120) * .5
def pop(f=520): n = int(.18 * SR); t = T(n); return np.sin(2 * np.pi * f * (1 + 1.2 * np.exp(-t * 40)) * t) * np.exp(-t * 22) * .6
def click(): n = int(.04 * SR); t = T(n); return hp(rng.standard_normal(n), 2500) * np.exp(-t * 180) * .5
def water(d=.5):
    n = int(d * SR); x = np.zeros(n)
    for k in range(int(d * 14)):
        f = rng.uniform(500, 1400); m = int(.06 * SR); t = T(m)
        b = np.sin(2 * np.pi * f * (1 + 2 * t) * t) * np.exp(-t * 60) * .35
        place(x, b, rng.uniform(0, d - .07))
    return x
def drip(): n = int(.2 * SR); t = T(n); return np.sin(2 * np.pi * 900 * (1 + 3 * np.exp(-t * 30)) * t) * np.exp(-t * 25) * .5
def step(): n = int(.09 * SR); t = T(n); return lp(rng.standard_normal(n), 600) * np.exp(-t * 50) * .45
def rustle(d=.6): n = int(d * SR); e = np.sin(np.pi * np.linspace(0, 1, n)); return bp(rng.standard_normal(n), 2000, 7000) * e * .25
def paper(): return rustle(.35) * 1.3
def hum(d=1.0):                                    # short peristaltic pump hum (never continuous)
    n = int(d * SR); t = T(n); x = (np.sin(2 * np.pi * 110 * t) + .4 * np.sign(np.sin(2 * np.pi * 55 * t))) * (.6 + .4 * np.sin(2 * np.pi * 9 * t))
    return fade(lp(x, 900) * .22, .04, .08)
def spray(): n = int(.35 * SR); t = T(n); return hp(rng.standard_normal(n), 3000) * np.exp(-t * 9) * .35
def chime(): n = int(.9 * SR); t = T(n); return (np.sin(2 * np.pi * 784 * t) + .5 * np.sin(2 * np.pi * 1175 * t)) * np.exp(-t * 5) * .28   # soft, not an alarm
def whoosh(d=.3): n = int(d * SR); e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5; return bp(rng.standard_normal(n), 400, 3000) * e * .5
def lock(): return click() + pop(300) * .4
def thunk(): n = int(.2 * SR); t = T(n); return np.sin(2 * np.pi * 120 * t) * np.exp(-t * 25) * .6

sfx = np.zeros(N)
cues = [
    (0.4, water(.6), .8), (3.1, step(), 1), (3.45, step(), 1), (3.8, step(), 1), (4.3, rustle(), 1), (5.7, paper(), 1),
    (12.0, pop(660), .8), (15.4, click(), 1), (19.0, tick(), 1), (20.6, tick(), 1), (25.0, whoosh(.4), .6),
    (30.3, pop(520), .7), (31.6, click(), 1), (35.0, drip(), .8), (40.4, click(), 1), (41.3, click(), 1), (42.4, drip(), .8), (42.8, drip(), .6),
    (45.3, pop(520), .7), (51.0, hum(1.4), 1), (51.2, water(1.2), .5), (53.4, paper(), 1), (54.2, paper(), .8),
    (57.5, water(.8), .8), (60.9, water(.5), .7), (63.0, rustle(.5), .8), (64.0, paper(), .7), (66.0, paper(), .7), (67.0, spray(), 1), (67.8, spray(), 1), (68.6, spray(), 1),
    (71.0, tick(), .6), (71.6, tick(), .6), (72.2, tick(), .6), (72.8, tick(), .6),
    (75.1, click(), 1), (75.6, whoosh(.5), .7), (76.2, pop(700), .6),
    (84.3, pop(520), .7), (91.2, tick(), 1), (92.2, tick(), 1), (93.2, tick(), 1),
    (95.0, hum(1.1), 1), (95.1, drip(), .5), (96.8, click(), .6), (97.0, hum(.8), 1), (97.1, drip(), .5), (98.5, water(1.5), .4),
    (102.3, tick(), 1), (104.0, tick(), 1), (105.4, step(), 1), (106.0, water(.4), .5), (107.0, rustle(.4), .7),
    (108.3, chime(), 1), (110.8, thunk(), .5),
    (113.6, pop(523), .6), (114.1, pop(587), .6), (114.6, pop(659), .6), (115.1, pop(698), .6), (115.6, pop(784), .6),
]
for at, x, g in cues: place(sfx, x, at, g)

# ---------------- music: calm plucked underscore, C major, 88 bpm ----------------
BEAT = 60 / 88
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def pluck(m, d=.6, g=1.0):
    n = int(d * SR); t = T(n); f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in [(1, 1), (2, .35), (3, .15)]) * np.exp(-t * 5.5)
    return fade(x * g, .004, .05)
def pad(ms, d, g=1.0):
    n = int(d * SR); t = T(n); x = sum(np.sin(2 * np.pi * midi(m) * t + i) + .3 * np.sin(2 * np.pi * midi(m) * 1.005 * t) for i, m in enumerate(ms))
    return fade(lp(x, 1500) * g, .8, 1.2)
music = np.zeros(N)
prog = [(48, (60, 64, 67)), (45, (57, 60, 64)), (41, (57, 60, 65)), (43, (55, 59, 62))]   # C Am F G
bar = 4 * BEAT; t0 = 0.0; k = 0
while t0 < 116:
    root, ch = prog[k % 4]
    place(music, pad(ch, bar + 1, .05), t0)
    place(music, pluck(root, 1.2, .5), t0); place(music, pluck(root, 1.0, .35), t0 + 2 * BEAT)
    for b, i in enumerate([0, 1, 2, 1, 0, 2, 1, 2]):
        place(music, pluck(ch[i] + 12, .5, .22), t0 + b * BEAT / 2)
    t0 += bar; k += 1
place(music, pad((60, 64, 67, 72), 4.5, .09), 116.4)
for i, m in enumerate((72, 76, 79, 84)): place(music, pluck(m, 2.0, .3), 116.4 + i * .12)
music = lp(music, 5000)
env = np.ones(N); env[:int(1.5 * SR)] = np.linspace(.2, 1, int(1.5 * SR)); env[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR))
music *= env

# music sits low so a voice recorded later stays on top
mix = music * .32 + sfx * .55
mix /= max(1e-6, np.max(np.abs(mix))) / .7
stereo = np.stack([mix, mix], 1)
sf.write('audio/mix.wav', stereo, SR)
print('mix', len(mix) / SR, 's')
