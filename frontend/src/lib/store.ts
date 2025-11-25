import { create } from 'zustand';

interface StatsState {
  totalPiiEmails: number;
  totalPiiHealthData: number;
  fetchStats: () => Promise<void>;
}

interface AzureOpenAIState {
  endpoint: string;
  apiKey: string;
  deployment: string;
  setCredentials: (endpoint: string, apiKey: string, deployment?: string) => void;
  clearCredentials: () => void;
  hasValidCredentials: () => boolean;
}

export const useStatsStore = create<StatsState>((set) => ({
  totalPiiEmails: 0,
  totalPiiHealthData: 0,
  fetchStats: async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/stats`);
      const data = await res.json();
      set({
        totalPiiEmails: data.totalPiiEmails || 0,
        totalPiiHealthData: data.totalPiiHealthData || 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },
}));

export const useAzureOpenAIStore = create<AzureOpenAIState>((set, get) => ({
  endpoint: '',
  apiKey: '',
  deployment: 'gpt-4.1-mini', // Default deployment name
  setCredentials: (endpoint: string, apiKey: string, deployment?: string) => {
    const deploymentName = deployment || get().deployment || 'gpt-4.1-mini';
    console.log('[STORE DEBUG] Setting credentials - endpoint:', `"${endpoint}"`, 'apiKey length:', apiKey.length, 'deployment:', `"${deploymentName}"`);
    set({ endpoint, apiKey, deployment: deploymentName });
  },
  clearCredentials: () => {
    console.log('[STORE DEBUG] Clearing credentials');
    set({ endpoint: '', apiKey: '', deployment: 'gpt-4.1-mini' });
  },
  hasValidCredentials: () => {
    const { endpoint, apiKey, deployment } = get();
    const isValid = endpoint.trim() !== '' && apiKey.trim() !== '' && deployment.trim() !== '';
    console.log('[STORE DEBUG] hasValidCredentials check - endpoint:', `"${endpoint}"`, 'apiKey length:', apiKey.length, 'deployment:', `"${deployment}"`, 'isValid:', isValid);
    return isValid;
  },
}));
