
import { CommunityPost, BoardType, CommunityUserProfile } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  // --- Read Posts ---
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return []; // Fallback empty if no DB

    try {
        let query = supabase
            .from('posts')
            .select(`
                *,
                votes ( vote_type )
            `)
            .order('created_at', { ascending: false });

        if (boardType) {
            query = query.eq('board_type', boardType);
        }
        
        // Filter hidden posts unless asking for hidden board
        if (boardType !== 'hidden') {
            query = query.neq('status', 'HIDDEN');
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching posts:", error);
            return [];
        }

        return data.map((row: any) => this.mapRowToPost(row));
    } catch (e) {
        console.error(e);
        return [];
    }
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
      if (!supabase) return [];
      
      const { data } = await supabase
        .from('posts')
        .select(`*, votes(vote_type)`)
        .eq('author_nickname', nickname)
        .neq('status', 'HIDDEN')
        .order('created_at', { ascending: false });
        
      return (data || []).map((row: any) => this.mapRowToPost(row));
  }

  async getPopularPosts(boardType: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];

    // Simple implementation: Get recent posts and sort by views/likes client-side
    // (For true scalability, this should be an RPC or a View in Supabase)
    const { data } = await supabase
        .from('posts')
        .select(`*, votes(vote_type)`)
        .eq('board_type', boardType)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false })
        .limit(20);

    if (!data) return [];

    const mapped = data.map((row: any) => this.mapRowToPost(row));
    // Sort by Total Votes (Heads) descending
    return mapped.sort((a, b) => b.heads - a.heads).slice(0, 3);
  }

  // --- Interactions ---

  async createPost(post: { title: string; content: string; author: string; boardType: BoardType }): Promise<boolean> {
      if (!supabase) return false;

      // 1. Get User ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 2. Insert
      const { error } = await supabase
          .from('posts')
          .insert({
              title: post.title,
              content: post.content,
              board_type: post.boardType,
              author_id: user.id,
              author_nickname: post.author,
              status: post.boardType === 'hidden' ? 'HIDDEN' : 'APPROVED'
          });

      if (error) {
          console.error("Create Post Error:", error);
          return false;
      }
      return true;
  }

  async requestStreamPost(postData: { title: string, content: string, author: string }): Promise<CommunityPost | null> {
      if (!supabase) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
          .from('posts')
          .insert({
              title: postData.title,
              content: postData.content,
              board_type: 'stream',
              author_id: user.id,
              author_nickname: postData.author,
              status: 'PENDING',
              thumbnail: 'stream_pending'
          })
          .select()
          .single();

      if (error || !data) return null;
      return this.mapRowToPost(data);
  }

  // --- Voting System (Real DB) ---

  async getUserVote(postId: string, nickname: string): Promise<'head' | 'half' | null> {
      if (!supabase) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
          .from('votes')
          .select('vote_type')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single();
          
      return data?.vote_type as 'head' | 'half' | null;
  }

  async toggleVote(postId: string, nickname: string, type: 'head' | 'half'): Promise<{ heads: number; halfshots: number; userVote: 'head' | 'half' | null }> {
      if (!supabase) return { heads: 0, halfshots: 0, userVote: null };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { heads: 0, halfshots: 0, userVote: null };

      // 1. Check existing vote
      const { data: existing } = await supabase
          .from('votes')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .single();

      let finalUserVote: 'head' | 'half' | null = type;

      if (existing) {
          if (existing.vote_type === type) {
              // Toggle OFF (Delete)
              await supabase.from('votes').delete().eq('id', existing.id);
              finalUserVote = null;
          } else {
              // Switch Vote (Update)
              await supabase.from('votes').update({ vote_type: type }).eq('id', existing.id);
          }
      } else {
          // New Vote (Insert)
          await supabase.from('votes').insert({
              post_id: postId,
              user_id: user.id,
              vote_type: type
          });
      }

      // 2. Re-calculate totals (Robust method)
      // Note: For high scale, increment/decrement columns are better. For this scale, counting rows is fine.
      const { count: heads } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('vote_type', 'head');
      const { count: halfs } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('vote_type', 'half');

      return {
          heads: heads || 0,
          halfshots: halfs || 0,
          userVote: finalUserVote
      };
  }

  async reportPost(postId: string, nickname: string): Promise<boolean> {
      // For now, just log to console or create a 'hidden' report post
      // Real implementation would insert into a 'reports' table
      console.log(`[CommunityService] Post ${postId} reported by ${nickname}`);
      return true;
  }

  // --- Profile & Stats ---

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
      // In a real app, this would aggregate count(*) from posts and comments tables
      // For now, we return a basic struct.
      // Ideally: select count(*) from posts where author_nickname = ...
      
      let postCount = 0;
      if (supabase) {
          const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_nickname', nickname);
          postCount = count || 0;
      }

      return {
          nickname,
          joinDate: 'Unknown', // Need to fetch from profiles if public
          postCount,
          commentCount: 0, // Not implemented yet
          guillotineCount: 0
      };
  }

  async executeGuillotine(nickname: string): Promise<number> {
      // Mock for admin action
      return 1;
  }

  async getHighGuillotineUsers(): Promise<CommunityUserProfile[]> {
      return [];
  }

  async getHighHalfshotPosts(): Promise<CommunityPost[]> {
      return [];
  }

  // --- Helper: Mapper ---
  private mapRowToPost(row: any): CommunityPost {
      // Calculate counts from the joined 'votes' array
      const votes = row.votes || [];
      const heads = votes.filter((v: any) => v.vote_type === 'head').length;
      const halfshots = votes.filter((v: any) => v.vote_type === 'half').length;

      return {
          id: row.id,
          boardType: row.board_type as BoardType,
          title: row.title,
          content: row.content,
          author: row.author_nickname || 'Unknown',
          authorRole: 'user', // Can be joined from profiles if needed
          createdAt: row.created_at,
          heads: heads,
          halfshots: halfshots,
          views: row.views,
          commentCount: 0,
          status: row.status,
          thumbnail: row.thumbnail,
          isHidden: row.status === 'HIDDEN'
      };
  }
}

export const communityService = new CommunityService();
