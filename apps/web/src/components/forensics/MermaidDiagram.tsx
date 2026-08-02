'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

interface MermaidDiagramProps {
  chart: string;
  id: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps): React.ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const { theme } = useTheme();

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async (): Promise<void> => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });

        if (containerRef.current) {
          const { svg } = await mermaid.render(`mermaid-${id}`, chart);
          if (isMounted) {
            setSvgContent(svg);
          }
        }
      } catch (error) {
        console.error('Failed to render mermaid diagram', error);
      }
    };

    void renderDiagram();

    return (): void => {
      isMounted = false;
    };
  }, [chart, id, theme]);

  return (
    <div
      className="flex justify-center items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-x-auto print:!bg-white"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
