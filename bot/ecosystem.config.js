const fs = require('fs');
const path = require('path');

// .env 파일을 읽어서 환경변수 객체로 변환
function loadEnv() {
	const envPath = path.join(__dirname, '..', '.env');
	if (!fs.existsSync(envPath)) return {};
	const env = {};
	fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
		line = line.trim();
		if (!line || line.startsWith('#')) return;
		const idx = line.indexOf('=');
		if (idx === -1) return;
		env[line.slice(0, idx)] = line.slice(idx + 1);
	});
	return env;
}

const dotenv = loadEnv();

module.exports = {
	apps: [
		{
			name: 'sugar-bot',
			script: 'index.js',
			cwd: __dirname,
			autorestart: true,
			max_restarts: 10,
			restart_delay: 5000,
			log_file: '../logs/bot.log',
			error_file: '../logs/bot-error.log',
			out_file: '../logs/bot.log',
			merge_logs: true,
			env: dotenv,
		},
		{
			name: 'sugar-crawl',
			script: 'crawl.js',
			args: '--cron',
			cwd: __dirname,
			autorestart: true,
			max_restarts: 10,
			restart_delay: 10000,
			log_file: '../logs/crawl.log',
			error_file: '../logs/crawl-error.log',
			out_file: '../logs/crawl.log',
			merge_logs: true,
			env: dotenv,
		},
	],
};
