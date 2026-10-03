# Builds every page from layout.html + pages/<slug>.html.
#   {{img:KEY|SIZES|eager}}  responsive <img> from PHOTOS
#   {{RAIMON}}               a band of the meander pattern from the bowl's rim (inline SVG)
#   {{MENU_LIST}}            the full menu as text, from MENU
#   {{CREDITS}} / {{V}}      photo credits / cache-busting version
# Edit PHOTOS or MENU below, then run:  python build.py
import json, re, time, pathlib

HERE = pathlib.Path(__file__).parent
U = 'https://images.unsplash.com/'

PHOTOS = {
    'hero':    ('photo-1632709810780-b5a4343cebec', 4765, 3059, '真上から見た醤油そば', 'Frank from 5 AM Ramen'),
    'bowl':    ('photo-1753525808061-b42dfdd8aa41', 4000, 6000, '薄暗いカウンターに置かれた、チャーシューと味玉の醤油そば', 'Phil Mishanin'),
    'tare':    ('photo-1499126167718-c87f5c1387e8', 5472, 3078, '白い丼に、小さな器から醤油ダレを注ぐ手元', 'Caroline Attwood'),
    'noodles': ('photo-1633352615955-f0c99e8b7e5a', 2832, 4240, '一玉ずつ丸めた、打ちたての細麺', 'Jakub Dziubak'),
    'chashu':  ('photo-1775572761893-c67c76dcee91', 4000, 6000, '器に並べた、炙りのチャーシューと白髪ねぎ', 'Leongsan'),
    'kombu':   ('photo-1702315631724-cb0d0f91d987', 6000, 4000, '岩の上に重なる、濡れた海藻', 'Joan'),
    'negi':    ('photo-1768860382695-e79bdb937ba0', 4000, 6000, '小口に刻んだ青ねぎ', 'SarahCreates'),
    'counter': ('photo-1513021115044-2a2843b05665', 4288, 2569, '木の格子に囲まれた、灯りのともるカウンター', 'Michel Catalisano'),
    'dough':   ('photo-1609053175487-f2bf03ba92b0', 6000, 4000, '製麺台で、麺棒に生地を巻きつけて延ばす料理人', 'Beth Macdonald'),
    'sake':    ('photo-1759300632250-42e219dfe99b', 4608, 3072, '並べられた日本酒の一升瓶', 'Johnny Ho'),
    'cup':     ('photo-1616653872600-d6461f1b7905', 2543, 4521, '白い器から立ちのぼる湯気', 'Varun Gaba'),
}

# The ticket machine and the menu list are both built from this.
# (id, category, name, price, note, is the signature bowl)
MENU = [
    ('tokusei', 'soba',  '特製醤油そば',     2600, 'チャーシュー三種、味玉、和牛ワンタン二つをのせた一杯。', True),
    ('shoyu',   'soba',  '醤油そば',         1800, '三つの醤油を合わせたタレに、丸鶏と昆布のスープ。', False),
    ('shio',    'soba',  '塩そば',           1800, '蛤の出汁と沖縄の塩。香味油は柚子の皮で。', False),
    ('tsuke',   'soba',  '昆布水のつけそば', 2200, '麺は利尻昆布の水に浸して。まず塩で、次に醤油のつけ汁で。', False),
    ('ajitama', 'top',   '味玉',              250, '名古屋コーチンの卵を、タレに一晩。', False),
    ('wonton',  'top',   '和牛ワンタン三つ',  600, '黒毛和牛の肩肉と生姜を、薄い皮で。', False),
    ('chashu',  'top',   'チャーシュー増し',  700, '肩ロース、豚バラ、鶏むねを一枚ずつ。', False),
    ('menma',   'top',   '穂先メンマ',        300, '筍の先の柔らかいところだけを、醤油で煮て。', False),
    ('truffle', 'top',   '黒トリュフ',        900, '季節限定。仕上げに削ってお出しします。', False),
    ('don',     'rice',  '炙りチャーシュー丼', 600, '端の部分を刻んで炙り、卵黄をのせて。', False),
    ('tkg',     'rice',  '卵かけご飯',        450, '土鍋で炊いたご飯と、名古屋コーチンの卵。', False),
    ('sake',    'drink', '日本酒（一合）',    1100, '月替わりで三種。スープに合う、辛口のものを。', False),
    ('beer',    'drink', '瓶ビール',          800, '中瓶。', False),
    ('ginger',  'drink', '自家製ジンジャーエール', 600, '高知の生姜と、きび砂糖で。', False),
]
CATS = [('soba', 'そば'), ('top', 'のせもの'), ('rice', 'ご飯'), ('drink', '飲みもの')]


def img(key, sizes='100vw', eager=False):
    pid, w, h, alt, _ = PHOTOS[key]
    base = f'{U}{pid}?auto=format&fit=crop&q=78'
    srcset = ', '.join(f'{base}&w={x} {x}w' for x in (640, 1000, 1600, 2400))
    load = ' fetchpriority="high"' if eager else ' loading="lazy"'
    return f'<img src="{base}&w=1600" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{alt}"{load} decoding="async">'


def repl(m):
    p = m.group(1).split('|')
    return img(p[0], p[1] if len(p) > 1 and p[1] else '100vw', len(p) > 2 and p[2] == 'eager')


RM = 28  # size of one meander tile, px


def raimon_tile(c=RM):
    """One tile of the meander (雷紋) on the rim of ramen bowls: a square spiral turning
    inward, plus a short tail along the bottom that joins the next tile."""
    s = c / 7
    pts = [(0, 6), (6, 6), (6, 0), (0, 0), (0, 4), (4, 4), (4, 2), (2, 2)]
    d = 'M' + ' L'.join(f'{x * s + s / 2:.1f} {y * s + s / 2:.1f}' for x, y in pts)
    d += f' M{6 * s + s / 2:.1f} {6 * s + s / 2:.1f} L{c + s / 2:.1f} {6 * s + s / 2:.1f}'
    return (f'<pattern id="rm" width="{c}" height="{c}" patternUnits="userSpaceOnUse">'
            f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/></pattern>')


def raimon():
    return f'<svg class="raimon" height="{RM}" aria-hidden="true"><rect width="100%" height="{RM}" fill="url(#rm)"/></svg>'


def yen(n):
    return f'{n:,}'


menu_list = []
for cat, label in CATS:
    rows = '\n'.join(
        f'          <li><b>{name}</b><span class="p">{yen(price)}<small>円</small></span><span class="n">{note}</span></li>'
        for _id, c, name, price, note, _ in MENU if c == cat)
    menu_list.append(f'      <div class="mgroup" data-in>\n        <h3>{label}</h3>\n        <ul>\n{rows}\n        </ul>\n      </div>')
menu_list = '\n'.join(menu_list)

# ---------- pages ----------
# slug: (nav label, <title>, description, page-head kicker, page-head title, lead, next slug)
PAGES = {
    'index': ('トップ', '中華そば 琥珀 | 西麻布の醤油そば', '西麻布、カウンター八席。丸鶏と昆布を十二時間かけて引いたスープと、毎朝打つ自家製麺の醤油そば。', None, None, None, None),
    'ippai': ('一杯ができるまで', '一杯ができるまで | 中華そば 琥珀', 'タレ、スープ、香味油、麺、チャーシュー。醤油そば一杯を、器に入れる順に。', '醤油そばの作り方', '一杯ができるまで', '器に入れる順に、六つの仕事をご紹介します。スクロールすると、一杯ができあがっていきます。', 'menu'),
    'menu':  ('お品書き', 'お品書き | 中華そば 琥珀', '醤油そば、塩そば、昆布水のつけそば。のせもの、ご飯、飲みもの。', '券売機と同じ並びで', 'お品書き', '店頭の券売機と同じ並びです。先に決めておくと、当日の注文がすみやかです。お会計は店内でも承ります。', 'craft'),
    'craft': ('素材と人', '素材と人 | 中華そば 琥珀', '鶏、醤油、昆布、小麦、豚、葱。琥珀の一杯を支える産地と、店主の話。', '産地と、店主のこと', '素材と人', '六つの素材は、すべて産地まで足を運んで決めました。十年かけて、少しずつ入れ替えてきたものです。', 'visit'),
    'visit': ('店舗とご予約', '店舗とご予約 | 中華そば 琥珀', '港区西麻布二丁目。昼の部と夜の部、各回の半分の席をご予約いただけます。', '西麻布二丁目', '店舗とご予約', '各回の半分の席を、ウェブでご予約いただけます。残りの席は、店頭にお並びの方から順にご案内します。', None),
}
NAV_ORDER = ['ippai', 'menu', 'craft', 'visit']
ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 6l6 6-6 6"/></svg>'


def nav(current, keys, sep='\n      '):
    links = []
    for k in keys:
        cur = ' aria-current="page"' if k == current else ''
        links.append(f'<a href="{k}.html"{cur}>{PAGES[k][0]}</a>')
    return sep.join(links)


def page_head(slug):
    _, _, _, kicker, title, lead, _ = PAGES[slug]
    return (f'  <section class="page-head">\n'
            f'    <div class="wrap">\n'
            f'      <ol class="crumbs"><li><a href="index.html">トップ</a></li><li aria-current="page">{title}</li></ol>\n'
            f'      <h1 class="page-title"><small>{kicker}</small>{title}</h1>\n'
            f'      <p class="page-lead">{lead}</p>\n'
            f'    </div>\n'
            f'    {{{{RAIMON}}}}\n'
            f'  </section>\n')


def next_link(slug):
    nxt = PAGES[slug][6]
    if not nxt:
        return ''
    return (f'  <nav class="next-page" aria-label="次のページ">\n'
            f'    <a class="wrap" href="{nxt}.html"><small>次は</small><b>{PAGES[nxt][4]}</b><span class="go">{ARROW}</span></a>\n'
            f'  </nav>\n')


layout = (HERE / 'layout.html').read_text(encoding='utf-8')
menu_json = json.dumps([dict(id=i, c=c, name=n, price=p, sig=s) for i, c, n, p, _, s in MENU], ensure_ascii=False)
version = str(int(time.time()))
credits = '、'.join(dict.fromkeys(p[4] for p in PHOTOS.values()))
TOKEN = re.compile(r'\{\{img:([^}]+)\}\}')
LEFTOVER = re.compile(r'\{\{[^}]+\}\}')

for slug, meta in PAGES.items():
    body = (HERE / 'pages' / f'{slug}.html').read_text(encoding='utf-8')
    if slug != 'index':
        body = page_head(slug) + body + next_link(slug)
    scripts = f'<script>window.MENU = {menu_json};</script>\n' if slug == 'menu' else ''
    html = (layout.replace('{{BODY}}', body)
                  .replace('{{TITLE}}', meta[1])
                  .replace('{{DESC}}', meta[2])
                  .replace('{{SLUG}}', slug)
                  .replace('{{NAV}}', nav(slug, NAV_ORDER))
                  .replace('{{FNAV}}', nav(slug, NAV_ORDER, ''))
                  .replace('{{SCRIPTS}}', scripts))
    html = TOKEN.sub(repl, html)
    html = (html.replace('{{MENU_LIST}}', menu_list)
                .replace('{{HERO_SRC}}', f"{U}{PHOTOS['hero'][0]}?auto=format&q=82&w=2400")
                .replace('{{RAIMON_TILE}}', raimon_tile())
                .replace('{{RAIMON}}', raimon())
                .replace('{{CREDITS}}', credits)
                .replace('{{V}}', version))
    left = LEFTOVER.findall(html)
    assert not left, (slug, left)
    (HERE / f'{slug}.html').write_text(html, encoding='utf-8')
    print(f'{slug}.html written')
