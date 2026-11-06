---
title: "Nextcloud 웹 설치와 도메인·프록시 설정"
date: "2026-11-06"
category: "NAS"
tags: ["NAS", "Nextcloud", "LXC"]
summary: "Nextcloud 웹 설치를 마치고, 도메인과 프록시를 등록하는 방법을 소개한다"
---

## 1. Nginx 설정

Nginx는 브라우저 요청을 받아서 Nextcloud로 넘긴다. PHP 파일은 PHP-FPM이 실행한다.

설정 파일은 `/etc/nginx/sites-available/nextcloud.conf`에 만든다.

<p class="example-note">아래 코드에서 <code>[대괄호]</code> 안은 예시이다. 복사해서 그대로 붙여넣으면 안 된다. 자기 값으로 바꾼 뒤에 실행한다.</p>

```nginx
server {
    listen 80;
    server_name [Nextcloud-외부-IP] [Nextcloud-내부-IP] [도메인];
    root /var/www/nextcloud/;
    index index.php index.html;

    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    gzip off;
    client_max_body_size 512M;

    location / {
        rewrite ^ /index.php;
    }

    location ~ ^\/(?:index|remote|public|cron|core\/ajax\/update|status|ocs\/v[12]|settings|themes\/v[12]|updater\/.+)\.php(?:$|\/) {
        fastcgi_split_path_info ^(.+?\.php)(\/.*|)$;
        set $path_info $fastcgi_path_info;
        try_files $fastcgi_script_name =404;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $path_info;
        fastcgi_param HTTPS on;
        fastcgi_param modHeadersAvailable true;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_intercept_errors on;
        fastcgi_request_buffering off;
    }
}
```

`server_name`에는 Nextcloud에 접속할 주소를 적는다.

설정을 적용한다.

```bash
ln -sf /etc/nginx/sites-available/nextcloud.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

`nginx -t`는 설정 문법을 검사한다. 문법이 틀리면 재시작이 안 된다. 검사에 통과해야 재시작한다.

설정이 제대로 들어갔는지 확인한다.

```bash
nginx -T | grep server_name
```

여기에 자기 주소가 나와야 한다. `[대괄호]`가 그대로 나오면, 바꾼 뒤에 다시 적용한다.

## 2. 웹 설치

Nginx 설정이 끝나면, 브라우저에서 설치를 마친다. 브라우저 주소창에 Nextcloud 주소를 적는다. 외부 접속용 IP로 접속한다.

```text
http://[Nextcloud-외부-IP]
```

설치 화면에서 관리자 계정을 만든다. 데이터 폴더는 기본값 그대로 둔다. 데이터베이스는 PostgreSQL을 고르고, 정보를 적는다.

```text
데이터베이스 사용자: nextcloud
데이터베이스 비밀번호: 설치할 때 정한 비밀번호
데이터베이스 이름: nextcloud
데이터베이스 호스트: localhost
```

데이터베이스 호스트가 `localhost`인 이유는 데이터베이스가 같은 LXC 안에 있어서이다.

설치가 끝나면 `/var/www/nextcloud/config/config.php`가 생긴다. 이 파일에 설치 정보가 저장된다.

## 3. 도메인 등록

Nextcloud는 등록한 주소로만 접속을 받는다. 등록하지 않은 주소로 접속하면, 신뢰할 수 없는 도메인이라는 오류가 나온다.

접속할 주소를 `trusted_domains`에 등록한다. `occ` 명령으로 등록한다.

```bash
sudo -u www-data php occ config:system:set trusted_domains 0 --value="localhost"
sudo -u www-data php occ config:system:set trusted_domains 1 --value="[Nextcloud-내부-IP]"
sudo -u www-data php occ config:system:set trusted_domains 2 --value="[Nextcloud-외부-IP]"
sudo -u www-data php occ config:system:set trusted_domains 3 --value="[도메인]"
```

번호는 0부터 순서대로 쓴다. 번호가 겹치면, 나중에 적은 값이 앞의 값을 덮는다.

등록됐는지 확인한다.

```bash
sudo -u www-data php occ config:system:get trusted_domains
```

## 4. 프록시 등록

프록시는 밖에서 들어오는 요청을 받아서 Nextcloud로 넘긴다. 프록시 LXC의 두 IP를 `trusted_proxies`에 등록한다.

```bash
sudo -u www-data php occ config:system:set trusted_proxies 0 --value="[프록시-내부-IP]"
sudo -u www-data php occ config:system:set trusted_proxies 1 --value="[프록시-외부-IP]"
```

프록시가 HTTPS를 처리하므로, 프로토콜도 HTTPS로 고정한다.

```bash
sudo -u www-data php occ config:system:set overwriteprotocol --value="https"
```

`overwriteprotocol`을 안 정하면, 프록시 뒤에서 HTTP와 HTTPS가 꼬인다. 브라우저는 HTTPS로 들어오는데 Nextcloud는 HTTP로 인식해서, 자꾸 리다이렉트하거나 잘못된 프로토콜이라는 경고가 나온다.

등록됐는지 확인한다.

```bash
sudo -u www-data php occ config:system:get trusted_proxies
sudo -u www-data php occ config:system:get overwriteprotocol
```

여기에 자기 프록시 IP와 `https`가 나와야 한다. `[대괄호]`가 그대로 나오면, 바꾼 뒤에 다시 등록한다.

## 5. 업로드 제한

기본 설정으로는 큰 파일을 올릴 수 없다. PHP 제한을 올린다.

```bash
PHP_INI="/etc/php/8.3/fpm/php.ini"
sed -i "s/memory_limit = .*/memory_limit = 512M/" "$PHP_INI"
sed -i "s/upload_max_filesize = .*/upload_max_filesize = 512M/" "$PHP_INI"
sed -i "s/post_max_size = .*/post_max_size = 512M/" "$PHP_INI"
sed -i "s/max_execution_time = .*/max_execution_time = 300/" "$PHP_INI"
sed -i "s/;opcache.enable=.*/opcache.enable=1/" "$PHP_INI"
sed -i "s/;opcache.interned_strings_buffer=.*/opcache.interned_strings_buffer=16/" "$PHP_INI"
sed -i "s/;opcache.max_accelerated_files=.*/opcache.max_accelerated_files=10000/" "$PHP_INI"
sed -i "s/;opcache.memory_consumption=.*/opcache.memory_consumption=128/" "$PHP_INI"
sed -i "s/;opcache.save_comments=.*/opcache.save_comments=1/" "$PHP_INI"
sed -i "s/;opcache.revalidate_freq=.*/opcache.revalidate_freq=1/" "$PHP_INI"
systemctl restart php8.3-fpm
```

`memory_limit`, `upload_max_filesize`, `post_max_size`는 512M로 올린다. `max_execution_time`은 300초로 올린다. OPcache는 PHP 실행 속도를 높인다.

설정을 바꾸면 PHP-FPM을 재시작해야 적용된다.
