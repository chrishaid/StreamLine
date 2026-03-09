import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, MessageSquare, Loader2, AlertCircle, Code, ChevronDown, ChevronRight, Sparkles, FileCode } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { ChatMessage } from '../../types';
import { chatApi } from '../../services/api';
import { extractBpmnXmlFromText, validateBpmnXml } from '../../utils/helpers';
import ReactMarkdown from 'react-markdown';

// Streaming status component
function StreamingStatus({ content, isExpanded, onToggle }: {
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Detect what Claude is doing based on content patterns
  const getStatus = () => {
    if (content.includes('```xml') || content.includes('<bpmn:')) {
      return { icon: FileCode, text: 'Generating BPMN diagram...', color: 'text-violet-600' };
    }
    if (content.includes('##') || content.includes('**')) {
      return { icon: Sparkles, text: 'Formatting response...', color: 'text-blue-600' };
    }
    return { icon: Loader2, text: 'Claude is thinking...', color: 'text-slate-500' };
  };

  const status = getStatus();
  const Icon = status.icon;
  const charCount = content.length;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-slate-50 rounded-2xl border border-violet-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50/50 transition-colors"
      >
        <Icon className={`w-4 h-4 ${status.color} ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium text-slate-700">{status.text}</span>
        <span className="text-2xs text-slate-400 ml-auto">{charCount} chars</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-3 max-h-32 overflow-y-auto">
          <p className="text-xs text-slate-500 whitespace-pre-wrap font-mono">
            {content.slice(-500)}
          </p>
        </div>
      )}
    </div>
  );
}

// Component to render message content with markdown and collapsed XML
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  const [showXml, setShowXml] = useState(false);

  // Detect and extract XML blocks
  const xmlRegex = /<\?xml[\s\S]*?<\/bpmn:definitions>|<bpmn:definitions[\s\S]*?<\/bpmn:definitions>/gi;
  const hasXml = xmlRegex.test(content);

  // Replace XML with placeholder for display
  const displayContent = content.replace(xmlRegex, '[BPMN XML - Click to expand]');

  // Extract the XML for the collapsible section
  const xmlMatch = content.match(xmlRegex);
  const xmlContent = xmlMatch ? xmlMatch[0] : null;

  if (isUser) {
    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="bg-forest/10 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-forest/10 p-3 rounded-lg overflow-x-auto text-xs font-mono my-2">{children}</pre>
          ),
        }}
      >
        {hasXml ? displayContent.replace('[BPMN XML - Click to expand]', '') : content}
      </ReactMarkdown>

      {hasXml && xmlContent && (
        <div className="mt-3 border border-violet-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowXml(!showXml)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-violet-50 hover:bg-violet-100 transition-colors text-left"
          >
            {showXml ? (
              <ChevronDown className="w-4 h-4 text-violet-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-violet-600" />
            )}
            <Code className="w-4 h-4 text-violet-600" />
            <span className="text-xs font-medium text-violet-700">BPMN XML Generated</span>
            <span className="text-2xs text-slate-400 ml-auto">
              {showXml ? 'Click to collapse' : 'Click to expand'}
            </span>
          </button>
          {showXml && (
            <pre className="p-4 bg-slate-50 text-2xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
              {xmlContent}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-violet-50 dark:bg-slate-700 rounded-2xl px-5 py-4 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-slate-500 ml-2">Claude is thinking...</span>
      </div>
    </div>
  );
}

const POSITION_CLASSES: Record<'right' | 'left' | 'bottom', { panel: string; collapsed: string }> = {
  right: {
    panel: 'right-4 md:right-8 top-20 md:top-48 bottom-4 md:bottom-8 w-[calc(100vw-2rem)] md:w-[380px] lg:w-[420px]',
    collapsed: 'right-4 md:right-8 bottom-4 md:bottom-8',
  },
  left: {
    panel: 'left-4 md:left-8 top-20 md:top-48 bottom-4 md:bottom-8 w-[calc(100vw-2rem)] md:w-[380px] lg:w-[420px]',
    collapsed: 'left-4 md:left-8 bottom-4 md:bottom-8',
  },
  bottom: {
    panel: 'left-4 md:left-8 right-4 md:right-8 bottom-4 md:bottom-8 h-80 md:h-96',
    collapsed: 'right-4 md:right-8 bottom-4 md:bottom-8',
  },
};

export function ChatPanel() {
  const {
    chatMessages,
    addChatMessage,
    ui,
    toggleChatPanel,
    currentSessionId,
    setCurrentSessionId,
    currentBpmnXml,
    currentProcess,
    userPreferences,
    setPreviewBpmnXml,
    isPreviewMode,
    pendingFeedback,
    clearPendingFeedback,
    previewBpmnXml,
  } = useAppStore();

  const position = (userPreferences.chatPosition || 'right') as 'right' | 'left' | 'bottom';
  const positionClasses = POSITION_CLASSES[position];
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [showStreamingDetails, setShowStreamingDetails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Handle feedback from preview banner
  useEffect(() => {
    if (pendingFeedback && !isSending) {
      // Format the feedback message to include context about what we're iterating on
      const feedbackMessage = `Regarding your suggested diagram changes: ${pendingFeedback}

Please update the BPMN diagram based on this feedback.`;
      setInput(feedbackMessage);
      clearPendingFeedback();
      // Auto-send the feedback
      setTimeout(() => {
        const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
        sendButton?.click();
      }, 100);
    }
  }, [pendingFeedback, isSending, clearPendingFeedback]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const messageText = input.trim();
    const newSessionId = currentSessionId || crypto.randomUUID();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: newSessionId,
      processId: currentProcess?.id || null,
      role: 'user',
      content: messageText,
      createdAt: new Date(),
    };

    addChatMessage(userMessage);
    setInput('');
    setIsSending(true);
    setError(null);

    // Update session ID if this is a new session
    if (!currentSessionId) {
      setCurrentSessionId(newSessionId);
    }

    try {
      // Call backend API with streaming - include current or preview BPMN XML for context
      const xmlContext = isPreviewMode && previewBpmnXml ? previewBpmnXml : currentBpmnXml;

      setStreamingContent('');
      let fullContent = '';
      let finalSessionId = newSessionId;

      // Use streaming API for real-time updates
      for await (const chunk of chatApi.sendMessageStream({
        message: messageText,
        sessionId: newSessionId,
        processId: currentProcess?.id,
        includeContext: true,
        bpmnXml: xmlContext || undefined,
      })) {
        if (chunk.type === 'content') {
          fullContent = chunk.fullContent || '';
          setStreamingContent(fullContent);
          if (chunk.sessionId) finalSessionId = chunk.sessionId;
        } else if (chunk.type === 'done') {
          if (chunk.sessionId) finalSessionId = chunk.sessionId;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        }
      }

      // Clear streaming state
      setStreamingContent('');

      // Create and add the assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: finalSessionId,
        processId: currentProcess?.id || null,
        role: 'assistant',
        content: fullContent,
        createdAt: new Date(),
      };
      addChatMessage(assistantMessage);

      // Check if the response contains BPMN XML
      console.log('[ChatPanel] Response received, checking for BPMN XML...');
      console.log('[ChatPanel] Content length:', fullContent.length);
      const bpmnXml = extractBpmnXmlFromText(fullContent);
      console.log('[ChatPanel] Extracted XML:', bpmnXml ? `${bpmnXml.length} chars` : 'null');

      if (bpmnXml) {
        const isValid = validateBpmnXml(bpmnXml);
        console.log('[ChatPanel] XML validation result:', isValid);

        if (isValid) {
          // Use preview mode instead of direct update
          // This allows user to review changes before accepting
          setPreviewBpmnXml(bpmnXml, {
            messageId: assistantMessage.id,
            description: 'Claude suggested diagram changes',
          });
          console.log('[ChatPanel] Preview mode activated');
        }
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.error?.message || 'Failed to send message. Please try again.');

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: newSessionId,
        processId: currentProcess?.id || null,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${
          err.response?.data?.error?.message || err.message || 'Unknown error'
        }. Please try again.`,
        createdAt: new Date(),
      };
      addChatMessage(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (ui.chatPanelCollapsed) {
    return (
      <div className={`fixed ${positionClasses.collapsed} z-40`}>
        <button
          data-tutorial="chat-toggle"
          onClick={toggleChatPanel}
          className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-4 md:px-8 md:py-5 rounded-2xl shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-violet-800 transition-all hover:scale-105 flex items-center gap-3 md:gap-4 min-h-[44px] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-600"
        >
          <MessageSquare className="w-6 h-6 md:w-8 md:h-8" />
          <span className="text-base md:text-lg font-semibold">AI Chat</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses.panel} bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 flex flex-col shadow-lg shadow-violet-500/10 z-30 rounded-2xl overflow-hidden transition-all`}>
      {/* Header */}
      <div className="h-16 border-b border-violet-100 dark:border-slate-700 flex items-center justify-between px-6 bg-gradient-to-r from-violet-50 to-slate-50">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Chat with Claude</h2>
        <button
          onClick={toggleChatPanel}
          className="p-2.5 hover:bg-violet-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Minimize2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare className="w-14 h-14 mb-4 text-violet-300" />
            <p className="text-base font-medium text-slate-800 dark:text-slate-100 mb-2">Start a conversation</p>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Ask Claude to create a BPMN process, suggest improvements, or explain a diagram.
            </p>
          </div>
        ) : (
          <>
            {chatMessages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-md shadow-violet-500/20'
                      : 'bg-violet-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <MessageContent content={message.content} isUser={message.role === 'user'} />
                  <span className={`text-2xs mt-2 block ${
                    message.role === 'user' ? 'text-white/70' : 'text-slate-400'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isSending && streamingContent ? (
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <StreamingStatus
                    content={streamingContent}
                    isExpanded={showStreamingDetails}
                    onToggle={() => setShowStreamingDetails(!showStreamingDetails)}
                  />
                </div>
              </div>
            ) : isSending ? (
              <TypingIndicator />
            ) : null}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-violet-100 dark:border-slate-700 p-5">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-violet-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            rows={2}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            data-send-button
            className="bg-gradient-to-r from-violet-600 to-violet-700 text-white px-5 rounded-xl hover:from-violet-700 hover:to-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center self-end h-14 min-w-[56px] shadow-md shadow-violet-500/20 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
        <div className="mt-4 flex gap-2 md:gap-3 flex-wrap">
          <button
            onClick={() =>
              handleQuickAction(
                'Create a simple BPMN process for employee onboarding with start event, tasks for document submission, equipment setup, and training, and an end event.'
              )
            }
            className="text-sm px-4 py-3 min-h-[44px] bg-violet-50 hover:bg-violet-100 text-violet-700 dark:text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            disabled={isSending}
          >
            Create new process
          </button>
          <button
            onClick={() =>
              handleQuickAction(
                'Please analyze the current BPMN diagram and suggest improvements.'
              )
            }
            className="text-sm px-4 py-3 min-h-[44px] bg-violet-50 hover:bg-violet-100 text-violet-700 dark:text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            disabled={isSending || !currentBpmnXml}
          >
            Suggest improvements
          </button>
          <button
            onClick={() =>
              handleQuickAction('Please explain this BPMN diagram in simple terms.')
            }
            className="text-sm px-4 py-3 min-h-[44px] bg-violet-50 hover:bg-violet-100 text-violet-700 dark:text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            disabled={isSending || !currentBpmnXml}
          >
            Explain diagram
          </button>
        </div>
      </div>
    </div>
  );
}
