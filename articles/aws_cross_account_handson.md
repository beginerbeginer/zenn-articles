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

## 記事の目的

AWSのクロスアカウント機能を用いたハンズオンを実施する設定方法を学ぶ
２つのAWSアカウントA,Bを作成しアカウントAのIAMロールに、アカウントBのIAMユーザーがスイッチできることを確認する

## IAMロールのクロスアカウントアクセスとは？

> クロスアカウントアクセスロールとはAWSアカウントAにあるIAMロールの権限をAWSアカウントBのIAMユーザが利用してアカウントAのリソースを操作するためのものになります。 メリットとしてはアカウントBにログインした状態からログアウトしてアカウントAにアクセスするといったことが不要になります。

## 作業内容

- アカウントを2つ作成する
- アカウントAに「読み取り専用のみ」のポリシー権限がアタッチされたIAMロールを持つIAMユーザーを作成してください。
- アカウントBのAWSアカウントのIDを確認してください
- アカウントAのIAMロールに、アカウントBのIAMユーザーがスイッチできるように設定してください

### AWSアカウントを2つ作成する

２つのAWSアカウントを作成する

![２つのAWSアカウント](https://storage.googleapis.com/zenn-user-upload/ac8c18cbd536-20230715.png)

## 参考記事

- [CloudFormationでクロスアカウントアクセスロールを作成してみた](https://dev.classmethod.jp/articles/created_a_cross-account_access_role_in_cloudformation/)
