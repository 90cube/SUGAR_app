import { Env } from '../index';

const DISCORD_API = 'https://discord.com/api/v10';

interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

interface DiscordEmbed {
	title?: string;
	description?: string;
	color?: number;
	fields?: EmbedField[];
	footer?: { text: string };
	timestamp?: string;
}

export async function sendDiscordMessage(
	env: Env,
	channelId: string,
	content: string,
	embeds?: DiscordEmbed[],
): Promise<boolean> {
	try {
		const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
			method: 'POST',
			headers: {
				'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
				'Content-Type': 'application/json',
				'User-Agent': 'DiscordBot (https://suddenlab.app, 1.0)',
			},
			body: JSON.stringify({
				content,
				embeds: embeds || [],
			}),
		});
		return response.ok;
	} catch (e: any) {
		console.error('[Discord] Send error:', e.message);
		return false;
	}
}

// 불만글 알림 전송
export async function sendComplaintAlert(env: Env, post: {
	title: string;
	author?: string;
	url?: string;
	published_at?: string;
	reason?: string;
}): Promise<boolean> {
	const channelId = env.DISCORD_CH_COMPLAINTS;
	if (!channelId) return false;

	const embed: DiscordEmbed = {
		title: `🚨 ${post.title}`,
		color: 0xFF4444,
		fields: [],
		footer: { text: '서든랩 불만 감지 시스템' },
		timestamp: new Date().toISOString(),
	};

	if (post.author) embed.fields!.push({ name: '작성자', value: post.author, inline: true });
	if (post.published_at) embed.fields!.push({ name: '작성일', value: post.published_at, inline: true });
	if (post.reason) embed.fields!.push({ name: '감지 사유', value: post.reason });
	if (post.url) embed.fields!.push({ name: '원문', value: post.url });

	return sendDiscordMessage(env, channelId, '', [embed]);
}

// 핫이슈 알림
export async function sendHotIssueAlert(env: Env, posts: { title: string; url?: string }[]): Promise<boolean> {
	const channelId = env.DISCORD_CH_HOT_ISSUES;
	if (!channelId || posts.length === 0) return false;

	const lines = posts.map((p, i) => `**${i + 1}.** ${p.title}${p.url ? ` ([링크](${p.url}))` : ''}`).join('\n');

	const embed: DiscordEmbed = {
		title: `🔥 오늘의 핫이슈 (${posts.length}건)`,
		description: lines.slice(0, 4000),
		color: 0xFF8800,
		footer: { text: '서든랩 커뮤니티 모니터링' },
		timestamp: new Date().toISOString(),
	};

	return sendDiscordMessage(env, channelId, '', [embed]);
}

// 공식 업데이트 알림
export async function sendOfficialUpdate(env: Env, post: {
	title: string;
	summary?: string;
	url?: string;
}): Promise<boolean> {
	const channelId = env.DISCORD_CH_OFFICIAL;
	if (!channelId) return false;

	const embed: DiscordEmbed = {
		title: `📢 ${post.title}`,
		description: post.summary || '',
		color: 0x00AAFF,
		footer: { text: 'NEXON 공식' },
		timestamp: new Date().toISOString(),
	};

	if (post.url) embed.fields = [{ name: '원문', value: post.url }];

	return sendDiscordMessage(env, channelId, '', [embed]);
}
