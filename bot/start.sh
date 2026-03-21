#!/bin/bash
# 서든랩 Bot + Crawler 시작 스크립트
# 사용법: ./start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# .env 로드
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

# DISCORD_BOT_TOKEN은 .env 파일에서 로드됨 (위 export 참조)

echo "================================"
echo "  서든랩 - Local Services"
echo "================================"
echo ""

# Ollama 확인
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "[!] Ollama가 꺼져있습니다. 시작합니다..."
  brew services start ollama
  sleep 3
fi
echo "[OK] Ollama (qwen2.5:1.5b)"

# 디스코드 봇 시작
echo "[>>] Discord Bot 시작..."
node index.js > ../logs/bot.log 2>&1 &
BOT_PID=$!
echo "[OK] Discord Bot (PID: $BOT_PID)"

# 크롤러 크론 시작
echo "[>>] Crawler Cron 시작 (08:05 / 20:05)..."
node crawl.js --cron > ../logs/crawl.log 2>&1 &
CRAWL_PID=$!
echo "[OK] Crawler Cron (PID: $CRAWL_PID)"

echo ""
echo "================================"
echo "  모든 서비스 시작 완료!"
echo "  봇 로그: tail -f logs/bot.log"
echo "  크롤 로그: tail -f logs/crawl.log"
echo "  종료: kill $BOT_PID $CRAWL_PID"
echo "================================"

# PID 저장 (stop.sh에서 사용)
echo "$BOT_PID" > .bot.pid
echo "$CRAWL_PID" > .crawl.pid

# 포그라운드 유지 (Ctrl+C로 종료)
trap "kill $BOT_PID $CRAWL_PID 2>/dev/null; echo '종료됨'; exit 0" INT TERM
wait
