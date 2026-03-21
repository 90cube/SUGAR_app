#!/bin/bash
# 서든랩 Bot + Crawler 종료
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ -f .bot.pid ]; then
  kill $(cat .bot.pid) 2>/dev/null && echo "[OK] Bot 종료"
  rm .bot.pid
fi

if [ -f .crawl.pid ]; then
  kill $(cat .crawl.pid) 2>/dev/null && echo "[OK] Crawler 종료"
  rm .crawl.pid
fi

echo "모든 서비스 종료됨"
