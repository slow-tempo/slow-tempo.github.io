---
title: "파일 새로고침 자동 스캔"
date: "2026-11-10"
category: "NAS"
tags: ["NAS", "Nextcloud", "LXC", "occ"]
summary: "Nextcloud가 밖에서 넣은 파일을 자동으로 보게 하는 방법을 소개한다"
---

Nextcloud는 파일을 디스크에서 직접 보지 않는다. 파일 목록은 데이터베이스에서 본다. 디스크에 파일이 있어도 데이터베이스에 없으면, 웹 화면에 안 나온다. SMB로 파일을 넣어도, 호스트에서 직접 파일을 넣어도, 같은 문제이다. 수동 스캔은 08에서 다뤘다. 여기서는 자동으로 보이게 하는 방법을 다룬다.

## 1. 자동으로 확인하게 하기

Nextcloud에 파일시스템 변경 확인 옵션이 있다. 이 옵션을 켜면, Nextcloud가 파일 목록을 볼 때마다 디스크도 확인한다. 디스크에 새 파일이 있으면, 데이터베이스에 바로 반영한다. 스캔 명령을 안 쳐도 된다.

설정은 다음과 같다.

<p class="example-note">아래 코드에서 <code>[대괄호]</code> 안은 예시이다. 복사해서 그대로 붙여넣으면 안 된다. 자기 값으로 바꾼 뒤에 실행한다.</p>

```text
filesystem_check_changes: 1
```

설정은 occ로 넣는다. PHP-FPM을 다시 시작하면 바로 적용된다.

```bash
pct exec 102 -- sudo -u www-data php /var/www/nextcloud/occ config:system:set filesystem_check_changes --value=1 --type=int
pct exec 102 -- systemctl restart php*-fpm
```

`filesystem_check_changes`가 1이면 자동 확인이 켜진 것이다.

## 2. 감시 스크립트

자동 확인만으로 부족할 때가 있다. 파일이 바뀌면 바로 스캔하는 감시 스크립트가 있다. `nextcloud-watcher.sh`이다. 서비스 이름은 `nextcloud-inotify.service`이다. 이름은 inotify이지만, 실제로는 inotify를 안 쓴다. 2초마다 폴더 시간을 확인한다. 폴더 시간이 바뀌면, 그 사용자 폴더를 스캔한다.

설정은 다음과 같다.

```text
감시: [사용자-a] 폴더, [사용자-b] 폴더
간격: 2초
동작: files:scan
```

txt에는 files_inotify 앱 설치가 있다. 실물은 앱이 없다. 대신 감시 스크립트가 있다. 감시 스크립트는 2026-11-09부터 돌고 있다.

감시에는 한계가 있다. 폴더 시간은 최상위 폴더에 직접 파일을 넣을 때만 바뀐다. 하위 폴더에 파일을 넣으면, 최상위 폴더 시간은 안 바뀐다. 그래서 하위 폴더에 넣은 파일은 감시가 못 알아챈다. 실제로 파일을 보이게 하는 건 1절의 자동 확인이다.

## 3. 실시간 감시

실시간 감시도 있다. `log_watcher.sh`이다. inotify로 데이터 폴더를 재귀 감시한다. 파일이 바뀌면 1초 조용해질 때까지 기다렸다가 스캔한다.

설정은 다음과 같다.

```text
감시: /var/www/nextcloud/data
방식: inotify 재귀
대기: 1초 조용하면 스캔
```

그런데 죽어 있었다. 감시 경로가 `/mnt/Nas`였는데, 102 안에 `/mnt/Nas`가 없다. inotifywait가 바로 종료되고, systemd가 재시작 루프 끝에 포기했다. nextcloud-sync.service는 11-09 재부팅 때부터 failed였다. 스캔 명령도 102 안에서 안 되는 형태였다. `pct exec 102`는 호스트 명령어라 102 안에선 안 된다.

고쳤다. 감시 경로, 유저 파싱, 스캔 명령 3곳을 바꿨다. 서비스를 다시 시작했더니 돌기 시작했다. 하위 폴더에 파일을 넣으면 바로 스캔이 돈다.

## 4. 백그라운드 작업

Nextcloud는 주기적으로 할 일이 있다. 오래된 버전을 지우고, 알림을 보내고, 파일을 정리한다. 이런 일은 백그라운드 작업이 한다. 백그라운드 작업은 cron으로 돌린다.

설정은 다음과 같다.

```text
백그라운드 작업: Cron
cron.php: 5분마다
```

cron에 등록하고, 백그라운드 작업 방식을 Cron으로 바꾼다.

```bash
(crontab -u www-data -l 2>/dev/null ; echo "*/5 * * * * php -f /var/www/nextcloud/cron.php") | sort -u | crontab -u www-data -
sudo -u www-data php /var/www/nextcloud/occ background:cron
```

cron.php가 5분마다 돈다. 백그라운드 작업이 그때 실행된다.

마운트 변경은 자동 감지가 안 된다. 그래서 매일 새벽에 전체 스캔을 돌린다. 안전망이다.

```bash
(crontab -u www-data -l 2>/dev/null ; echo "0 3 * * * php /var/www/nextcloud/occ files:scan --all --quiet") | sort -u | crontab -u www-data -
```

## 5. 확인

설정이 들어갔는지 확인한다. 호스트에서 파일을 만들고, Nextcloud 웹 화면에 바로 보이는지 확인한다. 스캔 명령을 안 쳐도 보인다.

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:get filesystem_check_changes
sudo -u www-data php /var/www/nextcloud/occ background-job:list --limit 5
```

첫 명령은 1이 나와야 한다. 둘째 명령은 백그라운드 작업 목록을 보여준다. last_run이 최근 시간이면, 백그라운드 작업이 돌고 있는 것이다.

## 6. 실전 사례: rbind 고친 뒤 폴더가 안 보였다

2026-11-09에 rbind로 마운트를 고쳤다. 디스크에는 폴더가 다 나타났는데, Nextcloud 목록에는 안 떴다. 2026-11-10에 [사용자-a] 하위 폴더가 안 보였다. 자동스캔이 있었는데도 못 잡았다.

마운트 변경은 mtime을 안 바꾼다. [사용자-a] 폴더 시간은 2026-11-07 12:43 그대로였다. 감시 스크립트와 자동 확인은 둘 다 mtime을 보고 "변화 없음"으로 판단했다. 2절의 한계가 실제로 일어난 것이다.

실시간 감시도 죽어 있었다. log_watcher.sh가 /mnt/Nas를 inotify로 감시하는데, /mnt/Nas가 102 안에 없다. 102 안 /mnt에는 Pompo만 있다. inotifywait가 경로가 없어서 바로 종료되고, systemd가 재시작 루프 끝에 포기했다. nextcloud-sync.service는 11-09 재부팅 때부터 failed였다.

수동 스캔으로 해결했다.

```text
폴더: 11,178개
파일: 84,786개
신규: 0개
갱신: 31,214개
삭제: 0개
오류: 0개
소요: 6분 32초
```

갱신 31,214개가 자동스캔이 안 돌았다는 증거이다. 자동스캔이 한 번이라도 돌았으면, 이미 최신이었을 것이다.

nextcloud-sync.service는 3절에서 고쳤다. 감시 경로를 102 안에 실제로 있는 경로로 바꾸고, 스캔 명령을 102 안에서 되는 형태로 바꿨다. 야간 스캔도 안전망으로 걸었다.
