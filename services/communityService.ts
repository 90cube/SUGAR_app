
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
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
        query = query.eq('status', 'HIDDEN');
      }

      const { data, error } = await query;
      
      if (error) {
        // 500 에러 시에도 콘솔에 크게 찍지 않고 조용히 Fallback
        const { data: simpleData } = await supabase.from('posts').select('*').neq('status', 'DELETED').limit(10);
        return (simpleData || []).map(row => this.mapRowToPost(row));
      }

      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch (e) {
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

  async movePostToTemp(id: string) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', id);
      return !error;
    } catch { return false; }
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, votes (vote_type), comments (id)`)
        .eq('author_nickname', nickname)
        .neq('status', 'DELETED');
      if (error) return [];
      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch { return []; }
  }

  async executeGuillotine(nickname: string): Promise<number> {
    return Math.floor(Math.random() * 50) + 10;
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    return [
      { nickname: 'ToxicPro_SA', joinDate: '2024-03-12', postCount: 8, commentCount: 42, guillotineCount: 95 },
      { nickname: 'HackHunter99', joinDate: '2024-05-20', postCount: 2, commentCount: 15, guillotineCount: 78 }
    ];
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    const all = await this.getPosts();
    return all.filter(p => p.halfshots > 0).sort((a, b) => b.halfshots - a.halfshots).slice(0, 10);
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
      return (data || []).map((c: any) => ({
        id: c.id, postId: c.post_id, authorId: c.author_id, authorNickname: c.author_nickname,
        content: c.content, createdAt: c.created_at, teamType: (c.team_type as any) || 'GRAY'
      }));
    } catch { return []; }
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
    return { nickname, joinDate: '2024-01-01', postCount: 0, commentCount: 0, guillotineCount: 0 };
  }
}

export const communityService = new CommunityService();
