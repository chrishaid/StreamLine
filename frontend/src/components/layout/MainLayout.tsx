import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAppStore } from '../../store/useAppStore';

interface MainLayoutProps {
  children: ReactNode;
  showChat?: boolean;
}

export function MainLayout({ children, showChat = false }: MainLayoutProps) {
  const { ui } = useAppStore();
  const { chatPanelCollapsed } = ui;

  return (
    <div className="h-screen p-6 bg-mist">
      <div className="h-full flex flex-col overflow-hidden rounded-2xl shadow-soft-lg bg-white border border-mist-300">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className={`flex-1 flex flex-col ${showChat && !chatPanelCollapsed ? 'mr-96' : ''}`}>
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}
