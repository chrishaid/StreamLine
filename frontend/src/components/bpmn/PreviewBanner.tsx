import { useState } from 'react';
import { Check, X, GitBranch, RefreshCw, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface PreviewBannerProps {
  onAccept: (createNewVersion: boolean) => void;
  onReject: () => void;
}

export function PreviewBanner({ onAccept, onReject }: PreviewBannerProps) {
  const { isPreviewMode, previewSource, sendPreviewFeedback } = useAppStore();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showVersionChoice, setShowVersionChoice] = useState(false);

  if (!isPreviewMode) return null;

  const handleRequestChanges = () => {
    if (feedback.trim()) {
      sendPreviewFeedback(feedback.trim());
      setFeedback('');
      setShowFeedback(false);
    }
  };

  const handleAcceptClick = () => {
    setShowVersionChoice(true);
  };

  const handleVersionChoice = (createNew: boolean) => {
    onAccept(createNew);
    setShowVersionChoice(false);
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Preview Mode</p>
              <p className="text-xs text-white/80">
                {previewSource?.description || 'Claude suggested changes to your diagram'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Feedback button */}
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Request Changes</span>
            </button>

            {/* Reject button */}
            <button
              onClick={onReject}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-red-500 rounded-lg transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Discard</span>
            </button>

            {/* Accept button */}
            {!showVersionChoice ? (
              <button
                onClick={handleAcceptClick}
                className="flex items-center gap-2 px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg transition-colors text-sm font-semibold"
              >
                <Check className="w-4 h-4" />
                <span>Accept</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white rounded-lg p-1">
                <button
                  onClick={() => handleVersionChoice(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors text-xs font-medium"
                  title="Update current diagram"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update</span>
                </button>
                <button
                  onClick={() => handleVersionChoice(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors text-xs font-medium"
                  title="Create new version"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>New Version</span>
                </button>
                <button
                  onClick={() => setShowVersionChoice(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback input */}
        {showFeedback && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestChanges()}
              placeholder="Describe what changes you'd like..."
              className="flex-1 px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              autoFocus
            />
            <button
              onClick={handleRequestChanges}
              disabled={!feedback.trim()}
              className="px-4 py-2 bg-white text-amber-600 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-50 transition-colors"
            >
              Send Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Toggle button to switch between preview and current diagram view
 */
export function PreviewToggle() {
  const { isPreviewMode, previewBpmnXml } = useAppStore();
  const [showingPreview, setShowingPreview] = useState(true);

  if (!isPreviewMode || !previewBpmnXml) return null;

  return (
    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-white rounded-xl shadow-lg border border-slate-200 p-1">
      <button
        onClick={() => setShowingPreview(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          !showingPreview
            ? 'bg-violet-100 text-violet-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <EyeOff className="w-4 h-4" />
        Current
      </button>
      <button
        onClick={() => setShowingPreview(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          showingPreview
            ? 'bg-amber-100 text-amber-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Eye className="w-4 h-4" />
        Preview
      </button>
    </div>
  );
}
