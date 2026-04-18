const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────
const WORKER_URL = 'https://sugarbackend.dudgh4141.workers.dev';
const INGEST_KEY = 'e805ae6c8d8d2ba4eb8c005c081658032da35d8ab37a2bb4883c4102db5e0391';
const CRON_STATE_FILE = path.join(__dirname, '.last-crawl');
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';

// ── 디스코드 채널 ID ──────────────────────────────────────
const CHANNELS = {
	complaints: '1484420432714006538',   // 불만글-알림
	hotIssues:  '1484420434815356968',   // 핫이슈
	official:   '1484420437092995213',   // 공식-업데이트
	summary:    '1484420439508914227',   // 커뮤니티-요약
};

// ── 디스코드 메시지 전송 ────────────────────────────────
async function sendToDiscord(channelId, content) {
	if (!BOT_TOKEN) return;
	try {
		await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
			method: 'POST',
			headers: { 'Authorization': `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ content: content.slice(0, 2000) }),
		});
	} catch (err) {
		console.error(`[Discord] 전송 실패:`, err.message);
	}
}

// ── 개별 게시글 상세 정보 추출 (댓글 수, 조회수, 추천) ──
async function fetchPostDetail(page, url) {
	try {
		await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
		await page.waitForTimeout(1500);

		const detail = await page.evaluate(() => {
			const text = document.body.innerText || '';
			const commentMatch = text.match(/댓글[:\s]*(\d+(?:[,\d]*)?)/);
			const viewMatch = text.match(/조회[:\s]*(\d+(?:[,\d]*)?)/);
			const likeMatch = text.match(/추천[:\s]*(\d+(?:[,\d]*)?)/);

			// 본문 일부 추출
			const contentEl = document.querySelector('.thum-txtin, .writing-view-box, .write_div');
			const content = contentEl?.textContent?.trim().slice(0, 300) || '';

			return {
				comments: commentMatch ? parseInt(commentMatch[1].replace(/,/g, '')) : 0,
				views: viewMatch ? parseInt(viewMatch[1].replace(/,/g, '')) : 0,
				likes: likeMatch ? parseInt(likeMatch[1].replace(/,/g, '')) : 0,
				content,
			};
		});
		return detail;
	} catch (err) {
		console.warn(`[Detail] 추출 실패 (${url}): ${err.message}`);
		return { comments: 0, views: 0, likes: 0, content: '' };
	}
}

// ── 배치 AI 필터링 (1회 AI 호출로 전체 필터) ─────────────
async function filterBatch(items) {
	if (items.length === 0) return new Map();

	const titles = items.map(item => ({
		external_id: item.url || '',
		title: item.title,
		author: '',
		url: item.url || '',
		published_at: item.published_at || '',
	}));

	try {
		const res = await fetch(`${WORKER_URL}/api/updates/filter`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INGEST_KEY}` },
			body: JSON.stringify({ titles }),
		});
		const result = await res.json();

		// 결과를 title → {kept, isComplaint} 맵으로 변환
		const keptTitles = new Set((result.posts || []).map(p => p.title));
		const resultMap = new Map();

		for (const item of items) {
			const kept = keptTitles.has(item.title);
			// complaints 수만 알 수 있으므로, Worker 응답의 posts에 포함된 것만 kept
			resultMap.set(item.title, { kept, isComplaint: false });
		}

		// 불만글 여부는 Worker가 이미 디스코드로 보내줌
		console.log(`[Filter] 배치 결과: ${items.length}건 중 ${keptTitles.size}건 통과, ${result.complaints || 0}건 불만글`);
		return resultMap;
	} catch (err) {
		console.warn(`[Filter] AI 배치 실패, 전부 통과 처리: ${err.message}`);
		// 실패 시 전부 통과
		const resultMap = new Map();
		for (const item of items) {
			resultMap.set(item.title, { kept: true, isComplaint: false });
		}
		return resultMap;
	}
}

// ── 개별 게시글 디스코드 전송 (상세 정보 포함) ──────────
async function postToDiscord(item, detail, isComplaint) {
	const { comments, views, likes } = detail;
	const stats = [`💬${comments}`, `👁${views}`, `👍${likes}`].join(' ┃ ');

	let msg = `📝 **${item.title}**\n`;
	msg += `${stats}\n`;
	if (detail.content) msg += `> ${detail.content.slice(0, 100)}${detail.content.length > 100 ? '...' : ''}\n`;
	msg += item.url || '';

	// 채널 선택: 불만글이면 complaints, 아니면 hotIssues
	const channel = isComplaint ? CHANNELS.complaints : CHANNELS.hotIssues;
	await sendToDiscord(channel, msg);
}

// ── 크롤링 결과 요약 보고 ────────────────────────────────
async function reportSummary(stats) {
	const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
	let report = `📊 **크롤링 리포트** (${now})\n`;
	report += `━━━━━━━━━━━━━━━━━━━━\n`;
	report += `넥슨 공식: ${stats.nexon}건\n`;
	report += `디씨 수집: ${stats.dcTotal}건\n`;
	report += `  ├ AI 통과: ${stats.dcKept}건\n`;
	report += `  ├ 불만글: ${stats.dcComplaints}건\n`;
	report += `  └ 제거: ${stats.dcRemoved}건\n`;
	if (stats.shorts > 0) report += `숏츠 신규: ${stats.shorts}건\n`;
	report += `총 게시: ${stats.nexon + stats.dcKept}건`;
	if (stats.dcTotal === 0 && stats.nexon === 0 && !stats.shorts) report += `\n💤 새로운 게시물 없음`;
	await sendToDiscord(CHANNELS.summary, report);
}

// ── 마지막 크롤링 시간 관리 ─────────────────────────────
function getLastCrawlTime() {
	try {
		const ts = fs.readFileSync(CRON_STATE_FILE, 'utf8').trim();
		return new Date(ts);
	} catch {
		// 첫 실행: 8시간 전부터 (오늘 자정이 아닌 최근 8시간)
		return new Date(Date.now() - 8 * 60 * 60 * 1000);
	}
}

function saveLastCrawlTime() {
	fs.writeFileSync(CRON_STATE_FILE, new Date().toISOString());
}

// ── 넥슨 공식 크롤링 (공지사항 + 업데이트만, DOM 직접 추출) ─
async function crawlNexon(page) {
	console.log('[Nexon] 공지사항/업데이트 크롤링...');
	const results = [];
	const lastCrawl = getLastCrawlTime();

	// 공지사항 + 패치노트 2개 섹션만 (자유게시판/커뮤니티 절대 제외)
	const sections = [
		{ url: 'https://sa.nexon.com/news/notice/list.aspx', source: 'nexon_notice', name: '공지사항' },
		{ url: 'https://sa.nexon.com/news/update/list.aspx', source: 'nexon_patch', name: '업데이트' },
	];

	for (const section of sections) {
		try {
			await page.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
			await page.waitForTimeout(3000);

			// 게시글 링크 수집 (ArticleSN 파라미터 포함 링크만)
			const links = await page.evaluate(() => {
				const rows = document.querySelectorAll('table tr, .board_list tr, .list_wrap tr');
				const items = [];
				for (const row of rows) {
					const link = row.querySelector('a[href*="ArticleSN"], a[href*="view.aspx"]');
					if (!link) continue;

					// 제목: 링크 텍스트 그대로
					const title = link.textContent?.trim();
					if (!title || title.length < 2) continue;

					// 날짜: 같은 행에서 날짜 텍스트 찾기
					const cells = row.querySelectorAll('td');
					let dateText = '';
					for (const cell of cells) {
						const text = cell.textContent?.trim() || '';
						if (/\d{4}[.\-]\d{2}[.\-]\d{2}/.test(text)) {
							dateText = text.match(/\d{4}[.\-]\d{2}[.\-]\d{2}/)[0];
							break;
						}
					}

					const href = link.getAttribute('href') || '';
					const absUrl = href.startsWith('http') ? href : `https://sa.nexon.com${href}`;

					items.push({ title, date: dateText, url: absUrl });
				}
				return items;
			});

			// 최근 7일 글 수집 (ON CONFLICT DO NOTHING으로 중복 방지)
			const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			const cutoffDate = cutoff.toISOString().slice(0, 10);
			const newLinks = links.filter(item => {
				if (!item.date) return false;
				const itemDate = new Date(item.date.replace(/\./g, '-'));
				if (isNaN(itemDate.getTime())) return false;
				return itemDate >= new Date(cutoffDate);
			});

			console.log(`[Nexon] ${section.name}: ${newLinks.length}/${links.length}건 (cutoff: ${cutoff.toISOString().slice(0, 10)})`);

			// 각 글 클릭해서 내용 추출 (DOM에서 직접)
			for (const item of newLinks.slice(0, 10)) {
				try {
					await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
					await page.waitForTimeout(2000);

					const currentUrl = page.url();
					// 리스트 페이지로 되돌아갔으면 깨진 링크
					if (currentUrl.includes('list.aspx')) {
						console.warn(`  [SKIP] 깨진 링크: ${item.title}`);
						continue;
					}

					// 제목은 리스트에서 추출한 원본 제목 사용 (DOM 변형 없음)
					// 내용: DOM에서 직접 추출
					const content = await page.evaluate(() => {
						const selectors = [
							'.view_content', '.article_content', '.board_content',
							'.content_area', '#content', '.news_view', '.bbs_content',
						];
						for (const sel of selectors) {
							const el = document.querySelector(sel);
							if (el) return el.textContent?.trim().slice(0, 500) || '';
						}
						// 없으면 메인 텍스트 블록
						const body = document.querySelector('main, article, .container');
						return body?.textContent?.trim().slice(0, 500) || '';
					});

					results.push({
						source: section.source,
						title: item.title,       // AI 없이 원본 제목 그대로
						content: content || '',
						url: currentUrl,
						published_at: item.date || '',
					});
					console.log(`  [OK] ${item.title}`);
				} catch (err) {
					console.error(`  [FAIL] ${item.title}: ${err.message}`);
				}
			}

			console.log(`[Nexon] ${section.name} 완료: ${results.filter(r => r.source === section.source).length}건`);
		} catch (err) {
			console.error(`[Nexon] ${section.name} 실패:`, err.message);
		}
	}

	return results;
}

// ── 디씨인사이드 크롤링 (서든어택 마갤 + Z마갤, 모바일 DOM 직접 추출) ──
async function crawlDCInside(browser) {
	console.log('[DC] 디씨인사이드 서든어택 마갤...');
	const results = [];

	// 모바일 UA로 별도 컨텍스트 (봇 차단 우회)
	const mobileCtx = await browser.newContext({
		userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
		locale: 'ko-KR',
		viewport: { width: 390, height: 844 },
	});
	const page = await mobileCtx.newPage();

	// 서든어택 마갤 + Z마갤 (정갤/인기글/개념글 절대 금지)
	const GALLERIES = [
		{ id: 'sa',  name: '서든갤' },
		{ id: 'saz', name: '서든Z갤' },
	];

	for (const gallery of GALLERIES) {
		let foundOldPost = false;

		for (let pageNum = 1; pageNum <= 3 && !foundOldPost; pageNum++) {
			try {
				const url = `https://m.dcinside.com/board/${gallery.id}?page=${pageNum}`;
				await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
				await page.waitForTimeout(2000);

				// 모바일 DOM: ul.gall-detail-lst > li > div.gall-detail-lnktb > a.lt
				const posts = await page.evaluate((galleryId) => {
					const items = [];
					const wrappers = document.querySelectorAll('ul.gall-detail-lst div.gall-detail-lnktb');

					for (const wrap of wrappers) {
						// 공지글 스킵 (부모 li에 notice 클래스)
						const parentLi = wrap.closest('li');
						if (parentLi?.classList.contains('notice')) continue;

						const link = wrap.querySelector('a.lt');
						if (!link) continue;

						// 제목: .subjectin 텍스트
						const title = link.querySelector('.subjectin')?.textContent?.trim();
						if (!title || title.length < 1) continue;

						// URL에서 글번호 추출
						const href = link.getAttribute('href') || '';
						const numMatch = href.match(/\/(\d+)(?:\?|$)/);
						const num = numMatch?.[1] || '';
						if (!num) continue;

						// 날짜: ginfo ul의 li 중 HH:MM 패턴
						const ginfoLis = link.querySelectorAll('ul.ginfo li');
						let dateText = '';
						for (const li of ginfoLis) {
							const t = li.textContent?.trim();
							if (/^\d{2}:\d{2}$/.test(t)) { dateText = t; break; }
							if (/^\d{2}\.\d{2}$/.test(t) || /^\d{4}[.\-]/.test(t)) { dateText = t; break; }
						}

						items.push({ title, num, date: dateText, href });
					}
					return items;
				}, gallery.id);

				let todayCount = 0;
				for (const item of posts) {
					const isToday = /^\d{2}:\d{2}$/.test(item.date);
					const isDateFormat = /^\d{2}\.\d{2}$/.test(item.date) || /^\d{4}[.\-]/.test(item.date);

					if (isDateFormat) {
						foundOldPost = true;
						continue;
					}
					if (!isToday) continue;

					const fullUrl = item.href.startsWith('http') ? item.href : `https://m.dcinside.com${item.href}`;
					if (!results.find(r => r.url === fullUrl)) {
						results.push({
							source: 'dcinside',
							title: item.title,
							url: fullUrl,
							content: '',
							published_at: item.date,
						});
						todayCount++;
					}
				}

				console.log(`[DC] ${gallery.name} ${pageNum}p: +${todayCount}건 (누적 ${results.length}, 이전날짜: ${foundOldPost})`);
			} catch (err) {
				console.error(`[DC] ${gallery.name} ${pageNum}p 실패:`, err.message);
			}
		}
	}

	await mobileCtx.close();
	console.log(`[DC] 오늘 글 총: ${results.length}건`);
	return results;
}

// ── Worker 포맷으로 변환해서 인제스트 ────────────────────
function toWorkerPost(item, idx) {
	return {
		external_id: item.url || `${item.source}_${Date.now()}_${idx}`,
		title: item.title,
		content: item.content || '',
		author: '',
		url: item.url || '',
		published_at: item.published_at || '',
	};
}

async function ingestToWorker(source, posts) {
	if (posts.length === 0) return 0;
	try {
		const workerPosts = posts.map((p, i) => toWorkerPost(p, i));

		// 디버그: 첫 2건 샘플 + 빈 필드 체크
		const emptyIds = workerPosts.filter(p => !p.external_id).length;
		const emptyTitles = workerPosts.filter(p => !p.title).length;
		if (emptyIds > 0 || emptyTitles > 0) {
			console.warn(`[Ingest] ⚠️ ${source}: 빈 external_id ${emptyIds}건, 빈 title ${emptyTitles}건`);
		}
		console.log(`[Ingest] ${source} 전송: ${workerPosts.length}건 (샘플: ${JSON.stringify(workerPosts.slice(0, 2).map(p => ({ id: p.external_id?.slice(-30), title: p.title?.slice(0, 20) })))})`);

		const res = await fetch(`${WORKER_URL}/api/updates/ingest`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INGEST_KEY}` },
			body: JSON.stringify({ source, posts: workerPosts }),
		});
		const data = await res.json();

		// 디버그: Worker 응답 전체 로깅
		console.log(`[Ingest] ${source} 응답: inserted=${data.inserted}, duplicates=${data.duplicates}, errors=${data.errors}`);
		if (data.errors > 0) {
			console.warn(`[Ingest] ⚠️ ${source}: ${data.errors}건 에러 발생 — Worker 로그 확인 필요`);
		}

		return data.inserted || 0;
	} catch (err) {
		console.error(`[Ingest] ${source} 실패:`, err.message);
		return 0;
	}
}

// ── 파이프라인: 배치 필터 → 통과분만 상세 크롤링 ────────
async function processpipeline(nexonItems, dcItems, browser) {
	const stats = { nexon: 0, dcTotal: dcItems.length, dcKept: 0, dcComplaints: 0, dcRemoved: 0 };

	// ── 넥슨: 바로 저장 + 디코 게시 ──
	if (nexonItems.length > 0) {
		const n = await ingestToWorker('nexon', nexonItems);
		stats.nexon = n;
		console.log(`[Ingest] 넥슨: ${n}/${nexonItems.length}건`);
		for (const item of nexonItems) {
			const tag = item.source === 'nexon_patch' ? '패치' : '공지';
			await sendToDiscord(CHANNELS.official, `📢 **[${tag}]** ${item.title}\n${item.url || ''}`);
		}
	}

	// ── 디씨: 배치 필터 (1회 AI 호출) → 통과분만 상세 처리 ──
	if (dcItems.length > 0) {
		// 1) 전체 제목을 한 번에 AI 필터링 (Workers AI 1회 호출)
		const filterMap = await filterBatch(dcItems);

		const keptItems = dcItems.filter(item => {
			const result = filterMap.get(item.title);
			if (!result || !result.kept) {
				stats.dcRemoved++;
				return false;
			}
			return true;
		});

		console.log(`[Pipeline] AI 필터: ${dcItems.length}건 → ${keptItems.length}건 통과 (${stats.dcRemoved}건 제거)`);

		// 2) 통과한 글만 상세 페이지 방문 + 저장 + 디코 전송
		if (keptItems.length > 0) {
			const detailCtx = await browser.newContext({
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
				locale: 'ko-KR',
				viewport: { width: 390, height: 844 },
			});
			const detailPage = await detailCtx.newPage();

			for (let i = 0; i < keptItems.length; i++) {
				const item = keptItems[i];
				console.log(`[Pipeline] (${i + 1}/${keptItems.length}) "${item.title}"`);

				// 상세 페이지에서 댓글/조회/추천 추출
				const detail = await fetchPostDetail(detailPage, item.url);
				const filterResult = filterMap.get(item.title);
				const isComplaint = filterResult?.isComplaint || false;
				console.log(`  [OK] 💬${detail.comments} 👁${detail.views} 👍${detail.likes}${isComplaint ? ' ⚠불만' : ''}`);

				if (isComplaint) stats.dcComplaints++;

				// 상세 content 보강
				item.content = detail.content || item.content;

				// DB 저장
				await ingestToWorker('dcinside', [item]);

				// 디스코드 게시
				await postToDiscord(item, detail, isComplaint);
				stats.dcKept++;

				// 디씨 레이트리밋 방지
				await new Promise(r => setTimeout(r, 1500));
			}

			await detailCtx.close();
		}
	}

	console.log(`[Pipeline] 완료 — 넥슨: ${stats.nexon}, 디씨: ${stats.dcKept}/${stats.dcTotal} (제거: ${stats.dcRemoved}, 불만: ${stats.dcComplaints})`);
	return stats;
}

// ── 숏츠 크롤링 (yt-dlp) ────────────────────────────────
const { execSync } = require('child_process');

const SHORTS_CHANNELS = [
	{ id: 'UCJ4j-kR_vfgxuOr-rQhgx0g', name: '위폭연구소장' },
	{ id: 'UCd1W-g8G53iTxnSRcpLuS5A', name: '강혜준' },
	{ id: 'UCFxR5xSOr7cSF5hNdcWBxuA', name: '텐시' },
	{ id: 'UCFmNjbm64D1qN_cWbOMMYHQ', name: '샷오바장인' },
	{ id: 'UCBZbRpnxJaRFCfyMnNZt4cg', name: 'victor' },
	{ id: 'UC9v5RS1PZVWuILrGRVxPYCQ', name: 'lafo' },
	{ id: 'UC9A2D9UVZD5vVfxFYCTMXWQ', name: '라포' },
	{ id: 'UCzszFt54IQlI48Qg2_BIkuA', name: 'dotobuild' },
];

// 제목 키워드 → 유형/맵 자동 분류
const TYPE_KEYWORDS = {
	'위폭': ['위폭', '폭탄', '수류탄', 'nade', '그레네이드', '폭딜'],
	'꿀팁': ['꿀팁', '팁', '방법', '하는법', '배워', '알려', '공략', '강좌', '노하우', '비법'],
	'세이브': ['세이브', 'save', '클러치', 'clutch', '역전'],
	'월샷': ['월샷', 'wallshot', '관통', '벽관'],
	'무기리뷰': ['무기', '리뷰', '총기', '스킨', '신무기', '성능'],
	'하이라이트': ['하이라이트', '올킬', '에이스', 'ace', '킬모음', '매드무비', '탑플레이'],
	'랭크전': ['랭크', 'rank', '경쟁전', '솔랭', '구간'],
};
const MAP_KEYWORDS = {
	'프로방스': ['프로방스', 'provence'],
	'데저트': ['데저트', 'desert'],
	'화콜': ['화콜', '화물열차', '화물콜'],
	'삼박자': ['삼박자', '3박자'],
	'이탈리아': ['이탈리아', 'italy'],
	'올드타운': ['올드타운', 'oldtown'],
	'크로스파이어': ['크로스파이어', 'crossfire', '크파'],
	'펠리스': ['펠리스', 'felice'],
	'5보급': ['5보급', '오보급'],
	'시티캣': ['시티캣', 'citycat'],
	'머리': ['머리'],
	'녹위': ['녹위', '녹색위장'],
	'레드': ['레드', 'red'],
	'프로즌시티': ['프로즌시티', '프시', 'frozen'],
	'트리오': ['트리오', 'trio'],
	'마베': ['마베', '마법사의베일'],
};

function classifyShort(title) {
	const t = title.toLowerCase();
	const types = [];
	const maps = [];
	for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
		if (keywords.some(kw => t.includes(kw))) types.push(type);
	}
	for (const [map, keywords] of Object.entries(MAP_KEYWORDS)) {
		if (keywords.some(kw => t.includes(kw))) maps.push(map);
	}
	// 기본 유형이 없으면 '꿀팁' 부여
	if (types.length === 0) types.push('꿀팁');
	return { types, maps };
}

async function crawlShorts() {
	console.log('\n[Shorts] 유튜브 숏츠 크롤링 시작...');
	const allVideos = [];

	for (const channel of SHORTS_CHANNELS) {
		try {
			// yt-dlp로 최근 숏츠 20개 메타데이터만 가져오기 (다운로드 X)
			const cmd = `yt-dlp --flat-playlist --no-download -j --playlist-end 20 "https://www.youtube.com/@${channel.name}/shorts" 2>/dev/null || yt-dlp --flat-playlist --no-download -j --playlist-end 20 "https://www.youtube.com/channel/${channel.id}/shorts" 2>/dev/null`;

			let output = '';
			try {
				output = execSync(cmd, { timeout: 60000, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
			} catch (e) {
				// yt-dlp 부분 실패 시에도 stdout 활용
				output = e.stdout || '';
			}

			if (!output.trim()) {
				console.log(`[Shorts] ${channel.name}: 영상 없음 또는 채널 접근 실패`);
				continue;
			}

			const lines = output.trim().split('\n').filter(l => l.startsWith('{'));
			let count = 0;
			for (const line of lines) {
				try {
					const data = JSON.parse(line);
					const videoId = data.id || data.url;
					if (!videoId || videoId.length !== 11) continue;

					const title = data.title || '서든어택 숏츠';
					const { types, maps } = classifyShort(title);

					allVideos.push({
						video_id: videoId,
						title,
						creator: channel.name,
						channel_id: channel.id,
						types,
						maps,
						thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
						published_at: data.upload_date || '',
					});
					count++;
				} catch {}
			}
			console.log(`[Shorts] ${channel.name}: ${count}건 수집`);
		} catch (err) {
			console.error(`[Shorts] ${channel.name} 실패:`, err.message);
		}
	}

	// Worker로 일괄 인제스트
	if (allVideos.length > 0) {
		try {
			const res = await fetch(`${WORKER_URL}/api/shorts/ingest`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INGEST_KEY}` },
				body: JSON.stringify({ videos: allVideos }),
			});
			const result = await res.json();
			console.log(`[Shorts] 인제스트 완료: 신규 ${result.inserted}건, 중복 ${result.duplicates}건 (총 ${allVideos.length}건)`);

			// 신규가 있으면 디스코드 알림
			if (result.inserted > 0) {
				await sendToDiscord(CHANNELS.summary, `🎬 **새 숏츠 ${result.inserted}건** 추가됨\n${allVideos.filter((_, i) => i < 3).map(v => `  • ${v.creator}: ${v.title}`).join('\n')}${result.inserted > 3 ? `\n  ... 외 ${result.inserted - 3}건` : ''}`);
			}
			return result.inserted;
		} catch (err) {
			console.error(`[Shorts] 인제스트 실패:`, err.message);
			return 0;
		}
	}

	console.log('[Shorts] 수집된 영상 없음');
	return 0;
}

// ── 메인 ────────────────────────────────────────────────
async function runCrawl() {
	const lastCrawl = getLastCrawlTime();
	console.log(`\n${'='.repeat(50)}`);
	console.log(`[Crawl] 시작: ${new Date().toLocaleString('ko-KR')}`);
	console.log(`[Crawl] 이전 크롤링: ${lastCrawl.toLocaleString('ko-KR')}`);
	console.log('='.repeat(50));

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
		locale: 'ko-KR',
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	try {
		const nexonItems = await crawlNexon(page);
		const dcItems = await crawlDCInside(browser);
		console.log(`[Crawl] 총 수집: ${nexonItems.length + dcItems.length}건 (넥슨 ${nexonItems.length}, 디씨 ${dcItems.length})`);

		const stats = await processpipeline(nexonItems, dcItems, browser);

		// 숏츠 크롤링 (yt-dlp, 브라우저 불필요)
		const newShorts = await crawlShorts();
		stats.shorts = newShorts;

		await reportSummary(stats);
		saveLastCrawlTime();
		console.log('[Crawl] 완료!');
	} catch (err) {
		await sendToDiscord(CHANNELS.summary, `❌ **크롤링 실패**\n${err.message}`);
		throw err;
	} finally {
		await browser.close();
	}
}

// ── 실행 ────────────────────────────────────────────────
const args = process.argv.slice(2);

process.on('unhandledRejection', (err) => console.error('[UnhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[UncaughtException]', err));

async function safeCrawl() {
	try { await runCrawl(); }
	catch (err) { console.error('[Crawl] 실패했지만 크론 유지:', err.message); }
}

if (args.includes('--once')) {
	runCrawl().then(() => process.exit(0)).catch(err => {
		console.error('[Fatal]', err);
		process.exit(1);
	});
} else if (args.includes('--cron')) {
	const schedule = require('node-schedule');
	console.log('[Cron] 스케줄: 매일 08:05, 20:05 KST');
	schedule.scheduleJob('5 8 * * *', () => safeCrawl());
	schedule.scheduleJob('5 20 * * *', () => safeCrawl());
	safeCrawl(); // 시작 시 1회
} else {
	console.log('사용법:');
	console.log('  node crawl.js --once   # 1회 크롤링');
	console.log('  node crawl.js --cron   # 스케줄 (08:05/20:05)');
}
