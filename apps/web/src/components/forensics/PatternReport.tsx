import React from 'react';
import { PatternCard, type UIPatternMatch } from './PatternCard.js';
import { MermaidDiagram } from './MermaidDiagram.js';
import { ReportActions } from './ReportActions.js';
import { ShieldCheck, Calendar, Activity } from 'lucide-react';

export interface ForensicReportPayload {
  id: string;
  hackIncidentId: string;
  analysisMode: 'simulation' | 'trace';
  chain: string;
  txHash?: string;
  metadata: {
    analysisDuration: number;
    timestamp: Date;
    engineVersion: string;
  };
  patterns: {
    detected: UIPatternMatch[];
    primaryPattern: string;
    confidence: number;
  };
  narrativeSummary?: string;
  attackStageDiagram?: string;
}

interface PatternReportProps {
  report: ForensicReportPayload;
}

export function PatternReport({ report }: PatternReportProps): React.ReactNode {
  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-12 print:max-w-none print:m-0 print:p-0">
      
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:shadow-none print:border-b print:rounded-none">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold tracking-wide text-sm uppercase">
            <ShieldCheck className="w-5 h-5" />
            Forensic Pattern Report
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Incident: {report.hackIncidentId}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(report.metadata.timestamp).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              Mode: <span className="capitalize">{report.analysisMode}</span>
            </div>
            {report.txHash && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-xs">
                  {report.txHash.slice(0, 10)}...{report.txHash.slice(-8)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full text-xs font-medium">
              {report.chain}
            </div>
          </div>
        </div>

        <ReportActions reportId={report.id} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Patterns */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Detected Patterns
            </h2>
            <div className="text-sm text-slate-500">
              {report.patterns.detected.length} pattern(s) identified
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {report.patterns.detected.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                No standard exploit patterns were detected with high confidence in this trace.
              </div>
            ) : (
              report.patterns.detected.map((pattern, idx) => (
                <PatternCard key={idx} pattern={pattern} />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Narrative & Diagram */}
        <div className="flex flex-col gap-6">
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:shadow-none">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
              Executive Summary
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {report.narrativeSummary || 
               "Detailed auto-generated prose narrative is not available for this trace. The attack signatures suggest the primary vector was: " + report.patterns.primaryPattern + "."}
            </p>
          </div>

          {report.attackStageDiagram && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:shadow-none overflow-hidden">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                Attack Sequence
              </h3>
              <MermaidDiagram chart={report.attackStageDiagram} id={report.id} />
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
