import { WORKER_BASE_URL } from '../constants';
import { GameUpdate, UpdateSearchResult, UpdatesPagination } from '../types';

class UpdatesService {
  private baseUrl = `${WORKER_BASE_URL}/api/updates`;

  async fetchUpdates(page = 1, source?: string, limit = 20): Promise<{ updates: GameUpdate[]; pagination: UpdatesPagination }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (source) params.set('source', source);

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) throw new Error(`Failed to fetch updates: ${response.status}`);
    return response.json();
  }

  async fetchUpdate(id: number): Promise<GameUpdate> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch update: ${response.status}`);
    return response.json();
  }

  async searchUpdates(query: string, source?: string, limit = 10): Promise<{ results: UpdateSearchResult[] }> {
    const body: any = { query, limit };
    if (source) body.source = source;

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    return response.json();
  }

  async fetchStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) throw new Error(`Failed to fetch stats: ${response.status}`);
    return response.json();
  }

  async react(updateId: number, reaction: string): Promise<{ reactions: Record<string, number> }> {
    const response = await fetch(`${this.baseUrl}/${updateId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    });
    if (!response.ok) throw new Error(`React failed: ${response.status}`);
    return response.json();
  }

  async fetchBatchReactions(ids: number[]): Promise<Record<number, Record<string, number>>> {
    if (ids.length === 0) return {};
    const response = await fetch(`${WORKER_BASE_URL}/api/reactions/batch?ids=${ids.join(',')}`);
    if (!response.ok) return {};
    const data: any = await response.json();
    return data.reactions || {};
  }
}

export const updatesService = new UpdatesService();
