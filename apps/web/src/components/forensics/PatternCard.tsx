import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { type PatternMatch } from '@aegis/core'; // Assuming it's exported from core, or we can use local types.
// Wait, the types are in forensic-engine, but this is apps/web. Since the web package probably consumes types via core, let's just use generic any or inline types if it fails, or define the interface here to be safe.
// Let's define the interface locally to ensure it builds correctly, as the UI doesn't strictly depend on the backend's exact type shape for rendering.

export interface UIPatternMatch {
  patternId: string;
  patternName: string;
  confidence: number;
  description: string;
  narrative?: string;
  evidence: {
    callNodeIds: string[];
    storageSlots: string[];
    eventSignatures: string[];
  };
}

interface PatternCardProps {
  pattern: UIPatternMatch;
}

export function PatternCard({ pattern }: PatternCardProps): React.ReactNode {
  // Determine color based on confidence
  let colorClass = 'bg-blue-500';
  let Icon = Info;
  let textClass = 'text-blue-700 dark:text-blue-400';
  
  if (pattern.confidence >= 0.8) {
    colorClass = 'bg-red-500';
    Icon = ShieldAlert;
    textClass = 'text-red-700 dark:text-red-400';
  } else if (pattern.confidence >= 0.5) {
    colorClass = 'bg-orange-500';
    Icon = AlertTriangle;
    textClass = 'text-orange-700 dark:text-orange-400';
  } else {
    colorClass = 'bg-yellow-500';
    Icon = AlertCircle;
    textClass = 'text-yellow-700 dark:text-yellow-400';
  }

  const confidencePercent = Math.round(pattern.confidence * 100);

  return (
    <div className="flex flex-col gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:shadow-none print:border-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={\`p-2 rounded-lg bg-opacity-10 \${colorClass.replace('bg-', 'bg-').replace('500', '100')} dark:bg-opacity-20\`}>
            <Icon className={\`w-6 h-6 \${textClass}\`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {pattern.patternName}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pattern.description}
            </p>
          </div>
        </div>
        
        {/* Confidence Score */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {confidencePercent}% Confidence
          </span>
          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={\`h-full \${colorClass} transition-all duration-500\`} 
              style={{ width: \`\${confidencePercent}%\` }}
            />
          </div>
        </div>
      </div>

      {/* Narrative */}
      {pattern.narrative && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800">
          <strong>Attack Narrative: </strong>
          {pattern.narrative}
        </div>
      )}

      {/* Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pattern.evidence.callNodeIds.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Call Trace Evidence</h4>
            <ul className="space-y-1">
              {pattern.evidence.callNodeIds.map(nodeId => (
                <li key={nodeId} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-xs">
                    {nodeId}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pattern.evidence.storageSlots.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Storage Manipulations</h4>
            <ul className="space-y-1">
              {pattern.evidence.storageSlots.map(slot => (
                <li key={slot} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-xs truncate max-w-[200px]">
                    {slot}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
