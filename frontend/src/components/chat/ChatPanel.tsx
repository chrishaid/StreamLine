import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, MessageSquare, Loader2, AlertCircle, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ChatMessage } from '../../types';
import { chatApi } from '../../services/api';
import { extractBpmnXmlFromText, validateBpmnXml } from '../../utils/helpers';

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
    getDiagramSvg,
    setEditorMode,
    markDirty,
    saveBpmnToDatabase,
  } = useAppStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [thinkingContent, setThinkingContent] = useState('');
  const [capturedXml, setCapturedXml] = useState('');
  const [showXml, setShowXml] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [includeDiagramImage, setIncludeDiagramImage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, streamingContent]);

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
    setStreamingContent('');
    setThinkingContent('');
    setCapturedXml('');
    setShowXml(false);
    setShowThinking(false);

    // Update session ID if this is a new session
    if (!currentSessionId) {
      setCurrentSessionId(newSessionId);
    }

    try {
      // Get diagram SVG if setting is enabled
      let diagramImage: string | undefined;
      if (includeDiagramImage && getDiagramSvg && currentBpmnXml) {
        try {
          const svg = await getDiagramSvg();
          if (svg) {
            // Convert SVG to base64
            diagramImage = btoa(svg);
          }
        } catch (err) {
          console.error('Failed to get diagram SVG:', err);
        }
      }

      // Stream response from backend
      const stream = chatApi.sendMessageStream({
        message: messageText,
        sessionId: newSessionId,
        processId: currentProcess?.id,
        includeContext: true,
        bpmnXml: currentBpmnXml || undefined,
        diagramImage,
      });

      let fullContent = '';
      let xmlDetected = false;

      for await (const chunk of stream) {
        if (chunk.type === 'thinking') {
          setThinkingContent(chunk.content);
        } else if (chunk.type === 'content') {
          fullContent = chunk.fullContent;

          // Check if XML is starting to appear
          if (!xmlDetected && (
            fullContent.includes('<?xml') ||
            fullContent.includes('<bpmn') ||
            fullContent.includes('```xml')
          )) {
            xmlDetected = true;
            setCapturedXml('pending'); // Indicate XML is being generated
          }

          // Only show content before XML starts
          if (xmlDetected) {
            const beforeXml = fullContent.split('<?xml')[0]
              .split('<bpmn')[0]
              .split('```xml')[0];
            setStreamingContent(beforeXml.trim());
          } else {
            setStreamingContent(fullContent);
          }
        } else if (chunk.type === 'done') {
          // Extract and validate BPMN XML only when stream is complete
          const bpmnXml = extractBpmnXmlFromText(fullContent);
          if (bpmnXml && validateBpmnXml(bpmnXml)) {
            setCapturedXml(bpmnXml);
            setCurrentBpmnXml(bpmnXml);
            console.log('✅ Complete BPMN XML extracted and updated');

            // Switch to edit mode so changes can be made
            setEditorMode('edit');

            // Mark as dirty and trigger auto-save after a short delay
            // to allow the modeler to load the diagram first
            markDirty();
            setTimeout(() => {
              saveBpmnToDatabase().catch((err) => {
                console.error('Failed to auto-save chat-generated BPMN:', err);
              });
            }, 2000);

            // Remove XML from displayed content
            let contentWithoutXml = fullContent
              .replace(/```xml[\s\S]*?```/g, '')
              .replace(/<\?xml[\s\S]*?<\/bpmn:definitions>/g, '')
              .trim();

            // Clean up any remaining XML fragments
            if (contentWithoutXml.includes('<bpmn')) {
              contentWithoutXml = contentWithoutXml.split('<bpmn')[0].trim();
            }

            setStreamingContent(contentWithoutXml);
          } else if (xmlDetected) {
            // XML was detected but not valid/complete
            console.error('❌ Incomplete or invalid BPMN XML detected');
            setCapturedXml('');
            setError('Received incomplete BPMN diagram. Please try again.');
          }

          // Create assistant message
          const assistantMessage: ChatMessage = {
            id: chunk.messageId,
            sessionId: chunk.sessionId,
            processId: chunk.processId,
            role: 'assistant',
            content: fullContent,
            createdAt: new Date(),
          };
          addChatMessage(assistantMessage);
          setStreamingContent('');
          setThinkingContent('');
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        }
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message. Please try again.');

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sessionId: newSessionId,
        processId: currentProcess?.id || null,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`,
        createdAt: new Date(),
      };
      addChatMessage(errorMessage);
      setStreamingContent('');
      setThinkingContent('');
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
      <div className="fixed right-4 bottom-4 z-50">
        <button
          onClick={toggleChatPanel}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-20 bottom-4 w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="h-14 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-4 flex-shrink-0">
        <h2 className="font-semibold text-white">Chat with Claude</h2>
        <button
          onClick={toggleChatPanel}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <Minimize2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Settings */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <ImageIcon className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 block">Include diagram image</span>
              <p className="text-xs text-gray-600 mt-0.5">
                Send visual diagram to Claude for better context
              </p>
            </div>
          </div>
          <button
            onClick={() => setIncludeDiagramImage(!includeDiagramImage)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              includeDiagramImage ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                includeDiagramImage ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm max-w-xs">
              Ask Claude to create a new BPMN process, suggest improvements, or explain a diagram.
            </p>
          </div>
        ) : (
          <>
            {chatMessages.map((message) => {
              // Extract display content (without XML)
              let displayContent = message.content;
              let messageXml = '';

              if (message.role === 'assistant') {
                const bpmnXml = extractBpmnXmlFromText(message.content);
                if (bpmnXml) {
                  messageXml = bpmnXml;
                  displayContent = message.content
                    .replace(/```xml[\s\S]*?```/g, '')
                    .replace(/<\?xml[\s\S]*?<\/bpmn:definitions>/g, '')
                    .trim();
                }
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{displayContent}</p>

                    {/* Collapsible XML section for assistant messages */}
                    {message.role === 'assistant' && messageXml && (
                      <details className="mt-3 border-t border-gray-300 pt-2">
                        <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800 flex items-center gap-1">
                          <ChevronDown className="w-3 h-3" />
                          View BPMN XML
                        </summary>
                        <pre className="text-xs bg-gray-800 text-gray-100 p-2 rounded mt-2 overflow-x-auto max-h-40 overflow-y-auto">
                          {messageXml}
                        </pre>
                      </details>
                    )}

                    <span className={`text-xs mt-1 block ${message.role === 'user' ? 'opacity-80' : 'opacity-60'}`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {isSending && (streamingContent || thinkingContent) && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg px-4 py-3 bg-gray-100 text-gray-800 shadow-sm">
                  {/* Chain of Thought */}
                  {thinkingContent && (
                    <details className="mb-3 border border-indigo-200 rounded-lg bg-indigo-50">
                      <summary className="text-xs font-medium text-indigo-700 cursor-pointer p-2 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Chain of Thought
                      </summary>
                      <div className="text-xs text-indigo-900 p-2 pt-0 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {thinkingContent}
                      </div>
                    </details>
                  )}

                  {/* Streaming content */}
                  {streamingContent && (
                    <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  )}

                  {/* XML indicator */}
                  {capturedXml && capturedXml !== '' && (
                    <div className="mt-3 border-t border-gray-300 pt-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {capturedXml === 'pending' ? 'Generating BPMN diagram...' : 'BPMN diagram generated ✓'}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                    <span className="text-xs text-gray-500">Streaming...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator when no streaming yet */}
            {isSending && !streamingContent && !thinkingContent && (
              <div className="flex justify-start">
                <div className="rounded-lg px-4 py-3 bg-gray-100">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0 bg-gray-50">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows={3}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <button
            onClick={() =>
              handleQuickAction(
                'Create a simple BPMN process for employee onboarding with start event, tasks for document submission, equipment setup, and training, and an end event.'
              )
            }
            className="text-xs px-3 py-1 bg-white hover:bg-indigo-50 border border-gray-300 rounded-full transition-colors"
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
            className="text-xs px-3 py-1 bg-white hover:bg-indigo-50 border border-gray-300 rounded-full transition-colors"
            disabled={isSending || !currentBpmnXml}
          >
            Suggest improvements
          </button>
          <button
            onClick={() =>
              handleQuickAction('Please explain this BPMN diagram in simple terms.')
            }
            className="text-xs px-3 py-1 bg-white hover:bg-indigo-50 border border-gray-300 rounded-full transition-colors"
            disabled={isSending || !currentBpmnXml}
          >
            Explain diagram
          </button>
        </div>
      </div>
    </div>
  );
}
