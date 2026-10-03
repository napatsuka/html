# Builds index.html from template.html and the sticker list below.
# Edit STICKERS (caption / category) and run:  python build.py
import json, pathlib

HERE = pathlib.Path(__file__).parent

CATS = {
    'drink': '飲む', 'tipsy': '酔う', 'hello': 'あいさつ',
    'feel': 'きもち', 'food': 'ごはん', 'dash': 'いそぐ',
}

STICKERS = [
    ('01', '飲もう！', 'drink'), ('02', '飲みたい！', 'drink'), ('03', '先に飲んでる', 'drink'),
    ('04', 'たくさん飲む', 'drink'), ('05', '飲む？', 'drink'), ('06', '乾杯！', 'drink'),
    ('07', 'Cheers!', 'drink'), ('08', '全然酔ってへん', 'tipsy'), ('09', '楽しく酔った', 'tipsy'),
    ('10', '記憶ない', 'tipsy'), ('11', '二日酔い', 'tipsy'), ('12', '気持ち悪い…', 'tipsy'),
    ('13', '了解です！', 'hello'), ('14', 'OK', 'hello'), ('15', 'ありがとう', 'hello'),
    ('16', 'ぺこり', 'hello'), ('17', 'わーい！', 'feel'), ('18', 'ぜぜー', 'feel'),
    ('19', '申し訳…', 'hello'), ('20', '痩せる', 'feel'), ('21', 'オーケー！', 'food'),
    ('22', 'オスシー！', 'food'), ('23', '満腹', 'food'), ('24', 'ぐー！', 'feel'),
    ('25', 'どっ？', 'feel'), ('26', '笑', 'feel'), ('27', 'OMG', 'feel'),
    ('28', 'ムカー！', 'feel'), ('29', 'なんでやねん！', 'feel'), ('30', 'どないやねん！', 'feel'),
    ('31', '急ぐ！！', 'dash'), ('32', 'ゴッ…', 'dash'), ('33', '着いた！', 'dash'),
    ('34', '秒で行く！！', 'dash'), ('35', 'マッハで行く！！', 'dash'), ('36', '飛んで行く！！', 'dash'),
    ('37', '到着！！', 'dash'), ('38', 'またねー', 'hello'), ('39', 'おはよう', 'hello'),
    ('40', 'おやすみ', 'hello'),
]

def img(n, cap, lazy=True, cls=''):
    return (f'<img src="images/stickers/{n}.png" width="370" height="320" alt="{cap}"'
            f'{" loading=\"lazy\"" if lazy else ""} decoding="async"{f" class=\"{cls}\"" if cls else ""}>')

counts = {k: sum(1 for s in STICKERS if s[2] == k) for k in CATS}
tabs = [f'<button type="button" data-filter="all" aria-pressed="true">すべて<span class="n">{len(STICKERS)}</span></button>']
tabs += [f'<button type="button" data-filter="{k}" aria-pressed="false">{v}<span class="n">{counts[k]}</span></button>' for k, v in CATS.items()]

grid = '\n'.join(
    f'          <li data-cat="{c}"><button type="button" data-n="{n}" aria-label="スタンプ{int(n)}「{cap}」を大きく見る">{img(n, cap)}</button></li>'
    for n, cap, c in STICKERS)

row1 = [s for i, s in enumerate(STICKERS) if i % 2 == 0]
row2 = [s for i, s in enumerate(STICKERS) if i % 2 == 1]
def parade(row):
    imgs = ''.join(img(n, '', lazy=False) for n, cap, c in row)
    return imgs + imgs  # doubled so the loop is seamless

data = json.dumps([{'n': n, 'cap': cap, 'cat': c} for n, cap, c in STICKERS], ensure_ascii=False)

html = (HERE / 'template.html').read_text(encoding='utf-8')
html = (html.replace('{{TABS}}', '\n          '.join(tabs))
            .replace('{{GRID}}', grid)
            .replace('{{PARADE1}}', parade(row1))
            .replace('{{PARADE2}}', parade(row2))
            .replace('{{DATA}}', data))
(HERE / 'index.html').write_text(html, encoding='utf-8')
print('index.html written,', len(STICKERS), 'stickers')
