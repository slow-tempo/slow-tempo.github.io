---
title: "GPU 공유와 미리보기·AI 앱"
date: "2026-11-07"
category: "NAS"
tags: ["NAS", "Nextcloud", "LXC"]
summary: "Nextcloud에 iGPU를 공유하고, 미리보기와 AI 앱, 전문 검색을 설정하는 방법을 소개한다"
---

## 1. GPU 공유

Nextcloud는 사진 미리보기와 동영상 변환에 GPU를 쓴다. Proxmox 호스트의 내장 GPU를 LXC 안에 그대로 넘긴다. Proxmox 웹 화면에서 LXC를 고르고, 설명에 GPU 공유라고 적고, 장치 패스스루를 추가한다.

```text
/dev/dri/card0
/dev/dri/renderD128
```

`card0`은 화면 출력용, `renderD128`은 연산용이다. 둘 다 넘겨야 미리보기와 동영상 변환이 GPU로 돌아간다.

드라이버를 설치한다.

```bash
apt update
apt install -y mesa-va-drivers va-driver-all clinfo vainfo mesa-opencl-icd wget gpg
```

`mesa-va-drivers`는 동영상 가속(VA-API) 드라이버이고, `mesa-opencl-icd`는 OpenCL 드라이버이다. `clinfo`와 `vainfo`는 GPU가 제대로 보이는지 확인하는 도구이다.

OpenCL 드라이버는 8845HS용 파일을 찾지 못한다. 있는 파일을 연결해준다.

```bash
mkdir -p /usr/lib/clc/
rm -f /usr/lib/clc/gfx1103-amdgcn-mesa-mesa3d.bc
ln -s /usr/lib/clc/gfx906-amdgcn-mesa-mesa3d.bc /usr/lib/clc/gfx1103-amdgcn-mesa-mesa3d.bc
```

`gfx1103`은 8845HS 내장 GPU의 이름이다. 이 파일이 없어서, 있는 `gfx906` 파일을 같은 이름으로 연결해준다.

GPU가 보이는지 확인한다.

```bash
vainfo | head
clinfo | grep "Device Name"
```

`vainfo`에 `Mesa Gallium driver for AMD Radeon Graphics (gfx1103_r1)`이 나오고, `clinfo`에 같은 GPU 이름이 나오면 된다.

## 2. 미리보기

사진과 동영상은 미리보기가 없으면 목록에서 바로 안 보인다. 미리보기 생성에 필요한 도구를 설치한다.

```bash
apt install imagemagick ffmpeg libmagickwand-dev -y
```

`imagemagick`은 이미지 처리, `ffmpeg`는 동영상 처리 도구이다.

미리보기 생성 앱을 설치한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ app:install previewgenerator
sudo -u www-data php /var/www/nextcloud/occ app:enable previewgenerator
```

미리보기 크기를 정한다. 한 번에 여러 크기를 만들면, 목록에서는 작은 것을, 크게 볼 때는 큰 것을 쓴다.

```bash
sudo -u www-data php /var/www/nextcloud/occ config:app:set previewgenerator column_count --value 8
sudo -u www-data php /var/www/nextcloud/occ config:app:set previewgenerator square_sizes --value "32 256"
sudo -u www-data php /var/www/nextcloud/occ config:app:set previewgenerator width_sizes --value "256 768 1280 1920"
sudo -u www-data php /var/www/nextcloud/occ config:app:set previewgenerator height_sizes --value "256 768 1280 1920"
```

`width_sizes`와 `height_sizes`는 가로, 세로 미리보기 크기이다. 최대 1920으로 올린다. 풀HD 화면에서 크게 봐도 깨지지 않는다.

텍스트와 마크다운 파일도 미리보기가 나오게 한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ config:system:set enabledPreviewProviders 7 --value="OC\\Preview\\TXT"
sudo -u www-data php /var/www/nextcloud/occ config:system:set enabledPreviewProviders 8 --value="OC\\Preview\\MarkDown"
```

문서 파일 미리보기도 만든다. LibreOffice와 한글 폰트를 설치한다.

```bash
apt update
apt install -y libreoffice fonts-nanum fonts-noto-cjk
```

폰트가 없으면 한글 문서 미리보기가 깨진다.

이미 있는 파일의 미리보기를 한 번에 만든다.

```bash
sudo -u www-data php /var/www/nextcloud/occ preview:generate-all -vvv
```

## 3. AI 앱

사진 앱과 얼굴 인식 앱을 설치한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ app:install memories
sudo -u www-data php /var/www/nextcloud/occ app:install recognize
```

Memories는 사진과 동영상을 모아 보는 앱이다. Files 앱의 기본 뷰어를 Memories로 바꾼다.

```bash
sudo -u www-data php /var/www/nextcloud/occ config:app:set memories rewrite_files_viewer --value="1"
sudo -u www-data php /var/www/nextcloud/occ config:app:set memories video_player --value="1"
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-js
```

Recognize는 사진 속 얼굴과 사물을 인식한다. 설치한 뒤에 다시 스캔한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ recognize:recrawl
```

## 4. 전문 검색

파일 이름만으로는 파일 안의 내용을 찾을 수 없다. 전문 검색은 파일 안의 글까지 찾아준다. 검색 엔진으로 Elasticsearch를 쓴다.

Docker를 설치한다.

```bash
apt update && apt install -y curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker
```

Elasticsearch 컨테이너를 띄운다.

```bash
docker run -d \
  --name elasticsearch \
  --privileged \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms2g -Xmx2g" \
  --restart always \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.4
```

`discovery.type=single-node`는 한 대만 쓴다는 뜻이다. `ES_JAVA_OPTS`는 메모리를 2GB로 정한다. `9200`은 검색 요청 포트이다.

한글 형태소 분석기 Nori를 설치한다.

```bash
docker exec -it elasticsearch bin/elasticsearch-plugin install analysis-nori
docker restart elasticsearch
```

Nextcloud 쪽 검색 앱을 켠다.

```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable fulltextsearch
sudo -u www-data php /var/www/nextcloud/occ app:enable fulltextsearch_elasticsearch
sudo -u www-data php /var/www/nextcloud/occ app:enable files_fulltextsearch
```

검색 플랫폼을 Elasticsearch로 정한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ fulltextsearch:configure '{"search_platform": "OCA\\FullTextSearch_Elasticsearch\\Platform\\ElasticsearchPlatform"}'
```

전문 검색 설정에서 탐색 아이콘을 켜고, 파일 크기 제한을 100MB로 하고, 분석기를 Nori로 고른다.

인덱싱을 시작한다.

```bash
sudo -u www-data php /var/www/nextcloud/occ fulltextsearch:reset
sudo -u www-data php /var/www/nextcloud/occ fulltextsearch:index
```

`fulltextsearch:reset`은 기존 인덱스를 지운다. `fulltextsearch:index`는 파일 내용을 읽어서 인덱스를 새로 만든다.

검색이 되는지 확인한다.

```bash
curl -s localhost:9200
sudo -u www-data php /var/www/nextcloud/occ fulltextsearch:check
```

`curl`에 Elasticsearch 정보가 나오고, `fulltextsearch:check`에 `elastic_host`가 `http://localhost:9200`으로 나오면 된다.

## 5. 확인

설정이 끝났는지 확인한다.

- `vainfo`와 `clinfo`에 8845HS GPU가 보인다.
- 사진 목록에 미리보기가 보인다.
- Memories에서 사진과 동영상이 보인다.
- Recognize 설정에서 인식이 돌아간다.
- 검색창에 파일 안의 단어를 치면 파일이 나온다.
