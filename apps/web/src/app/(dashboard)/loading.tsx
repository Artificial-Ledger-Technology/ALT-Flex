import styles from './loading.module.css';

export default function DashboardLoading(): React.ReactNode {
  return (
    <div className={`flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 ${styles.loadingContainer}`}>
      <div className={styles.headerRow}>
        <div className={`animate-shimmer ${styles.titleSkeleton}`} />
        <div className={`animate-shimmer ${styles.actionSkeleton}`} />
      </div>
      
      <div className={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`animate-shimmer ${styles.cardSkeleton}`} />
        ))}
      </div>

      <div className={`animate-shimmer ${styles.mainSkeleton}`} />
    </div>
  );
}
