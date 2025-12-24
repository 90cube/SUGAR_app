
import { CommunityPost, BoardType, CommunityUserProfile } from '../types';
import { supabase } from './supabaseClient';

class CommunityService {
  
  // --- Check Connection ---
  async checkConnection(): Promise<boolean> {
      if (!supabase) return false;
      try {
          const { count, error } = await supabase.from('posts').select('*', { count: 'exact', head: true });
          if (error) {
              console.error("[Supabase] Connection Check Failed:", error.message);
              return false;
          }
          console.log(`[Supabase] Connection OK. Post count: ${count}`);
          return true;
      } catch (e) {
          console.error("[Supabase] Connection Exception:", e);
          return false;
      }
  }

  // --- Fallback Mock Data ---
  private getMockPosts(boardType: BoardType = 'balance'): CommunityPost[] {
      // Mock data logic remains the same...
      const systemNotice: CommunityPost = {
          id: 'sys_notice_1',
          boardType: 'update',
          title: '[System] Database Setup Required',
          content: '<p>Supabase에 <strong>public.posts</strong> 테이블이 없습니다.<br/>SQL Editor에서 테이블 생성 쿼리를 실행해주세요. 현재는 임시 데이터가 표시됩니다.</p>',
          author: 'System',
          authorRole: 'admin',
          createdAt: new Date().toISOString(),
          heads: 999,
          halfshots: 0,
          views: 0,
          commentCount: 0,
          status: 'APPROVED',
          thumbnail: 'https://placehold.co/600x338/334155/FFF?text=DB+Setup+Required'
      };

      const mockBalance: CommunityPost = {
          id: 'mock_balance_1',
          boardType: 'balance',
          title: '[예시] 에임지옥 vs 3보급창고',
          content: '연습하기 어디가 더 좋나요?',
          author: 'TestUser',
          authorRole: 'user',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          heads: 5,
          halfshots: 2,
          views: 42,
          commentCount: 0,
          status: 'APPROVED'
      };

      const items = [systemNotice, mockBalance];
      return items.filter(i => i.boardType === boardType || i.boardType === 'update');
  }

  // --- Read Posts ---
  async getPosts(boardType?: BoardType): Promise<CommunityPost[]> {
    if (!supabase) {
        console.warn("[CommunityService] Supabase client is null. Returning mocks.");
        return this.getMockPosts(boardType); 
    }

    try {
        console.log(`[Supabase] Fetching posts for board: ${boardType || 'ALL'}...`);
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
            console.error("[Supabase] Fetch Error:", error);
            // Check for Missing Table Error (PGRST205 or 42P01)
            if (error.code === 'PGRST205' || error.code === '42P01') {
                console.warn("[CommunityService] Tables missing in Supabase. Returning mock data.");
                return this.getMockPosts(boardType);
            }
            return [];
        }

        console.log(`[Supabase] Fetched ${data?.length || 0} posts.`);
        return data.map((row: any) => this.mapRowToPost(row));
    } catch (e) {
        console.error("[CommunityService] Exception in getPosts:", e);
        return this.getMockPosts(boardType);
    }
  }

  async getPostsByAuthor(nickname: string): Promise<CommunityPost[]> {
      if (!supabase) return [];
      
      try {
        const { data, error } = await supabase
            .from('posts')
            .select(`*, votes(vote_type)`)
            .eq('author_nickname', nickname)
            .neq('status', 'HIDDEN')
            .order('created_at', { ascending: false });
            
        if (error) {
            if (error.code === 'PGRST205' || error.code === '42P01') return [];
            throw error;
        }

        return (data || []).map((row: any) => this.mapRowToPost(row));
      } catch (e) {
          console.warn("getPostsByAuthor failed:", e);
          return [];
      }
  }

  async getPopularPosts(boardType: BoardType): Promise<CommunityPost[]> {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`*, votes(vote_type)`)
            .eq('board_type', boardType)
            .eq('status', 'APPROVED')
            .order('created_at', { ascending: false })
            .limit(20);
            
        if (error) {
            // Fallback if table missing
            if (error.code === 'PGRST205' || error.code === '42P01') {
                return this.getMockPosts(boardType).slice(0, 3);
            }
            return [];
        }

        if (!data) return [];

        const mapped = data.map((row: any) => this.mapRowToPost(row));
        // Sort by Total Votes (Heads) descending
        return mapped.sort((a, b) => b.heads - a.heads).slice(0, 3);
    } catch (e) {
        return [];
    }
  }

  // --- Interactions ---

  async createPost(post: { title: string; content: string; author: string; boardType: BoardType; thumbnail?: string }): Promise<boolean> {
      if (!supabase) {
          console.error("[CommunityService] Cannot create post: Supabase not connected.");
          return false;
      }

      console.log(`[Supabase] 📤 Sending Create Post Request...`);
      console.log(` - Title: ${post.title}`);
      console.log(` - Author: ${post.author}`);
      console.log(` - Board: ${post.boardType}`);

      try {
          // 1. Get User ID
          const { data: { user } } = await supabase.auth.getUser();
          
          let userId = user?.id;
          if (!userId) {
              console.warn("[Supabase] No Auth Session found. Trying Fallback UUID for Dev/Test Mode.");
              // Fallback for "sugar" dev account if RLS allows anon/public inserts
              userId = '00000000-0000-0000-0000-000000000000'; 
          }

          // 2. Insert
          const payload = {
              title: post.title,
              content: post.content,
              board_type: post.boardType,
              author_id: userId,
              author_nickname: post.author,
              status: post.boardType === 'hidden' ? 'HIDDEN' : 'APPROVED',
              thumbnail: post.thumbnail || null
          };

          const { data, error } = await supabase
              .from('posts')
              .insert(payload)
              .select(); 

          if (error) {
              console.error(`%c[Supabase] ❌ Insert Error: ${error.message}`, 'color: red; font-weight: bold;');
              console.error(error);
              if (error.code === 'PGRST205' || error.code === '42P01') {
                  alert("데이터베이스 테이블(posts)이 존재하지 않습니다.");
              }
              return false;
          }
          
          console.log(`%c[Supabase] ✅ Post Created Successfully!`, 'color: green; font-weight: bold;', data);
          return true;
      } catch (e) {
          console.error("[CommunityService] createPost Exception:", e);
          return false;
      }
  }

  async requestStreamPost(postData: { title: string, content: string, author: string }): Promise<CommunityPost | null> {
      if (!supabase) return null;
      
      try {
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || '00000000-0000-0000-0000-000000000000';

          const { data, error } = await supabase
              .from('posts')
              .insert({
                  title: postData.title,
                  content: postData.content,
                  board_type: 'stream',
                  author_id: userId,
                  author_nickname: postData.author,
                  status: 'PENDING',
                  thumbnail: 'stream_pending'
              })
              .select()
              .single();

          if (error) {
              console.error("[Supabase] Stream Request Error:", error);
              return null;
          }
          console.log("[Supabase] Stream Request Sent:", data);
          return this.mapRowToPost(data);
      } catch {
          return null;
      }
  }

  // --- Voting System (Real DB) ---

  async getUserVote(postId: string, nickname: string): Promise<'head' | 'half' | null> {
      if (!supabase) return null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .single();
        
        if (error) return null;
        return data?.vote_type as 'head' | 'half' | null;
      } catch {
          return null;
      }
  }

  async toggleVote(postId: string, nickname: string, type: 'head' | 'half'): Promise<{ heads: number; halfshots: number; userVote: 'head' | 'half' | null }> {
      if (!supabase) return { heads: 0, halfshots: 0, userVote: null };

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { heads: 0, halfshots: 0, userVote: null };

          // 1. Check existing vote
          const { data: existing, error } = await supabase
              .from('votes')
              .select('*')
              .eq('post_id', postId)
              .eq('user_id', user.id)
              .single();
          
          if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found', which is fine
               if (error.code === 'PGRST205' || error.code === '42P01') {
                   // Table missing, simulate success for UI
                   return { heads: 1, halfshots: 0, userVote: type };
               }
          }

          let finalUserVote: 'head' | 'half' | null = type;

          if (existing) {
              if (existing.vote_type === type) {
                  await supabase.from('votes').delete().eq('id', existing.id);
                  finalUserVote = null;
              } else {
                  await supabase.from('votes').update({ vote_type: type }).eq('id', existing.id);
              }
          } else {
              await supabase.from('votes').insert({
                  post_id: postId,
                  user_id: user.id,
                  vote_type: type
              });
          }

          // 2. Re-calculate totals
          const { count: heads } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('vote_type', 'head');
          const { count: halfs } = await supabase.from('votes').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('vote_type', 'half');

          return {
              heads: heads || 0,
              halfshots: halfs || 0,
              userVote: finalUserVote
          };
      } catch (e) {
          console.error("toggleVote failed", e);
          return { heads: 0, halfshots: 0, userVote: null };
      }
  }

  async reportPost(postId: string, nickname: string): Promise<boolean> {
      console.log(`[CommunityService] Post ${postId} reported by ${nickname}`);
      return true;
  }

  // --- Profile & Stats ---

  async getCommunityUserProfile(nickname: string): Promise<CommunityUserProfile> {
      let postCount = 0;
      if (supabase) {
          const { count, error } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_nickname', nickname);
          if (!error) postCount = count || 0;
      }

      return {
          nickname,
          joinDate: 'Unknown',
          postCount,
          commentCount: 0, 
          guillotineCount: 0
      };
  }

  async executeGuillotine(nickname: string): Promise<number> {
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
      const votes = row.votes || [];
      const heads = votes.filter((v: any) => v.vote_type === 'head').length;
      const halfshots = votes.filter((v: any) => v.vote_type === 'half').length;

      return {
          id: row.id,
          boardType: row.board_type as BoardType,
          title: row.title,
          content: row.content,
          author: row.author_nickname || 'Unknown',
          authorRole: 'user', 
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
