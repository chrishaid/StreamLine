import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useHelpStore } from '../../store/useHelpStore';
import { tutorialSteps } from '../../data/helpContent';

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export function SpotlightTutorial() {
  const {
    showSpotlightTutorial,
    tutorialStep,
    nextStep,
    prevStep,
    completeTutorial,
    skipTutorial,
  } = useHelpStore();

  const [spotlightPos, setSpotlightPos] = useState<SpotlightPosition | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);

  const currentStep = tutorialSteps[tutorialStep];
  const isFirstStep = tutorialStep === 0;
  const isLastStep = tutorialStep === tutorialSteps.length - 1;

  const calculatePositions = useCallback(() => {
    if (!currentStep) return;

    if (currentStep.position === 'center' || !currentStep.target) {
      // Center modal - no spotlight
      setSpotlightPos(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 220,
        arrowPosition: 'top',
      });
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (!element) {
      // Element not found, show centered
      setSpotlightPos(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 200,
        left: window.innerWidth / 2 - 220,
        arrowPosition: 'top',
      });
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 8;

    // Set spotlight position
    setSpotlightPos({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position based on step preference
    const tooltipWidth = 400;
    const tooltipHeight = 280;
    const gap = 16;

    let top = 0;
    let left = 0;
    let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'left';

    switch (currentStep.position) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        arrowPosition = 'left';
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        arrowPosition = 'right';
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'top';
        break;
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = 'bottom';
        break;
      default:
        top = rect.bottom + gap;
        left = rect.left;
        arrowPosition = 'top';
    }

    // Keep tooltip within viewport
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    setTooltipPos({ top, left, arrowPosition });
  }, [currentStep]);

  useEffect(() => {
    if (showSpotlightTutorial) {
      calculatePositions();
      window.addEventListener('resize', calculatePositions);
      return () => window.removeEventListener('resize', calculatePositions);
    }
  }, [showSpotlightTutorial, tutorialStep, calculatePositions]);

  // Keyboard navigation
  useEffect(() => {
    if (!showSpotlightTutorial) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastStep) {
          completeTutorial();
        } else {
          nextStep();
        }
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSpotlightTutorial, isFirstStep, isLastStep, nextStep, prevStep, completeTutorial, skipTutorial]);

  if (!showSpotlightTutorial || !currentStep) return null;

  const content = (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop with spotlight cutout */}
      <div className="absolute inset-0">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightPos && (
                <rect
                  x={spotlightPos.left}
                  y={spotlightPos.top}
                  width={spotlightPos.width}
                  height={spotlightPos.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Spotlight ring */}
      {spotlightPos && (
        <div
          className="absolute border-2 border-violet-400 rounded-xl pointer-events-none animate-pulse"
          style={{
            top: spotlightPos.top,
            left: spotlightPos.left,
            width: spotlightPos.width,
            height: spotlightPos.height,
            boxShadow: '0 0 0 4px rgba(139, 92, 246, 0.3), 0 0 20px rgba(139, 92, 246, 0.4)',
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          className="absolute bg-white rounded-2xl shadow-2xl p-6 w-[400px] animate-fade-in"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {/* Arrow */}
          <div
            className={`absolute w-4 h-4 bg-white transform rotate-45 ${
              tooltipPos.arrowPosition === 'left'
                ? '-left-2 top-1/2 -translate-y-1/2'
                : tooltipPos.arrowPosition === 'right'
                ? '-right-2 top-1/2 -translate-y-1/2'
                : tooltipPos.arrowPosition === 'top'
                ? 'left-1/2 -top-2 -translate-x-1/2'
                : 'left-1/2 -bottom-2 -translate-x-1/2'
            }`}
          />

          {/* Close button */}
          <button
            onClick={skipTutorial}
            className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="pr-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{currentStep.title}</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {currentStep.description}
            </p>

            {/* Image preview for welcome step */}
            {currentStep.image && currentStep.position === 'center' && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={currentStep.image}
                  alt={currentStep.title}
                  className="w-full h-40 object-cover object-top"
                />
              </div>
            )}

            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1.5">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === tutorialStep
                        ? 'bg-violet-600'
                        : index < tutorialStep
                        ? 'bg-violet-300'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400">
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </span>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                onClick={skipTutorial}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Skip Tour
              </button>
              <button
                onClick={isLastStep ? completeTutorial : nextStep}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
              >
                {isLastStep ? (
                  "Let's Go!"
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
