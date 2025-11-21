'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface Conversation {
  _id: string;
  title: string;
  createdAt: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const loadConversation = async (id: string) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false); // Close sidebar on mobile when selecting a chat
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          conversationId: currentConversationId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      const aiMessage: Message = { role: 'ai', content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      
      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        fetchConversations(); // Refresh list to show new chat
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-screen bg-[#0B1120] text-slate-100 overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] border-r border-slate-800/50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/20 font-medium group"
          >
            <span className="text-xl font-light group-hover:rotate-90 transition-transform duration-300">+</span> 
            <span>New Chat</span>
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden ml-2 p-2 text-slate-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Recent Chats</div>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => loadConversation(conv._id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm truncate transition-all duration-200 border ${
                  currentConversationId === conv._id
                    ? 'bg-slate-800/80 text-white border-slate-700 shadow-sm'
                    : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                {conv.title || 'New Chat'}
              </button>
            ))}
          </div>
        </div>
        
        {/* User Profile / Settings Placeholder */}
        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
              U
            </div>
            <div className="text-sm font-medium text-slate-300">User</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-[#0B1120] w-full">
        {/* Header */}
        <div className="absolute top-0 left-0 w-full h-16 bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-800/50 z-10 flex items-center px-4 md:px-6 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1 text-slate-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate max-w-[200px] md:max-w-none">Gemini AI by SAINT Develops</span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">Beta</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-20 pb-32 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-linear-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-900/20 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">How can I help you today?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                  {['Explain quantum computing', 'Write a python script', 'Plan a trip to Japan', 'Creative writing ideas'].map((suggestion) => (
                    <button 
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all duration-200 text-left text-sm text-slate-300 hover:text-white hover:shadow-lg hover:shadow-blue-900/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-6 py-4 shadow-md ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800/80 text-slate-100 rounded-bl-none border border-slate-700/50'
                  }`}
                >
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                      <div className="w-4 h-4 rounded-full bg-linear-to-tr from-blue-400 to-purple-400"></div>
                      <span className="text-xs font-medium uppercase tracking-wider">Gemini</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-800/50 text-slate-100 rounded-2xl px-6 py-4 rounded-bl-none border border-slate-700/50 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-[#0B1120] via-[#0B1120] to-transparent pt-20 pb-8 px-4 z-20">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
              <div className="relative flex items-end gap-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-2 shadow-2xl">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Message Gemini..."
                  className="w-full max-h-32 p-3 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-none custom-scrollbar"
                  rows={1}
                  style={{ minHeight: '44px' }}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-900/20 mb-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
            </form>
            <p className="text-center text-xs text-slate-500 mt-4 font-medium">
              Gemini can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
