import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ExternalLink, ArrowLeft, Maximize2, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { helpSections } from '../data/helpContent';
import { useHelpStore } from '../store/useHelpStore';

export function HelpPage() {
  const navigate = useNavigate();
  const { startTutorial } = useHelpStore();
  const [activeSection, setActiveSection] = useState(helpSections[0]?.id || '');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const sections = contentRef.current.querySelectorAll('[data-section]');
      let currentSection = activeSection;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 200) {
          currentSection = section.getAttribute('data-section') || currentSection;
        }
      });

      setActiveSection(currentSection);
    };

    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.addEventListener('scroll', handleScroll);
      return () => contentEl.removeEventListener('scroll', handleScroll);
    }
  }, [activeSection]);

  const scrollToSection = (sectionId: string) => {
    const element = contentRef.current?.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
  };

  const handleTakeTour = () => {
    startTutorial();
    navigate('/');
  };

  return (
    <MainLayout hideFooter>
      <div className="h-full flex bg-gradient-to-br from-violet-50/30 via-slate-50 to-slate-100/80">
        {/* Table of Contents - Fixed Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-violet-100 bg-white/80 backdrop-blur-sm flex flex-col h-full">
          <div className="p-6 border-b border-violet-100 flex-shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Library
            </button>
            <h2 className="text-lg font-semibold text-slate-800">Help & Guide</h2>
            <p className="text-sm text-slate-500 mt-1">StreamLine Documentation</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {helpSections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center gap-3 ${
                      activeSection === section.id
                        ? 'bg-violet-100 text-violet-700 font-medium'
                        : 'text-slate-600 hover:bg-violet-50 hover:text-violet-600'
                    }`}
                  >
                    <span className="flex-shrink-0 text-slate-400">
                      {getIcon(section.icon)}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-violet-100 space-y-2 flex-shrink-0">
            <button
              onClick={handleTakeTour}
              className="w-full px-4 py-3 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              <Icons.Compass className="w-4 h-4" />
              Take the Tour
            </button>
            <a
              href="https://camunda.com/bpmn/reference/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 border border-violet-200 text-slate-600 rounded-xl text-sm hover:bg-violet-50 hover:border-violet-300 transition-colors text-center"
            >
              <span className="flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                BPMN Reference
              </span>
            </a>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-10">
            {/* Page Header */}
            <div className="mb-10">
              <h1 className="text-3xl font-semibold text-slate-800 mb-3">Visual Guide</h1>
              <p className="text-base text-slate-500">
                Learn how to create, manage, and optimize your business process diagrams with StreamLine.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {helpSections.map((section) => (
                <section
                  key={section.id}
                  data-section={section.id}
                  className="scroll-mt-8"
                >
                  <div className="bg-white rounded-2xl border border-violet-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Section Header */}
                    <div className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-violet-50 to-white border-b border-violet-100">
                      <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                        {getIcon(section.icon)}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-800">{section.title}</h2>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                    </div>

                    {/* Section Image */}
                    {section.image && (
                      <div className="px-6 pt-6">
                        <div
                          className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-200 hover:border-violet-300 transition-colors"
                          onClick={() => setZoomedImage(section.image!)}
                        >
                          <img
                            src={section.image}
                            alt={section.title}
                            className="w-full h-auto object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-slate-600">
                              <Maximize2 className="w-4 h-4" />
                              Click to enlarge
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section Content */}
                    <div className="p-6">
                      <p className="text-slate-600 leading-relaxed mb-5">{section.content}</p>

                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <ul className="space-y-3">
                          {section.keyPoints.map((point, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-3 text-slate-600"
                            >
                              <ChevronRight className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <p className="text-slate-500 text-sm mb-4">
                Need more help? Check out the official BPMN 2.0 specification and best practices.
              </p>
              <a
                href="https://camunda.com/bpmn/reference/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Camunda BPMN Reference Guide
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed view"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </MainLayout>
  );
}
