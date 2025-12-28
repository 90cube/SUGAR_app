
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment, StreamingRequest } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  private mapPostRow(row: any): CommunityPost {
    return {
      id: row.id,
      boardType: (row.board_type || '').toLowerCase() as BoardType,
      title: row.title || 'Untitled',
      content: row.content || '',
      author: row.author_nickname || 'Unknown',
      authorId: row.author_id,
      authorRole: 'user',
      createdAt: row.created_at,
      heads: 0, 
      halfshots: row.halfshots || 0,
      blueVotes: row.blue_votes || 0,
      redVotes: row.red_votes || 0,
      views: row.views || 0,
      commentCount: 0,
      status: row.status || 'APPROVED',
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url,
      blueOption: row.blue_option,
      redOption: row.red_option
    };
  }

  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      // [1] 방송 게시글 (streaming_posts 테이블 연동)
      if (boardType === 'stream') {
          const { data, error } = await supabase
            .from('streaming_posts')
            .select(`*`)
            .eq('status', 'VISIBLE')
            .order('created_at', { ascending: false });
          
          if (error) return [];

          return (data || []).map((row: any) => ({
              id: row.id,
              boardType: 'stream',
              title: row.description || 'LIVE_STREAM',
              content: row.description || '',
              author: 'Streamer',
              authorId: row.streamer_id,
              authorRole: 'user',
              createdAt: row.created_at,
              heads: 0,
              halfshots: 0,
              blueVotes: 0,
              redVotes: 0,
              views: 0,
              commentCount: 0,
              status: 'APPROVED',
              thumbnailUrl: row.thumbnail_url,
              streamUrl: row.stream_url,
              platform: row.platform
          }));
      }

      // [2] 일반 게시글 (posts 테이블 연동)
      let query = supabase
        .from('posts')
        .select('*')
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false });

      if (boardType) {
        // DB 스키마에 맞춰 대문자로 조회
        query = query.eq('board_type', boardType.toUpperCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(row => this.mapPostRow(row));
    } catch (e) {
      console.error("[CommunityService] Fetch Error:", e);
      return [];
    }
  }

  async createPost(post: { boardType: string, title: string, content: string }): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // profiles 테이블에서 닉네임 조회
    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();

    const { error } = await supabase.from('posts').insert({
      board_type: post.boardType.toUpperCase(),
      title: post.title,
      content: post.content,
      author_id: user.id,
      author_nickname: profile?.nickname || 'Unknown Subject',
      status: 'APPROVED'
    });

    if (error) throw error;
    return true;
  }

  async getCommunityUserProfile(nickname: string, authorId?: string): Promise<CommunityUserProfile> {
    if (!supabase) return { nickname, joinDate: '-', postCount: 0, commentCount: 0, guillotineCount: 0 };
    const queryId = authorId ? { id: authorId } : { nickname };
    const { data: prof } = await supabase.from('profiles').select('*').match(queryId).maybeSingle();
    
    return { 
      nickname: prof?.nickname || nickname, 
      joinDate: prof?.joined_at ? prof.joined_at.split('T')[0] : '-', 
      postCount: prof?.post_count || 0, 
      commentCount: prof?.comment_count || 0, 
      guillotineCount: prof?.guillotine_count || 0 
    };
  }

  async getPostsByAuthorId(authorId: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => this.mapPostRow(row));
  }

  // Add getPostsByAuthor to handle nickname-based queries
  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_nickname', nickname)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => this.mapPostRow(row));
  }

  async executeGuillotine(nickname: string): Promise<number> {
    if (!supabase) return 0;
    const { data: prof } = await supabase.from('profiles').select('guillotine_count').eq('nickname', nickname).single();
    const nextCount = (prof?.guillotine_count || 0) + 1;
    await supabase.from('profiles').update({ guillotine_count: nextCount }).eq('nickname', nickname);
    return nextCount;
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .gt('guillotine_count', 0)
      .order('guillotine_count', { ascending: false })
      .limit(10);
    if (error) return [];
    return data.map(prof => ({
        nickname: prof.nickname,
        joinDate: prof.joined_at ? prof.joined_at.split('T')[0] : '-',
        postCount: prof.post_count || 0,
        commentCount: prof.comment_count || 0,
        guillotineCount: prof.guillotine_count || 0
    }));
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gt('halfshots', 0)
      .order('halfshots', { ascending: false })
      .limit(10);
    if (error) return [];
    return data.map(row => this.mapPostRow(row));
  }
}

export const communityService = new CommunityService();
