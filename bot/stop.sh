#!/bin/bash
# 서든랩 Bot + Crawler 종료 (pm2)
pm2 stop sugar-bot sugar-crawl 2>/dev/null
pm2 delete sugar-bot sugar-crawl 2>/dev/null
echo "모든 서비스 종료됨"
