#!/bin/bash

set -e

echo "================================"
echo " Git Upload"
echo "================================"

FILE="$1"
MESSAGE="$2"

if [ -z "$MESSAGE" ]; then
    MESSAGE="Update blog"
fi

echo ""
echo "[1/4] Git 상태 확인"
git status

echo ""

if [ -z "$FILE" ]; then

    echo "[2/4] 모든 변경사항 추가"
    git add .

else

    echo "[2/4] 파일 추가: $FILE"

    if [ ! -f "$FILE" ]; then
        echo "ERROR: 파일이 존재하지 않습니다."
        exit 1
    fi

    git add "$FILE"

fi

echo ""
echo "[3/4] Commit"

git commit -m "$MESSAGE" || {
    echo "Commit할 변경사항이 없습니다."
    exit 0
}

echo ""
echo "[4/4] Push"

git push

echo ""
echo "================================"
echo " Upload complete!"
echo "================================"
