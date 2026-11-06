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

## 5. 확인

연결이 끝났는지 확인한다.

- 웹 파일 목록에 NAS 파일이 보인다.
- SMB로 파일을 넣고 `files:scan`을 하면, 웹 화면에도 보인다.
- `backgroundjobs_mode`가 `cron`이다.
- 공유 폴더가 웹 파일 목록에 보인다.
