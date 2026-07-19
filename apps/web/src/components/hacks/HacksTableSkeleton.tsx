import styles from './HacksTable.module.css';

export function HacksTableSkeleton(): React.ReactNode {
  // Create 10 skeleton rows
  const skeletonRows = Array.from({ length: 10 }).map((_, i) => (
    <tr key={i} className={styles.tr}>
      <td className={styles.td}>
        <div
          className={`${styles.skeleton ?? ''} ${styles.skeletonText ?? ''} ${styles.skeletonWSmall ?? ''}`}
        />
      </td>
      <td className={styles.td}>
        <div
          className={`${styles.skeleton ?? ''} ${styles.skeletonText ?? ''} ${styles.skeletonWMedium ?? ''}`}
        />
      </td>
      <td className={styles.td}>
        <div className={`${styles.skeleton ?? ''} ${styles.skeletonBadge ?? ''}`} />
      </td>
      <td className={styles.td}>
        <div
          className={`${styles.skeleton ?? ''} ${styles.skeletonText ?? ''} ${styles.skeletonWMedium ?? ''}`}
        />
      </td>
      <td className={styles.td}>
        <div className={`${styles.skeleton ?? ''} ${styles.skeletonBadge ?? ''}`} />
      </td>
      <td className={styles.td}>
        <div className={`${styles.skeleton ?? ''} ${styles.skeletonIcon ?? ''}`} />
      </td>
      <td className={styles.td}>
        <div className={`${styles.skeleton ?? ''} ${styles.skeletonIcon ?? ''}`} />
      </td>
    </tr>
  ));

  return (
    <div className={styles.container}>
      <div className={styles.scrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Protocol</th>
              <th className={styles.th}>Chain</th>
              <th className={styles.th}>Loss (USD)</th>
              <th className={styles.th}>Attack Vector</th>
              <th className={styles.th}>POC</th>
              <th className={styles.th}>Sources</th>
            </tr>
          </thead>
          <tbody>{skeletonRows}</tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div
          className={`${styles.skeleton ?? ''} ${styles.skeletonText ?? ''} ${styles.skeletonWMedium ?? ''}`}
          style={{ width: '150px' }}
        />
        <div className={styles.buttonGroup}>
          <div
            className={`${styles.skeleton ?? ''} ${styles.skeletonButton ?? ''}`}
            style={{ width: '80px', height: '36px' }}
          />
          <div
            className={`${styles.skeleton ?? ''} ${styles.skeletonButton ?? ''}`}
            style={{ width: '80px', height: '36px' }}
          />
        </div>
      </div>
    </div>
  );
}
