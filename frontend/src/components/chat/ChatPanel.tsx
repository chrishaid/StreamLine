import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, MessageSquare, Loader2, AlertCircle, Code, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { ChatMessage } from '../../types';
import { chatApi } from '../../services/api';
import { extractBpmnXmlFromText, validateBpmnXml } from '../../utils/helpers';
import ReactMarkdown from 'react-markdown';

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
        <div className="mt-3 border border-sage/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowXml(!showXml)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-sage/10 hover:bg-sage/20 transition-colors text-left"
          >
            {showXml ? (
              <ChevronDown className="w-4 h-4 text-sage" />
            ) : (
              <ChevronRight className="w-4 h-4 text-sage" />
            )}
            <Code className="w-4 h-4 text-sage" />
            <span className="text-xs font-medium text-sage">BPMN XML Generated</span>
            <span className="text-2xs text-stone ml-auto">
              {showXml ? 'Click to collapse' : 'Click to expand'}
            </span>
          </button>
          {showXml && (
            <pre className="p-4 bg-forest/5 text-2xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
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
      <div className="bg-mist dark:bg-pine rounded-2xl px-5 py-4 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-stone ml-2">Claude is thinking...</span>
      </div>
    </div>
  );
}

const POSITION_CLASSES = {
  right: {
    panel: 'right-8 top-48 bottom-8 w-[420px]',
    collapsed: 'right-8 bottom-8',
  },
  left: {
    panel: 'left-8 top-48 bottom-8 w-[420px]',
    collapsed: 'left-8 bottom-8',
  },
  bottom: {
    panel: 'left-8 right-8 bottom-8 h-96',
    collapsed: 'right-8 bottom-8',
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
    setCurrentBpmnXml,
    currentBpmnXml,
    currentProcess,
    userPreferences,
  } = useAppStore();

  const position = userPreferences.chatPosition || 'right';
  const positionClasses = POSITION_CLASSES[position];
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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
      // Call backend API - include current BPMN XML for context
      const response = await chatApi.sendMessage({
        message: messageText,
        sessionId: newSessionId,
        processId: currentProcess?.id,
        includeContext: true,
        bpmnXml: currentBpmnXml || undefined,
      });

      // Add assistant's message
      addChatMessage(response.message);

      // Check if the response contains BPMN XML
      const bpmnXml = extractBpmnXmlFromText(response.message.content);
      if (bpmnXml && validateBpmnXml(bpmnXml)) {
        setCurrentBpmnXml(bpmnXml);
        console.log('BPMN XML extracted and updated:', bpmnXml.substring(0, 100) + '...');
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
          onClick={toggleChatPanel}
          className="bg-sage text-white px-8 py-5 rounded-2xl shadow-soft-lg hover:bg-sage-600 transition-all hover:scale-105 flex items-center gap-4 border border-sage-400"
        >
          <MessageSquare className="w-8 h-8" />
          <span className="text-lg font-semibold">AI Chat</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses.panel} bg-white dark:bg-forest-800 border border-mist-300 dark:border-pine flex flex-col shadow-soft-lg z-30 rounded-2xl overflow-hidden transition-all`}>
      {/* Header */}
      <div className="h-16 border-b border-mist dark:border-pine flex items-center justify-between px-6 bg-gradient-to-r from-forest/5 to-sage/5">
        <h2 className="text-base font-semibold text-forest dark:text-mist">Chat with Claude</h2>
        <button
          onClick={toggleChatPanel}
          className="p-2 hover:bg-mist dark:hover:bg-pine rounded-lg transition-colors"
        >
          <Minimize2 className="w-5 h-5 text-slate-500 dark:text-stone" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare className="w-14 h-14 mb-4 text-mist-400" />
            <p className="text-base font-medium text-forest dark:text-mist mb-2">Start a conversation</p>
            <p className="text-sm text-stone max-w-xs leading-relaxed">
              Ask Claude to create a BPMN process, suggest improvements, or explain a diagram.
            </p>
          </div>
        ) : (
          <>
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-sage text-white shadow-soft'
                      : 'bg-mist dark:bg-pine text-forest dark:text-mist'
                  }`}
                >
                  <MessageContent content={message.content} isUser={message.role === 'user'} />
                  <span className={`text-2xs mt-2 block ${
                    message.role === 'user' ? 'text-white/70' : 'text-stone'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isSending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-mist dark:border-pine p-5">
        {error && (
          <div className="mb-4 p-4 bg-ember-50 border border-ember-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-ember mt-0.5 flex-shrink-0" />
            <p className="text-sm text-ember-700">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-mist-300 dark:border-pine rounded-xl px-4 py-3 text-sm text-forest dark:text-mist dark:bg-forest-800 placeholder-stone focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage transition-all"
            rows={2}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="bg-sage text-white px-5 rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center self-end h-14 shadow-soft"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            onClick={() =>
              handleQuickAction(
                'Create a simple BPMN process for employee onboarding with start event, tasks for document submission, equipment setup, and training, and an end event.'
              )
            }
            className="text-sm px-5 py-3 bg-mist hover:bg-mist-300 text-slate-600 dark:text-mist dark:bg-pine dark:hover:bg-sage/20 rounded-xl transition-colors"
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
            className="text-sm px-5 py-3 bg-mist hover:bg-mist-300 text-slate-600 dark:text-mist dark:bg-pine dark:hover:bg-sage/20 rounded-xl transition-colors disabled:opacity-50"
            disabled={isSending || !currentBpmnXml}
          >
            Suggest improvements
          </button>
          <button
            onClick={() =>
              handleQuickAction('Please explain this BPMN diagram in simple terms.')
            }
            className="text-sm px-5 py-3 bg-mist hover:bg-mist-300 text-slate-600 dark:text-mist dark:bg-pine dark:hover:bg-sage/20 rounded-xl transition-colors disabled:opacity-50"
            disabled={isSending || !currentBpmnXml}
          >
            Explain diagram
          </button>
        </div>
      </div>
    </div>
  );
}
