import { useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useHelpStore } from '../../store/useHelpStore';
import { helpSections } from '../../data/helpContent';

export function HelpDrawer() {
  const { showHelpDrawer, helpDrawerSection, closeHelpDrawer } = useHelpStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to section when drawer opens with a specific section
  useEffect(() => {
    if (showHelpDrawer && helpDrawerSection && contentRef.current) {
      const sectionElement = contentRef.current.querySelector(
        `[data-section="${helpDrawerSection}"]`
      );
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [showHelpDrawer, helpDrawerSection]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHelpDrawer) {
        closeHelpDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelpDrawer, closeHelpDrawer]);

  if (!showHelpDrawer) return null;

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={closeHelpDrawer}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Help & Guide</h2>
            <p className="text-sm text-slate-500">Quick reference for StreamLine</p>
          </div>
          <button
            onClick={closeHelpDrawer}
            className="p-2 hover:bg-violet-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {helpSections.map((section) => (
              <div
                key={section.id}
                data-section={section.id}
                className="bg-white border border-violet-100 rounded-xl overflow-hidden"
              >
                {/* Section Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-violet-50/50">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-600">
                    {getIcon(section.icon)}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800">{section.title}</h3>
                    <p className="text-xs text-slate-500">{section.description}</p>
                  </div>
                </div>

                {/* Section Content */}
                <div className="p-4">
                  {section.image && (
                    <div className="mb-4 rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={section.image}
                        alt={section.title}
                        className="w-full h-32 object-cover object-top"
                      />
                    </div>
                  )}

                  <p className="text-sm text-slate-600 mb-3">{section.content}</p>

                  {section.keyPoints && section.keyPoints.length > 0 && (
                    <ul className="space-y-2">
                      {section.keyPoints.map((point, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-slate-600"
                        >
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-2 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* External Link */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <a
              href="https://camunda.com/bpmn/reference/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-sm text-slate-600 hover:text-violet-600 transition-colors"
            >
              <span>Learn more about BPMN 2.0</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
