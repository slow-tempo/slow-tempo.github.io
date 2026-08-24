#!/bin/bash

set -e

echo "================================"
echo " Git Upload"
echo "================================"

echo ""
echo "[1/4] Git 상태 확인"
git status

echo ""
echo "[2/4] 변경사항 추가"
git add .

echo ""
echo "[3/4] Commit"

MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    MESSAGE="Update blog"
fi

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
