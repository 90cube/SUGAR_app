
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  async getPosts(boardType?: BoardType, currentUserId?: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      let query = supabase
        .from('posts')
        .select(`*, votes (vote_type), comments (id)`)
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false });

      if (boardType === 'TEMP') {
        query = query.eq('board_type', 'TEMP');
        if (currentUserId && !await this.checkIsAdmin(currentUserId)) {
          query = query.eq('author_id', currentUserId);
        }
      } else if (boardType && boardType !== 'hidden') {
        query = query.eq('board_type', boardType);
      } else if (boardType === 'hidden') {
        query = query.eq('status', 'HIDDEN');
      }

      const { data, error } = await query;
      if (error) return [];
      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch (e) {
      return [];
    }
  }

  private async checkIsAdmin(userId: string): Promise<boolean> {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin';
  }

  private mapRowToPost(row: any): CommunityPost {
    const votes = row.votes || [];
    const comments = row.comments || [];
    
    return {
      id: row.id,
      boardType: row.board_type as BoardType,
      title: row.title || (row.board_type === 'balance' ? `${row.blue_option} vs ${row.red_option}` : 'Untitled'),
      content: row.content || row.extra_content || '',
      author: row.author_nickname || 'Unknown',
      authorRole: 'user', 
      createdAt: row.created_at,
      heads: votes.filter((v: any) => v.vote_type === 'HEAD').length,
      halfshots: votes.filter((v: any) => v.vote_type === 'HALF').length,
      blueVotes: row.blue_votes || 0,
      redVotes: row.red_votes || 0,
      views: row.views || 0,
      commentCount: comments.length,
      status: row.status,
      thumbnail: row.thumbnail,
      isHidden: row.status === 'HIDDEN',
      blueOption: row.blue_option,
      redOption: row.red_option
    };
  }

  async createPost(post: any) {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const payload: any = {
      author_id: user.id,
      author_nickname: post.author,
      board_type: post.boardType,
      status: 'APPROVED',
      thumbnail: post.thumbnail
    };

    if (post.boardType === 'balance') {
      payload.blue_option = post.blueOption;
      payload.red_option = post.redOption;
      payload.extra_content = post.content;
      payload.title = `${post.blueOption} vs ${post.redOption}`;
    } else {
      payload.title = post.title;
      payload.content = post.content;
    }

    const { error } = await supabase.from('posts').insert(payload);
    return !error;
  }

  async votePost(postId: string, voteType: 'HEAD' | 'HALF') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check existing vote
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('author_id', user.id)
      .maybeSingle();

    if (existing) return false;

    const { error } = await supabase.from('votes').insert({
      post_id: postId,
      author_id: user.id,
      vote_type: voteType
    });
    return !error;
  }

  async addComment(postId: string, content: string, teamType: 'BLUE' | 'RED' | 'GRAY' = 'GRAY') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || user.email?.split('@')[0] || 'Unknown';

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id,
      author_nickname: nickname,
      content: content,
      team_type: teamType
    });
    return !error;
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    try {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      return (data || []).map((c: any) => ({
        id: c.id, 
        postId: c.post_id, 
        authorId: c.author_id, 
        authorNickname: c.author_nickname,
        content: c.content, 
        createdAt: c.created_at, 
        teamType: (c.team_type as any) || 'GRAY'
      }));
    } catch { return []; }
  }

  async movePostToTemp(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', postId);
    return !error;
  }

  async deletePost(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ status: 'DELETED' }).eq('id', postId);
    return !error;
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes (vote_type), comments (id)`).eq('author_nickname', nickname).neq('status', 'DELETED');
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
    return { nickname, joinDate: '2024-01-01', postCount: 0, commentCount: 0, guillotineCount: 0 };
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
}

export const communityService = new CommunityService();
