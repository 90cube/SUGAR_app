const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { Resolver } = dns;

// ── DNS Helper (sandbox workaround) ─────────────────────
const _dnsResolver = new Resolver();
_dnsResolver.setServers(['1.1.1.1', '8.8.8.8']);

function resolveHost(hostname) {
	return new Promise((resolve, reject) => {
		_dnsResolver.resolve4(hostname, (err, addresses) => {
			if (err || !addresses || addresses.length === 0) reject(err || new Error('No addresses'));
			else resolve(addresses[0]);
		});
	});
}

async function buildHostResolverRules() {
	const hosts = ['sa.nexon.com'];
	const rules = [];
	for (const host of hosts) {
		try {
			const ip = await resolveHost(host);
			rules.push(`MAP ${host} ${ip}`);
		} catch (e) {
			console.error(`[DNS] Failed to resolve ${host}:`, e.message);
		}
	}
	return rules.length > 0 ? rules.join(', ') : null;
}

// ── Config ──────────────────────────────────────────────
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const STATE_FILE = path.join(__dirname, '.anomaly-state');

const CHANNELS = {
	summary: '1484420439508914227',
};

const LIST_URL = 'https://sa.nexon.com/news/events/list.aspx?n4EventCode=2';
const SCAN_INTERVAL_MS = 5 * 60 * 1000; // 5분

// 이상 탐지 기준
const ANOMALY_COMMENT_MIN = 5000;      // 댓글 5000건 이상
const ANOMALY_DUPLICATE_COUNT = 20;    // 최신 댓글 20개 중 같은 내용

// ── 상태 관리 ───────────────────────────────────────────
// currentPage: 현재 목록 페이지 번호
// eventQueue: 현재 페이지에서 아직 조사 안 한 이벤트 [{id, href, title}]
// scannedEventIds: 이미 조사 완료된 이벤트 ID 목록
function loadState() {
	try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
	catch { return { currentPage: null, eventQueue: [], scannedEventIds: [], running: false }; }
}
function saveState(state) {
	fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── 디스코드 메시지 ─────────────────────────────────────
async function sendDiscord(channelId, content, embed) {
	if (!BOT_TOKEN) return;
	try {
		const body = {};
		if (content) body.content = content.slice(0, 2000);
		if (embed) body.embeds = [embed];
		await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
			method: 'POST',
			headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
	} catch (err) { console.error('[Discord]', err.message); }
}

// ── 이벤트 목록에서 링크 수집 ───────────────────────────
async function getEventLinks(page, pageNo) {
	const url = `${LIST_URL}&n4PageNo=${pageNo}`;
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await page.waitForTimeout(8000);

	const events = await page.evaluate(() => {
		const links = document.querySelectorAll('a[href*="events/view"]');
		const seen = new Set();
		return Array.from(links)
			.map(a => {
				const id = (a.href.match(/n4ArticleSN=(\d+)/) || [])[1] || '';
				// 제목: 가장 가까운 텍스트 콘텐츠
				const parent = a.closest('li, tr, div');
				const title = parent?.textContent?.trim()?.slice(0, 100) || a.textContent.trim() || '';
				return { href: a.href, title, id };
			})
			.filter(e => {
				if (!e.id || seen.has(e.id)) return false;
				seen.add(e.id);
				return true;
			});
	});

	return events;
}

// ── 마지막 페이지 번호 ─────────────────────────────────
async function getLastPageNo(page) {
	await page.goto(`${LIST_URL}&n4PageNo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await page.waitForTimeout(8000);
	return page.evaluate(() => {
		let max = 1;
		document.querySelectorAll('a[href*="n4PageNo"]').forEach(a => {
			const m = a.href.match(/n4PageNo=(\d+)/);
			if (m) max = Math.max(max, parseInt(m[1]));
		});
		return max;
	});
}

// ── 이벤트 상세 → 댓글 수 + 첫 페이지 댓글 ─────────────
async function scrapeEventDetail(page, eventUrl) {
	await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await page.waitForTimeout(8000);
	// 스크롤 하단으로 (댓글 영역 로딩 트리거)
	await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	await page.waitForTimeout(3000);

	return page.evaluate(() => {
		// 1. "전체댓글 | N건" 에서 댓글 수 추출
		const bodyText = document.body.innerText;
		const totalMatch = bodyText.match(/전체\s*댓글[^\d]*(\d[\d,]*)\s*건/);
		const totalComments = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : 0;

		// 2. 이벤트 제목 추출
		const titleEl = document.querySelector('.event_view h3, .view_title, .tit, h3');
		const title = titleEl?.textContent?.trim() || '';

		// 3. 첫 페이지에 보이는 댓글 수집 (로드됐으면)
		const comments = [];
		// 다양한 셀렉터 시도
		const commentEls = document.querySelectorAll(
			'.comment_list li, .reply_list li, .cmt_list li, ' +
			'#CommentList li, #commentList li, [id*="ommentList"] li, ' +
			'div.comtList li, div.comt_list li, .comtArea li'
		);
		commentEls.forEach(el => {
			const text = el.textContent.trim();
			if (text.length < 3) return;
			// 작성자와 내용 분리 시도
			const parts = text.split(/\n/).map(s => s.trim()).filter(s => s);
			if (parts.length >= 2) {
				comments.push({ author: parts[0], content: parts.slice(1).join(' ').slice(0, 200) });
			} else {
				comments.push({ author: '', content: text.slice(0, 200) });
			}
		});

		// 4. "댓글이 없습니다" 표시 확인
		const noComments = bodyText.includes('댓글이 없습니다');

		return { totalComments, title, comments, noComments };
	});
}

// ── 1개 이벤트만 조사 ───────────────────────────────────
async function scanOneEvent(statusCallback) {
	let state = loadState();
	if (!state.running) return { done: true, reason: 'stopped' };

	const hostRules = await buildHostResolverRules();
	const launchArgs = [];
	if (hostRules) launchArgs.push(`--host-resolver-rules=${hostRules}`);
	const browser = await chromium.launch({ headless: true, args: launchArgs });
	const ctx = await browser.newContext({
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
		locale: 'ko-KR', viewport: { width: 1440, height: 900 },
	});
	const page = await ctx.newPage();

	try {
		// 1. 큐가 비었으면 → 다음 페이지 이벤트 목록 로드
		if (!state.eventQueue || state.eventQueue.length === 0) {
			let pageNo = state.currentPage;

			if (!pageNo) {
				pageNo = await getLastPageNo(page);
				console.log(`[Anomaly] 마지막 페이지: ${pageNo}`);
				if (statusCallback) await statusCallback(`마지막 페이지: ${pageNo}. 스캔 시작...`);
			}

			console.log(`[Anomaly] 페이지 ${pageNo} 이벤트 목록 로드`);
			const events = await getEventLinks(page, pageNo);

			// 이미 조사한 것 제외 + 역순 (맨 아래 글 = 가장 오래된 글부터)
			const filtered = events
				.filter(e => !state.scannedEventIds.includes(e.id))
				.reverse();

			if (filtered.length === 0 && pageNo > 1) {
				// 이 페이지 다 했으면 다음 페이지로
				saveState({ ...state, currentPage: pageNo - 1, eventQueue: [] });
				console.log(`[Anomaly] 페이지 ${pageNo} 완료, 다음: ${pageNo - 1}`);
				if (statusCallback) await statusCallback(`페이지 ${pageNo} 완료. 다음 페이지: ${pageNo - 1}`);
				return { done: false, skipped: true };
			} else if (filtered.length === 0 && pageNo <= 1) {
				saveState({ ...state, running: false, eventQueue: [] });
				console.log(`[Anomaly] 전체 스캔 완료!`);
				if (statusCallback) await statusCallback('전체 스캔 완료!');
				return { done: true, reason: 'complete' };
			}

			state.eventQueue = filtered;
			state.currentPage = pageNo;
			saveState(state);
			console.log(`[Anomaly] 페이지 ${pageNo}: ${filtered.length}개 대기`);
		}

		// 2. 큐에서 1개 꺼내서 조사
		const event = state.eventQueue.shift();
		console.log(`[Anomaly] 조사: #${event.id} "${(event.title || '').slice(0, 50)}"`);
		if (statusCallback) await statusCallback(`조사 중: #${event.id} (남은 큐: ${state.eventQueue.length})`);

		const detail = await scrapeEventDetail(page, event.href);
		const displayTitle = detail.title || event.title || `이벤트 #${event.id}`;

		console.log(`  → 댓글 ${detail.totalComments}건, 수집 ${detail.comments.length}건${detail.noComments ? ' (미로드)' : ''}`);

		// 3. 이상 탐지: 댓글 5000건 이상 AND 최신 댓글 20개가 같은 내용
		let isAnomaly = false;
		let anomalyReason = '';

		if (detail.totalComments >= ANOMALY_COMMENT_MIN && detail.comments.length >= ANOMALY_DUPLICATE_COUNT) {
			// 최신 댓글 20개 검사
			const recent = detail.comments.slice(0, ANOMALY_DUPLICATE_COUNT);
			const contentCounts = {};
			recent.forEach(c => {
				const key = c.content.slice(0, 80).toLowerCase().trim();
				contentCounts[key] = (contentCounts[key] || 0) + 1;
			});

			// 가장 많이 반복된 내용
			const top = Object.entries(contentCounts).sort((a, b) => b[1] - a[1])[0];
			if (top && top[1] >= ANOMALY_DUPLICATE_COUNT) {
				isAnomaly = true;
				anomalyReason = [
					`댓글 **${detail.totalComments}건**`,
					`최신 ${ANOMALY_DUPLICATE_COUNT}개 댓글이 **동일한 내용**:`,
					`> "${top[0].slice(0, 100)}"`,
				].join('\n');
			}
		}

		if (isAnomaly) {
			await sendDiscord(CHANNELS.summary, '', {
				title: `ANOMALY — #${event.id}`,
				description: [
					`**${displayTitle}**`,
					'',
					anomalyReason,
					'',
					`[원문 보기](${event.href})`,
				].join('\n').slice(0, 4000),
				color: 0xFF0000,
				footer: { text: `페이지 ${state.currentPage} | 남은 큐: ${state.eventQueue.length}` },
				timestamp: new Date().toISOString(),
			});
			console.log(`  ⚠ ANOMALY 보고됨`);
		} else {
			console.log(`  ✓ 정상 (${detail.totalComments}건)`);
		}

		// 4. 상태 저장
		state.scannedEventIds.push(event.id);
		// 큐가 비었으면 다음 페이지로
		if (state.eventQueue.length === 0 && state.currentPage > 1) {
			state.currentPage = state.currentPage - 1;
		} else if (state.eventQueue.length === 0 && state.currentPage <= 1) {
			state.running = false;
		}
		saveState({
			...state,
			scannedEventIds: [...new Set(state.scannedEventIds)].slice(-3000),
			lastScan: new Date().toISOString(),
		});

		return { done: !state.running, event: event.id, comments: detail.totalComments };
	} finally {
		await browser.close();
	}
}

// ── 연속 루프 ───────────────────────────────────────────
async function runLoop(statusCallback) {
	const state = loadState();
	if (state.running) {
		if (statusCallback) await statusCallback('이미 스캔이 진행 중입니다.');
		return;
	}

	saveState({ ...state, running: true });

	try {
		while (loadState().running) {
			const result = await scanOneEvent(statusCallback);
			if (result.reason === 'stopped') break;
			if (result.done) {
				// 끝까지 갔으면 처음부터 다시
				await sendDiscord(CHANNELS.summary, '`[Anomaly]` 전체 스캔 완료. 처음부터 다시 시작합니다.');
				if (statusCallback) await statusCallback('전체 스캔 완료. 처음부터 다시 시작.');
				saveState({ ...loadState(), currentPage: null, eventQueue: [], scannedEventIds: [], running: true });
				continue;
			}
			if (result.skipped) continue;
			console.log(`[Anomaly] 다음 조사까지 ${SCAN_INTERVAL_MS / 1000}초 대기...`);
			// 500ms 단위로 running 체크 → /anomaly stop 시 즉시 반응
			for (let i = 0; i < SCAN_INTERVAL_MS / 500; i++) {
				if (!loadState().running) break;
				await new Promise(r => setTimeout(r, 500));
			}
		}
	} catch (err) {
		console.error('[Anomaly] 에러:', err.message);
		if (statusCallback) await statusCallback(`에러: ${err.message}`);
	} finally {
		saveState({ ...loadState(), running: false });
	}
}

// ── Export ───────────────────────────────────────────────
module.exports = { scanOneEvent, runLoop, loadState, saveState };

// ── CLI ─────────────────────────────────────────────────
if (require.main === module) {
	process.on('unhandledRejection', err => console.error('[Error]', err));
	const args = process.argv.slice(2);

	if (args.includes('--once')) {
		saveState({ ...loadState(), running: true });
		scanOneEvent(console.log).then(() => {
			saveState({ ...loadState(), running: false });
			process.exit(0);
		}).catch(err => { console.error(err); process.exit(1); });
	} else if (args.includes('--loop')) {
		runLoop(console.log);
	} else if (args.includes('--reset')) {
		saveState({ currentPage: null, scannedEventIds: [], running: false });
		console.log('상태 초기화 완료');
	} else if (args.includes('--status')) {
		console.log(JSON.stringify(loadState(), null, 2));
	} else {
		console.log('사용법:');
		console.log('  node anomaly.js --once    # 1페이지만');
		console.log('  node anomaly.js --loop    # 5분 간격 연속');
		console.log('  node anomaly.js --reset   # 초기화');
		console.log('  node anomaly.js --status  # 상태');
		console.log('\n봇에서: !anomaly start/stop/status');
	}
}
