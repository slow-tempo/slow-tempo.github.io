---
title: "리버스 프록시로 외부 접속하기"
date: "2026-11-07"
category: "NAS"
tags: ["NAS", "Nextcloud", "LXC"]
summary: "리버스 프록시를 세워서 밖에서 Nextcloud에 안전하게 접속하는 방법을 소개한다"
---

## 1. 프록시

Nextcloud는 집 안에 있다. 밖에서 접속하려면 집 문을 열어야 한다. 서비스마다 포트를 따로 열면, 문이 여러 개가 된다. 문이 많으면 관리도 어렵고, 보안도 약해진다.

리버스 프록시는 문을 하나로 만든다. 밖에서는 프록시 하나만 보이고, 프록시가 요청을 받아서 안쪽 서비스로 넘긴다. 포트는 프록시 것만 열고, 나머지는 닫아둔다. HTTPS 인증서도 프록시가 한 곳에서 관리한다.

프록시로 Nginx Proxy Manager를 쓴다. 웹 화면에서 설정하고, Let's Encrypt 인증서를 자동으로 발급한다.

## 2. LXC 만들기

프록시는 LXC 103에 설치한다. 설정은 다음과 같다.

<p class="example-note">아래 코드에서 <code>[대괄호]</code> 안은 예시이다. 복사해서 그대로 붙여넣으면 안 된다. 자기 값으로 바꾼 뒤에 실행한다.</p>

```text
OS: Debian
Disk: 8GB
CPU: 1
Memory: 512MB
```

네트워크는 2개를 쓴다.

```text
net0: [프록시-외부-IP]/24, 외부 접속용
net1: [프록시-내부-IP]/24, Nextcloud와 10G 통신용
```

`net0`은 밖에서 들어오는 요청을 받는 쪽이다. `net1`은 Nextcloud와 빠르게 통신하는 쪽이다. 자동 시작을 켠다.

Docker가 돌아가려면 LXC 설정이 필요하다. Features에서 `keyctl=1`과 `nesting=1`을 체크한다. 설정 파일에 다음을 추가한다.

```bash
LXC_ID=103
CONF_FILE="/etc/pve/lxc/${LXC_ID}.conf"
cat <<EOF >> $CONF_FILE
unprivileged: 1
lxc.apparmor.profile: unconfined
lxc.cap.drop:
lxc.cgroup.devices.allow: c 1:3 rwm
lxc.mount.auto: proc:rw sys:rw
EOF
```

`unprivileged`는 권한 없는 컨테이너라는 뜻이다. `apparmor`를 풀고, 장치를 허용해야 Docker가 안에서 돌아간다.

## 3. NPM 설치

Docker를 설치한다.

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
docker compose version
```

Nginx Proxy Manager를 Docker Compose로 설치한다. `/opt/npm` 폴더를 만들고, `docker-compose.yml`을 쓴다.

```yaml
version: '3'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: always
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

`80`은 HTTP, `443`은 HTTPS, `81`은 관리 화면 포트이다. `restart: always`는 재부팅해도 자동으로 뜨게 한다.

설치한다.

```bash
mkdir -p /opt/npm && cd /opt/npm
docker compose up -d
systemctl enable docker
```

`docker compose up -d`는 컨테이너를 백그라운드로 띄운다. `systemctl enable docker`는 부팅할 때 Docker가 자동으로 뜨게 한다. 재부팅해서 NPM이 자동으로 뜨는지 확인한다.

## 4. 프록시 호스트 등록

브라우저에서 NPM 관리 화면에 접속한다.

```text
http://[프록시-외부-IP]:81
```

초기 계정은 `admin@example.com`이다. 비밀번호는 `[초기-비밀번호]`이다. 처음 로그인하면 비밀번호를 바꾸라는 화면이 나온다. 바로 바꾼다.

Proxy Hosts에서 Add Proxy Host를 누른다. Details를 적는다.

```text
Domain Names: [도메인]
Forward Hostname / IP: [Nextcloud-내부-IP]
Forward Port: 80
```

`Forward Hostname`에는 Nextcloud의 10G IP를 적는다. 프록시와 Nextcloud가 10G로 통신하는 것이 핵심이다. 내부 IP가 아니라 외부 IP를 적으면, 느린 쪽으로 돌아간다.

SSL 탭에서 Request a new SSL Certificate를 고른다. Let's Encrypt 인증서가 발급된다. 옵션은 다음과 같이 둔다.

```text
Force SSL: On
HTTP/2 Support: On
HSTS Enabled: On
Block Common Exploits: On
Websockets Support: On
Cache Assets: Off
```

`Force SSL`은 HTTP로 들어와도 HTTPS로 바꿔준다. `Block Common Exploits`는 흔한 웹 공격을 막는다. `Websockets Support`는 Nextcloud 알림 같은 실시간 기능에 필요하다. `Cache Assets`는 끈다. 프록시가 파일을 캐싱하면, 파일 목록이 늦게 보이거나 로그인이 꼬일 수 있다.

저장하면 프록시 호스트가 생긴다.

## 5. 방화벽과 포트 포워딩

프록시 포트를 열어야 밖에서 들어올 수 있다. Proxmox 웹 화면에서 LXC 103의 방화벽을 켠다. 규칙을 추가한다.

```text
Proxmox 웹 화면 ↓ LXC 103 ↓ 방화벽 ↓ 추가
방향: in, 동작: ACCEPT, 프로토콜: tcp, 대상 포트: 80,81,443
```

대상 포트는 띄어쓰기 없이 `80,81,443`으로 적는다.

공유기에서 포트 포워딩을 한다. 외부 포트 80과 443을 프록시로 넘긴다. 공유기마다 화면이 다르다. DDNS도 공유기에서 설정한다. `[도메인]`이 집 공인 IP를 가리키게 한다.

통신사에서 외부 포트 80과 443을 막으면, 다른 외부 포트로 바꿔서 넘긴다.

## 6. 확인

설정이 끝났는지 확인한다.

- `https://[도메인]`에 접속하면 Nextcloud 로그인 화면이 보인다.
- 주소창에 자물쇠가 보이고, 인증서가 Let's Encrypt로 나온다.
- `http://[도메인]`으로 들어가도 `https://`로 바뀐다.
- NPM 관리 화면에서 프록시 호스트가 Online이다.
