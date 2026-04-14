#!/bin/bash
# 서든랩 Bot + Crawler 시작 스크립트 (pm2)
# 사용법: ./start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# .env 로드
if [ -f "../.env" ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

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

# pm2 확인
if ! command -v pm2 &> /dev/null; then
  echo "[!] pm2가 없습니다. 설치합니다..."
  npm install -g pm2
fi

# 기존 프로세스 정리 후 pm2로 시작
pm2 delete sugar-bot sugar-crawl 2>/dev/null
pm2 start ecosystem.config.js

echo ""
echo "================================"
echo "  모든 서비스 시작 완료! (pm2)"
echo "  상태: pm2 status"
echo "  봇 로그: pm2 logs sugar-bot"
echo "  크롤 로그: pm2 logs sugar-crawl"
echo "  종료: pm2 stop all"
echo "================================"

# 맥 재부팅 시 자동시작 설정 (최초 1회만 하면 됨)
pm2 save --force
