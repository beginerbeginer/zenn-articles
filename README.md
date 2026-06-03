# zenn-articles

## 対話式CLIで記事を作成する

```bash
cd ~/projects_private/zenn-articles
npm run article:new
```

質問に答えると、`articles/`配下にZenn用のMarkdownファイルが作成されます。
emojiは番号で選択でき、記事作成後は自動で`npx zenn preview`が起動して、作成した記事ページがブラウザで開きます。
Zenn CLI固有のコマンドやオプションは、このラッパーCLIの内側に隠しています。

## 記事の雛形からサーバーの起動まで実行

```bash
npx zenn new:article --title "記事のタイトル" --type idea --emoji 📝; npx zenn preview
```

## 記事を公開するとき

- `published`オプションを`true`に変更する
- zennで指定したブランチにpushする

## デプロイ履歴を確認するとき

- 下記URLを押下する
<https://zenn.dev/dashboard/deploys>

## 参考にした記事(いつもありがとうございます)

- [Zenn CLIで記事・本を管理する方法](https://zenn.dev/zenn/articles/zenn-cli-guide)
