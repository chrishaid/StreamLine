import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { ChatMessage } from '../../types';
import { chatApi } from '../../services/api';
import { extractBpmnXmlFromText, validateBpmnXml } from '../../utils/helpers';

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
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <span className={`text-2xs mt-2 block ${
                    message.role === 'user' ? 'text-white/70' : 'text-stone'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
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
            className="bg-sage text-white px-4 rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center self-end h-12 shadow-soft"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() =>
              handleQuickAction(
                'Create a simple BPMN process for employee onboarding with start event, tasks for document submission, equipment setup, and training, and an end event.'
              )
            }
            className="text-xs px-4 py-2 bg-mist hover:bg-mist-300 text-slate-600 dark:text-mist dark:bg-pine dark:hover:bg-sage/20 rounded-lg transition-colors"
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
            className="text-xs px-4 py-2 bg-mist hover:bg-mist-300 text-slate-600 dark:text-mist dark:bg-pine dark:hover:bg-sage/20 rounded-lg transition-colors disabled:opacity-50"
            disabled={isSending || !currentBpmnXml}
          >
            Suggest improvements
          </button>
          <button
            onClick={() =>
              handleQuickAction('Please explain this BPMN diagram in simple terms.')
            }
            className="text-xs px-4 py-2 bg-mist hover:bg-mist-300 text-slate-600 dark:text-mist dark:bg-pine dark:hover:bg-sage/20 rounded-lg transition-colors disabled:opacity-50"
            disabled={isSending || !currentBpmnXml}
          >
            Explain diagram
          </button>
        </div>
      </div>
    </div>
  );
}
