---
title: "AWSでクロスアカウントを作成するハンズオン"
emoji: "📝"
type: "idea" # tech: 技術記事 / idea: アイデア
topics: [AWS]
published: false
---


## 目次

- 記事の目的
- IAMロールのクロスアカウントアクセスとは？
- 作業内容
  - アカウントを2つ作成する
  - アカウントAに「読み取り専用のみ」のポリシー権限がアタッチされたIAMロールを持つIAMユーザーを作成する
  - アカウントBのAWSアカウントのIDを確認する
  - アカウントAのIAMロールに、アカウントBのIAMユーザーがスイッチできるように設定する
- 参考記事

## 記事の目的

AWSのクロスアカウント機能を用いたハンズオンを実施する設定方法を学ぶ
２つのAWSアカウントA,Bを作成しアカウントAのIAMロールに、アカウントBのIAMユーザーがスイッチできることを確認する

## IAMロールのクロスアカウントアクセスとは？

> クロスアカウントアクセスロールとはAWSアカウントAにあるIAMロールの権限をAWSアカウントBのIAMユーザが利用してアカウントAのリソースを操作するためのものになります。 メリットとしてはアカウントBにログインした状態からログアウトしてアカウントAにアクセスするといったことが不要になります。

## 作業内容

- アカウントを2つ作成する
- アカウントAに「読み取り専用のみ」のポリシー権限がアタッチされたIAMロールを持つIAMユーザーを作成する
- アカウントBのAWSアカウントのIDを確認する
- アカウントAのIAMロールに、アカウントBのIAMユーザーがスイッチできるように設定する

### AWSアカウントを2つ作成する

２つのAWSアカウントを作成する

![２つのAWSアカウント](https://storage.googleapis.com/zenn-user-upload/ac8c18cbd536-20230715.png)

### アカウントAに「読み取り専用のみ」のポリシー権限がアタッチされたIAMロールを持つIAMユーザーを作成する

```terraform: main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.1.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_iam_user" "user" {
  name = "ReadOnlyUser"
}

resource "aws_iam_access_key" "user_key" { // 目的のIAMユーザーのアクセスキーを作成
  user = aws_iam_user.user.name
}

resource "aws_iam_role" "role" {
  name = "ReadOnlyRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          AWS = "arn:aws:iam::アカウントBのID:root"
        },
        Action = "sts:AssumeRole",
      },
    ],
  })
}

resource "aws_iam_role_policy_attachment" "role_readonly_policy" {
  role       = aws_iam_role.role.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

![ReadOnlyUser](https://storage.googleapis.com/zenn-user-upload/e72f09271da0-20230715.png)

![ReadOnlyRole](https://storage.googleapis.com/zenn-user-upload/295da143b6f5-20230715.png)

アカウントBのIDが書かれていることを確認する。

![信頼されたエンティティ](https://storage.googleapis.com/zenn-user-upload/a35f881d59d4-20230715.png)

作成したReadOnlyRoleを開きロールを切り替えるためのリンクのアイコンをクリックします。

![リンクをコピーする](https://storage.googleapis.com/zenn-user-upload/c5b6d27abb53-20230715.png)

chromeのシークレットモードを開きコピーしたリンクのページを開きます。
ロールの切り替えを選択します。

![ロールの切り替えを選択](https://storage.googleapis.com/zenn-user-upload/f346e0cfc160-20230715.png)


![リンク押下後のロールの切り替え](https://storage.googleapis.com/zenn-user-upload/6b44c7c6dc23-20230715.png)

### アカウントBのAWSアカウントのIDを確認する

### アカウントAのIAMロールに、アカウントBのIAMユーザーがスイッチできるように設定する

## 参考記事

- [CloudFormationでクロスアカウントアクセスロールを作成してみた](https://dev.classmethod.jp/articles/created_a_cross-account_access_role_in_cloudformation/)
