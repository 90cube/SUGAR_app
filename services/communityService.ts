
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment, StreamingRequest } from '../types';
import { supabase } from './supabaseClient';
import { IMAGE_BUCKET } from '../constants';

class CommunityService {
  
  async getPosts(boardType?: BoardType, currentUserId?: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      // [1] 방송 게시글 (Streaming Posts)
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
              title: `방송: ${row.description?.slice(0, 20) || '제목 없음'}`,
              content: row.description || '',
              author: 'Unknown',
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

      // [2] 일반 게시글 (Standard Posts)
      // 보안 오류를 피하기 위해 필요한 관계 데이터만 최소한으로 select ('votes(vote_type)', 'comments(id)')
      let query = supabase
        .from('posts')
        .select(`
          *,
          votes (vote_type),
          comments (id, is_deleted)
        `) 
        .neq('status', 'DELETED') // 삭제된 글 제외
        .order('created_at', { ascending: false });

      if (boardType === 'TEMP') {
        query = query.eq('board_type', 'TEMP');
        if (currentUserId && !await this.checkIsAdmin(currentUserId)) {
          query = query.eq('author_id', currentUserId);
        }
      } else if (boardType && boardType !== 'hidden') {
        const dbBoardType = boardType.toUpperCase();
        query = query.eq('board_type', dbBoardType === 'BALANCE' ? 'BALANCE' : dbBoardType === 'FUN' ? 'FUN' : dbBoardType);
      } else if (boardType === 'hidden') {
        query = query.eq('status', 'HIDDEN');
      }

      const { data, error } = await query;
      
      if (error) {
          console.error("[CommunityService] getPosts error:", error);
          // 관계 데이터 fetch 실패 시 기본 데이터만이라도 시도
          const { data: fallbackData } = await supabase.from('posts').select('*').neq('status', 'DELETED').order('created_at', { ascending: false });
          return (fallbackData || []).map((row: any) => this.mapRowToPost(row));
      }
      
      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch (e) {
      console.error("Exception in getPosts:", e);
      return [];
    }
  }

  private async checkIsAdmin(userId: string): Promise<boolean> {
    const { data } = await supabase.from('public_profiles').select('role').eq('id', userId).maybeSingle();
    return data?.role === 'admin';
  }

  private mapRowToPost(row: any): CommunityPost {
    // votes와 comments 배열을 기반으로 카운트 계산
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
      // 삭제되지 않은 댓글만 카운트
      commentCount: comments.filter((c: any) => !c.is_deleted).length,
      status: row.status,
      thumbnail: row.thumbnail || null,
      imageUrl: row.image_url,
      thumbnailUrl: row.thumbnail_url,
      isHidden: row.status === 'HIDDEN',
      blueOption: row.blue_option,
      redOption: row.red_option
    };
  }

  async uploadImage(file: File | null): Promise<{ imageUrl: string, thumbnailUrl: string } | null> {
    if (!file || !supabase) return null;
    if (file.size > 512 * 1024) throw new Error("이미지 용량은 512KB 이하만 업로드할 수 있습니다.");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("인증 정보가 없습니다.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(fileName, file);
    if (upErr) throw upErr;

    const publicUrl = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(fileName).data.publicUrl;
    return { imageUrl: publicUrl, thumbnailUrl: publicUrl };
  }

  async createStreamingRequest(payload: any): Promise<boolean> {
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
    return data || [];
  }

  async getPendingStreamingRequests(): Promise<StreamingRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('streaming_requests').select('*').eq('status', 'PENDING').order('created_at', { ascending: true });
    return (data || []).map((req: any) => ({ ...req, profiles: { nickname: 'Requester' } }));
  }

  async processStreamingRequest(requestId: string, status: 'APPROVED' | 'REJECTED', message: string): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('streaming_requests').update({ status, admin_message: message, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', requestId);
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
      board_type: post.boardType === 'balance' ? 'BALANCE' : post.boardType === 'fun' ? 'FUN' : post.boardType,
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

    const { data, error } = await supabase.from('posts').insert(payload).select().single();
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
      payload.blue_option = post.blueOption || '';
      payload.red_option = post.redOption || '';
      payload.extra_content = post.content || '';
    } else {
      payload.title = post.title || '';
      payload.content = post.content || '';
    }
    const { data, error } = await supabase.from('posts').update(payload).eq('id', postId).select().single();
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
    return !error;
  }

  async voteBalance(postId: string, voteSide: 'BLUE' | 'RED') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: existing } = await supabase.from('balance_votes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
    if (existing) return false;
    const { error } = await supabase.from('balance_votes').insert({ post_id: postId, user_id: user.id, vote_side: voteSide });
    return !error;
  }

  async addComment(postId: string, content: string, teamType: 'BLUE' | 'RED' | 'GRAY' = 'GRAY'): Promise<CommunityComment | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('public_profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || 'Unknown';
    const { data, error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, author_nickname: nickname, content, team_type: teamType }).select().single();
    if (error) return null;
    return { id: data.id, postId: data.post_id, authorId: data.author_id, authorNickname: data.author_nickname, content: data.content, createdAt: data.created_at, teamType: data.team_type as any || 'GRAY' };
  }

  async softDeleteComment(commentId: string, isAdminAction: boolean, nickname: string): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('comments').update({ is_deleted: true, deleted_by: user?.id, deleted_reason: isAdminAction ? 'ADMIN_ACTION' : 'USER_SELF' }).eq('id', commentId);
    return !error;
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map((c: any) => ({ 
      id: c.id, postId: c.post_id, authorId: c.author_id, authorNickname: c.author_nickname, content: c.content, createdAt: c.created_at, teamType: (c.team_type as any) || 'GRAY', isDeleted: c.is_deleted, deletedBy: c.deleted_by, deletedReason: c.deleted_reason
    }));
  }

  async movePostToTemp(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', postId);
    return !error;
  }

  async getPostsByAuthorId(authorId: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes(vote_type), comments(id, is_deleted)`).eq('author_id', authorId).neq('status', 'DELETED');
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes(vote_type), comments(id, is_deleted)`).eq('author_nickname', nickname).neq('status', 'DELETED');
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getCommunityUserProfile(nickname: string, authorId?: string): Promise<CommunityUserProfile> {
    if (!supabase) return { nickname, joinDate: '-', postCount: 0, commentCount: 0, guillotineCount: 0 };
    
    // 뷰의 post_count는 신뢰도가 낮으므로 직접 필터링 카운트 수행
    const queryId = authorId ? { id: authorId } : { nickname };
    const { data: prof } = await supabase.from('public_profiles').select('created_at, id').match(queryId).maybeSingle();
    
    if (!prof) return { nickname, joinDate: '-', postCount: 0, commentCount: 0, guillotineCount: 0 };

    // [중요] 삭제되지 않은 게시글만 직접 카운트
    const { count: realPostCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', prof.id)
      .neq('status', 'DELETED');

    // [중요] 삭제되지 않은 댓글만 직접 카운트
    const { count: realCommentCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', prof.id)
      .eq('is_deleted', false);

    return { 
      nickname, 
      joinDate: prof.created_at ? prof.created_at.split('T')[0] : '-', 
      postCount: realPostCount || 0, 
      commentCount: realCommentCount || 0, 
      guillotineCount: 0 
    };
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('posts').select(`*, votes(vote_type), comments(id, is_deleted)`).neq('status', 'DELETED').limit(20);
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row)).sort((a, b) => b.halfshots - a.halfshots);
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    return [{ nickname: 'ToxicPlayer_01', joinDate: '2024-02-14', postCount: 5, commentCount: 142, guillotineCount: 88 }];
  }

  async executeGuillotine(nickname: string): Promise<number> {
    return Math.floor(Math.random() * 50) + 10;
  }
}

export const communityService = new CommunityService();
