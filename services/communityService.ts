
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment, StreamingRequest } from '../types';
import { supabase } from './supabaseClient';
import { IMAGE_BUCKET } from '../constants';

class CommunityService {
  
  async getPosts(boardType?: BoardType, currentUserId?: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      if (boardType === 'stream') {
          const { data, error } = await supabase
            .from('streaming_posts')
            .select(`*, profiles:public_profiles(nickname)`)
            .eq('status', 'VISIBLE')
            .order('created_at', { ascending: false });
          
          if (error) return [];
          return (data || []).map((row: any) => ({
              id: row.id,
              boardType: 'stream',
              title: `${row.profiles?.nickname || 'Unknown'} 님의 방송`,
              content: row.description || '',
              author: row.profiles?.nickname || 'Unknown',
              authorId: row.requester_id,
              authorRole: 'user',
              createdAt: row.created_at,
              heads: row.heads || 0,
              halfshots: row.halfshots || 0,
              blueVotes: 0,
              redVotes: 0,
              views: 0,
              commentCount: 0,
              status: 'APPROVED',
              thumbnailUrl: row.thumbnail_url,
              streamUrl: row.stream_url,
              prUrl: row.pr_url,
              platform: row.platform
          }));
      }

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
        const targetBoard = boardType.toLowerCase();
        query = query.eq('board_type', targetBoard === 'balance' ? 'BALANCE' : boardType === 'fun' ? 'FUN' : boardType);
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
    const { data } = await supabase.from('public_profiles').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin';
  }

  private mapRowToPost(row: any): CommunityPost {
    const votes = row.votes || [];
    const comments = row.comments || [];
    return {
      id: row.id,
      boardType: (row.board_type === 'BALANCE' ? 'balance' : row.board_type === 'FUN' ? 'fun' : row.board_type) as BoardType,
      title: row.title || (row.board_type === 'BALANCE' ? `${row.blue_option} vs ${row.red_option}` : 'Untitled'),
      content: row.content || row.extra_content || '',
      author: row.author_nickname || 'Unknown',
      authorId: row.author_id,
      authorRole: 'user', 
      createdAt: row.created_at,
      heads: votes.filter((v: any) => v.vote_type === 'HEAD').length,
      halfshots: votes.filter((v: any) => v.vote_type === 'HALF').length,
      blueVotes: row.blue_votes || 0,
      redVotes: row.red_votes || 0,
      views: row.views || 0,
      commentCount: comments.length,
      status: row.status,
      thumbnail: row.thumbnail || null,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url,
      isHidden: row.status === 'HIDDEN',
      blueOption: row.blue_option,
      redOption: row.red_option
    };
  }

  /**
   * 통합된 이미지 업로드 로직
   * 1. 파일이 없으면 즉시 null 반환 (Storage 호출 금지)
   * 2. 파일이 있으면 유효성 검사 후 단일 버킷(IMAGE_BUCKET)에 업로드
   */
  async uploadImage(file: File | null): Promise<{ imageUrl: string, thumbnailUrl: string } | null> {
    // [중요] 파일이 선택되지 않은 경우 Supabase Storage 호출을 원천 차단
    if (!file || !supabase) return null;

    // 1. 프론트엔드 검증 (512KB)
    if (file.size > 512 * 1024) throw new Error("이미지 용량은 512KB 이하만 업로드할 수 있습니다.");
    
    // 2. MIME 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) throw new Error("허용되지 않는 파일 형식입니다. (jpg, png, webp, gif)");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("인증 정보가 없습니다.");

    // 3. 단일 버킷 사용
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });

    if (upErr) throw upErr;

    const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(fileName).data.publicUrl;
    
    return { imageUrl: publicUrl, thumbnailUrl: publicUrl };
  }

  // 레거시 호환용 래퍼 (이제 boardType 구분 없음)
  async uploadKukkukImage(file: File): Promise<{ imageUrl: string, thumbnailUrl: string } | null> {
    return this.uploadImage(file);
  }

  async uploadLabUpdateImage(file: File): Promise<{ imageUrl: string, thumbnailUrl: string } | null> {
    return this.uploadImage(file);
  }

  async createStreamingRequest(payload: { platform: string, stream_url: string, pr_url: string, description: string, thumbnail_url: string }): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('streaming_requests').insert({ requester_id: user.id, ...payload });
    if (error) throw new Error(error.message);
    return true;
  }

  async getMyStreamingRequests(): Promise<StreamingRequest[]> {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from('streaming_requests').select('*').eq('requester_id', user.id).order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async getPendingStreamingRequests(): Promise<StreamingRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('streaming_requests').select('*, profiles:public_profiles(nickname)').eq('status', 'PENDING').order('created_at', { ascending: true });
    if (error) return [];
    return data || [];
  }

  async processStreamingRequest(requestId: string, status: 'APPROVED' | 'REJECTED', message: string): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('streaming_requests').update({ status, admin_message: message, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', requestId);
    if (error) throw new Error(error.message);
    return true;
  }

  async createPost(post: any): Promise<CommunityPost | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('public_profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || 'Unknown';

    const payload: any = {
      author_id: user.id,
      author_nickname: nickname,
      board_type: post.boardType === 'balance' ? 'BALANCE' : post.board_type === 'fun' ? 'FUN' : post.boardType,
      status: 'APPROVED',
      thumbnail: post.thumbnail || null,
      image_url: post.imageUrl || null,
      thumbnail_url: post.thumbnail_url || null
    };

    if (post.boardType === 'balance') {
      payload.blue_option = post.blueOption || '';
      payload.red_option = post.redOption || '';
      payload.extra_content = post.content || '';
    } else {
      payload.title = post.title || '';
      payload.content = post.content || '';
    }

    const { data, error } = await supabase.from('posts').insert(payload).select(`*, votes (vote_type), comments (id)`).single();
    if (error) throw new Error(error.message);
    return this.mapRowToPost(data);
  }

  async updatePost(postId: string, post: any): Promise<CommunityPost | null> {
    if (!supabase) return null;
    const payload: any = {
      board_type: post.boardType === 'balance' ? 'BALANCE' : post.boardType === 'fun' ? 'FUN' : post.boardType,
      thumbnail: post.thumbnail || null,
      image_url: post.imageUrl || null,
      thumbnail_url: post.thumbnail_url || null
    };
    if (post.boardType === 'balance') {
      payload.blue_option = post.blue_option || post.blueOption || '';
      payload.red_option = post.red_option || post.redOption || '';
      payload.extra_content = post.content || '';
    } else {
      payload.title = post.title || '';
      payload.content = post.content || '';
    }
    const { data, error } = await supabase.from('posts').update(payload).eq('id', postId).select(`*, votes (vote_type), comments (id)`).single();
    if (error) throw new Error(error.message);
    return this.mapRowToPost(data);
  }

  async deletePost(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ status: 'DELETED' }).eq('id', postId);
    if (error) throw new Error(error.message);
    return true;
  }

  async votePost(postId: string, voteType: 'HEAD' | 'HALF') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: existing } = await supabase.from('votes').select('id').eq('post_id', postId).eq('author_id', user.id).maybeSingle();
    if (existing) return false;
    const { error } = await supabase.from('votes').insert({ post_id: postId, author_id: user.id, vote_type: voteType });
    if (error) throw new Error(error.message);
    return true;
  }

  async voteBalance(postId: string, voteSide: 'BLUE' | 'RED') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: existing } = await supabase.from('balance_votes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
    if (existing) return false;
    const { error } = await supabase.from('balance_votes').insert({ post_id: postId, user_id: user.id, vote_side: voteSide });
    if (error) throw new Error(error.message);
    return true;
  }

  async addComment(postId: string, content: string, teamType: 'BLUE' | 'RED' | 'GRAY' = 'GRAY'): Promise<CommunityComment | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('public_profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || 'Unknown';
    const { data, error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, author_nickname: nickname, content, team_type: teamType }).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, postId: data.post_id, authorId: data.author_id, authorNickname: data.author_nickname, content: data.content, createdAt: data.created_at, teamType: data.team_type as any || 'GRAY' };
  }

  async softDeleteComment(commentId: string, isAdminAction: boolean, nickname: string): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    
    // 내용과 닉네임을 수정하지 않고 상태만 변경
    const { error } = await supabase
        .from('comments')
        .update({ 
            is_deleted: true, 
            deleted_by: user?.id,
            deleted_reason: isAdminAction ? 'ADMIN_ACTION' : 'USER_SELF'
        })
        .eq('id', commentId);

    if (error) throw new Error(error.message);
    return true;
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map((c: any) => ({ 
      id: c.id, 
      postId: c.post_id, 
      authorId: c.author_id, 
      authorNickname: c.author_nickname, 
      content: c.content, 
      createdAt: c.created_at, 
      teamType: (c.team_type as any) || 'GRAY', 
      isDeleted: c.is_deleted,
      deletedBy: c.deleted_by,
      deletedReason: c.deleted_reason
    }));
  }

  async movePostToTemp(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', postId);
    if (error) throw new Error(error.message);
    return true;
  }

  async getPostsByAuthorId(authorId: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes (vote_type), comments (id)`).eq('author_id', authorId).neq('status', 'DELETED');
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes (vote_type), comments (id)`).eq('author_nickname', nickname).neq('status', 'DELETED');
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getCommunityUserProfile(nickname: string, authorId?: string): Promise<CommunityUserProfile> {
    if (!supabase) return { nickname, joinDate: '-', postCount: 0, commentCount: 0, guillotineCount: 0 };
    
    let joinDate = '-';
    let postCount = 0;
    let commentCount = 0;

    const queryId = authorId ? { id: authorId } : { nickname };

    const { data: prof } = await supabase
      .from('public_profiles')
      .select('created_at, id, post_count, comment_count')
      .match(queryId)
      .maybeSingle();
    
    if (prof) {
        joinDate = prof.created_at ? prof.created_at.split('T')[0] : '-';
        postCount = prof.post_count || 0;
        commentCount = prof.comment_count || 0;
    }

    return { nickname, joinDate, postCount, commentCount, guillotineCount: 0 };
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    return [{ nickname: 'ToxicPlayer_01', joinDate: '2024-02-14', postCount: 5, commentCount: 142, guillotineCount: 88 }];
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes (vote_type), comments (id)`).neq('status', 'DELETED').limit(20);
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row)).filter(p => p.halfshots > 0).sort((a, b) => b.halfshots - a.halfshots);
  }

  async executeGuillotine(nickname: string): Promise<number> {
    return Math.floor(Math.random() * 50) + 10;
  }
}

export const communityService = new CommunityService();
