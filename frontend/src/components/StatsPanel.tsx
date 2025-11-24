'use client';

import { useStatsStore } from '@/lib/store';
import { useEffect } from 'react';

export default function StatsPanel() {
  const { totalPiiEmails, fetchStats } = useStatsStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Statistics</h3>
      <p className="text-gray-700">
        <span className="font-medium">Total PII emails submitted:</span> {totalPiiEmails}
      </p>
    </div>
  );
}
