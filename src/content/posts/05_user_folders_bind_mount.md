---
title: "사용자 폴더와 바인드 마운트"
date: "2026-11-05"
category: "NAS"
tags: ["NAS", "ZFS", "Nextcloud"]
summary: "ZFS 풀 위에 사용자별 폴더를 나누고, Nextcloud가 볼 수 있게 바인드 마운트로 연결하는 방법을 소개한다"
---

## 1. 데이터셋 폴더

데이터셋은 ZFS 풀 위에 만드는 폴더 단위이다.

풀 하나를 통째로 쓰지 않고, 데이터셋으로 나눠서 쓴다. 사용자마다 데이터셋 하나씩, 공유용으로 데이터셋 하나씩 만드는 식이다. 실제로 쓴 명령은 다음과 같다.

```bash
zfs create Nas/user-a
zfs create Nas/user-b
zfs create Nas/shared
zfs create -o compression=lz4 Nas/backup
```

`user-a`와 `user-b`는 사용자 이름 예시이다. 백업용 폴더는 압축을 켠다. 데이터셋을 만들면, `/mnt/Nas` 아래에 폴더가 바로 생긴다. 따로 폴더를 만들 필요가 없다.

```text
ZFS 풀
    ├── 사용자 A 폴더
    ├── 사용자 B 폴더
    ├── 공유 폴더
    └── 백업용 폴더
```

## 2. 사용자 폴더

사용자마다 폴더를 나누면, 한 사용자의 파일이 다른 사용자의 폴더에 섞이지 않는다.

한 사용자 폴더에 문제가 생겨도, 다른 사용자 폴더는 그대로 쓴다. 백업용 폴더도 따로 둔다. 백업용 폴더는 평소에 쓰는 폴더와 섞이지 않게 분리한다.

## 3. 바인드 마운트

Nextcloud는 풀 전체를 보는 것이 아니라, 자기 폴더만 본다.

바인드 마운트는 한 폴더를 다른 위치에서도 보이게 하는 방법이다. 사용자 폴더를 Nextcloud가 보는 위치에 바인드 마운트로 연결하면, Nextcloud 안에서 그 폴더의 파일을 볼 수 있다.

bindfs를 고른 이유는 초기 가용 용량이 적어서이다. 파일을 복사하지 않고, 같은 파일을 다른 위치에서 보이게 할 수 있다.

권한도 Nextcloud가 쓰는 계정에 맞춘다. 권한이 맞지 않으면, Nextcloud가 파일을 보지 못하거나 쓰지 못한다. bindfs는 권한도 바꿀 수 있다. `force-user=33`으로 Nextcloud가 쓰는 계정에 맞춰준다. 실제로 쓴 명령은 다음과 같다.

```bash
apt-get update && apt-get install -y bindfs
mkdir -p /mnt/cloud_bridge/user-a
mkdir -p /mnt/cloud_bridge/user-b
```

`/etc/fstab`에 다음 두 줄을 추가한다. fstab에 넣어두면, 재부팅해도 자동으로 붙는다.

```text
bindfs#/mnt/Nas/user-a /mnt/cloud_bridge/user-a fuse perms=0770,force-user=33,force-group=[그룹],nonempty 0 0
bindfs#/mnt/Nas/user-b /mnt/cloud_bridge/user-b fuse perms=0770,force-user=33,force-group=[그룹],nonempty 0 0
```

`force-user=33`은 Nextcloud가 쓰는 `www-data` 계정의 번호이다. `[그룹]` 자리에는 공용 그룹 이름이나 번호를 쓴다. 설정을 반영한다.

```bash
systemctl daemon-reload
mount -a
```

## 4. 저장소 준비

풀을 만들고, 데이터셋으로 사용자 폴더를 나누고, Nextcloud가 볼 수 있게 바인드 마운트로 연결하면, 저장소 준비가 끝난다. 준비됐는지 확인한다.

```bash
zfs list Nas
mount | grep cloud_bridge
```

`zfs list`에서 데이터셋 4개가 나오고, `mount`에서 바인드 마운트 2개가 나오면 준비된 것이다.
