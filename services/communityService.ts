
import { CommunityPost, BoardType, CommunityUserProfile } from '../types';

// Local Simulation Log (Admin Inbox)
const adminInbox: string[] = [];

// Mock Vote Storage: { postId: { userId: 'head' | 'half' } }
const MOCK_VOTES: Record<string, Record<string, 'head' | 'half'>> = {};

// Mock Community Users Database
const MOCK_COMMUNITY_USERS: Record<string, CommunityUserProfile> = {
    'SniperKing99': { nickname: 'SniperKing99', joinDate: '2023-01-15', postCount: 12, commentCount: 45, guillotineCount: 2 },
    'RifleMan': { nickname: 'RifleMan', joinDate: '2023-05-20', postCount: 5, commentCount: 120, guillotineCount: 0 },
    'NewbieOne': { nickname: 'NewbieOne', joinDate: '2024-02-10', postCount: 2, commentCount: 8, guillotineCount: 5 }, // High guillotine
    'TrollMaster': { nickname: 'TrollMaster', joinDate: '2022-11-30', postCount: 50, commentCount: 300, guillotineCount: 15 }, // Very high guillotine
    'sugar': { nickname: 'sugar', joinDate: '2020-01-01', postCount: 999, commentCount: 999, guillotineCount: 0 },
    'GM_Sudden': { nickname: 'GM_Sudden', joinDate: '2020-01-01', postCount: 100, commentCount: 50, guillotineCount: 0 },
};

// Dummy Data Store
const MOCK_POSTS: CommunityPost[] = [
  // --- HIDDEN BOARD (Admin Only) ---
  {
      id: 'h-1',
      boardType: 'hidden',
      title: 'Suspected Aimbot Report - User: TrollMaster',
      content: 'Massive reports coming in. Review required.',
      author: 'AutoMod',
      authorRole: 'admin',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      heads: 0,
      halfshots: 0,
      views: 1,
      commentCount: 0,
      status: 'HIDDEN',
      isHidden: true
  },
  {
      id: 'h-2',
      boardType: 'hidden',
      title: 'Server Vulnerability Patch (Confidential)',
      content: 'Do not disclose until patch 1.05 is live.',
      author: 'DevTeam',
      authorRole: 'admin',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      heads: 0,
      halfshots: 0,
      views: 5,
      commentCount: 2,
      status: 'HIDDEN',
      isHidden: true
  },

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
  // ... (Other existing posts omitted for brevity but assumed present)
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
    id: 'f-2',
    boardType: 'fun',
    title: 'When you flash your own team',
    content: 'Detailed analysis of throwing a flashbang into a wall.',
    author: 'TrollMaster',
    authorRole: 'user',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    heads: 45,
    halfshots: 55, // High halfshots
    views: 230,
    commentCount: 5,
    status: 'APPROVED'
  }
];

class CommunityService {
  
  // Simulate Async Fetch
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (boardType === 'hidden') {
            resolve(MOCK_POSTS.filter(p => p.isHidden || p.boardType === 'hidden'));
        } else if (boardType) {
            const filtered = MOCK_POSTS.filter(p => p.boardType === boardType && !p.isHidden);
            resolve(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else {
            resolve(MOCK_POSTS.filter(p => !p.isHidden).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }, 300); 
    });
  }

  // Fetch posts filtered by author
  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
      return new Promise((resolve) => {
          setTimeout(() => {
              const posts = MOCK_POSTS.filter(p => p.author === nickname && !p.isHidden);
              resolve(posts);
          }, 300);
      });
  }

  async getLatestUpdate(): Promise<CommunityPost | null> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const updates = MOCK_POSTS.filter(p => p.boardType === 'update' && !p.isHidden);
            updates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(updates.length > 0 ? updates[0] : null);
        }, 100);
    });
  }

  async getPopularPosts(boardType: BoardType): Promise<CommunityPost[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const candidates = MOCK_POSTS.filter(p => 
            p.boardType === boardType && 
            p.status === 'APPROVED' &&
            !p.isHidden &&
            new Date(p.createdAt) >= sevenDaysAgo
        );

        candidates.sort((a, b) => (b.heads - b.halfshots) - (a.heads - a.halfshots));
        const topCandidates = candidates.slice(0, 5);
        const shuffled = topCandidates.sort(() => 0.5 - Math.random());
        resolve(shuffled.slice(0, 3));
      }, 300);
    });
  }

  // --- Voting Logic (1 Vote Per User) ---

  async getUserVote(postId: string, userId: string): Promise<'head' | 'half' | null> {
    if (!MOCK_VOTES[postId]) return null;
    return MOCK_VOTES[postId][userId] || null;
  }

  async toggleVote(postId: string, userId: string, type: 'head' | 'half'): Promise<{ heads: number; halfshots: number; userVote: 'head' | 'half' | null }> {
      return new Promise((resolve) => {
          setTimeout(() => {
              // Initialize vote storage for this post
              if (!MOCK_VOTES[postId]) MOCK_VOTES[postId] = {};
              
              const currentVote = MOCK_VOTES[postId][userId];
              const postIndex = MOCK_POSTS.findIndex(p => p.id === postId);
              
              if (postIndex === -1) {
                  // Should not happen
                  resolve({ heads: 0, halfshots: 0, userVote: null });
                  return;
              }

              const post = MOCK_POSTS[postIndex];

              if (currentVote === type) {
                  // Toggle OFF (Remove vote)
                  delete MOCK_VOTES[postId][userId];
                  if (type === 'head') post.heads = Math.max(0, post.heads - 1);
                  else post.halfshots = Math.max(0, post.halfshots - 1);
                  
                  resolve({ heads: post.heads, halfshots: post.halfshots, userVote: null });
              } else {
                  // New Vote or Switch Vote
                  if (currentVote) {
                      // Remove previous vote first
                      if (currentVote === 'head') post.heads = Math.max(0, post.heads - 1);
                      else post.halfshots = Math.max(0, post.halfshots - 1);
                  }

                  // Add new vote
                  MOCK_VOTES[postId][userId] = type;
                  if (type === 'head') post.heads += 1;
                  else post.halfshots += 1;

                  resolve({ heads: post.heads, halfshots: post.halfshots, userVote: type });
              }
          }, 200);
      });
  }

  async reportPost(postId: string, userId: string): Promise<boolean> {
      return new Promise((resolve) => {
          setTimeout(() => {
              console.log(`[CommunityService] User ${userId} reported post ${postId} via Guillotine.`);
              // In a real app, create a record in 'hidden' board or increment report count
              resolve(true);
          }, 500);
      });
  }

  // --- User Profile & Guillotine ---

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
      return new Promise((resolve) => {
          setTimeout(() => {
              if (MOCK_COMMUNITY_USERS[nickname]) {
                  resolve(MOCK_COMMUNITY_USERS[nickname]);
              } else {
                  // Create default if not exists
                  const newUser = {
                      nickname,
                      joinDate: new Date().toISOString().split('T')[0],
                      postCount: 0,
                      commentCount: 0,
                      guillotineCount: 0
                  };
                  MOCK_COMMUNITY_USERS[nickname] = newUser;
                  resolve(newUser);
              }
          }, 200);
      });
  }

  async executeGuillotine(nickname: string): Promise<number> {
      return new Promise((resolve) => {
          setTimeout(() => {
              if (MOCK_COMMUNITY_USERS[nickname]) {
                  MOCK_COMMUNITY_USERS[nickname].guillotineCount += 1;
                  resolve(MOCK_COMMUNITY_USERS[nickname].guillotineCount);
              } else {
                  resolve(0);
              }
          }, 400);
      });
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
      return new Promise((resolve) => {
          setTimeout(() => {
              const users = Object.values(MOCK_COMMUNITY_USERS);
              // Sort by Guillotine count desc
              users.sort((a, b) => b.guillotineCount - a.guillotineCount);
              resolve(users.filter(u => u.guillotineCount > 0)); // Only show those with penalties
          }, 300);
      });
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
      return new Promise((resolve) => {
          setTimeout(() => {
              const posts = MOCK_POSTS.filter(p => !p.isHidden && p.halfshots > 0);
              // Sort by Halfshots desc
              posts.sort((a, b) => b.halfshots - a.halfshots);
              resolve(posts.slice(0, 10)); // Top 10
          }, 300);
      });
  }

  // --- Writing ---

  async createPost(post: { title: string; content: string; author: string; boardType: BoardType }): Promise<boolean> {
      return new Promise((resolve) => {
          setTimeout(() => {
              const newPost: CommunityPost = {
                  id: `p-${Date.now()}`,
                  boardType: post.boardType,
                  title: post.title,
                  content: post.content,
                  author: post.author,
                  authorRole: 'user',
                  createdAt: new Date().toISOString(),
                  heads: 0,
                  halfshots: 0,
                  views: 0,
                  commentCount: 0,
                  status: 'APPROVED',
                  isHidden: post.boardType === 'hidden'
              };
              MOCK_POSTS.unshift(newPost);
              
              // Increment user post count
              if (MOCK_COMMUNITY_USERS[post.author]) {
                  MOCK_COMMUNITY_USERS[post.author].postCount += 1;
              }

              resolve(true);
          }, 500);
      });
  }

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
                  thumbnail: 'stream_pending',
                  status: 'PENDING'
              };
              MOCK_POSTS.unshift(newPost);
              resolve(newPost);
          }, 600);
      });
  }
}

export const communityService = new CommunityService();
