"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon, BotIcon, UserIcon, PaperclipIcon, FileIcon, XIcon } from "lucide-react";
import { sendDossierMessage } from "@/app/(dashboard)/mon-dossier/echanges/actions";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
};

interface ChatInterfaceProps {
  dossierId: string;
  initialMessages: Message[];
  currentUserId: string;
}

export function ChatInterface({ dossierId, initialMessages, currentUserId }: ChatInterfaceProps) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    initialMessages,
    (state, newMessage: Message) => [...state, newMessage]
  );

  async function handleSubmit(formData: FormData) {
    const content = formData.get("content") as string;
    const file = formData.get("file") as File;
    
    if (!content.trim() && (!file || file.size === 0)) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      content: content,
      senderId: currentUserId,
      createdAt: new Date(),
      attachmentName: file && file.size > 0 ? file.name : null,
      attachmentUrl: null // Optimistically null until refresh
    };

    addOptimisticMessage(newMessage);
    formRef.current?.reset();
    setSelectedFile(null);

    startTransition(async () => {
      await sendDossierMessage(dossierId, formData);
    });
  }

  // Auto-scroll could be added here with useEffect on messages change

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-md bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {optimisticMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <BotIcon className="h-8 w-8 mb-2 opacity-50" />
            <p>Commencez la discussion avec votre conseiller.</p>
          </div>
        ) : (
          optimisticMessages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-3 max-w-[80%]",
                  isMe ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {isMe ? <UserIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "p-3 rounded-lg text-sm space-y-2",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  )}
                >
                  {msg.content && <p>{msg.content}</p>}
                  
                  {msg.attachmentName && (
                    <div className="flex items-center gap-2 p-2 bg-black/10 rounded">
                        <FileIcon className="h-4 w-4" />
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-xs font-medium">{msg.attachmentName}</span>
                            {msg.attachmentUrl && (
                                <a href={msg.attachmentUrl} target="_blank" className="text-[10px] underline hover:no-underline">
                                    Télécharger
                                </a>
                            )}
                        </div>
                    </div>
                  )}

                  <div className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-right" : "text-left")}>
                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-surface border-t border-border">
         {selectedFile && (
            <div className="mb-2 flex items-center gap-2 text-xs bg-muted p-1 px-2 rounded w-fit text-foreground">
                <FileIcon className="h-3 w-3" />
                <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                <button type="button" onClick={() => { 
                    setSelectedFile(null); 
                    if(fileInputRef.current) fileInputRef.current.value = ""; 
                }} className="hover:text-destructive">
                    <XIcon className="h-3 w-3" />
                </button>
            </div>
         )}
         
        <form ref={formRef} action={handleSubmit} className="flex gap-2 items-end">
            <input 
                type="file" 
                name="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <Button 
                type="button" 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground" 
                onClick={() => fileInputRef.current?.click()}
            >
                <PaperclipIcon className="h-5 w-5" />
            </Button>

          <Textarea
            name="content"
            placeholder="Posez votre question..."
            className="min-h-[40px] max-h-[150px] resize-none py-2"
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                }
            }}
          />
          <Button type="submit" size="icon" disabled={pending} className="h-10 w-10 shrink-0">
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
