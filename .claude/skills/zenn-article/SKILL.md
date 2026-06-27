---
name: zenn-article
description: |
  このリポジトリ（zenn-articles）で Zenn 記事を新規作成・プレビュー・公開するフロー。
  フロントマターの書式、slug 命名規則、対話式 CLI（npm run article:new）の使い方、
  プレビューサーバーの起動、published フラグと公開（push）の関係を含む。
  - Zenn 記事を書きたい・新しい記事を作りたい・記事の雛形が欲しい、
    プレビューで確認したい、記事を公開したい、published を切り替えたい、
    フロントマターや topics/emoji/slug をどうするか迷ったときに参照する。
---

# Zenn 記事の作成・プレビュー・公開

このリポジトリは [Zenn CLI](https://zenn.dev/zenn/articles/zenn-cli-guide) で記事を管理する。
記事は `articles/<slug>.md` に1ファイル1記事で置く。本文は日本語で書く。

## 1. 記事を新規作成する

### 推奨：対話式 CLI

```bash
npm run article:new
```

タイトル・slug 先頭・emoji（番号選択）・type・topics・公開可否・概要を順に聞かれ、
`articles/` に Markdown が生成され、自動で `npx zenn preview` が起動してブラウザで開く。
Zenn CLI 固有のオプションはこのラッパーの内側に隠されている（`scripts/create-article.mjs`）。

### エージェントが直接ファイルを作る場合

CLI は対話入力を待ってしまうため、Claude が作るときは `articles/<slug>.md` を直接 Write する。
その際は下記のフロントマター書式と slug 規則に必ず従う。

## 2. フロントマターの書式

```yaml
---
title: "記事のタイトル"
emoji: "📝"
type: "idea" # tech: 技術記事 / idea: アイデア
topics: ["zenn", "テスト"]
published: false
---
```

- **title**: ダブルクォートで囲む。
- **emoji**: 記事を表す絵文字を1つ。CLI の候補は 📝💡🚀🧪🔧📚⚡🔒。
- **type**: `tech`（技術記事）または `idea`（アイデア・ポエム・参加レポート等）。
- **topics**: 1〜5個の配列。`["react", "javascript"]` 形式。日本語タグも可。
- **published**: 新規作成時は **必ず `false`（下書き）** にする。公開判断はユーザーが行う。

## 3. slug（ファイル名）の命名規則

- CLI は `先頭文字列-<ランダム16進>`（例：`testing-cli-a1b2c3d4e5f6`）を生成する。
- 既存リポジトリには意味のある slug（例：`aws_cross_account_handson.md`）も混在する。
- **検索性を優先したい記事は、内容が分かる意味のある slug を手で付けてよい。**
  ランダムでよいか・意味のある名前にするかは、必要に応じてユーザーに確認する。
- slug は英小文字・数字・ハイフン（またはアンダースコア）で構成し、`.md` 拡張子。

## 4. 本文の構成

既存記事は概ね次の流れ。テーマに応じて見出しは調整してよい。

- 導入（記事の目的 / この記事を読んでほしい人）
- 本文（見出しで区切る。表・コードブロック・図を活用）
- まとめ・感想

## 5. プレビューする

```bash
npx zenn preview --port 8000
```

- バックグラウンドで起動し、`http://localhost:8000/articles/<slug>` を開いて確認する。
- 起動完了は `nc -z localhost 8000` 等でポートを待ってからブラウザを開くと確実。
- 終了するときはプロセスを停止する（バックグラウンド実行なら明示的に kill）。

## 6. 公開する

1. フロントマターの `published` を `true` に変更する。
2. Zenn 連携で指定したブランチ（通常 `main`）に push する。
3. 反映状況は [Zenn デプロイ履歴](https://zenn.dev/dashboard/deploys) で確認できる。

> **重要：push と公開の関係**
> - GitHub への push はソースを送るだけ。Zenn 上の公開は `published: true` で初めて行われる。
> - したがって `published: false` のまま push しても Zenn には記事は出ない（下書きのまま）。
> - **push は破壊的・外向きの操作。ユーザーの明示的な指示があるまで実行しない。**

## 7. コミットの注意

- コミットメッセージは Why を日本語で書く（リポジトリ共通ルール）。
- 公開前提でない下書きは `published: false` を確認してからコミットする。
- 機密情報が混入していないか、必要に応じて `git-secret-guard` スキルで確認する。
