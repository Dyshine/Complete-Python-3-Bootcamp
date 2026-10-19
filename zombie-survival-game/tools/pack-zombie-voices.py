# Regenerates sounds/zmoan_*, zrage_*, zatk_*, zdie_* from CC0 packs on OpenGameArt (see sounds/CREDITS.txt).
#   python3 tools/pack-zombie-voices.py <download dir> [out dir, default sounds/]      (needs curl, unzip, ffmpeg, numpy)
# Long recordings are split into takes at the pauses; each take gets the rumble and a little hiss filtered out, is trimmed,
# faded, levelled by its loud part (moans a little quieter than snarls) and encoded mono 32 kHz 64 kbps.
import subprocess, sys, os, numpy as np
DL = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'sounds'); SR = 22050
B = 'https://opengameart.org/sites/default/files/'
SRC = {  # pack: files (zips are unpacked)
 'antumdeluge': ['undead-moans.zip'], 'emopreben': ['zombiemoans_-_wav.zip'], 'darsycho_moans': ['darsycho__zombie-moans_0.ogg'],
 'darsycho_ghoul': ['hungry-ghoul_0.ogg'], 'artisticdude': ['zombies.zip'], 'saturn91': ['02_zombey.mp3', '07_zombey.mp3'],
 'darsycho_snarl': ['monster-snarl-5.ogg', 'monster-snarl-attack.ogg', 'monsters-snarls-3_0.ogg'],
 'arcadeparty': ['Voice%20Effects%20Zombie-Skeleton-Monster%20Human%20Male.zip']}
PICK = {  # category: (loudness target dBFS, takes as pack__file[__sN for the Nth take of a long recording])
 'zmoan': (-20, ['antumdeluge__undead-1', 'antumdeluge__undead-2', 'antumdeluge__undead-3', 'antumdeluge__undead-4',
   'emopreben__ZombieMoans_-_Track_5_-_ZombieMoan1', 'emopreben__ZombieMoans_-_Track_6_-_ZombieMoan2',
   'darsycho_moans__darsycho__zombie-moans_0__s0', 'darsycho_moans__darsycho__zombie-moans_0__s1',
   'darsycho_ghoul__hungry-ghoul_0__s1', 'darsycho_ghoul__hungry-ghoul_0__s2', 'darsycho_ghoul__hungry-ghoul_0__s10', 'darsycho_ghoul__hungry-ghoul_0__s11',
   'artisticdude__zombie-16', 'artisticdude__zombie-18', 'saturn91__02_zombey', 'saturn91__07_zombey']),
 'zrage': (-17, ['darsycho_snarl__monster-snarl-5__s0', 'darsycho_snarl__monster-snarl-5__s1', 'darsycho_snarl__monster-snarl-5__s2',
   'darsycho_snarl__monster-snarl-5__s4', 'darsycho_snarl__monster-snarl-5__s6', 'darsycho_snarl__monster-snarl-5__s8',
   'darsycho_snarl__monster-snarl-attack__s0', 'darsycho_snarl__monster-snarl-attack__s2', 'darsycho_snarl__monster-snarl-attack__s5',
   'darsycho_snarl__monster-snarl-attack__s6', 'darsycho_snarl__monster-snarl-attack__s7', 'darsycho_snarl__monster-snarl-attack__s9',
   'darsycho_snarl__monsters-snarls-3_0__s1', 'darsycho_snarl__monsters-snarls-3_0__s3', 'artisticdude__zombie-10', 'artisticdude__zombie-12']),
 'zatk': (-16, ['arcadeparty__zombieYell1', 'arcadeparty__zombieYell2', 'arcadeparty__zombieYell3', 'arcadeparty__zombieYell4', 'arcadeparty__zombieYell5',
   'arcadeparty__zombieYell7', 'arcadeparty__zombieYell8', 'arcadeparty__zombieYell9', 'arcadeparty__zombieYell10', 'artisticdude__zombie-24']),
 'zdie': (-17, ['arcadeparty__zombieDeath1', 'arcadeparty__zombieDeath2', 'arcadeparty__zombieDeath3', 'arcadeparty__zombieDeath4', 'artisticdude__zombie-17'])}

def load(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()
def env(x, H):
    return np.array([np.sqrt(np.mean(x[i:i + H] ** 2)) for i in range(0, len(x) - H, H)])
def split(x):  # takes separated by at least 0.25 s more than 40 dB under the recording's peak
    H = 256; on = env(x, H) > env(x, H).max() * 10 ** (-40 / 20); segs = []; i = 0; gap = int(.25 * SR / H)
    while i < len(on):
        if on[i]:
            j = i; q = 0
            while j < len(on) and q < gap: q = 0 if on[j] else q + 1; j += 1
            segs.append((max(0, i - 4) * H, min(len(x), (j - gap + 6) * H))); i = j
        else: i += 1
    return [s for s in segs if s[1] - s[0] > .2 * SR]
def takes():
    T = {}
    for pack, files in SRC.items():
        d = os.path.join(DL, pack); os.makedirs(d, exist_ok=True)
        for f in files:
            dst = os.path.join(d, f.replace('%20', '_'))
            if not os.path.exists(dst): subprocess.run(['curl', '-sSfL', '--retry', '3', '-o', dst, B + f], check=True)
            if dst.endswith('.zip'): subprocess.run(['unzip', '-q', '-o', dst, '-d', d], check=True)
        for root, _, fs in os.walk(d):
            if '__MACOSX' in root: continue
            for fn in sorted(fs):
                if not fn.lower().endswith(('.wav', '.ogg', '.mp3')) or 'preview' in fn.lower(): continue
                x = load(os.path.join(root, fn)); segs = split(x) if len(x) > 3.2 * SR else [(0, len(x))]
                for k, (a, b) in enumerate(segs):
                    T[f"{pack}__{os.path.splitext(fn)[0].replace(' ', '_')}" + (f"__s{k}" if len(segs) > 1 else '')] = x[a:b]
    return T
def ff(x, flt):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', flt, '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).copy()
T = takes()
for cat, (target, names) in PICK.items():
    for i, n in enumerate(names, 1):
        x = ff(T[n], 'highpass=f=70,afftdn=nr=8:nf=-42')
        H = 256; e = env(x, H); on = np.where(e > e.max() * 10 ** (-42 / 20))[0]
        a = max(0, on[0] * H - int(.03 * SR)); b = min(len(x), (on[-1] + 1) * H + int(.06 * SR)); x = x[a:b]
        fi, fo = int(.008 * SR), int(min(.09, len(x) / SR * .2) * SR)
        x[:fi] *= np.linspace(0, 1, fi); x[-fo:] *= np.linspace(1, 0, fo) ** 1.5
        act = e[on[0]:on[-1] + 1]; act = act[act > e.max() * .1]
        x = x * min(10 ** (target / 20) / (np.sqrt(np.mean(act ** 2)) + 1e-9), 10 ** (-1 / 20) / (np.abs(x).max() + 1e-9))
        dst = os.path.join(OUT, f'{cat}_{i}.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ar', '32000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', dst],
                       input=x.astype(np.float32).tobytes(), check=True)
        print(f'{cat}_{i}.mp3  {n}  {len(x) / SR:.2f} s')
