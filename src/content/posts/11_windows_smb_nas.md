---
title: "윈도우에서 SMB로 NAS 쓰기"
date: "2026-11-09"
category: "NAS"
tags: ["NAS", "SMB", "LXC", "Windows"]
summary: "윈도우에서 SMB로 NAS 폴더에 접속해서 파일을 읽고 쓰는 방법을 소개한다"
---

## 1. SMB

SMB는 윈도우 파일 공유 프로토콜이다. 윈도우 탐색기에서 NAS 폴더를 네트워크 드라이브처럼 쓴다. Nextcloud는 웹으로 쓰고, SMB는 탐색기로 쓴다. 큰 파일을 옮기거나, 프로그램을 NAS 폴더에 직접 연결할 때 SMB를 쓴다.

SMB 서버는 101번 LXC에 둔다. 101번은 Samba를 돌리는 컨테이너이다. NAS 폴더를 각 사용자 홈에 마운트한다. 윈도우는 자기 홈에 SMB로 접속한다.

## 2. LXC 만들기

Proxmox 웹 화면에서 LXC 101을 만든다. 설정은 다음과 같다. 만드는 화면에서 고르는 값이다. 명령어가 아니다.

<p class="example-note">아래 코드에서 <code>[대괄호]</code> 안은 예시이다. 복사해서 그대로 붙여넣으면 안 된다. 자기 값으로 바꾼 뒤에 실행한다.</p>

```text
OS: Debian
Disk: 8GB
CPU: 1
Memory: 1GB
Unprivileged: 해제
```

Unprivileged 체크를 해제하면 privileged 컨테이너가 된다. `pct start 101`로 시작하고, `pct enter 101`로 들어간다.

## 3. 계정과 그룹

Samba를 설치한다. 사용자 두 명을 만든다. 리눅스 계정과 SMB 계정을 따로 만든다. 리눅스 비밀번호와 SMB 비밀번호를 같은 값으로 맞춘다. 공용 그룹을 만든다. 두 사람을 그룹에 넣는다.

```bash
apt update
apt install -y samba sudo
useradd -m -s /bin/bash [사용자-a]
useradd -m -s /bin/bash [사용자-b]
bash -c "echo '[사용자-a]:[비밀번호]' | chpasswd"
bash -c "echo '[사용자-b]:[비밀번호]' | chpasswd"
printf "[비밀번호]\n[비밀번호]\n" | smbpasswd -a -s [사용자-a]
printf "[비밀번호]\n[비밀번호]\n" | smbpasswd -a -s [사용자-b]
groupadd -g [그룹-번호] [그룹]
usermod -aG [그룹] [사용자-a]
usermod -aG [그룹] [사용자-b]
```

`[그룹-번호]`는 공용 그룹 번호, `[그룹]`은 공용 그룹 이름이다. `useradd -m`은 홈 디렉토리를 같이 만든다. `chpasswd`는 리눅스 비밀번호를, `smbpasswd -a`는 SMB 비밀번호를 만든다.

## 4. 공유 설정

공유는 `[homes]` 하나이다. `[homes]`는 각 사용자 홈을 공유한다. 설정은 다음과 같다.

```text
[homes]
read only = no
create mask = 0770
directory mask = 0770
valid users = %S
browseable = no
```

기본은 읽기 전용이라서, 쓰기를 허용한다. 0770은 소유주와 그룹만 읽고 쓰게 한다. `%S`는 본인만 자기 홈에 접속하게 한다. `browseable`이 `no`라서 네트워크 목록에 안 보인다. 주소를 직접 입력한다.

```bash
sed -i '/^\[homes\]/,/^\[/ s/read only =.*/read only = no/' /etc/samba/smb.conf
sed -i '/^\[homes\]/,/^\[/ s/create mask =.*/create mask = 0770/' /etc/samba/smb.conf
sed -i '/^\[homes\]/,/^\[/ s/directory mask =.*/directory mask = 0770/' /etc/samba/smb.conf
systemctl restart smbd
```

로그가 쌓이지 않게 logrotate로 자른다. `/var/log/samba/log.smbd`를 10MB마다 1개만 남긴다.

## 5. 폴더 마운트

NAS 폴더를 컨테이너 홈에 마운트한다. 101을 멈추고, 101.conf에 추가한다. `onboot`는 1이다. 재부팅하면 자동으로 뜬다. `mp0`은 [사용자-a] 폴더, `mp1`은 [사용자-b] 폴더이다. `lxc.apparmor.profile`은 `unconfined`이다. `lxc.cap.drop`은 비워 둔다.

```bash
pct stop 101
cat <<'EOF' >> /etc/pve/lxc/101.conf
onboot: 1
mp0: /mnt/Nas/[사용자-a],mp=/home/[사용자-a]
mp1: /mnt/Nas/[사용자-b],mp=/home/[사용자-b]
lxc.apparmor.profile: unconfined
lxc.cap.drop:
EOF
pct start 101
```

자식 데이터셋은 따로 마운트한다. mp 바인드는 자식을 따라오지 않는다. 102번에서 확인한 것과 같은 문제이다. 지금은 mp 항목이 69개이다.

## 6. 윈도우에서 접속

파일 탐색기 주소창에 `\\[서버-10G-IP]\[사용자-a]`를 입력한다. 사용자 이름과 비밀번호를 입력한다. SMB 계정이다. 자기 홈이 열린다.

네트워크 드라이브로 연결하면, 매번 주소를 안 쳐도 된다. 탐색기에서 "내 PC"를 우클릭하고 "네트워크 드라이브 연결"을 누른다. 폴더에 `\\[서버-10G-IP]\[사용자-a]`를 입력한다. "로그온할 때 다시 연결"에 체크한다. 일반랜으로 연결할 때는 `[서버-IP]`를 쓴다.

## 7. 확인

smbd가 뜨는지 본다. 설정을 확인한다. 윈도우에서 파일을 만들고, 소유주를 확인한다. SMB로 만든 파일은 로그인한 계정 소유가 된다.

```bash
systemctl status smbd
testparm -s
```

`testparm`은 설정 파일을 검사한다. `[homes]`에 `read only = No`, `create mask = 0770`, `directory mask = 0770`, `valid users = %S`가 나오면 된다. 호스트에서 `ls -l /mnt/Nas/[사용자-a]`로 확인한다. 윈도우에서 만든 파일이 로그인한 계정 소유로 나오면 된다.
