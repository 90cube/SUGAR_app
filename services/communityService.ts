
import { CommunityPost, BoardType, CommunityUserProfile, CommunityComment } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  async checkConnection(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('posts').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      let query = supabase
        .from('posts')
        .select('*, votes(vote_type), comments(id)')
        .neq('status', 'DELETED') // 삭제된 글은 제외
        .order('created_at', { ascending: false });

      if (boardType && boardType !== 'hidden') {
        query = query.eq('board_type', boardType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row: any) => this.mapRowToPost(row));
    } catch (e) {
      console.error("[CommunityService] getPosts error", e);
      return [];
    }
  }

  async getComments(postId: string): Promise<CommunityComment[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        authorNickname: c.author_nickname,
        content: c.content,
        createdAt: c.created_at,
        teamType: (c.team_type as 'BLUE' | 'RED' | 'GRAY') || 'GRAY'
      }));
    } catch (e) {
      console.error("[CommunityService] getComments error", e);
      return [];
    }
  }

  async createComment(postId: string, content: string, nickname: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: vote } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .in('vote_type', ['BLUE', 'RED'])
        .maybeSingle();

      const teamType = vote?.vote_type === 'BLUE' ? 'BLUE' : vote?.vote_type === 'RED' ? 'RED' : 'GRAY';

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: user.id,
        author_nickname: nickname,
        content: content,
        team_type: teamType
      });

      return !error;
    } catch (e) {
      console.error("[CommunityService] createComment error", e);
      return false;
    }
  }

  async castBalanceVote(postId: string, team: 'BLUE' | 'RED'): Promise<{ blue: number; red: number; userVote: 'BLUE' | 'RED' | null; error?: string }> {
    if (!supabase) return { blue: 0, red: 0, userVote: null };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { blue: 0, red: 0, userVote: null };

      const { data: existing } = await supabase
        .from('votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .in('vote_type', ['BLUE', 'RED'])
        .maybeSingle();

      if (existing) {
        return { blue: 0, red: 0, userVote: existing.vote_type as 'BLUE' | 'RED', error: "투표는 번복할 수 없습니다." };
      }

      await supabase.from('votes').insert({
        post_id: postId,
        user_id: user.id,
        vote_type: team
      });

      const { data: allVotes } = await supabase.from('votes').select('vote_type').eq('post_id', postId).in('vote_type', ['BLUE', 'RED']);
      const blue = allVotes?.filter((v: any) => v.vote_type === 'BLUE').length || 0;
      const red = allVotes?.filter((v: any) => v.vote_type === 'RED').length || 0;

      return { blue, red, userVote: team };
    } catch (e) {
      return { blue: 0, red: 0, userVote: null, error: "투표 실패" };
    }
  }

  // Fix: Renamed return property 'halfs' to 'halfshots' to be consistent with CommunityPost interface and types
  async toggleReaction(postId: string, type: 'HEAD' | 'HALF'): Promise<{ heads: number; halfshots: number }> {
    if (!supabase) return { heads: 0, halfshots: 0 };
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { heads: 0, halfshots: 0 };

      const { data: existing } = await supabase
        .from('votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .in('vote_type', ['HEAD', 'HALF'])
        .maybeSingle();

      if (existing) {
        if (existing.vote_type === type) {
          await supabase.from('votes').delete().eq('id', existing.id);
        } else {
          await supabase.from('votes').update({ vote_type: type }).eq('id', existing.id);
        }
      } else {
        await supabase.from('votes').insert({ post_id: postId, user_id: user.id, vote_type: type });
      }

      const { data: all } = await supabase.from('votes').select('vote_type').eq('post_id', postId);
      return {
        heads: all?.filter((v: any) => v.vote_type === 'HEAD').length || 0,
        halfshots: all?.filter((v: any) => v.vote_type === 'HALF').length || 0
      };
    } catch {
      return { heads: 0, halfshots: 0 };
    }
  }

  async getBalanceVoteStatus(postId: string): Promise<'BLUE' | 'RED' | null> {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('votes').select('vote_type').eq('post_id', postId).eq('user_id', user.id).in('vote_type', ['BLUE', 'RED']).maybeSingle();
    return data ? (data.vote_type as 'BLUE' | 'RED') : null;
  }

  async createPost(post: { title: string; content: string; author: string; boardType: BoardType; thumbnail?: string }): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase.from('posts').insert({
        title: post.title,
        content: post.content,
        board_type: post.boardType,
        author_id: user.id,
        author_nickname: post.author,
        thumbnail: post.thumbnail || null,
        status: post.boardType === 'hidden' ? 'HIDDEN' : 'APPROVED'
      });
      return !error;
    } catch {
      return false;
    }
  }

  async updatePostStatus(postId: string, status: 'APPROVED' | 'PENDING' | 'HIDDEN' | 'DELETED'): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from('posts').update({ status }).eq('id', postId);
    return !error;
  }

  async movePostToTemp(postId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('posts')
            .update({ board_type: 'TEMP' })
            .eq('id', postId);
        return !error;
    } catch (e) {
        console.error("[CommunityService] movePostToTemp error", e);
        return false;
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      // 실제 데이터 보존이 필요하다면 update status = 'DELETED'
      // 여기서는 하드 딜리트를 수행합니다.
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      return !error;
    } catch (e) {
      console.error("[CommunityService] deletePost error", e);
      return false;
    }
  }

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
    if (!supabase) return { nickname, joinDate: 'Unknown', postCount: 0, commentCount: 0, guillotineCount: 0 };
    const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_nickname', nickname);
    const { count: commentCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_nickname', nickname);
    const { data: profile } = await supabase.from('profiles').select('joined_at, nickname, guillotine_count').eq('nickname', nickname).maybeSingle();
    return {
      nickname,
      joinDate: profile?.joined_at ? profile.joined_at.split('T')[0] : 'Unknown',
      postCount: postCount || 0,
      commentCount: commentCount || 0,
      guillotineCount: profile?.guillotine_count || 0
    };
  }

  async executeGuillotine(nickname: string): Promise<number> {
    if (!supabase) return 0;
    try {
      const { data: profile } = await supabase.from('profiles').select('guillotine_count').eq('nickname', nickname).maybeSingle();
      const currentCount = profile?.guillotine_count || 0;
      const newCount = currentCount + 1;
      await supabase.from('profiles').update({ guillotine_count: newCount }).eq('nickname', nickname);
      return newCount;
    } catch (e) {
      console.error("[CommunityService] executeGuillotine error", e);
      return 0;
    }
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .gt('guillotine_count', 0)
        .order('guillotine_count', { ascending: false })
        .limit(10);
      if (error) throw error;

      return await Promise.all((data || []).map(async (u: any) => {
        const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_nickname', u.nickname);
        const { count: commentCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('author_nickname', u.nickname);
        return {
          nickname: u.nickname,
          joinDate: u.joined_at ? u.joined_at.split('T')[0] : 'Unknown',
          postCount: postCount || 0,
          commentCount: commentCount || 0,
          guillotineCount: u.guillotine_count || 0
        };
      }));
    } catch (e) {
      console.error("[CommunityService] getHighGuillotineUsers error", e);
      return [];
    }
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, votes(vote_type), comments(id)');
      if (error) throw error;
      const mapped = (data || []).map((row: any) => this.mapRowToPost(row));
      return mapped
        .filter((p: CommunityPost) => p.halfshots > 0)
        .sort((a: CommunityPost, b: CommunityPost) => b.halfshots - a.halfshots)
        .slice(0, 10);
    } catch (e) {
      console.error("[CommunityService] getHighHalfshotPosts error", e);
      return [];
    }
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
    if (!supabase) return [];
    const { data } = await supabase.from('posts').select('*, votes(vote_type), comments(id)').eq('author_nickname', nickname).order('created_at', { ascending: false });
    return (data || []).map((row: any) => this.mapRowToPost(row));
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
}

export const communityService = new CommunityService();
