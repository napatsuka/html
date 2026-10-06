# Builds every page from layout.html + pages/<slug>.html.
#   {{img:KEY|SIZES|eager}}  <img> from PHOTOS (the shop's own photos in images/, or Unsplash)
#   {{ODEN_JSON}}            the oden in the pot, for the menu page
#   {{SHOP_*}}               shop details from SHOP
#   {{CREDITS}} / {{V}}      photo credits / cache-busting version
# Edit SHOP, ODEN or PHOTOS below, then run:  python build.py
import json, re, time, pathlib

HERE = pathlib.Path(__file__).parent
U = 'https://images.unsplash.com/'

SHOP = {
    'NAME': 'ファナティーおでん',
    'CONCEPT': 'おでんとカラオケ ときどきシーシャ',
    'ADDRESS': '大阪府大阪市北区堂山町2-2 エビスビル3F',
    'HOURS': '17:00〜29:00',
    'HOLIDAY': '無休',
    'BUDGET': '2,000円〜3,000円',
    'SEATS': '60席',
}

# key: (file in images/ or Unsplash id, width, height, alt, Unsplash photographer or None for the shop's own)
PHOTOS = {
    'bar':     ('interior-bar.jpg', 2000, 1125, '赤いネオンの輪とステンドグラスの照明が下がる、ファナティーおでんのカウンター', None),
    'booth':   ('interior-booth.jpg', 1125, 2000, '花柄の壁紙と花柄のソファのボックス席。棚にはボードゲーム、壁にはカラオケの画面', None),
    'poster':  ('poster.jpg', 1075, 1522, '看板娘の女将まみが、おでんをよそうポスター。おでんとカラオケ ときどきシーシャ', None),
    'shisha':  ('photo-1574238752695-675b86d49267', 6000, 4000, '暗がりで煙をくゆらせるシーシャ（写真はイメージです）', 'Awesome Sauce Creative'),
    'mic':     ('photo-1516280440614-37939bbacd81', 4272, 2848, 'スタンドに立てたマイク（写真はイメージです）', 'Bogomil Mihaylov'),
    'gyoza':   ('photo-1738681336104-608b4e7dc3b0', 5184, 3456, '黒い皿に並んだ焼き餃子（写真はイメージです）', 'Mikey Frost'),
}

# The oden pot. (name, reading for screen readers is the same text, price in yen)
ODEN = ['大根', 'たまご', '厚揚げ', 'こんにゃく', 'ちくわ', 'もちきんちゃく', 'はんぺん', 'ロールキャベツ',
        'たこ焼き', 'がんも', 'つくね', '牛すじ', 'ウィンナー', 'えびまよ']
ODEN_PRICE = 300
MORIAWASE = (5, 1200)


def img(key, sizes='100vw', eager=False):
    src, w, h, alt, who = PHOTOS[key]
    load = ' fetchpriority="high"' if eager else ' loading="lazy"'
    if who is None:
        return f'<img src="images/{src}?v={{{{V}}}}" width="{w}" height="{h}" alt="{alt}"{load} decoding="async">'
    base = f'{U}{src}?auto=format&fit=crop&q=78'
    srcset = ', '.join(f'{base}&w={x} {x}w' for x in (640, 1000, 1600, 2400))
    return f'<img src="{base}&w=1600" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{alt}"{load} decoding="async">'


def repl(m):
    p = m.group(1).split('|')
    return img(p[0], p[1] if len(p) > 1 and p[1] else '100vw', len(p) > 2 and p[2] == 'eager')


# slug: (nav label, <title>, description)
PAGES = {
    'index':  ('トップ', 'ファナティーおでん｜梅田・堂山 おでんとカラオケ ときどきシーシャ', '梅田・堂山のネオ居酒屋。おでんは一品300円、カラオケは無料、ときどきシーシャ。17時から朝5時まで、無休で営業しています。'),
    'menu':   ('メニュー', 'メニュー｜ファナティーおでん', 'おでんは一品300円、五種盛り合わせは1,200円。肉汁焼き餃子などの逸品、200種類以上の飲み放題、カラオケとシーシャ。'),
    'access': ('店舗案内', '店舗案内・アクセス｜ファナティーおでん', '大阪市北区堂山町2-2 エビスビル3F。東梅田駅・梅田駅から。17:00〜29:00、無休、60席。'),
}
NAV_ORDER = ['menu', 'access']


def nav(current, keys, sep='\n      '):
    out = []
    for k in keys:
        cur = ' aria-current="page"' if k == current else ''
        out.append(f'<a href="{k}.html"{cur}>{PAGES[k][0]}</a>')
    return sep.join(out)


layout = (HERE / 'layout.html').read_text(encoding='utf-8')
oden_json = json.dumps(dict(items=ODEN, price=ODEN_PRICE, mori=dict(n=MORIAWASE[0], price=MORIAWASE[1])), ensure_ascii=False)
version = str(int(time.time()))
credits = '、'.join(dict.fromkeys(p[4] for p in PHOTOS.values() if p[4]))
TOKEN = re.compile(r'\{\{img:([^}]+)\}\}')
LEFTOVER = re.compile(r'\{\{[^}]+\}\}')

for slug, meta in PAGES.items():
    body = (HERE / 'pages' / f'{slug}.html').read_text(encoding='utf-8')
    scripts = f'<script>window.ODEN = {oden_json};</script>\n' if slug == 'menu' else ''
    html = (layout.replace('{{BODY}}', body)
                  .replace('{{TITLE}}', meta[1])
                  .replace('{{DESC}}', meta[2])
                  .replace('{{SLUG}}', slug)
                  .replace('{{NAV}}', nav(slug, NAV_ORDER))
                  .replace('{{FNAV}}', nav(slug, ['index'] + NAV_ORDER, ''))
                  .replace('{{SCRIPTS}}', scripts))
    html = TOKEN.sub(repl, html)
    for k, v in SHOP.items():
        html = html.replace('{{SHOP_' + k + '}}', v)
    html = html.replace('{{CREDITS}}', credits).replace('{{V}}', version)
    left = LEFTOVER.findall(html)
    assert not left, (slug, left)
    (HERE / f'{slug}.html').write_text(html, encoding='utf-8')
    print(f'{slug}.html written')
