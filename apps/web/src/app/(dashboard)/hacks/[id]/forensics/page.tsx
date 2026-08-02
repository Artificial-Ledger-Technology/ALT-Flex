import React from 'react';
import { TraceViewer } from '@/components/forensics/TraceViewer';
import { mockTraceData } from '@/components/forensics/mockTraceData';
import { StorageDiffInspector } from '@/components/forensics/StorageDiffInspector';
import { mockStorageDiffs, mockGlobalDiffSummary } from '@/components/forensics/mockStorageData';

export default function ForensicTracePage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ height: '800px' }}>
        <TraceViewer traceResult={mockTraceData} />
      </div>
      <div>
        <StorageDiffInspector storageDiffs={mockStorageDiffs} globalSummary={mockGlobalDiffSummary} />
      </div>
    </div>
  );
}
