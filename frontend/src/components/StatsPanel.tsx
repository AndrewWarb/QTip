'use client';

import { useStatsStore, useAzureOpenAIStore } from '@/lib/store';
import { useEffect } from 'react';

export default function StatsPanel() {
  const { totalPiiEmails, totalPiiHealthData, fetchStats } = useStatsStore();
  const { hasValidCredentials } = useAzureOpenAIStore();

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full text-center space-y-2">
      <div className="text-gray-800 text-lg font-medium">
        Total PII emails submitted:{' '}
        <span className="font-semibold text-gray-900">{totalPiiEmails}</span>
      </div>
      {hasValidCredentials() && (
        <div className="text-gray-800 text-lg font-medium">
          Total PII health data items submitted:{' '}
          <span className="font-semibold text-gray-900">{totalPiiHealthData}</span>
        </div>
      )}
    </div>
  );
}