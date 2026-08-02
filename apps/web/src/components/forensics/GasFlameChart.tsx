import React from 'react';
import { CallTreeNode } from '@aegis/forensic-engine';
import styles from './TraceViewer.module.css';

interface GasFlameChartProps {
  rootNode: CallTreeNode;
}

interface FlameBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  gas: bigint;
  depth: number;
}

export const GasFlameChart: React.FC<GasFlameChartProps> = ({ rootNode }) => {
  const totalGas = Number(rootNode.gasUsed);
  if (totalGas === 0) return null;

  const blocks: FlameBlock[] = [];
  const ROW_HEIGHT = 15;
  
  const traverse = (node: CallTreeNode, currentX: number, depth: number) => {
    const widthPercentage = (Number(node.gasUsed) / totalGas) * 100;
    
    blocks.push({
      x: currentX,
      y: depth * ROW_HEIGHT,
      width: widthPercentage,
      height: ROW_HEIGHT - 2,
      name: node.decodedCall?.name || node.to,
      gas: node.gasUsed,
      depth,
    });

    let childX = currentX;
    for (const child of node.children) {
      traverse(child, childX, depth + 1);
      childX += (Number(child.gasUsed) / totalGas) * 100;
    }
  };

  traverse(rootNode, 0, 0);

  const maxDepth = Math.max(...blocks.map((b) => b.depth));
  const svgHeight = (maxDepth + 1) * ROW_HEIGHT;

  // Generate colors based on depth
  const getColor = (depth: number) => {
    const colors = ['#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981'];
    return colors[depth % colors.length];
  };

  return (
    <div className={styles.flameChartContainer}>
      <div className={styles.flameChartTitle}>Gas Distribution (Flame Chart)</div>
      <div className={styles.flameChart}>
        <svg width="100%" height="100%" viewBox={`0 0 100 ${Math.max(60, svgHeight)}`} preserveAspectRatio="none">
          {blocks.map((block, idx) => (
            <g key={`${block.name}-${idx}`}>
              <title>{block.name} - {block.gas.toString()} gas</title>
              <rect
                x={`${block.x}%`}
                y={block.y}
                width={`${Math.max(0.1, block.width)}%`}
                height={block.height}
                fill={getColor(block.depth)}
                rx={1}
                opacity={0.8}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
