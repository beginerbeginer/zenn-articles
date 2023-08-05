---
title: "作成したEC2インスタンスからRDSに接続する"
emoji: "📝"
type: "idea" # tech: 技術記事 / idea: アイデア
topics: [aws]
published: true
---

## 記事の目的

この記事では、作成したEC2インスタンスからRDSに接続する方法を学びます。
具体的には、プライベートサブネットにRDSを構築しパブリックサブネットにEC2を構築します。
EC2からRDSに接続し、サンプルのデータベースを作成しサンプルデータベースに対し、任意のデータを投入することまで実施します。

![構成図](https://storage.googleapis.com/zenn-user-upload/5bb31d7aa289-20230805.png)

:::message alert
本記事に掲載されているインフラ環境は、記事公開前にすでに削除されています。また、エンドポイントの情報などセキュリティに関わる情報も示していますが、これは説明を分かりやすくする目的で掲載しています。
:::

## 事前準備

下記のインストールを済ませて下さい。

- awscli
- tfenv
- terraform v1.5.4
- sshキーの作成

また今回はAWSコンソールではなくTerraformというインフラの自動構築ツールを使い構築して行きます。

## terraformの構成

```bash
.
├── main.tf
├── terraform.tfstate
└── terraform.tfstate.backup
```

::::details 今回Terraformで書いたコード
:::message

```hcl:main.tf
data "aws_availability_zones" "available" {}

terraform {
  required_version = "1.5.4"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.10.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1" # 東京リージョン
}

# VPCの作成
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "dev-vpc"
  }
}

# インターネットゲートウェイの作成
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "dev-igw"
  }
}

# パブリックルートテーブルの作成
resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "dev-public-route-table"
  }
}

# パブリックサブネットにルートテーブルを関連付ける
resource "aws_route_table_association" "public_route_table_association" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_route_table.id
}

# パブリックサブネットの作成
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  tags = {
    Name = "dev-pub-subnet"
  }
}

# プライベートサブネットの作成 (2つの異なるAZ)
resource "aws_subnet" "private_subnet" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = element(["10.0.2.0/24", "10.0.3.0/24"], count.index)
  availability_zone = element(data.aws_availability_zones.available.names, count.index)
  tags = {
    Name = "dev-pri-subnet-${count.index}"
  }
}

# RDSへの通信を許可するセキュリティグループ
resource "aws_security_group" "allow_mysql" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["${aws_instance.ec2_instance.private_ip}/32"]
  }
}

resource "aws_security_group" "allow_ssh" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # ここは適切なIPアドレス範囲に設定してください
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "allow-ssh"
  }
}

# EC2インスタンスの作成（パブリックサブネット内）
resource "aws_instance" "ec2_instance" {
  ami                    = "ami-0e25eba2025eea319"
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.allow_ssh.id]
  key_name               = aws_key_pair.deployer.key_name
  tags = {
    Name = "dev-ec2"
  }
}

resource "aws_key_pair" "deployer" {
  key_name   = "230804_test_aws_keypair_can_delete_anytime"
  public_key = file("~/.ssh/230804_test_aws_keypair_can_delete_anytime.pub")
}

# Elastic IPの作成
resource "aws_eip" "eip" {
  domain   = "vpc"
  instance = aws_instance.ec2_instance.id
  tags = {
    Name = "dev-eip"
  }
}

# RDSインスタンスの作成（プライベートサブネット内）
resource "aws_db_instance" "mysql_instance" {
  allocated_storage      = 20
  storage_type           = "gp2"
  engine                 = "mysql"
  engine_version         = "8.0.28"
  instance_class         = "db.m5d.large"
  db_name                = "mydb"
  username               = aws_ssm_parameter.db_user.value
  password               = aws_ssm_parameter.db_password.value
  parameter_group_name   = "default.mysql8.0"
  skip_final_snapshot    = true
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.allow_mysql.id]
  kms_key_id             = aws_kms_key.rds_encryption_key.arn
  storage_encrypted      = true
  tags = {
    Name = "dev-rds"
  }

  depends_on = [aws_db_subnet_group.rds_subnet_group]
}

# RDSデータの暗号化用KMSキー
resource "aws_kms_key" "rds_encryption_key" {
  description             = "RDS encryption key"
  enable_key_rotation     = false
  deletion_window_in_days = 7
  is_enabled              = true
  tags = {
    Name = "dev-kms"
  }
}

# RDS用サブネットグループ
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "main"
  subnet_ids = aws_subnet.private_subnet[*].id
  tags = {
    Name = "dev-rds-subnet-group"
  }
}

# Parameter Store
resource "aws_ssm_parameter" "db_user" {
  description = "user for database connection"
  name = "/db/user"
  value = "user"
  type = "String"
}

resource "aws_ssm_parameter" "db_password" {
  description = "password for database connection"
  name = "/db/password"
  value = "password"
  type = "SecureString"

  lifecycle {
    ignore_changes = [value]
  }
}
```

:::
::::

## 作成されたEC2インスタンスをAWSコンソールから確認する

sshで接続するために下記の情報を確認します。

- IPアドレス
- キーペアの名前

![IPアドレス](https://storage.googleapis.com/zenn-user-upload/61ff4fc1e66a-20230805.png)
![キーペア](https://storage.googleapis.com/zenn-user-upload/b3b50f202f24-20230805.png)

## EC2にログインする

上記のIPアドレスとキーペアの名前を使いsshコマンドでEC2にログインします。

```bash
ssh -i ~/.ssh/230804_test_aws_keypair_can_delete_anytime ec2-user@13.113.66.132
```

今回は無料枠のAmazon Linux2を使用したのでssh接続が成功した場合、下記の画像が出ることを確認しましょう

![EC2にssh接続が成功する](https://storage.googleapis.com/zenn-user-upload/e639fcb9aeff-20230805.png)

## MySQLクライアントをインストールする

```bash
sudo yum install mysql -y
```

## RDSの情報を確認する

![RDSの情報](https://storage.googleapis.com/zenn-user-upload/07dd653d0505-20230805.png)
![ユーザー名とパスワード](https://storage.googleapis.com/zenn-user-upload/49dae05aef6f-20230805.png)

## RDSにログインする

```bash
mysql -h terraform-20230805061309384500000004.cpftkzzabeio.ap-northeast-1.rds.amazonaws.com -uuser -ppassword
```

![RDSにログインする](https://storage.googleapis.com/zenn-user-upload/d8b5640828b1-20230805.png)

## RDSにDBとテーブルを作成する

下記コマンドを実行しテーブル内にデータを作成する

```sql
create database testdb;
use testdb;
create table user (ID int(3), first_name VARCHAR(20), last_name VARCHAR(30));
insert into user (ID, first_name, last_name) values (1, 'Tarou', 'Tanaka');

MySQL [testdb]> select * from user;
+------+------------+-----------+
| ID   | first_name | last_name |
+------+------------+-----------+
|    1 | Tarou      | Tanaka    |
+------+------------+-----------+
1 row in set (0.00 sec)
```

## 最後

下記コマンドを実行して作成したAWSリソースを忘れずに削除しましょう。これにより意図しない課金を防ぐことができます。

```bash
terraform destroy
```

## まとめ

EC2インスタンスからRDSに接続しDBを作りデータを投入することが確認できました。
またTerraformを使いAWSリソースをコードで管理することでインフラ構成の移植性を挙げられることを学べました。

## 参考記事

- [AWSで使うパスワードなどの機密情報を暗号化してGit管理する](https://zenn.dev/boronngo/articles/terraform-ssm-secret-parameter)
