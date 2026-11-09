---
title: "Nextcloud 설치, LXC와 데이터베이스"
date: "2026-11-05"
category: "NAS"
tags: ["NAS", "Nextcloud", "LXC"]
summary: "Proxmox 위에 Nextcloud용 LXC를 만들고, PostgreSQL 데이터베이스와 Nextcloud 소스를 준비하는 방법을 소개한다"
---

## 1. LXC

LXC는 Proxmox 위에서 Nextcloud만 따로 돌리는 상자이다.

이 시리즈에서는 Debian 12로 만든다. 설정은 다음과 같다.

```text
OS: Debian
Disk: 50GB
CPU: 2
Memory: 4GB
```

Debian은 안정판으로 오래 있어서 고른 배포판이다. 메모리는 대용량 파일 처리에 쓰고, CPU는 파일 처리를 담당한다. 디스크 50GB는 휴지통 용량까지 고려한 크기이다. 부팅할 때 자동으로 시작하게 설정한다.

네트워크는 2개를 쓴다. 하나는 밖에서 접속하는 용도, 하나는 빠른 내부 통신용이다. 내부 통신용 네트워크에는 게이트웨이를 두지 않는다.

LXC는 웹 화면에서 만든다. 템플릿이 없으면, 먼저 템플릿을 받는다. 저장소에서 CT 템플릿을 열고, Debian 12 템플릿을 다운로드한다. 템플릿 목록에 Debian 12가 없으면, Create CT에서 고를 템플릿이 없다.

만드는 순서는 다음과 같다.

```text
Proxmox 웹 화면
    ↓
Create CT
    ↓
템플릿 고르기 (Debian 12)
    ↓
호스트 이름·비밀번호·CPU·메모리·디스크 정하기
    ↓
네트워크 2개 정하기 (vmbr0, vmbr10g)
    ↓
자동 시작 설정
    ↓
컨테이너 시작
    ↓
셸 들어가기
```

템플릿은 OS가 미리 들어 있는 이미지이다. LXC는 가상 머신과 달리 OS를 따로 설치하지 않는다. 템플릿을 받는 것이 OS 설치이다.

LXC 안에 들어가는 것은 다음과 같다.

```text
Proxmox
    └── LXC (Nextcloud)
             ├── Nginx (웹 서버)
             ├── PHP 8.3 (실행)
             ├── PostgreSQL (데이터베이스)
             └── Nextcloud 소스
```

## 2. 패키지

LXC 안에 필요한 것을 설치한다.

웹 서버는 Nginx, 데이터베이스는 PostgreSQL, 실행 언어는 PHP 8.3이다. Nginx를 고른 이유는 리버스 프록시로 쓸 수 있고, 가볍기 때문이다. PHP 확장은 이미지 처리, 데이터베이스 연결, 압축 해제 등에 쓴다.

Debian 12 기본 저장소에는 PHP 8.3이 없다. 그래서 PHP 저장소를 먼저 추가한다.

```bash
apt update && apt upgrade -y
apt install -y lsb-release ca-certificates apt-transport-https software-properties-common curl gnupg2 wget bzip2
curl -sSL https://packages.sury.org/php/README.txt | bash -x
apt install -y nginx postgresql php8.3-fpm php8.3-common php8.3-pgsql php8.3-gd php8.3-curl php8.3-xml php8.3-mbstring php8.3-zip php8.3-intl php8.3-bcmath php8.3-gmp php8.3-imagick php8.3-opcache php8.3-cli
mkdir -p /run/php
chown www-data:www-data /run/php
systemctl enable php8.3-fpm postgresql nginx
systemctl start php8.3-fpm postgresql nginx
```

## 3. 데이터베이스

Nextcloud는 파일 자체는 디스크에 저장하고, 사용자·공유·설정 같은 정보는 데이터베이스에 저장한다. 그래서 파일 저장소와 별도로 데이터베이스가 필요하다.

PostgreSQL을 고른 이유는 데이터 무결성과 안정성 때문이다.

PostgreSQL에 사용자부터 만들고, 그 사용자에게 데이터베이스를 만든다.

```bash
sudo -u postgres psql <<EOF
CREATE USER nextcloud WITH PASSWORD '비밀번호';
CREATE DATABASE nextcloud OWNER nextcloud;
\c nextcloud
GRANT ALL ON SCHEMA public TO nextcloud;
GRANT ALL PRIVILEGES ON DATABASE nextcloud TO nextcloud;
\q
EOF
```

비밀번호는 자기 비밀번호로 바꿔서 쓴다. 데이터베이스 이름과 사용자 이름은 예시이다.

## 4. Nextcloud 소스

Nextcloud 소스는 공식 다운로드 주소에서 받는다. `/var/www/`는 Debian 웹 서버의 기본 위치이다. `/var/www/` 아래에 풀고, 소유권을 웹 서버 계정으로 바꾼다.

```bash
cd /var/www/
wget https://download.nextcloud.com/server/releases/latest.tar.bz2
tar -xjf latest.tar.bz2
chown -R www-data:www-data /var/www/nextcloud/
chmod -R 755 /var/www/nextcloud/
```

웹 서버는 `www-data` 계정으로 돌아간다. 소스 파일의 소유권이 `www-data`가 아니면, 웹 설치가 파일을 쓰지 못한다.

권한 755는 소유주만 파일을 바꿀 수 있게 한다. 다른 계정은 읽고 실행만 할 수 있다.

이 단계까지 마치면, LXC 안에 Nextcloud 소스와 데이터베이스가 준비된다. 준비됐는지 확인한다.

```bash
ls /var/www/nextcloud | head
systemctl is-active php8.3-fpm postgresql nginx
```

`ls`에서 파일 목록이 나오고, `is-active`에서 `active`가 세 번 나오면 준비된 것이다.
