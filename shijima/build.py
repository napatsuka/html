# Builds index.html from template.html.
# In the template, {{img:KEY|SIZES|eager}} becomes a responsive <img>; "eager" is optional.
# Swap a photo by editing PHOTOS below (or point it at a local file in images/), then run:  python build.py
import re, pathlib

HERE = pathlib.Path(__file__).parent
U = 'https://images.unsplash.com/'

PHOTOS = {
    # key: (unsplash id, width, height, alt, credit)
    'asagiri': ('photo-1700109688821-15b8b773e780', 6000, 4000, '霧が立ちこめる渓谷と、谷底を流れる川', 'Gandosh Ganbaatar'),
    'asage':   ('photo-1680137248903-7af5d51a3350', 4416, 2944, '木の膳に置かれた、湯気の立つお味噌汁', 'Seiya Maeda'),
    'keiryu':  ('photo-1785899582411-9412fb91ddf6', 5712, 4284, '緑の木々に囲まれた、浅い渓流', 'Zion C'),
    'yuami':   ('photo-1785057707880-777f72acea8f', 6000, 4000, '山並みを望む露天の湯船', 'Loris Boulinguez'),
    'yuge':    ('photo-1642821199328-a3bcdc821552', 6240, 4160, '朱塗りの膳に並んだ、夕餉の品々', 'Takafumi Yamashita'),
    'hoshi':   ('photo-1680711583060-ff084599b8f5', 6750, 4500, '山の稜線の上に広がる星空', 'Iori Ikeda'),
    'kawane':  ('photo-1614301246509-d1fc7d78b6b6', 3868, 2579, '大きな窓のある、畳敷きの客室', 'Susann Schuster'),
    'ryokuin': ('photo-1785871097863-1cceb66ced88', 4850, 3637, '窓の外に青もみじが広がる、薄暗い客室', 'realfish'),
    'engawa':  ('photo-1610333684078-c89bd57f2e46', 7952, 5304, '障子越しに外の光が入る客室', 'Lucas Calloch'),
    'hanare':  ('photo-1733653023417-92ffcab24969', 4000, 6000, '囲炉裏のある、古い木造の部屋', 'Leopold Maitre'),
    'oke':     ('photo-1783094724116-ff5f8362a581', 3857, 5430, '森の中に置かれた木桶の湯船', 'Kris Tian'),
    'yukimi':  ('photo-1761929586535-589bc67b34a2', 5612, 3741, '雪に囲まれた湯屋に、灯りがともる', 'hiding ninja'),
    'hassun':  ('photo-1688246552025-b2ff346aaca2', 2590, 2590, '焼き魚と小鉢が並ぶ、会席の膳', 'Fábio Alves'),
    'tsukuri': ('photo-1627221122441-9b31f3fe708c', 5174, 3449, '串に刺して炭火で焼く川魚', 'Jinomono Media'),
    'tani':    ('photo-1566533425209-12d79c871474', 3376, 6000, '雲のかかる山あいを流れる川', 'Tomoki Orita'),
    'genkan':  ('photo-1760301748231-cbb6c16530a8', 3355, 5033, '提灯の灯る、木造の宿の入口', 'Nicola Fittipaldi'),
}

WIDTHS = (640, 1000, 1600, 2400)

def img(key, sizes='100vw', eager=False):
    pid, w, h, alt, _ = PHOTOS[key]
    if pid.startswith('photo-'):
        base = f'{U}{pid}?auto=format&fit=crop&q=78'
        src = f'{base}&w=1600'
        srcset = ', '.join(f'{base}&w={x} {x}w' for x in WIDTHS)
        extra = f' srcset="{srcset}" sizes="{sizes}"'
    else:
        src, extra = pid, ''
    load = ' fetchpriority="high"' if eager else ' loading="lazy"'
    return f'<img src="{src}"{extra} width="{w}" height="{h}" alt="{alt}"{load} decoding="async">'

def repl(m):
    parts = m.group(1).split('|')
    return img(parts[0], parts[1] if len(parts) > 1 and parts[1] else '100vw', len(parts) > 2 and parts[2] == 'eager')

html = (HERE / 'template.html').read_text(encoding='utf-8')
html = re.sub(r'\{\{img:([^}]+)\}\}', repl, html)
credits = '、'.join(dict.fromkeys(p[4] for p in PHOTOS.values()))
html = html.replace('{{CREDITS}}', credits)
# Cache-bust css/js so browsers pick up edits.
import time
html = html.replace('{{V}}', str(int(time.time())))
assert '{{' not in html, 'unreplaced token'
(HERE / 'index.html').write_text(html, encoding='utf-8')
print('index.html written')
