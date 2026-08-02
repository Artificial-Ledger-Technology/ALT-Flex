import React from 'react';
import { TraceViewer } from '@/components/forensics/TraceViewer';
import { mockTraceData } from '@/components/forensics/mockTraceData';

export default function ForensicTracePage({ params }: { params: { id: string } }) {
  return (
    <div style={{ height: 'calc(100vh - 120px)', padding: 'var(--spacing-6)' }}>
      <TraceViewer traceResult={mockTraceData} />
    </div>
  );
}
