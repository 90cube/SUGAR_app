
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
        const targetBoard = boardType.toLowerCase();
        query = query.eq('board_type', targetBoard === 'balance' ? 'BALANCE' : boardType);
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
      boardType: (row.board_type === 'BALANCE' ? 'balance' : row.board_type) as BoardType,
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
      isHidden: row.status === 'HIDDEN',
      blueOption: row.blue_option,
      redOption: row.red_option
    };
  }

  async createPost(post: any): Promise<CommunityPost | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Profiles에서 최신 닉네임 조회 (user.id 기반)
    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || user.email?.split('@')[0] || 'Unknown';

    const payload: any = {
      author_id: user.id, // 필수: auth.uid()
      author_nickname: nickname,
      board_type: post.boardType === 'balance' ? 'BALANCE' : post.boardType,
      status: 'APPROVED',
      thumbnail: post.thumbnail || null
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

    // Insert 후 결과 행을 즉시 반환받음
    const { data, error } = await supabase.from('posts').insert(payload).select(`*, votes (vote_type), comments (id)`).single();
    
    if (error) {
      console.error("[CommunityService] Create Post Failed:", error);
      alert(`[ERROR] 게시글 저장 실패: ${error.message}`);
      return null;
    }
    
    return this.mapRowToPost(data);
  }

  async votePost(postId: string, voteType: 'HEAD' | 'HALF') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 본인 글 체크
    const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single();
    if (post && post.author_id === user.id) {
        alert("자신의 글에 추천, 비추천, 투표, 신고 할 수 없습니다.");
        return false;
    }

    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('author_id', user.id)
      .maybeSingle();

    if (existing) {
      alert("이미 추천/비추천을 하셨습니다.");
      return false;
    }

    const { error } = await supabase.from('votes').insert({
      post_id: postId,
      author_id: user.id,
      vote_type: voteType
    });
    
    if (error) {
      alert(`[ERROR] 추천 실패: ${error.message}`);
      return false;
    }
    return true;
  }

  async voteBalance(postId: string, voteSide: 'BLUE' | 'RED') {
    if (!supabase) return false;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 1. 자기 글 투표 불가 체크
    const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).single();
    if (post && post.author_id === user.id) {
        alert("자신의 글에 추천, 비추천, 투표, 신고 할 수 없습니다.");
        return false;
    }

    // 2. 이미 투표했는지 체크 (중복 투표 방지)
    const { data: existing } = await supabase
      .from('balance_votes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      alert("이미 투표에 참여하셨습니다. (번복 불가)");
      return false;
    }

    // 3. 밸런스 투표 전용 테이블에 insert (GRAY는 호출 안함)
    const { error } = await supabase.from('balance_votes').insert({
      post_id: postId,
      user_id: user.id, // auth.uid()
      vote_side: voteSide
    });

    if (error) {
        console.error("[CommunityService] Balance Vote Error:", error);
        alert(`[ERROR] 투표 저장 실패: ${error.message}`);
        return false;
    }
    return true;
  }

  async addComment(postId: string, content: string, teamType: 'BLUE' | 'RED' | 'GRAY' = 'GRAY'): Promise<CommunityComment | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
    const nickname = profile?.nickname || user.email?.split('@')[0] || 'Unknown';

    const { data, error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: user.id, // 필수: auth.uid()
      author_nickname: nickname,
      content: content,
      team_type: teamType
    }).select().single();

    if (error) {
      console.error("[CommunityService] Add Comment Error:", error);
      alert(`[ERROR] 댓글 저장 실패: ${error.message}`);
      return null;
    }

    return {
      id: data.id, 
      postId: data.post_id, 
      authorId: data.author_id, 
      authorNickname: data.author_nickname,
      content: data.content, 
      createdAt: data.created_at, 
      teamType: data.team_type as any || 'GRAY'
    };
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) return [];
      
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

  async deletePost(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ status: 'DELETED' }).eq('id', postId);
    if (error) {
        alert(`[ERROR] 처리 실패: ${error.message}`);
        return false;
    }
    return true;
  }

  async movePostToTemp(postId: string) {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ board_type: 'TEMP' }).eq('id', postId);
    if (error) {
        alert(`[ERROR] 격리 실패: ${error.message}`);
        return false;
    }
    return true;
  }

  async getPostsByAuthorId(authorId: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    // 닉네임 기반 대신 고유 ID 기반으로 정확히 필터링
    const { data, error } = await supabase
      .from('posts')
      .select(`*, votes (vote_type), comments (id)`)
      .eq('author_id', authorId)
      .neq('status', 'DELETED');
      
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select(`*, votes (vote_type), comments (id)`)
      .eq('author_nickname', nickname)
      .neq('status', 'DELETED');
      
    if (error) return [];
    return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
    return { nickname, joinDate: '2024-01-01', postCount: 0, commentCount: 0, guillotineCount: 0 };
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    return [
      { nickname: 'ToxicPlayer_01', joinDate: '2024-02-14', postCount: 5, commentCount: 142, guillotineCount: 88 }
    ];
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('posts')
      .select(`*, votes (vote_type), comments (id)`)
      .neq('status', 'DELETED')
      .limit(20);
      
    if (error) return [];
    return (data || [])
      .map((row: any) => this.mapRowToPost(row))
      .filter(p => p.halfshots > 0)
      .sort((a, b) => b.halfshots - a.halfshots);
  }

  async executeGuillotine(nickname: string): Promise<number> {
    return Math.floor(Math.random() * 50) + 10;
  }
}

export const communityService = new CommunityService();
