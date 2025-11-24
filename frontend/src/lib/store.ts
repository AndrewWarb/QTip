import { create } from 'zustand';

interface StatsState {
  totalPiiEmails: number;
  fetchStats: () => Promise<void>;
}

export const useStatsStore = create<StatsState>((set) => ({
  totalPiiEmails: 0,
  fetchStats: async () => {
    try {
      const res = await fetch('http://localhost:5263/api/stats');
      const data = await res.json();
      set({ totalPiiEmails: data.totalPiiEmails });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },
}));
