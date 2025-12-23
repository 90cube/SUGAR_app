
import { CommunityPost, BoardType } from '../types';

// Local Simulation Log (Admin Inbox)
const adminInbox: string[] = [];

// Dummy Data Store
const MOCK_POSTS: CommunityPost[] = [
  // --- UPDATES (Admin Only) ---
  {
    id: 'u-1',
    boardType: 'update',
    title: '2024 Season 4: Grand Open & Patch Notes',
    content: `
      <p>Greetings, Sudden Attackers.</p>
      <p>Season 4 has officially begun! Here are the key highlights:</p>
      <br/>
      <ul>
        <li>New Map: <strong>Factory</strong> added to ranked rotation.</li>
        <li>Weapon Balance: <strong>NA-94</strong> damage slightly reduced (-1).</li>
        <li>Ranked Rewards: specialized 'Noble' skins for Master tier and above.</li>
      </ul>
      <br/>
      <p>Good luck in your placement matches!</p>
    `,
    author: 'GM_Sudden',
    authorRole: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    heads: 1240,
    halfshots: 23,
    views: 15400,
    commentCount: 45,
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600&h=338',
    status: 'APPROVED'
  },
  {
    id: 'u-2',
    boardType: 'update',
    title: 'Emergency Maintenance Notice (10/25)',
    content: 'We will be performing emergency server maintenance to fix login issues related to the recent auth server patch. Expected downtime: 2 hours.',
    author: 'GM_Breeze',
    authorRole: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    heads: 50,
    halfshots: 500,
    views: 8900,
    commentCount: 120,
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600&h=338',
    status: 'APPROVED'
  },
  {
    id: 'u-3',
    boardType: 'update',
    title: 'Fair Play Campaign: October Ban Wave',
    content: 'We have permanently banned 1,204 accounts for using unauthorized third-party programs. Fair play is our top priority.',
    author: 'GM_Police',
    authorRole: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    heads: 5000,
    halfshots: 12,
    views: 32000,
    commentCount: 800,
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=600&h=338',
    status: 'APPROVED'
  },

  // --- BALANCE (User) ---
  {
    id: 'b-1',
    boardType: 'balance',
    title: 'Is the TRG-21 still meta after the nerf?',
    content: 'With the recent buff to the NA-94, I feel like the sniper meta is shifting slightly. The swap speed feels slower.',
    author: 'SniperKing99',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    heads: 15,
    halfshots: 2,
    views: 120,
    commentCount: 8,
    status: 'APPROVED'
  },
  {
    id: 'b-2',
    boardType: 'balance',
    title: 'AK-47 recoil pattern needs a rework',
    content: 'It is too random compared to the SIG. Please fix.',
    author: 'RifleMan',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    heads: 5,
    halfshots: 12,
    views: 85,
    commentCount: 14,
    status: 'APPROVED'
  },
  {
    id: 'b-3',
    boardType: 'balance',
    title: 'Why Magnum is banned in clan wars?',
    content: 'I strictly believe Magnum requires skill.',
    author: 'NewbieOne',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    heads: 2,
    halfshots: 45,
    views: 300,
    commentCount: 52,
    status: 'APPROVED'
  },
  {
    id: 'b-4',
    boardType: 'balance',
    title: 'M4A1 needs a damage buff immediately',
    content: 'It loses to almost every SMG in close range now.',
    author: 'M4Lover',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    heads: 150,
    halfshots: 10,
    views: 1200,
    commentCount: 30,
    status: 'APPROVED'
  },
  {
    id: 'b-5',
    boardType: 'balance',
    title: 'Unpopular Opinion: Flashbangs are balanced',
    content: 'You just need to turn away faster.',
    author: 'FlashUser',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    heads: 10,
    halfshots: 200,
    views: 2000,
    commentCount: 100,
    status: 'APPROVED'
  },

  // --- FUN (Keuk - Humor) ---
  {
    id: 'f-1',
    boardType: 'fun',
    title: 'My aim today vs yesterday (Meme)',
    content: 'Why does my hand shake only when I see an enemy?',
    author: 'PotatoAim',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    heads: 88,
    halfshots: 0,
    views: 500,
    commentCount: 12,
    thumbnail: 'placeholder_meme',
    status: 'APPROVED'
  },
  {
    id: 'f-2',
    boardType: 'fun',
    title: 'When you flash your own team',
    content: 'Detailed analysis of throwing a flashbang into a wall.',
    author: 'TrollMaster',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    heads: 45,
    halfshots: 1,
    views: 230,
    commentCount: 5,
    status: 'APPROVED'
  },
  {
    id: 'f-3',
    boardType: 'fun',
    title: 'Legendary Ninja Defuse (Video)',
    content: 'They never saw me coming.',
    author: 'NinjaTurtle',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    heads: 500,
    halfshots: 2,
    views: 5000,
    commentCount: 40,
    status: 'APPROVED'
  },
  {
    id: 'f-4',
    boardType: 'fun',
    title: 'My character glitching through the floor',
    content: 'New tactical advantage?',
    author: 'BugFinder',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
    heads: 200,
    halfshots: 5,
    views: 1500,
    commentCount: 20,
    status: 'APPROVED'
  },

  // --- STREAM (User - Registration) ---
  {
    id: 's-1',
    boardType: 'stream',
    title: 'Ranked Match Climb to Grand Master! 🔴 LIVE',
    content: 'Join the stream for high level sniper gameplay.',
    author: 'ProGamer_X',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), 
    heads: 120,
    halfshots: 5,
    views: 1200,
    commentCount: 0,
    thumbnail: 'stream_1',
    status: 'APPROVED'
  },
  {
    id: 's-2',
    boardType: 'stream',
    title: 'Clan War Scrims - 5v5',
    content: 'Blue Team vs Red Team competitive match.',
    author: 'ClanLeader',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), 
    heads: 30,
    halfshots: 0,
    views: 450,
    commentCount: 0,
    thumbnail: 'stream_2',
    status: 'APPROVED'
  }
];

class CommunityService {
  
  // Simulate Async Fetch
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (boardType) {
            const filtered = MOCK_POSTS.filter(p => p.boardType === boardType);
            resolve(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
            resolve(MOCK_POSTS.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }, 300); // Simulate network latency
    });
  }

  async getLatestUpdate(): Promise<CommunityPost | null> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const updates = MOCK_POSTS.filter(p => p.boardType === 'update');
            // Sort by date desc
            updates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(updates.length > 0 ? updates[0] : null);
        }, 100);
    });
  }

  // Calculate top posts from last 7 days based on (heads - halfshots)
  async getPopularPosts(boardType: BoardType): Promise<CommunityPost[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const candidates = MOCK_POSTS.filter(p => 
            p.boardType === boardType && 
            p.status === 'APPROVED' && // Only approved posts can be popular
            new Date(p.createdAt) >= sevenDaysAgo
        );

        // Sort by score (heads - halfshots) descending
        candidates.sort((a, b) => (b.heads - b.halfshots) - (a.heads - a.halfshots));

        // Take top 5 candidates to randomize from (to give variety)
        const topCandidates = candidates.slice(0, 5);

        // Shuffle and pick 3
        const shuffled = topCandidates.sort(() => 0.5 - Math.random());
        resolve(shuffled.slice(0, 3));
      }, 300);
    });
  }

  // Submit a Stream Registration Request
  async requestStreamPost(postData: { title: string, content: string, author: string }): Promise<CommunityPost> {
      return new Promise((resolve) => {
          setTimeout(() => {
              const newPost: CommunityPost = {
                  id: `s-${Date.now()}`,
                  boardType: 'stream',
                  title: postData.title,
                  content: postData.content,
                  author: postData.author,
                  authorRole: 'user',
                  createdAt: new Date().toISOString(),
                  heads: 0,
                  halfshots: 0,
                  views: 0,
                  commentCount: 0,
                  thumbnail: 'stream_pending', // Placeholder logic
                  status: 'PENDING'
              };

              // Add to DB
              MOCK_POSTS.unshift(newPost);

              // Log to Admin Inbox (Simulated Server Logic)
              const logMsg = `[Stream Request] User '${newPost.author}' requested stream: "${newPost.title}" at ${newPost.createdAt}`;
              adminInbox.push(logMsg);
              console.log("SERVER LOG:", logMsg);

              resolve(newPost);
          }, 600);
      });
  }

  // Simulate Voting
  async vote(postId: string, type: 'head' | 'half'): Promise<{ success: boolean, newCount: number }> {
    // In a real app, this would hit API. Here we just mock it.
    const post = MOCK_POSTS.find(p => p.id === postId);
    if (post) {
        if (type === 'head') post.heads++;
        else post.halfshots++;
        return { success: true, newCount: type === 'head' ? post.heads : post.halfshots };
    }
    return { success: false, newCount: 0 };
  }
}

export const communityService = new CommunityService();
