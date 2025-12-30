
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment } from '../types';
import { supabase } from './supabaseClient';
import { BUCKET_MAP, IMAGE_BUCKET } from '../constants';

class CommunityService {
  
  /**
   * DB 행 데이터를 애플리케이션 타입으로 매핑
   * blue_votes/red_votes(투표)와 heads/halfshots(추천)를 명확히 구분합니다.
   */
  private mapPostRow(row: any): CommunityPost {
    return {
      id: row.id,
      boardType: (row.board_type || '') as BoardType,
      title: row.title || 'Untitled Archive',
      content: row.content || '',
      author: row.author_nickname || 'Unknown Subject',
      authorId: row.author_id,
      authorRole: 'user',
      createdAt: row.created_at,
      heads: row.heads || 0,        // 추천 (DB 컬럼 없을 시 0 처리)
      halfshots: row.halfshots || 0, // 비추천 (DB 컬럼 없을 시 0 처리)
      blueVotes: row.blue_votes || 0, // 투표 A
      redVotes: row.red_votes || 0,   // 투표 B
      views: row.views || 0,
      commentCount: 0, 
      status: (row.status || 'APPROVED') as any,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url || row.thumbnail || row.image_url,
      blueOption: row.blue_option,
      redOption: row.red_option
    };
  }

  /**
   * 게시글 목록 조회
   */
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .neq('status', 'DELETED')
        .order('created_at', { ascending: false });

      if (boardType) {
        query = query.eq('board_type', boardType);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[CommunityService] Query Error:", error);
        return [];
      }
      
      const posts = (data || []).map(row => this.mapPostRow(row));
      
      const postsWithCounts = await Promise.all(posts.map(async (post) => {
          const count = await this.getCommentCount(post.id);
          return { ...post, commentCount: count };
      }));
      
      return postsWithCounts;
    } catch (e) {
      console.error("[CommunityService] Fetch Exception:", e);
      return [];
    }
  }

  async getCommentCount(postId: string): Promise<number> {
    if (!supabase) return 0;
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    return error ? 0 : (count || 0);
  }

  /**
   * 댓글 목록 조회
   */
  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("[CommunityService] Get Comments Error:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      authorNickname: row.author_nickname,
      content: row.content,
      createdAt: row.created_at,
      teamType: 'GRAY' // Default
    }));
  }

  /**
   * 댓글 작성
   */
  async createComment(postId: string, content: string): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("로그인이 필요합니다.");

    const { data: profile } = await supabase
      .from('public_profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id,
      author_nickname: profile?.nickname || 'Unknown',
      content: content
    });

    if (error) {
      console.error("[CommunityService] Create Comment Error:", error);
      throw error;
    }
    return true;
  }

  /**
   * 게시글 추천/비추천 (Headshot/Halfshot/Guillotine)
   * 이것은 '투표(Vote)'와 무관한 게시글 자체에 대한 반응입니다.
   */
  async registerInteraction(postId: string, type: 'HEADSHOT' | 'HALFSHOT' | 'GUILLOTINE'): Promise<{ heads: number, halfshots: number } | null> {
    if (!supabase) return null;

    // 1. 현재 값 조회
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('heads, halfshots')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
        console.error("Interaction Fetch Error:", fetchError);
        return null;
    }

    let updateData = {};
    if (type === 'HEADSHOT') {
      updateData = { heads: (post.heads || 0) + 1 };
    } else if (type === 'HALFSHOT') {
      updateData = { halfshots: (post.halfshots || 0) + 1 };
    } else if (type === 'GUILLOTINE') {
      // 길로틴은 별도 로직이므로 여기서는 카운트만 리턴
      return { heads: post.heads, halfshots: post.halfshots };
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select('heads, halfshots')
      .single();

    if (error || !data) {
        console.error("Interaction Update Error:", error);
        return null;
    }
    return { heads: data.heads, halfshots: data.halfshots };
  }

  /**
   * 이미지 업로드
   */
  async uploadImage(file: File, boardType: string): Promise<string | null> {
    if (!supabase) return null;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("허용되지 않는 파일 형식입니다. (JPG, PNG, WEBP, GIF 가능)");
    }
    if (file.size > 512 * 1024) {
      throw new Error("이미지 용량 초과 (최대 512KB)");
    }

    const bucket = BUCKET_MAP[boardType] || IMAGE_BUCKET;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("인증 세션이 만료되었습니다.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`; 

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * 게시글 작성
   */
  async createPost(post: { boardType: string, title: string, content: string, imageUrl?: string, blueOption?: string, redOption?: string }): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('public_profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    // heads, halfshots는 DB Default(0) 사용하므로 insert에서 제외
    const insertPayload: any = {
      board_type: post.boardType,
      title: post.title,
      content: post.content,
      image_url: post.imageUrl,
      author_id: user.id,
      author_nickname: profile?.nickname || 'Unknown Subject',
      status: 'APPROVED',
      blue_option: post.blueOption,
      red_option: post.redOption,
      blue_votes: post.blueOption ? 0 : undefined,
      red_votes: post.redOption ? 0 : undefined
    };

    const { error } = await supabase.from('posts').insert(insertPayload);

    if (error) {
      console.error("[CommunityService] Create Error:", error);
      throw error;
    }
    return true;
  }

  /**
   * 밸런스 투표 기능
   * 이것은 '추천(Heads)'과 다른 '투표(Vote)' 기능입니다.
   * blue_votes와 red_votes 컬럼을 업데이트합니다.
   */
  async castVote(postId: string, side: 'BLUE' | 'RED'): Promise<{blue: number, red: number} | null> {
      if (!supabase) return null;
      
      const { data: current, error: fetchError } = await supabase
          .from('posts')
          .select('blue_votes, red_votes')
          .eq('id', postId)
          .single();
          
      if (fetchError || !current) {
        console.error("[CommunityService] CastVote Fetch Error:", fetchError);
        return null;
      }

      const updateData = side === 'BLUE' 
          ? { blue_votes: (current.blue_votes || 0) + 1 }
          : { red_votes: (current.red_votes || 0) + 1 };

      const { data, error } = await supabase
          .from('posts')
          .update(updateData)
          .eq('id', postId)
          .select('blue_votes, red_votes')
          .single();
          
      if (error || !data) {
        console.error("[CommunityService] CastVote Update Error:", error);
        return null;
      }
      
      return {
          blue: data.blue_votes,
          red: data.red_votes
      };
  }

  async getCommunityUserProfile(nickname: string, authorId?: string): Promise<CommunityUserProfile> {
    if (!supabase) return { nickname, joinDate: '-', postCount: 0, commentCount: 0, guillotineCount: 0 };
    const queryId = authorId ? { id: authorId } : { nickname };
    
    const { data: prof } = await supabase
      .from('public_profiles')
      .select('*')
      .match(queryId)
      .maybeSingle();
    
    return { 
      nickname: prof?.nickname || nickname, 
      joinDate: prof?.joined_at ? prof.joined_at.split('T')[0] : '-', 
      postCount: prof?.post_count || 0, 
      commentCount: prof?.comment_count || 0, 
      guillotineCount: prof?.guillotine_count || 0 
    };
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('public_profiles')
      .select('*')
      .gt('guillotine_count', 0)
      .order('guillotine_count', { ascending: false })
      .limit(20);
    
    return (data || []).map(prof => ({
      nickname: prof.nickname,
      joinDate: prof.joined_at ? prof.joined_at.split('T')[0] : '-',
      postCount: prof.post_count || 0,
      commentCount: prof.comment_count || 0,
      guillotineCount: prof.guillotine_count || 0
    }));
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from('posts')
      .select('*')
      .gt('halfshots', 0)
      .order('halfshots', { ascending: false })
      .limit(20);
    
    return (data || []).map(row => this.mapPostRow(row));
  }

  async executeGuillotine(nickname: string): Promise<number> {
    if (!supabase) throw new Error("DB 연결 불가");
    const { data: prof } = await supabase.from('public_profiles').select('guillotine_count').eq('nickname', nickname).single();
    const newCount = (prof?.guillotine_count || 0) + 1;
    await supabase.from('profiles').update({ guillotine_count: newCount }).eq('nickname', nickname);
    return newCount;
  }

  async getPostsByAuthorId(authorId: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });
    return error ? [] : (data || []).map(row => this.mapPostRow(row));
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_nickname', nickname)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });
    return error ? [] : (data || []).map(row => this.mapPostRow(row));
  }
}

export const communityService = new CommunityService();
