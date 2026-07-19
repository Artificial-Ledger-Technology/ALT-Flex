'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Shield,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { skillsApi } from '../../lib/api-client';
import type { AISkillFile, SkillSafetyResponse } from '@aegis/core';

interface SkillDetailModalProps {
  skill: AISkillFile;
  isOpen: boolean;
  onClose: () => void;
}

export function SkillDetailModal({
  skill,
  isOpen,
  onClose,
}: SkillDetailModalProps): React.ReactElement | null {
  const [content, setContent] = useState<string>('');
  const [safety, setSafety] = useState<SkillSafetyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const fetchData = async (): Promise<void> => {
        try {
          setIsLoading(true);
          const [contentRes, safetyRes] = await Promise.all([
            skillsApi.getSkillContent(skill.id),
            skillsApi.getSkillSafety(skill.id).catch(() => null),
          ]);
          setContent(contentRes.content);
          setSafety(safetyRes);
        } catch (error) {
          console.error('Failed to load skill details:', error);
          setContent('// Error loading content');
        } finally {
          setIsLoading(false);
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchData();
    } else {
      document.body.style.overflow = 'unset';
    }
    return (): void => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, skill.id]);

  if (!isOpen) return null;

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      await skillsApi.incrementCopyCount(skill.id).catch(console.error);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getSafetyIcon = (label?: string): React.ReactElement => {
    switch (label) {
      case 'safe':
        return <ShieldCheck size={16} className="text-emerald-500" />;
      case 'suspicious':
        return <ShieldAlert size={16} className="text-amber-500" />;
      case 'malicious':
        return <Shield size={16} className="text-red-500" />;
      default:
        return <HelpCircle size={16} className="text-gray-400" />;
    }
  };

  const syntaxLang =
    skill.format.toLowerCase() === 'yaml'
      ? 'yaml'
      : skill.format.toLowerCase() === 'json'
        ? 'json'
        : 'markdown';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e): void => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            <h2
              style={{ margin: 0, fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)' }}
            >
              {skill.name}
            </h2>
            <div style={metadataRowStyle}>
              <span>by {skill.author}</span> •
              <span style={{ textTransform: 'uppercase' }}>{skill.platform}</span> •
              <span style={{ textTransform: 'capitalize' }}>{skill.language}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              style={actionBtnStyle}
              onClick={(): void => {
                void handleCopy();
              }}
              title="Copy Full Content"
            >
              {isCopied ? <Check size={18} color="var(--accent-emerald)" /> : <Copy size={18} />}
              <span>Copy Full</span>
            </button>
            <button style={closeBtnStyle} onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={contentLayout}>
          <div style={codeSectionStyle}>
            {isLoading ? (
              <div style={loadingStyle}>Loading content...</div>
            ) : (
              <SyntaxHighlighter
                language={syntaxLang}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  borderRadius: 'var(--radius-md)',
                  flexGrow: 1,
                  maxHeight: '500px',
                }}
                showLineNumbers
              >
                {content}
              </SyntaxHighlighter>
            )}
          </div>

          <div style={sidebarSectionStyle}>
            <h3
              style={{
                margin: '0 0 var(--space-4) 0',
                fontSize: 'var(--font-size-md)',
                color: 'var(--text-primary)',
              }}
            >
              Safety Scan Results
            </h3>
            {isLoading ? (
              <div style={loadingStyle}>Loading safety info...</div>
            ) : safety?.latestScan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={safetyCardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    {getSafetyIcon(safety.currentLabel)}
                    <strong style={{ textTransform: 'capitalize' }}>{safety.currentLabel}</strong>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {safety.latestScan.finalLabel === safety.currentLabel
                      ? 'Current Label'
                      : 'Scan Override'}
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={metaDetailStyle}>
                    <strong>Critical:</strong> {safety.latestScan.criticalCount}
                  </div>
                  <div style={metaDetailStyle}>
                    <strong>High:</strong> {safety.latestScan.highCount}
                  </div>
                  <div style={metaDetailStyle}>
                    <strong>Medium:</strong> {safety.latestScan.mediumCount}
                  </div>
                  <div style={metaDetailStyle}>
                    <strong>Low:</strong> {safety.latestScan.lowCount}
                  </div>
                  <div style={metaDetailStyle}>
                    <strong>Info:</strong> {safety.latestScan.infoCount}
                  </div>
                </div>

                <div style={metaDetailStyle}>
                  <strong>Scanner Version:</strong> {safety.latestScan.scannerVersion}
                </div>
                <div style={metaDetailStyle}>
                  <strong>Scanned At:</strong>{' '}
                  {new Date(safety.latestScan.scanTimestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                No recent safety scans available.
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-6)' }}>
              <a
                href={`https://github.com/ALT-Flex/skills/blob/main/${skill.id}`}
                target="_blank"
                rel="noreferrer"
                style={githubLinkStyle}
              >
                <ExternalLink size={14} />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 'var(--space-4)',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-xl)',
  width: '100%',
  maxWidth: '1000px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: 'var(--space-4) var(--space-6)',
  borderBottom: '1px solid var(--border-subtle)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'var(--bg-secondary)',
};

const metadataRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  color: 'var(--text-muted)',
  fontSize: 'var(--font-size-sm)',
  marginTop: 'var(--space-1)',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: 'var(--space-1)',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const actionBtnStyle: React.CSSProperties = {
  ...closeBtnStyle,
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-tertiary)',
  padding: 'var(--space-2) var(--space-4)',
  gap: 'var(--space-2)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 500,
  border: '1px solid var(--border-subtle)',
};

const contentLayout: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexGrow: 1,
  overflow: 'hidden',
};

const codeSectionStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: 'var(--space-4)',
  overflowY: 'auto',
  backgroundColor: 'var(--bg-primary)',
};

const sidebarSectionStyle: React.CSSProperties = {
  width: '300px',
  flexShrink: 0,
  borderLeft: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-secondary)',
  padding: 'var(--space-4)',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '200px',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
};

const safetyCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-tertiary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
};

const metaDetailStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
};

const githubLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  textDecoration: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--font-size-sm)',
  border: '1px solid var(--border-subtle)',
  transition: 'background-color 0.2s',
};
