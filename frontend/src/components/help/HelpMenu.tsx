import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, BookOpen, Compass, MessageSquare, ExternalLink } from 'lucide-react';
import { useHelpStore } from '../../store/useHelpStore';
import { useAppStore } from '../../store/useAppStore';

export function HelpMenu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { startTutorial, openHelpDrawer } = useHelpStore();
  const { toggleChatPanel } = useAppStore();

  const handleVisualGuide = () => {
    setIsOpen(false);
    navigate('/help');
  };

  const handleTakeTour = () => {
    setIsOpen(false);
    startTutorial();
  };

  const handleAskClaude = () => {
    setIsOpen(false);
    toggleChatPanel();
  };

  const handleQuickHelp = () => {
    setIsOpen(false);
    openHelpDrawer();
  };

  return (
    <div className="relative" data-tutorial="help-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 hover:bg-violet-50 rounded-xl transition-colors min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        aria-label="Help menu"
      >
        <HelpCircle className="w-5 h-5 text-slate-500" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg shadow-violet-500/10 border border-violet-100 py-2 z-20 animate-fade-in">
            <div className="px-4 py-2 border-b border-violet-100">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Help & Resources
              </p>
            </div>

            <div className="p-2">
              <button
                onClick={handleVisualGuide}
                className="w-full px-3 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center gap-3 rounded-lg"
              >
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Visual Guide</p>
                  <p className="text-xs text-slate-500">Full documentation with images</p>
                </div>
              </button>

              <button
                onClick={handleTakeTour}
                className="w-full px-3 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center gap-3 rounded-lg"
              >
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Compass className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Take the Tour</p>
                  <p className="text-xs text-slate-500">Interactive walkthrough</p>
                </div>
              </button>

              <button
                onClick={handleQuickHelp}
                className="w-full px-3 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center gap-3 rounded-lg"
              >
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Quick Help</p>
                  <p className="text-xs text-slate-500">Open help panel</p>
                </div>
              </button>

              <button
                onClick={handleAskClaude}
                className="w-full px-3 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center gap-3 rounded-lg"
              >
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Ask Claude</p>
                  <p className="text-xs text-slate-500">AI-powered assistance</p>
                </div>
              </button>
            </div>

            <div className="border-t border-violet-100 p-2">
              <a
                href="https://camunda.com/bpmn/reference/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3 py-2.5 text-left hover:bg-violet-50 transition-colors flex items-center gap-3 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">BPMN Reference</p>
                  <p className="text-xs text-slate-500">Camunda best practices</p>
                </div>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
