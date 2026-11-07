---
title: "NAS 폴더를 Nextcloud에 연결하기"
date: "2026-11-07"
category: "NAS"
tags: ["NAS", "Nextcloud", "LXC"]
summary: "NAS 사용자 폴더를 Nextcloud에 연결하고, 파일 스캔과 백그라운드 작업을 설정하는 방법을 소개한다"
---

## 1. 연결 방법

Nextcloud는 파일을 디스크에서 직접 보지 않는다. 파일 목록은 데이터베이스에서 본다. 디스크에 파일이 있어도 데이터베이스에 없으면, 웹 화면에 안 나온다.

NAS 사용자 폴더는 Nextcloud 데이터 폴더 위치에 그대로 마운트한다. Proxmox 웹 화면에서 LXC를 고르고, 마운트 지점을 추가한다. 경로는 다음과 같다.

<p class="example-note">아래 코드에서 <code>[대괄호]</code> 안은 예시이다. 복사해서 그대로 붙여넣으면 안 된다. 자기 값으로 바꾼 뒤에 실행한다.</p>

```text
/var/www/nextcloud/data/[사용자]/files
```

`[사용자]` 자리에 자기 사용자 이름을 쓴다. 볼륨은 NAS 사용자 데이터셋이다. 이 폴더가 곧 NAS 사용자 폴더이다. SMB로 파일을 넣어도, Nextcloud로 파일을 올려도, 같은 폴더에 쌓인다.

마운트가 제대로 됐는지 확인한다.

```bash
mount | grep "nextcloud/data"
```

여기에 자기 사용자 폴더 마운트가 나와야 한다.

## 2. 파일 스캔

마운트만으로는 파일이 웹 화면에 안 나온다. 파일을 데이터베이스에 등록해야 한다. `files:scan`이 디스크 파일을 읽어서 데이터베이스에 등록한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ files:scan [사용자]
```

`occ` 명령은 Nextcloud가 쓰는 `www-data` 계정으로 실행한다. root로 실행하면 파일 소유주가 꼬인다.

전체를 한 번에 스캔할 때는 `--all`을 쓴다.

```bash
sudo -u www-data php /var/www/nextcloud/occ files:scan --all
```

스캔이 끝나면 웹 파일 목록에 NAS 파일이 보인다. SMB로 파일을 넣은 뒤에도 스캔을 하면 된다.

## 3. 백그라운드 작업

Nextcloud는 백그라운드 작업이 있다. 썸네일 생성, 파일 정리 같은 일을 뒤에서 처리한다. 기본값은 AJAX이다. AJAX는 웹 화면에 접속할 때만 돌아간다. 아무도 접속하지 않으면 작업이 쌓인다.

Cron으로 바꾸면, 접속과 상관없이 5분마다 돌아간다. 크론탭에 등록한다.

```bash
(crontab -u www-data -l 2>/dev/null ; echo "*/5 * * * * php -f /var/www/nextcloud/cron.php") | sort -u | crontab -u www-data -
```

`crontab -l`로 기존 작업을 먼저 읽고, 새 작업을 더한 뒤에 다시 넣는다. 기존 작업이 지워지지 않는다. 중복도 `sort -u`가 없앤다.

Nextcloud 내부 모드도 Cron으로 바꾼다.

```bash
sudo -u www-data php /var/www/nextcloud/occ background:cron
```

바뀌었는지 확인한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:get backgroundjobs_mode
```

여기에 `cron`이 나와야 한다. 관리 설정의 기본 설정에서도 백그라운드 작업이 Cron으로 선택되어 있는지 확인한다.

## 4. 공유 폴더

사용자 폴더 말고, 여러 사람이 함께 쓰는 공유 폴더도 있다. 공유 폴더는 외부 스토리지로 연결한다. 외부 스토리지 앱은 기본으로 켜져 있다.

관리 설정에서 외부 스토리지를 연다. 로컬을 추가하고, 폴더 이름과 경로, 적용할 사용자를 적는다.

```text
폴더 이름: [공유-폴더]
구성: /mnt/[공유-폴더]
적용 대상: [사용자]
```

폴더 이름은 Nextcloud 안에서 보이는 이름이다. 구성은 LXC 안에 마운트된 실제 경로이다. 적용 대상은 이 폴더를 쓸 사용자이다.

등록됐는지 확인한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ files_external:list
```

여기에 마운트 지점과 경로, 적용 사용자가 나와야 한다.

## 5. 소유권

같은 폴더에 쌓여도, 소유주는 만드는 쪽대로 찍힌다. Nextcloud로 올린 파일은 `www-data` 소유가 된다. Nextcloud는 웹서버 계정 `www-data`(UID 33)로 돌아가기 때문이다. SMB로 만든 파일은 로그인한 계정 소유가 된다.

소유주가 `www-data`면, SMB 사용자는 그룹 권한으로만 접근한다. 그룹에 쓰기 권한이 없으면, 파일을 고치거나 지우지 못한다.

확인한다.

```bash
ls -l /mnt/Nas/[사용자]
```

소유주가 `www-data`로 나오면, Nextcloud로 올린 파일이다.

지금 있는 파일은 바꾼다. Proxmox 호스트에서 root로 실행한다. 자기 폴더 안의 `www-data` 소유 파일만 바꾼다. 공용 폴더는 건드리지 않는다.

```bash
find /mnt/Nas/[사용자] -user www-data -exec chown [사용자]:[그룹] {} +
```

`[사용자]` 자리에 자기 사용자 이름을, `[그룹]` 자리에 공용 그룹 이름이나 번호를 쓴다. 바뀐 뒤에 `ls -l`로 다시 확인한다.

새로 올라오는 파일은 이벤트로 바꾼다. 크론으로 주기적으로 쓸어담지 않는다. 파일 쓰기가 끝나면 그때 바로 바꾼다. 설치와 서비스 등록도 Proxmox 호스트에서 한다.

```bash
apt-get update && apt-get install -y inotify-tools
cat > /usr/local/bin/fix-owner.sh <<'EOF'
#!/bin/bash
inotifywait -m -r -e close_write,moved_to --format '%w%f' /mnt/Nas/[사용자] | while read file; do
  chown --from=www-data [사용자]:[그룹] "$file"
done
EOF
chmod +x /usr/local/bin/fix-owner.sh
```

`'EOF'`에 따옴표가 있다. `$file`이 스크립트 안에 그대로 들어가게 한다. `--from=www-data`는 소유주가 `www-data`인 파일만 바꾼다. `create` 이벤트로는 안 바꾼다. 만드는 도중에 소유주가 바뀌면, 이어서 쓰는 데 실패할 수 있다.

서비스로 등록한다. 재부팅해도 자동으로 뜬다.

```bash
cat > /etc/systemd/system/fix-owner.service <<'EOF'
[Unit]
Description=Fix Nextcloud file ownership
After=zfs-mount.service

[Service]
ExecStart=/usr/local/bin/fix-owner.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now fix-owner
```

확인한다. Nextcloud로 파일을 올리고, `ls -l`로 소유주를 본다. 자기 이름으로 바뀌어 있으면 된다. 서비스 상태도 본다.

```bash
systemctl status fix-owner
```

서비스가 멈추면 새 파일은 안 바뀐다. 그때는 위의 find 명령으로 한 번에 바꾼다.

## 6. 확인

연결이 끝났는지 확인한다.

- 웹 파일 목록에 NAS 파일이 보인다.
- SMB로 파일을 넣고 `files:scan`을 하면, 웹 화면에도 보인다.
- `backgroundjobs_mode`가 `cron`이다.
- 공유 폴더가 웹 파일 목록에 보인다.
