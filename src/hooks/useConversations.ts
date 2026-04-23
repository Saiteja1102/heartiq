import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type Conversation = {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  last_message_at: string;
  created_at: string;
  // joined
  other_name?: string;
  other_role?: string;
  other_specialty?: string | null;
  unread_count?: number;
  last_message_preview?: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: "text" | "file" | "ecg_report";
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
};

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`patient_id.eq.${user.id},doctor_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    const list = (convs as Conversation[]) ?? [];
    if (list.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch counterpart profiles
    const otherIds = list.map((c) => (c.patient_id === user.id ? c.doctor_id : c.patient_id));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, role, specialty")
      .in("user_id", otherIds);

    // Last message + unread count per conversation
    const ids = list.map((c) => c.id);
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at, sender_id, is_read, message_type, file_name")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });

    const lastByConv: Record<string, Message> = {};
    const unreadByConv: Record<string, number> = {};
    (msgs ?? []).forEach((m: any) => {
      if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m;
      if (!m.is_read && m.sender_id !== user.id) {
        unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1;
      }
    });

    const enriched: Conversation[] = list.map((c) => {
      const otherId = c.patient_id === user.id ? c.doctor_id : c.patient_id;
      const p = (profiles ?? []).find((x: any) => x.user_id === otherId);
      const lm = lastByConv[c.id];
      let preview: string | null = null;
      if (lm) {
        preview = lm.message_type === "text" ? (lm.content ?? "") : `📎 ${lm.file_name ?? "Attachment"}`;
      }
      return {
        ...c,
        other_name: (p as any)?.display_name ?? "Unknown",
        other_role: (p as any)?.role ?? "patient",
        other_specialty: (p as any)?.specialty ?? null,
        unread_count: unreadByConv[c.id] ?? 0,
        last_message_preview: preview,
      };
    });
    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    const channel = supabase
      .channel(`conv-list:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  return { conversations, loading, refresh, totalUnread };
};

export const getOrCreateConversation = async (patientId: string, doctorId: string): Promise<string | null> => {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("doctor_id", doctorId)
    .maybeSingle();
  if (existing) return (existing as any).id;
  const { data, error } = await supabase
    .from("conversations")
    .insert({ patient_id: patientId, doctor_id: doctorId })
    .select("id")
    .single();
  if (error) {
    console.error(error);
    return null;
  }
  return (data as any).id;
};
