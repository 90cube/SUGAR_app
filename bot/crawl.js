const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────
const WORKER_URL = 'https://sugarbackend.dudgh4141.workers.dev';
const INGEST_KEY = 'sugar-ingest-key-2026-secure';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CRON_STATE_FILE = path.join(__dirname, '.last-crawl');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);

// ── 마지막 크롤링 시간 관리 ─────────────────────────────
function getLastCrawlTime() {
	try {
		const ts = fs.readFileSync(CRON_STATE_FILE, 'utf8').trim();
		return new Date(ts);
	} catch {
		// 첫 실행: 오늘 00:00 부터
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}
}

function saveLastCrawlTime() {
	fs.writeFileSync(CRON_STATE_FILE, new Date().toISOString());
}

// ── Worker Gemini 프록시로 스크린샷 분석 ─────────────────
async function analyzeScreenshot(screenshotPath, prompt) {
	const imageBuffer = fs.readFileSync(screenshotPath);
	const base64Image = imageBuffer.toString('base64');

	const res = await fetch(`${WORKER_URL}/gemini/models/gemini-2.5-flash`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{
				parts: [
					{ text: prompt },
					{ inlineData: { mimeType: 'image/png', data: base64Image } },
				],
			}],
			generationConfig: { temperature: 0, maxOutputTokens: 8000 },
		}),
	});

	const data = await res.json();
	return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── JSON 파싱 ───────────────────────────────────────────
function extractJSON(text) {
	const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (codeMatch) try { return JSON.parse(codeMatch[1]); } catch {}
	const arrMatch = text.match(/\[[\s\S]*\]/);
	if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
	const objMatch = text.match(/\{[\s\S]*\}/);
	if (objMatch) try { return JSON.parse(objMatch[0]); } catch {}
	return [];
}

// ── 넥슨 공식 크롤링 (리스트 → 각 글 클릭) ─────────────
async function crawlNexon(page) {
	console.log('[Nexon] 공지사항 크롤링...');
	const results = [];
	const lastCrawl = getLastCrawlTime();
	const lastCrawlStr = lastCrawl.toISOString().slice(0, 10);

	const sections = [
		{ url: 'https://sa.nexon.com/news/notice/list.aspx', source: 'nexon_notice', name: '공지사항' },
		{ url: 'https://sa.nexon.com/news/update/list.aspx', source: 'nexon_patch', name: '업데이트' },
	];

	for (const section of sections) {
		try {
			await page.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
			await page.waitForTimeout(5000);

			// 1. 리스트 스크린샷
			const listSS = path.join(SCREENSHOT_DIR, `${section.source}_list.png`);
			await page.screenshot({ path: listSS, fullPage: false });
			console.log(`[Nexon] ${section.name} 리스트 캡처`);

			// 2. Gemini로 리스트 분석 - 날짜 기준 필터
			const listAnalysis = await analyzeScreenshot(listSS,
				`이 스크린샷은 서든어택 ${section.name} 페이지입니다.
게시물 목록에서 각 게시물의 제목, 날짜, 순서(위에서 몇번째)를 추출하세요.
마지막 확인 시간: ${lastCrawlStr}
이 날짜 이후(포함)의 게시물만 추출하세요.

JSON 배열: [{"title": "제목", "date": "YYYY-MM-DD", "index": 1}]
index는 목록에서 위에서부터의 순번 (1부터 시작).
해당하는 게시물이 없으면 빈 배열 [].
JSON만 출력.`
			);

			const listItems = Array.isArray(extractJSON(listAnalysis)) ? extractJSON(listAnalysis) : [];
			console.log(`[Nexon] ${section.name}: ${listItems.length}건 새 글 발견`);

			// 3. 각 글 클릭해서 내용 스크린샷
			for (const item of listItems) {
				try {
					// 리스트 페이지로 돌아가기
					await page.goto(section.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
					await page.waitForTimeout(3000);

					// 게시물 목록에서 해당 글 클릭 (제목 텍스트로 찾기)
					const titleLink = await page.locator(`a, td, span, div`).filter({ hasText: item.title }).first();

					if (titleLink) {
						await titleLink.click({ timeout: 5000 }).catch(async () => {
							// 제목으로 못 찾으면 순번으로 시도
							const rows = page.locator('table tr, .board-list li, .list-item').nth(item.index || 0);
							const link = rows.locator('a').first();
							if (await link.count() > 0) await link.click();
						});
						await page.waitForTimeout(3000);

						// 상세 페이지 스크린샷
						const detailSS = path.join(SCREENSHOT_DIR, `${section.source}_detail_${item.index}.png`);
						await page.screenshot({ path: detailSS, fullPage: true });

						// Gemini로 내용 분석
						const detailAnalysis = await analyzeScreenshot(detailSS,
							`이 스크린샷은 서든어택 ${section.name} 상세 페이지입니다.
제목, 날짜, 본문 내용을 추출하세요.
본문은 핵심 내용만 요약해서 500자 이내로.

JSON: {"title": "제목", "date": "날짜", "content": "본문 요약"}
JSON만 출력.`
						);

						const detail = extractJSON(detailAnalysis);
						if (detail && detail.title) {
							results.push({
								source: section.source,
								title: detail.title,
								content: detail.content || '',
								url: page.url(),
								published_at: detail.date || item.date,
								visibility: 'public',
							});
							console.log(`  [OK] ${detail.title}`);
						}
					}
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

// ── 디씨인사이드 크롤링 (오늘 날짜만, 여러 페이지) ──────
async function crawlDCInside(page) {
	console.log('[DC] 디씨인사이드 서든갤...');
	const results = [];
	const today = new Date().toISOString().slice(0, 10);
	let foundOldPost = false;

	for (let pageNum = 1; pageNum <= 3 && !foundOldPost; pageNum++) {
		try {
			await page.goto(
				`https://gall.dcinside.com/mgallery/board/lists/?id=suddenattack&page=${pageNum}`,
				{ waitUntil: 'domcontentloaded', timeout: 30000 }
			);
			await page.waitForTimeout(5000);

			// 뷰포트 스크린샷
			const ssPath = path.join(SCREENSHOT_DIR, `dc_p${pageNum}.png`);
			await page.screenshot({ path: ssPath, fullPage: false });
			console.log(`[DC] ${pageNum}페이지 캡처`);

			const analysis = await analyzeScreenshot(ssPath,
				`디시인사이드 서든어택 갤러리 게시판입니다. 오늘: ${today}
- 시간만 표시(예: "14:30")된 글 = 오늘 글
- 날짜 표시(예: "03.19")된 글 = 해당 날짜 글
- 공지/AD 제외

오늘(${today}) 글만 추출.
이전 날짜 글이 보이면 has_old: true.

JSON: {"posts": [{"title": "제목", "date": "시간", "num": "글번호"}], "has_old": false}
JSON만 출력.`
			);

			let parsed;
			try {
				parsed = extractJSON(analysis);
				if (!parsed.posts) parsed = { posts: Array.isArray(parsed) ? parsed : [], has_old: false };
			} catch { parsed = { posts: [], has_old: false }; }

			if (parsed.has_old) foundOldPost = true;

			for (const item of (parsed.posts || [])) {
				if (item.title && !results.find(r => r.title === item.title)) {
					results.push({
						source: 'dcinside', title: item.title,
						url: `https://gall.dcinside.com/mgallery/board/view/?id=suddenattack&no=${item.num || ''}`,
						content: '', published_at: item.date || today,
					});
				}
			}

			console.log(`[DC] ${pageNum}p: +${(parsed.posts || []).length}건 (누적 ${results.length}, 이전날짜: ${foundOldPost})`);

			// 스크롤해서 추가 캡처
			await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
			await page.waitForTimeout(1000);
			const ss2 = path.join(SCREENSHOT_DIR, `dc_p${pageNum}_scroll.png`);
			await page.screenshot({ path: ss2, fullPage: false });

			const analysis2 = await analyzeScreenshot(ss2,
				`디시인사이드 서든어택 갤러리 (스크롤 아래). 오늘: ${today}
오늘 글만 추출. 시간만 표시 = 오늘.
JSON: {"posts": [{"title": "제목", "date": "시간", "num": "글번호"}], "has_old": false}
JSON만 출력.`
			);

			let parsed2;
			try {
				parsed2 = extractJSON(analysis2);
				if (!parsed2.posts) parsed2 = { posts: Array.isArray(parsed2) ? parsed2 : [], has_old: false };
			} catch { parsed2 = { posts: [], has_old: false }; }

			if (parsed2.has_old) foundOldPost = true;
			for (const item of (parsed2.posts || [])) {
				if (item.title && !results.find(r => r.title === item.title)) {
					results.push({
						source: 'dcinside', title: item.title,
						url: `https://gall.dcinside.com/mgallery/board/view/?id=suddenattack&no=${item.num || ''}`,
						content: '', published_at: item.date || today,
					});
				}
			}
		} catch (err) {
			console.error(`[DC] ${pageNum}p 실패:`, err.message);
		}
	}

	console.log(`[DC] 오늘 글 총: ${results.length}건`);
	return results;
}

// ── Worker 포맷으로 변환해서 인제스트 ────────────────────
function toWorkerPost(item, idx) {
	return {
		external_id: item.url || `${item.source}_${Date.now()}_${idx}`,
		title: item.title,
		content: item.content || item.title,
		author: '',
		url: item.url || '',
		published_at: item.published_at || '',
	};
}

async function ingestToWorker(source, posts) {
	if (posts.length === 0) return 0;
	try {
		const res = await fetch(`${WORKER_URL}/api/updates/ingest`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INGEST_KEY}` },
			body: JSON.stringify({
				source,  // "nexon" or "dcinside"
				posts: posts.map((p, i) => toWorkerPost(p, i)),
			}),
		});
		const data = await res.json();
		return data.inserted || 0;
	} catch (err) {
		console.error(`[Ingest] ${source} 실패:`, err.message);
		return 0;
	}
}

async function filterAndIngest(items) {
	if (items.length === 0) return;

	const nexonItems = items.filter(i => i.source.startsWith('nexon'));
	const dcItems = items.filter(i => i.source === 'dcinside');

	// 넥슨: 바로 저장
	if (nexonItems.length > 0) {
		const n = await ingestToWorker('nexon', nexonItems);
		console.log(`[Ingest] 넥슨: ${n}/${nexonItems.length}건`);
	}

	// 디씨: AI 필터 후 저장
	if (dcItems.length > 0) {
		try {
			const res = await fetch(`${WORKER_URL}/api/updates/filter`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INGEST_KEY}` },
				body: JSON.stringify({ titles: dcItems.map(i => ({ title: i.title, source: i.source })) }),
			});
			const filtered = await res.json();

			const approved = dcItems.filter(i => (filtered.approved || []).includes(i.title));
			const complaints = dcItems.filter(i => (filtered.complaints || []).includes(i.title));
			const rest = dcItems.filter(i =>
				!(filtered.approved || []).includes(i.title) &&
				!(filtered.complaints || []).includes(i.title) &&
				!(filtered.filtered || []).includes(i.title)
			);

			// 필터 결과가 비어있으면 전부 통과시킴
			const toIngest = approved.length > 0 ? approved : [...approved, ...rest];
			if (toIngest.length > 0) {
				const n = await ingestToWorker('dcinside', toIngest);
				console.log(`[Ingest] 디씨 통과: ${n}/${toIngest.length}건`);
			}
			if (complaints.length > 0) {
				// 불만글은 별도로 저장 (TODO: visibility 처리는 Worker 쪽에서)
				const n = await ingestToWorker('dcinside', complaints);
				console.log(`[Ingest] 디씨 불만: ${n}/${complaints.length}건`);
			}

			console.log(`[Filter] 총 ${dcItems.length} → 통과: ${approved.length}, 불만: ${complaints.length}, 제거: ${(filtered.filtered || []).length}`);
		} catch (err) {
			console.error('[Filter] 실패, 전부 저장:', err.message);
			const n = await ingestToWorker('dcinside', dcItems);
			console.log(`[Ingest] 디씨 (필터없이): ${n}/${dcItems.length}건`);
		}
	}
}

// ── 메인 ────────────────────────────────────────────────
async function runCrawl() {
	const lastCrawl = getLastCrawlTime();
	console.log(`\n${'='.repeat(50)}`);
	console.log(`[Crawl] 시작: ${new Date().toLocaleString('ko-KR')}`);
	console.log(`[Crawl] 이전 크롤링: ${lastCrawl.toLocaleString('ko-KR')}`);
	console.log('='.repeat(50));

	const browser = await chromium.launch({ headless: false });
	const context = await browser.newContext({
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
		locale: 'ko-KR',
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	try {
		const nexonItems = await crawlNexon(page);
		const dcItems = await crawlDCInside(page);
		const allItems = [...nexonItems, ...dcItems];
		console.log(`[Crawl] 총 수집: ${allItems.length}건`);

		if (allItems.length > 0) await filterAndIngest(allItems);

		saveLastCrawlTime();
		console.log('[Crawl] 완료! 크롤링 시간 저장됨');
	} finally {
		await browser.close();
	}
}

// ── 실행 ────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--once')) {
	runCrawl().then(() => process.exit(0)).catch(err => {
		console.error('[Fatal]', err);
		process.exit(1);
	});
} else if (args.includes('--cron')) {
	const schedule = require('node-schedule');
	console.log('[Cron] 스케줄: 매일 08:05, 20:05 KST');
	schedule.scheduleJob('5 8 * * *', () => runCrawl());
	schedule.scheduleJob('5 20 * * *', () => runCrawl());
	runCrawl(); // 시작 시 1회
} else {
	console.log('사용법:');
	console.log('  node crawl.js --once   # 1회 크롤링');
	console.log('  node crawl.js --cron   # 스케줄 (08:05/20:05)');
}
