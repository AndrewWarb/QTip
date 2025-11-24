'use client';

import { useStatsStore } from '@/lib/store';
import { useEffect } from 'react';

export default function StatsPanel() {
  const { totalPiiEmails, fetchStats } = useStatsStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full text-center text-gray-800 text-lg font-medium">
      Total PII emails submitted:{' '}
      <span className="font-semibold text-gray-900">{totalPiiEmails}</span>
    </div>
  );
}