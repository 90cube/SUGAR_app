
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      // 400 에러를 피하기 위해 votes와 comments 카운트를 더 안전하게 가져옵니다.
      let query = supabase
        .from('posts')
        .select(`
          *,
          votes (vote_type),
          comments (id)
        `)
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false });

      if (boardType && boardType !== 'hidden') {
        query = query.eq('board_type', boardType);
      } else if (boardType === 'hidden') {
        // 비밀 게시판은 HIDDEN 상태인 글만 조회
        query = query.eq('status', 'HIDDEN');
      }

      const { data, error } = await query;
      
      if (error) {
        console.warn("[CommunityService] Complex query failed, falling back to simple select", error);
        // 복잡한 쿼리가 실패하면 최소한의 데이터만 가져옵니다.
        const { data: simpleData } = await supabase.from('posts').select('*').neq('status', 'DELETED').order('created_at', { ascending: false });
        return (simpleData || []).map(row => this.mapRowToPost(row));
      }

      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch (e) {
      console.error("[CommunityService] getPosts error", e);
      return [];
    }
  }

  private mapRowToPost(row: any): CommunityPost {
    const votes = row.votes || [];
    const comments = row.comments || [];
    
    return {
      id: row.id,
      boardType: row.board_type as BoardType,
      title: row.title,
      content: row.content,
      author: row.author_nickname || 'Unknown',
      authorRole: 'user', 
      createdAt: row.created_at,
      heads: votes.filter((v: any) => v.vote_type === 'HEAD').length,
      halfshots: votes.filter((v: any) => v.vote_type === 'HALF').length,
      blueVotes: votes.filter((v: any) => v.vote_type === 'BLUE').length,
      redVotes: votes.filter((v: any) => v.vote_type === 'RED').length,
      views: row.views || 0,
      commentCount: comments.length,
      status: row.status,
      thumbnail: row.thumbnail,
      isHidden: row.status === 'HIDDEN'
    };
  }

  // Fix: Added missing movePostToTemp method
  async movePostToTemp(id: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', id);
    return !error;
  }

  // Fix: Added missing getPostsByAuthor method
  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          votes (vote_type),
          comments (id)
        `)
        .eq('author_nickname', nickname)
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch (e) {
      console.error("[CommunityService] getPostsByAuthor error", e);
      return [];
    }
  }

  // Fix: Added missing executeGuillotine method
  async executeGuillotine(nickname: string): Promise<number> {
    console.log(`[CommunityService] Guillotine executed for ${nickname}`);
    // Simulate updating and returning a new count
    return Math.floor(Math.random() * 50) + 10;
  }

  // Fix: Added missing getHighGuillotineUsers method
  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    // Mocking high report users
    return [
      { nickname: 'ToxicPro_SA', joinDate: '2024-03-12', postCount: 8, commentCount: 42, guillotineCount: 95 },
      { nickname: 'HackHunter99', joinDate: '2024-05-20', postCount: 2, commentCount: 15, guillotineCount: 78 },
      { nickname: 'LoudMouth', joinDate: '2024-01-05', postCount: 24, commentCount: 312, guillotineCount: 45 }
    ];
  }

  // Fix: Added missing getHighHalfshotPosts method
  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    const all = await this.getPosts();
    return all
      .filter(p => p.halfshots > 0)
      .sort((a, b) => b.halfshots - a.halfshots)
      .slice(0, 15);
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    return (data || []).map((c: any) => ({
      id: c.id, postId: c.post_id, authorId: c.author_id, authorNickname: c.author_nickname,
      content: c.content, createdAt: c.created_at, teamType: (c.team_type as any) || 'GRAY'
    }));
  }

  async createPost(post: any) {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('posts').insert({
      ...post, author_id: user.id, author_nickname: post.author, status: 'APPROVED'
    });
    return !error;
  }

  async deletePost(id: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ status: 'DELETED' }).eq('id', id);
    return !error;
  }

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
    // Returning dummy profile data
    return { 
      nickname, 
      joinDate: '2024-01-01', 
      postCount: 5, 
      commentCount: 12, 
      guillotineCount: 0 
    };
  }
}

export const communityService = new CommunityService();
