import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, MessageSquare, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ChatMessage } from '../../types';

export function ChatPanel() {
  const { chatMessages, addChatMessage, ui, toggleChatPanel, currentSessionId } = useAppStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: currentSessionId || crypto.randomUUID(),
      processId: null,
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    addChatMessage(userMessage);
    setInput('');
    setIsSending(true);

    // TODO: Send to Claude API
    // For now, just add a placeholder response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: userMessage.sessionId,
        processId: null,
        role: 'assistant',
        content: 'This is a placeholder response. Claude API integration coming soon!',
        createdAt: new Date(),
      };
      addChatMessage(assistantMessage);
      setIsSending(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (ui.chatPanelCollapsed) {
    return (
      <div className="fixed right-4 bottom-4">
        <button
          onClick={toggleChatPanel}
          className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-600 transition-colors"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-16 bottom-0 w-96 bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <h2 className="font-semibold text-gray-800">Chat with Claude</h2>
        <button
          onClick={toggleChatPanel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Minimize2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm max-w-xs">
              Ask Claude to create a new BPMN process, suggest improvements, or explain a diagram.
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
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <button className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            Create new process
          </button>
          <button className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            Suggest improvements
          </button>
          <button className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            Explain diagram
          </button>
        </div>
      </div>
    </div>
  );
}
