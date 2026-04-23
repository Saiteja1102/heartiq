import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, FileText, Download, Phone, Check, CheckCheck, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { conversations, loading } = useConversations();
  const activeId = params.get("c");
  const active = conversations.find((c) => c.id === activeId) ?? null;

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (!activeId && conversations.length > 0 && window.innerWidth >= 1024) {
      setParams({ c: conversations[0].id }, { replace: true });
    }
  }, [conversations, activeId, setParams]);

  return (
    <div className="flex bg-background" style={{ height: "calc(100dvh - 57px)", minHeight: 480 }}>
      {/* Sidebar */}
      <aside className={`${active ? "hidden md:flex" : "flex"} flex-col w-full md:w-[320px] border-r border-white/5 bg-sidebar/40 min-h-0`}>
        <div className="px-5 py-5">
          <h2 className="font-display text-2xl">Messages</h2>
          <p className="text-xs text-muted-foreground mt-1">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          {loading && <div className="px-3 text-xs text-muted-foreground">Loading…</div>}
          {!loading && conversations.length === 0 && (
            <div className="text-center px-6 py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start a chat from the consult page</p>
            </div>
          )}
          {conversations.map((c) => (
            <ConvRow key={c.id} c={c} active={c.id === activeId} onClick={() => setParams({ c: c.id })} />
          ))}
        </div>
      </aside>

      {/* Thread */}
      {active ? (
        <Thread conversation={active} onBack={() => setParams({})} />
      ) : (
        <div className="hidden md:grid place-items-center flex-1 text-center text-muted-foreground">
          <div>
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ConvRow = ({ c, active, onClick }: { c: Conversation; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex gap-3 px-3 py-3 rounded-xl transition mb-1 ${
      active ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
    }`}
  >
    <div className="h-11 w-11 rounded-full bg-gradient-coral grid place-items-center font-mono text-sm font-semibold text-white shrink-0">
      {(c.other_name ?? "?").split(" ").slice(-1)[0]?.[0]}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium truncate">{c.other_name}</div>
        <div className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
          {new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate">{c.last_message_preview ?? "No messages yet"}</div>
        {(c.unread_count ?? 0) > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono grid place-items-center font-bold shrink-0">
            {c.unread_count}
          </span>
        )}
      </div>
    </div>
  </button>
);

export const Thread = ({
  conversation,
  onBack,
  embedded = false,
}: {
  conversation: Conversation;
  onBack?: () => void;
  embedded?: boolean;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, send, otherTyping, broadcastTyping } = useMessages(conversation.id);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, otherTyping]);

  const onSend = async () => {
    if (!user) return;
    if (file) {
      setUploading(true);
      try {
        const path = `${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("chat_files").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("chat_files").createSignedUrl
          ? await supabase.storage.from("chat_files").createSignedUrl(path, 60 * 60 * 24 * 7)
          : { data: { signedUrl: "" } };
        await send(text || "", { message_type: "file", file_url: (data as any)?.signedUrl ?? path, file_name: file.name });
        setFile(null);
        setText("");
      } catch (e: any) {
        toast.error(e.message ?? "Upload failed");
      } finally {
        setUploading(false);
      }
      return;
    }
    if (!text.trim()) return;
    await send(text);
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    } else {
      broadcastTyping();
    }
  };

  const startCall = async () => {
    if (!user) return;
    const otherId = conversation.patient_id === user.id ? conversation.doctor_id : conversation.patient_id;
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({
        conversation_id: conversation.id,
        initiator_id: user.id,
        receiver_id: otherId,
        status: "ringing",
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Could not start call");
      return;
    }
    // Send notification
    await supabase.from("notifications").insert({
      user_id: otherId,
      type: "incoming_call",
      title: "Incoming video call",
      body: "Tap to answer",
      related_id: (data as any).id,
    });
    navigate(`/call/${(data as any).id}`);
  };

  return (
    <section className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="h-9 w-9 rounded-full bg-gradient-coral grid place-items-center font-mono text-xs font-semibold text-white">
            {(conversation.other_name ?? "?").split(" ").slice(-1)[0]?.[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{conversation.other_name}</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {otherTyping ? <span className="text-secondary">typing…</span> : conversation.other_specialty ?? conversation.other_role}
            </div>
          </div>
        </div>
        {!embedded && (
          <Button size="sm" variant="ghost" onClick={startCall} className="text-secondary">
            <Phone className="h-4 w-4" /> Video Call
          </Button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-6 space-y-3">
        {messages.map((m) => {
          const me = m.sender_id === user?.id;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${me ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] ${me ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {m.message_type === "file" || m.message_type === "ecg_report" ? (
                  <a
                    href={m.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm border ${
                      me ? "bg-primary/15 border-primary/30 rounded-br-sm" : "bg-white/5 border-white/10 rounded-bl-sm"
                    }`}
                  >
                    <FileText className="h-4 w-4 text-secondary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate max-w-[180px]">{m.file_name ?? "File"}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Download className="h-2.5 w-2.5" /> Download
                      </div>
                    </div>
                  </a>
                ) : (
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-sm ${
                      me ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/[0.06] rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1 px-1">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {me && (m.is_read ? <CheckCheck className="h-3 w-3 text-secondary" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </motion.div>
          );
        })}
        <AnimatePresence>
          {otherTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl bg-white/[0.06] flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5">
        {file && (
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
            <FileText className="h-3 w-3 text-secondary" />
            <span className="truncate max-w-[200px]">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center hover:border-white/20 transition shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Type a message…"
            className="flex-1 resize-none bg-input/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 max-h-[120px]"
          />
          <button
            onClick={onSend}
            disabled={uploading || (!text.trim() && !file)}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ChatPage;
