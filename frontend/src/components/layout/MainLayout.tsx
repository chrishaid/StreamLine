import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../store/useAppStore';

interface MainLayoutProps {
  children: ReactNode;
  showChat?: boolean;
}

export function MainLayout({ children, showChat = false }: MainLayoutProps) {
  const { ui } = useAppStore();
  const { chatPanelCollapsed } = ui;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className={`flex-1 flex ${showChat && !chatPanelCollapsed ? 'mr-96' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
