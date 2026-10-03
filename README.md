# ホームページ制作フォルダ

サイトごとにフォルダを分けています。新しいサイトは、同じ構成のフォルダを一つ増やして作ります。

```
html/
├─ README.md
├─ index.html          全サイトの一覧（python build_index.py で生成）
├─ build_index.py      一覧を作るスクリプト。業種と並び順はここの SITES に書く
├─ thumbs/             一覧に出す各サイトのサムネイル（<フォルダ名>.jpg、1200×750）
├─ sushi-mio/          鮨 澪（銀座の鮨店）
│  ├─ index.html       日本語ページ
│  ├─ en.html          英語ページ
│  ├─ css/style.css
│  ├─ js/main.js
│  └─ images/          自前の写真を置く場所
├─ yakiniku-oki/       焼肉 燠（西麻布の焼肉店）
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/main.js
│  └─ images/
├─ nibiiro-sosai/      にびいろ葬祭（世田谷の葬儀社）
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/main.js
│  └─ images/
├─ kairo-inc/         株式会社カイロ（IT・IoT開発会社）
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/board.js      トップの基板アニメーション
│  ├─ js/main.js
│  └─ images/
├─ rikka-fg/          六花フィナンシャル・グループ（銀行・企業情報ページ）
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/crystal.js    トップの雪の結晶アニメーション
│  ├─ js/main.js
│  └─ images/
├─ nyanbei/           にゃん兵衛（キャラクターサイト）
│  ├─ template.html    ここを編集して python build.py で index.html を生成
│  ├─ build.py         スタンプのセリフと分類の一覧
│  └─ images/stickers/ スタンプ画像 01〜40
├─ shijima/           湯宿 しじま（木曽の旅館）
│  ├─ template.html    ここを編集して python build.py で index.html を生成
│  ├─ build.py         写真の一覧（差し替えはここ）
│  ├─ css/style.css
│  └─ js/main.js
├─ sushi-gosu/        鮨 呉須（日本橋の江戸前鮨・7ページ構成）
│  ├─ layout.html      全ページ共通のヘッダー・フッター
│  ├─ pages/           ページごとの中身（ここを編集して python build.py）
│  ├─ build.py         写真の一覧、おまかせ十五貫の献立、ページ一覧
│  ├─ css/style.css
│  └─ js/main.js
├─ ramen-kohaku/      中華そば 琥珀（西麻布の醤油そば・5ページ構成）
│  ├─ layout.html      全ページ共通のヘッダー・フッター
│  ├─ pages/           ページごとの中身（ここを編集して python build.py）
│  ├─ build.py         写真の一覧、お品書き（券売機もここから作られます）、ページ一覧
│  ├─ css/style.css
│  └─ js/main.js       丼の描画（canvas）、券売機、予約
└─ （次のサイト）/
```

## 決まりごと

- フォルダ名は半角英小文字とハイフン（例：`sushi-mio`、`cafe-aoyama`）
- 各サイトの中は `css/`・`js/`・`images/` に分ける
- ページ内のパスは相対パス（`css/style.css` など）にして、フォルダごと移動・公開できるようにする

## 確認のしかた

このフォルダで次を実行し、ブラウザで `http://localhost:8766/サイト名/` を開きます。

```
python -m http.server 8766
```
