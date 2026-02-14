
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Minus, Send, ChevronLeft, Search, Clock, ShieldCheck } from 'lucide-react';
import { User, Conversation, ChatMessage } from '../types';
import { MOCK_USERS, MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../constants';

interface ChatWidgetProps {
  currentUser: User;
}

type ChatOpenDetail = {
  participantId?: string;
  participantName?: string;
  participantAvatar?: string;
};

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [participantOverrides, setParticipantOverrides] = useState<Record<string, { name?: string; avatar?: string }>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeConvId) {
      scrollToBottom();
    }
  }, [activeConvId, messagesMap]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<ChatOpenDetail>;
      const participantId = ce.detail?.participantId;
      if (!participantId) return;

      const participantName = ce.detail?.participantName;
      const participantAvatar = ce.detail?.participantAvatar;

      if (participantName || participantAvatar) {
        setParticipantOverrides((prev) => ({
          ...prev,
          [participantId]: {
            name: participantName ?? prev[participantId]?.name,
            avatar: participantAvatar ?? prev[participantId]?.avatar,
          },
        }));
      }

      setIsOpen(true);

      setConversations((prev) => {
        const existing = prev.find((c) => c.participantId === participantId);
        if (existing) {
          setActiveConvId(existing.id);
          return prev;
        }

        const newConv: Conversation = {
          id: `conv-${Date.now()}`,
          participantId,
          updatedAt: new Date().toISOString(),
          lastMessage: undefined,
        };

        setActiveConvId(newConv.id);
        setMessagesMap((prevMessages) => ({
          ...prevMessages,
          [newConv.id]: prevMessages[newConv.id] ?? [],
        }));

        return [newConv, ...prev];
      });
    };

    window.addEventListener('capitune:v3:open-chat', handler);
    return () => window.removeEventListener('capitune:v3:open-chat', handler);
  }, []);

  const resolveParticipant = (participantId: string | undefined | null) => {
    if (!participantId) return null;
    const override = participantOverrides[participantId];
    const fromMock = MOCK_USERS.find((u) => u.id === participantId);
    return {
      id: participantId,
      name: override?.name || fromMock?.name || 'Participant',
      avatar: override?.avatar || fromMock?.avatar || '',
    };
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const participant = activeConv ? resolveParticipant(activeConv.participantId) : null;
  const activeMessages = activeConvId ? messagesMap[activeConvId] || [] : [];

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeConvId) return;

    const newMessage: ChatMessage = {
      id: `m-${Date.now()}`,
      senderId: currentUser.id,
      text: inputText,
      createdAt: new Date().toISOString()
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMessage]
    }));

    setConversations(prev => prev.map(c => 
      c.id === activeConvId ? { ...c, lastMessage: inputText, updatedAt: newMessage.createdAt } : c
    ));

    setInputText('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-purple-600 text-white rounded-full shadow-2xl shadow-purple-200 flex items-center justify-center hover:scale-110 transition-all z-50 animate-bounce"
      >
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black animate-pulse">2</div>
        <MessageSquare className="w-7 h-7" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-[340px] h-[500px] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
      {/* Header */}
      <div className="p-5 bg-purple-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeConvId ? (
            <button
              onClick={() => setActiveConvId(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Retour à la liste des conversations"
              title="Retour"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
          )}
          <h3 className="text-sm font-black uppercase tracking-widest">
            {activeConvId && participant ? participant.name.split(' ')[0] : 'Messagerie'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Réduire la messagerie"
            title="Réduire"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/50">
        {!activeConvId ? (
          /* Conversation List */
          <div className="p-4 space-y-3">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Rechercher expert..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-200 transition-all" />
            </div>
            {conversations.map(conv => {
              const p = resolveParticipant(conv.participantId);
              return (
                <button 
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className="w-full flex items-center gap-4 p-3 bg-white hover:bg-purple-50 rounded-2xl border border-transparent hover:border-purple-100 transition-all group text-left shadow-sm"
                >
                  {p?.avatar ? (
                    <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover shadow-sm ring-2 ring-white" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 shadow-sm ring-2 ring-white flex items-center justify-center">
                      <span className="text-slate-500 font-black">
                        {(p?.name || 'P').slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors">{p?.name}</p>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> 2h</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-medium">{conv.lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Chat View */
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
              <div className="text-center py-4">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 inline-block px-3 py-1 rounded-full">Conversation Sécurisée</p>
              </div>
              {activeMessages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-[20px] text-xs font-medium shadow-sm leading-relaxed ${
                      isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                    }`}>
                      {msg.text}
                      <p className={`text-[8px] mt-1.5 font-bold uppercase ${isMe ? 'text-purple-200 text-right' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Input */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Votre réponse..." 
                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-200 font-medium"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-purple-100"
                aria-label="Envoyer le message"
                title="Envoyer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;
