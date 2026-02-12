"use client";

import { useState, useEffect, useRef } from "react";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { Paperclip, Smile, Image as ImageIcon, X, Send, Loader2 } from "lucide-react";

type Message = {
  id: string;
  content: string | null;
  senderId: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  type: "TEXT" | "IMAGE" | "FILE" | "VIDEO" | "AUDIO";
  attachmentUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  isRead: boolean;
  createdAt: string;
};

type ConversationData = {
  id: string;
  otherUser: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    accountType: string;
  };
};

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😍", "😎", "😊", "😭", "👍", "👎", "👋", "🙏", "💪", "🎉", "🔥", "❤️", "💔", "💯", "✅", "❌", "🤔", "👀"];

export function ConversationWindow({
  conversationId,
  currentUserId,
  onClose,
}: {
  conversationId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Erreur fetch messages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if ((!newMessage.trim()) || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: newMessage.trim(),
          type: "TEXT"
        }),
      });

      if (res.ok) {
        setNewMessage("");
        setShowEmojiPicker(false);
        await fetchMessages();
      }
    } catch (err) {
      console.error("Erreur envoi message:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/conversations/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Erreur upload");
      
      const { url, mimeType, fileName, fileSize } = await uploadRes.json();
      
      // Determine type
      let type = "FILE";
      if (mimeType.startsWith("image/")) type = "IMAGE";
      else if (mimeType.startsWith("video/")) type = "VIDEO";
      else if (mimeType.startsWith("audio/")) type = "AUDIO";

      // Send message immediately with attachment
      const sendRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: null,
          type,
          attachmentUrl: url,
          fileName,
          fileSize,
          mimeType
        }),
      });

      if (sendRes.ok) {
        await fetchMessages();
      }
    } catch (err) {
      console.error("Erreur upload/envoi fichier:", err);
      // Show error toast logic here if available
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleEmojiClick(emoji: string) {
    setNewMessage(prev => prev + emoji);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const renderMessageContent = (msg: Message) => {
    switch (msg.type) {
        case "IMAGE":
            return (
                <div className="space-y-1">
                    <img 
                        src={msg.attachmentUrl || ""} 
                        alt="Image partagée" 
                        className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.attachmentUrl || "", "_blank")}
                    />
                    {msg.content && <p className="text-sm mt-1">{msg.content}</p>}
                </div>
            );
        case "FILE":
            return (
                <div className="flex items-center gap-2 bg-black/5 p-2 rounded-lg max-w-[200px]">
                    <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="overflow-hidden">
                        <a 
                            href={msg.attachmentUrl || "#"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline truncate block"
                        >
                            {msg.fileName || "Fichier joint"}
                        </a>
                        <span className="text-xs text-muted-foreground">
                            {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : "Fichier"}
                        </span>
                    </div>
                </div>
            );
        default:
            return <p className="text-sm whitespace-pre-wrap">{msg.content || ""}</p>;
    }
  };

  if (loading) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-80 md:w-96 items-center justify-center rounded-xl border border-border bg-white shadow-2xl">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[550px] w-80 md:w-96 flex-col rounded-xl border border-border bg-white shadow-2xl overflow-hidden font-sans">
      {/* En-tête */}
      <div className="flex items-center justify-between bg-navy text-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <AvatarBubble
            name={conversation.otherUser.fullName}
            url={conversation.otherUser.avatarUrl}
            size="sm"
            showOnline={false}
          />
          <div>
            <h3 className="font-semibold text-sm leading-tight">{conversation.otherUser.fullName}</h3>
            <p className="text-xs opacity-80">
              {conversation.otherUser.accountType === "PROFESSIONAL" ? "Expert" : "Membre"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
            <div className="bg-navy/5 p-4 rounded-full mb-3">
                <Send className="h-6 w-6 text-navy/40" />
            </div>
            <p className="text-sm font-medium text-navy/60">Démarrez la conversation</p>
            <p className="text-xs text-muted-foreground mt-1">Dites bonjour à {conversation.otherUser.fullName.split(' ')[0]} 👋</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    {!isOwn && (
                      <AvatarBubble
                        name={msg.sender.fullName}
                        url={msg.sender.avatarUrl}
                        size="sm"
                        showOnline={false}
                      />
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`rounded-2xl px-4 py-2 shadow-sm ${
                          isOwn 
                            ? "bg-navy text-white rounded-tr-sm" 
                            : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                        }`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                      <span className={`mt-1 text-[10px] text-muted-foreground ${isOwn ? "text-right" : "text-left"}`}>
                        {formatMessageTime(msg.createdAt)}
                        {isOwn && msg.isRead && <span className="ml-1">✓✓</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Zone */}
      <div className="bg-white border-t border-gray-100 p-3 relative">
        {isUploading && (
             <div className="absolute -top-8 left-0 right-0 bg-navy/5 text-navy text-xs py-1 px-4 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Envoi du fichier...
             </div>
        )}
        
        {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-16 left-4 bg-white border border-gray-200 shadow-xl rounded-lg p-3 grid grid-cols-7 gap-1 z-50 w-64 animate-in fade-in zoom-in-95 duration-200">
                {COMMON_EMOJIS.map(emoji => (
                    <button 
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)} 
                        className="text-xl hover:bg-gray-100 p-1 rounded transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            />
            
            <div className="flex gap-1 pb-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors"
                    title="Joindre un fichier"
                >
                    <Paperclip className="h-5 w-5" />
                </button>
                <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-2 rounded-full transition-colors ${showEmojiPicker ? "bg-gray-100 text-navy" : "text-muted-foreground hover:bg-gray-100"}`}
                    title="Emoji"
                >
                    <Smile className="h-5 w-5" />
                </button>
                 <button
                    type="button"
                    onClick={() => {
                        // Pour les GIFs, on ouvre aussi l'upload pour le moment, en filtrant les images
                        if (fileInputRef.current) {
                            fileInputRef.current.accept = "image/gif";
                            fileInputRef.current.click();
                        }
                    }}
                    className="p-2 text-muted-foreground hover:bg-gray-100 rounded-full transition-colors hidden sm:block"
                    title="Envoyer un GIF (via upload)"
                >
                    <span className="text-xs font-bold border-2 border-current rounded px-0.5">GIF</span>
                </button>
            </div>

            <div className="flex-1 bg-gray-50 rounded-2xl border border-transparent focus-within:border-navy/20 focus-within:ring-1 focus-within:ring-navy/20 focus-within:bg-white transition-all">
                <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    placeholder="Écrivez un message..."
                    className="w-full bg-transparent px-4 py-3 text-sm outline-none resize-none max-h-32 min-h-[44px]"
                    rows={1}
                />
            </div>

            <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className={`p-3 rounded-full bg-navy text-white shadow-md hover:bg-navy/90 focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-50 disabled:shadow-none transition-all pb-3`}
            >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
        </form>
      </div>
    </div>
  );
}
