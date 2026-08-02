import React, { useRef, useMemo, useState, useEffect } from 'react';
import { CallTreeNode } from '@aegis/forensic-engine';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CallTreeNodeRow } from './CallTreeNodeRow';
import styles from './TraceViewer.module.css';

interface FlattenedNode {
  node: CallTreeNode;
  isLastChildList: boolean[];
}

interface CallTreeListProps {
  rootNode: CallTreeNode;
  searchQuery: string;
  expandAll: boolean;
  onSelectNode: (node: CallTreeNode) => void;
  selectedNodeId: string | null;
}

export const CallTreeList: React.FC<CallTreeListProps> = ({
  rootNode,
  searchQuery,
  expandAll,
  onSelectNode,
  selectedNodeId,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // State to track expanded nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode.id]));

  // Auto expand all when toggle is clicked
  useEffect(() => {
    if (expandAll) {
      const allIds = new Set<string>();
      const gatherIds = (n: CallTreeNode) => {
        allIds.add(n.id);
        n.children.forEach(gatherIds);
      };
      gatherIds(rootNode);
      setExpandedNodes(allIds);
    } else {
      setExpandedNodes(new Set([rootNode.id]));
    }
  }, [expandAll, rootNode]);

  // Expand node to ensure search results are visible
  useEffect(() => {
    if (searchQuery) {
      const newExpanded = new Set(expandedNodes);
      const query = searchQuery.toLowerCase();
      
      const searchAndExpand = (n: CallTreeNode): boolean => {
        let isMatch = 
          n.to.toLowerCase().includes(query) || 
          n.from.toLowerCase().includes(query) ||
          (n.decodedCall?.name.toLowerCase().includes(query) ?? false);
          
        let hasMatchingChild = false;
        for (const child of n.children) {
          if (searchAndExpand(child)) {
            hasMatchingChild = true;
          }
        }
        
        if (hasMatchingChild || isMatch) {
          newExpanded.add(n.id);
          return true;
        }
        return false;
      };
      
      searchAndExpand(rootNode);
      setExpandedNodes(newExpanded);
    }
  }, [searchQuery, rootNode]); // Omitting expandedNodes to avoid loops

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Flatten tree for virtualized list
  const visibleNodes = useMemo(() => {
    const result: FlattenedNode[] = [];
    const query = searchQuery.toLowerCase();

    const traverse = (node: CallTreeNode, isLastChildList: boolean[]) => {
      // Filter logic
      const isMatch = !query || 
        node.to.toLowerCase().includes(query) || 
        node.from.toLowerCase().includes(query) ||
        (node.decodedCall?.name.toLowerCase().includes(query) ?? false);

      // We always show the root or nodes that match or if search is empty
      result.push({ node, isLastChildList });

      if (expandedNodes.has(node.id)) {
        node.children.forEach((child: CallTreeNode, index: number) => {
          traverse(child, [...isLastChildList, index === node.children.length - 1]);
        });
      }
    };

    traverse(rootNode, []);
    return result;
  }, [rootNode, expandedNodes, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // estimated row height in px
    overscan: 10,
  });

  return (
    <div className={styles.treeContainer} ref={parentRef}>
      <div 
        className={styles.treeInner}
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = visibleNodes[virtualRow.index];
          if (!item) return null;
          const { node, isLastChildList } = item;
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CallTreeNodeRow
                node={node}
                isExpanded={expandedNodes.has(node.id)}
                isSelected={selectedNodeId === node.id}
                onToggle={(e) => toggleNode(node.id, e)}
                onClick={() => onSelectNode(node)}
                isLastChildList={isLastChildList}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
