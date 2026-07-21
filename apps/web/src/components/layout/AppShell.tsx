'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '../ui/ToastContext';
import styles from './AppShell.module.css';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): React.ReactNode {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = (): void => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = (): void => {
    setIsSidebarOpen(false);
  };

  return (
    <ToastProvider>
      <div className={styles.appShell}>
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className={styles.mainContent}>
          <Header onMenuAction={toggleSidebar} isMenuOpen={isSidebarOpen} />
          <main className={styles.pageContainer}>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
