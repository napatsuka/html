# Builds every page from layout.html + pages/<slug>.html.
#   {{img:KEY|SIZES|eager}}  responsive <img> from PHOTOS
#   {{OMAKASE_LIST}}          accessible list of the fifteen pieces
#   {{WAVES}}                 a band of seigaiha waves (inline SVG)
#   {{CREDITS}} / {{V}}       photo credits / cache-busting version
# Edit PHOTOS or OMAKASE below, then run:  python build.py
import json, re, time, pathlib

HERE = pathlib.Path(__file__).parent
U = 'https://images.unsplash.com/'

PHOTOS = {
    'hands':   ('photo-1758872123813-6abff307029e', 4368, 2912, '握り鮨を握る職人の手元', 'Tadahiro Higuchi'),
    'tai':     ('photo-1691442574552-6059a11c0e25', 5817, 3878, '黒い器に置かれた、白身の握り一貫', 'Juan Francisco Pineda Lopez'),
    'anago':   ('photo-1691442548582-f0d30de7d268', 5292, 3528, '黒い器に置かれた、煮ツメを塗った握り一貫', 'Juan Francisco Pineda Lopez'),
    'maguro':  ('photo-1691442569833-aa1881678f29', 5416, 3611, '黒い器に置かれた、鮪の握り一貫', 'Juan Francisco Pineda Lopez'),
    'knife':   ('photo-1711991022613-63df8929f311', 6000, 4000, 'まな板の上で、柳刃包丁で魚を引く手元', 'blackieshoot'),
    'rice':    ('photo-1689039234540-d335a43ca28a', 3560, 5340, '木の飯台に盛られた、炊きたてのシャリ', 'Gastro Editorial'),
    'kirin':   ('photo-1694174798844-7d2b3c2fcee7', 8326, 5541, '日本橋の欄干に据えられた、青銅の麒麟像', 'fan yang'),
    'counter': ('photo-1625668751669-65ceebd81e34', 4000, 6000, '灯りに照らされた白木のカウンター', 'Yu'),
    'menu':    ('photo-1774970809861-6ee7706d974a', 9520, 6328, '品書きの上に置かれた一貫の握り', 'Lei Hwang'),
    'sake':    ('photo-1657269946528-fb9aa16fd925', 4000, 6000, 'ガラスの器に注がれる日本酒', 'Fulvio Ciccolo'),
}

# The fifteen pieces of the October omakase, in the order they are served.
OMAKASE = [
    ('鯛',   'たい',       '明石',       '昆布締め', '利尻昆布で一晩。身が締まり、旨みが移ります。'),
    ('墨烏賊', 'すみいか',  '天草',       '包丁',     '細かな包丁目を入れ、甘みを引き出します。'),
    ('小鰭',  'こはだ',     '佐賀',       '酢〆',     '塩と酢で〆る、江戸前の仕事のはじまり。'),
    ('鰆',   'さわら',     '京都・舞鶴',   '藁焼き',   '皮目だけを藁の火で炙り、香りをまとわせます。'),
    ('赤身',  'あかみ',     '青森・大間',   '漬け',     '煮切り醤油に数分。江戸の保存の知恵です。'),
    ('中とろ', 'ちゅうとろ', '青森・大間',   '寝かせ',   '十日ほど寝かせ、脂と香りを開かせます。'),
    ('車海老', 'くるまえび', '大分',       '茹で',     '握る直前に茹で、人肌の温度でお出しします。'),
    ('赤貝',  'あかがい',   '閖上',       '包丁',     '叩いて身を締め、磯の香りを立たせます。'),
    ('〆鯖',  'しめさば',   '神奈川・松輪', '酢〆',     '浅めに〆て、皮目を少しだけ炙ります。'),
    ('鮑',   'あわび',     '房総',       '蒸し',     '酒で四時間蒸し、肝のソースを添えます。'),
    ('いくら', 'いくら',    '北海道',     '漬け',     '秋鮭の卵を、自家製の出汁醤油で。'),
    ('雲丹',  'うに',       '北海道・浜中', '生',       '塩水に浸けず、木箱のまま届いたものを。'),
    ('煮蛤',  'にはまぐり', '桑名',       '煮る',     '煮汁を煮詰めた煮ツメを、刷毛でひと塗り。'),
    ('穴子',  'あなご',     '江戸前・羽田', '煮る',     'ふっくらと煮上げ、焼き目をつけて。'),
    ('玉子',  'たまご',     '自家製',     '焼き',     '芝海老をすり込み、一時間かけて焼き上げます。'),
]

def img(key, sizes='100vw', eager=False):
    pid, w, h, alt, _ = PHOTOS[key]
    base = f'{U}{pid}?auto=format&fit=crop&q=78'
    srcset = ', '.join(f'{base}&w={x} {x}w' for x in (640, 1000, 1600, 2400))
    load = ' fetchpriority="high"' if eager else ' loading="lazy"'
    return f'<img src="{base}&w=1600" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{alt}"{load} decoding="async">'

def repl(m):
    p = m.group(1).split('|')
    return img(p[0], p[1] if len(p) > 1 and p[1] else '100vw', len(p) > 2 and p[2] == 'eager')

def waves(width=1440, r=22, rows=2, stroke='#2F4FA0', fill='#F3F3EF'):
    """A band of seigaiha: rows of concentric rings, each row drawn over the one behind it.
    Only the top row's scallops show as an edge; everything below is solid pattern."""
    h = r * rows
    out = []
    for row in range(rows):
        cy = r + row * r
        offset = 0 if row % 2 == 0 else r
        for cx in range(-r + offset, width + 2 * r, 2 * r):
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
            for rr in (r * .72, r * .44, r * .16):
                out.append(f'<circle cx="{cx}" cy="{cy}" r="{rr:.1f}" fill="none" stroke="{stroke}" stroke-width="1.2"/>')
    return (f'<svg class="waves" viewBox="0 0 {width} {h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'
            + ''.join(out) + '</svg>')

KANJI_NUM = '一二三四五六七八九十'
def kanji(n):
    return KANJI_NUM[n - 1] if n <= 10 else '十' + KANJI_NUM[n - 11]

omakase_list = '\n'.join(
    f'          <li>{kanji(i)}貫目　{k}（{y}）　{o}　{w}。{note}</li>'
    for i, (k, y, o, w, note) in enumerate(OMAKASE, 1))

omakase_list = '\n'.join(
    f'          <li>{kanji(i)}貫目　{k}（{y}）　{o}　{w}。{note}</li>'
    for i, (k, y, o, w, note) in enumerate(OMAKASE, 1))

# ---------- pages ----------
# slug: (nav label, <title>, description, page-head label, page-head title, lead, next slug, dark head)
PAGES = {
    'index':   ('トップ', '鮨 呉須 | 日本橋室町　江戸前鮨', '昭和三十七年、日本橋で創業。三代目が握る、江戸前の仕事を尽くした十五貫のおまかせ。鮨 呉須（ごす）。', None, None, None, None, False),
    'edomae':  ('江戸前の仕事', '江戸前の仕事 | 鮨 呉須', '〆る、漬ける、煮る、寝かす。江戸前鮨の四つの仕事と、赤酢のシャリについて。', 'The craft of Edomae', '江戸前の仕事', '魚に手を加えて、旨みを引き出す。冷蔵庫のなかった江戸で生まれた知恵を、いまも一つも省かずに続けています。', 'omakase', False),
    'omakase': ('おまかせ', 'おまかせ十五貫 | 鮨 呉須', '神無月のおまかせ十五貫を、お出しする順に一貫ずつ。産地と江戸前の仕事を添えて。', 'Omakase, October', 'おまかせ十五貫', '神無月の十五貫を、カウンターでお出しする順に。スクロールすると、一貫ずつ皿に載ります。', 'gens', True),
    'gens':    ('三代', '三代 | 鮨 呉須', '昭和三十七年、日本橋室町で創業。初代から三代目まで、同じ場所で握り続けてきた歩み。', 'Three generations', '三代', '初代が暖簾を掲げてから六十余年。白木のカウンターと、暖簾の藍の色は変えていません。', 'menu', False),
    'menu':    ('お品書き', 'お品書き | 鮨 呉須', '昼と夜のおまかせ、お持ち帰りの折詰、酒のご案内。', 'Menu', 'お品書き', '昼も夜も、おまかせのみです。お好みや苦手なものは、ご予約の際にお知らせください。', 'visit', False),
    'visit':   ('店舗', '店舗 | 鮨 呉須', '東京メトロ三越前駅から徒歩二分。白木のカウンター十席と個室一室。', 'Visit', '店舗', '日本橋の欄干の麒麟から、北へ五分。藍の暖簾が目印です。', 'reserve', False),
    'reserve': ('ご予約', 'ご予約 | 鮨 呉須', '二か月先の同日までご予約を承ります。お電話またはこちらのフォームから。', 'Reservation', 'ご予約', '二か月先の同日まで承ります。お席をお取りできるか確認し、翌営業日までにお返事します。', None, True),
}
NAV_ORDER = ['edomae', 'omakase', 'gens', 'menu', 'visit']
ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 6l6 6-6 6"/></svg>'


def nav(current, keys, sep='\n      '):
    links = []
    for k in keys:
        cur = ' aria-current="page"' if k == current else ''
        links.append(f'<a href="{k}.html"{cur}>{PAGES[k][0]}</a>')
    return sep.join(links)


def page_head(slug):
    _, _, _, label, title, lead, _, dark = PAGES[slug]
    cls = 'page-head is-dark' if dark else 'page-head'
    return (f'  <section class="{cls}">\n'
            f'    <div class="wrap">\n'
            f'      <ol class="crumbs"><li><a href="index.html">トップ</a></li><li aria-current="page">{title}</li></ol>\n'
            f'      <p class="label">{label}</p>\n'
            f'      <h1 class="page-title">{title}</h1>\n'
            f'      <p class="page-lead">{lead}</p>\n'
            f'    </div>\n'
            f'  </section>\n')


def next_link(slug):
    nxt = PAGES[slug][6]
    if not nxt:
        return ''
    return (f'  <nav class="next-page" aria-label="次のページ">\n'
            f'    <a class="wrap" href="{nxt}.html"><span class="label">Next</span><b>{PAGES[nxt][4]}</b><span class="go">{ARROW}</span></a>\n'
            f'  </nav>\n')


layout = (HERE / 'layout.html').read_text(encoding='utf-8')
omakase_json = json.dumps(
    [dict(k=k, y=y, o=o, w=w, note=n, n=kanji(i)) for i, (k, y, o, w, n) in enumerate(OMAKASE, 1)],
    ensure_ascii=False)
version = str(int(time.time()))
credits = '、'.join(dict.fromkeys(p[4] for p in PHOTOS.values()))
TOKEN = re.compile(r'\{\{img:([^}]+)\}\}')
LEFTOVER = re.compile(r'\{\{[^}]+\}\}')

for slug, meta in PAGES.items():
    body = (HERE / 'pages' / f'{slug}.html').read_text(encoding='utf-8')
    if slug != 'index':
        body = page_head(slug) + body + next_link(slug)
    scripts = f'<script>window.OMAKASE = {omakase_json};</script>\n' if slug == 'omakase' else ''
    html = (layout.replace('{{BODY}}', body)
                  .replace('{{TITLE}}', meta[1])
                  .replace('{{DESC}}', meta[2])
                  .replace('{{SLUG}}', slug)
                  .replace('{{NAV}}', nav(slug, NAV_ORDER))
                  .replace('{{FNAV}}', nav(slug, NAV_ORDER + ['reserve'], ''))
                  .replace('{{BOOK_CURRENT}}', ' aria-current="page"' if slug == 'reserve' else '')
                  .replace('{{SCRIPTS}}', scripts))
    html = TOKEN.sub(repl, html)
    html = (html.replace('{{OMAKASE_LIST}}', omakase_list)
                .replace('{{WAVES}}', waves())
                .replace('{{WAVES_DARK}}', waves(fill='#16244A', stroke='#5C78C2'))
                .replace('{{CREDITS}}', credits)
                .replace('{{V}}', version))
    left = LEFTOVER.findall(html)
    assert not left, (slug, left)
    (HERE / f'{slug}.html').write_text(html, encoding='utf-8')
    print(f'{slug}.html written')
