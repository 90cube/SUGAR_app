
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment, StreamingRequest } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  async getPosts(boardType?: BoardType, currentUserId?: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      // 1. Handle Streaming Posts Separately if boardType is stream
      if (boardType === 'stream') {
          const { data, error } = await supabase
            .from('streaming_posts')
            .select(`*, profiles(nickname)`)
            .eq('status', 'VISIBLE')
            .order('created_at', { ascending: false });
          
          if (error) return [];
          return (data || []).map((row: any) => ({
              id: row.id,
              boardType: 'stream',
              title: `${row.profiles?.nickname} 님의 방송`,
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

      // 2. Original Post Fetching
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
      if (error) {
        console.error("[CommunityService] Fetch Posts Error:", error);
        return [];
      }
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

  private async generateThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320; // Streaming thumbnails need higher res than 64x64
        canvas.height = 180; // 16:9 ratio
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 320, 180);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Blob creation failed"));
        }, 'image/webp', 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async uploadKukkukImage(file: File): Promise<{ imageUrl: string, thumbnailUrl: string } | null> {
    if (!supabase) return null;
    if (file.size > 500 * 1024) throw new Error("파일 용량이 너무 큽니다. (500KB 이하만 가능)");
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return null;

    const fileId = crypto.randomUUID();
    const originalPath = `original/${userId}/${fileId}_${file.name}`;
    const thumbPath = `thumb/${userId}/${fileId}_thumb.webp`;

    const { error: upErr } = await supabase.storage.from('kukkuk-images').upload(originalPath, file);
    if (upErr) throw upErr;

    const thumbBlob = await this.generateThumbnail(file);
    const { error: thumbErr } = await supabase.storage.from('kukkuk-images').upload(thumbPath, thumbBlob);
    if (thumbErr) throw thumbErr;

    const imageUrl = supabase.storage.from('kukkuk-images').getPublicUrl(originalPath).data.publicUrl;
    const thumbnailUrl = supabase.storage.from('kukkuk-images').getPublicUrl(thumbPath).data.publicUrl;

    return { imageUrl, thumbnailUrl };
  }

  async createStreamingRequest(payload: { platform: string, stream_url: string, pr_url: string, description: string, thumbnail_url: string }): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('streaming_requests').insert({
      requester_id: user.id,
      ...payload
    });

    if (error) {
      console.error("[CommunityService] Streaming Request Failed:", error);
      alert(`[ERROR] 게시 요청 실패: ${error.message}`);
      return false;
    }
    return true;
  }

  async getMyStreamingRequests(): Promise<StreamingRequest[]> {
    if (!supabase) return [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('streaming_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  async getPendingStreamingRequests(): Promise<StreamingRequest[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('streaming_requests')
      .select('*, profiles(nickname)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (error) return [];
    return data || [];
  }

  async processStreamingRequest(requestId: string, status: 'APPROVED' | 'REJECTED', message: string): Promise<boolean> {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('streaming_requests').update({
      status,
      admin_message: message,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);

    if (error) {
      alert(`처리 실패: ${error.message}`);
      return false;
    }
    return true;
  }

  async createPost(post: any): Promise<CommunityPost | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || user.email?.split('@')[0] || 'Unknown';

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
      payload.blue_option = post.blue_option || '';
      payload.red_option = post.red_option || '';
      payload.extra_content = post.content || '';
      payload.title = '';
      payload.content = '';
    } else {
      payload.title = post.title || '';
      payload.content = post.content || '';
    }

    const { data, error } = await supabase.from('posts').insert(payload).select(`*, votes (vote_type), comments (id)`).single();
    
    if (error) {
      console.error("[CommunityService] Create Post Failed:", error);
      alert(`[ERROR] 게시글 저장 실패: ${error.message}`);
      return null;
    }
    
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
      payload.title = '';
      payload.content = '';
    } else {
      payload.title = post.title || '';
      payload.content = post.content || '';
    }
    const { data, error } = await supabase.from('posts').update(payload).eq('id', postId).select(`*, votes (vote_type), comments (id)`).single();
    if (error) return null;
    return this.mapRowToPost(data);
  }

  async deletePost(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ status: 'DELETED' }).eq('id', postId);
    return !error;
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
    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || 'Unknown';
    const { data, error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, author_nickname: nickname, content: content, team_type: teamType }).select().single();
    if (error) return null;
    return { id: data.id, postId: data.post_id, authorId: data.author_id, authorNickname: data.author_nickname, content: data.content, createdAt: data.created_at, teamType: data.team_type as any || 'GRAY' };
  }

  async softDeleteComment(commentId: string): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
    return !error;
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map((c: any) => ({ id: c.id, postId: c.post_id, authorId: c.author_id, authorNickname: c.author_nickname, content: c.content, createdAt: c.created_at, teamType: (c.team_type as any) || 'GRAY', isDeleted: c.is_deleted }));
  }

  async movePostToTemp(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', postId);
    return !error;
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

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
    return { nickname, joinDate: '2024-01-01', postCount: 0, commentCount: 0, guillotineCount: 0 };
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
