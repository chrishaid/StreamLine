import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAppStore } from '../../store/useAppStore';

interface MainLayoutProps {
  children: ReactNode;
  showChat?: boolean;
  hideFooter?: boolean;
  compact?: boolean;
}

export function MainLayout({ children, showChat = false, hideFooter = false, compact = false }: MainLayoutProps) {
  const { ui } = useAppStore();
  const { chatPanelCollapsed } = ui;

  // Use compact padding for editor pages to maximize canvas space
  const containerPadding = compact ? 'p-3' : 'p-6';

  return (
    <div className={`h-screen ${containerPadding} bg-mist`}>
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
        {!hideFooter && <Footer />}
      </div>
    </div>
  );
}
