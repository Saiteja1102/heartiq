import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, FileUp, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Thread } from "./Chat";
import { toast } from "sonner";

const Call = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [otherName, setOtherName] = useState("Caller");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [time, setTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!sessionId || !user) return;
      const { data } = await supabase.from("call_sessions").select("*").eq("id", sessionId).maybeSingle();
      if (!data) { toast.error("Call not found"); navigate("/dashboard"); return; }
      setSession(data);
      const otherId = (data as any).initiator_id === user.id ? (data as any).receiver_id : (data as any).initiator_id;
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", otherId).maybeSingle();
      setOtherName((prof as any)?.display_name ?? "Caller");
      if ((data as any).conversation_id) {
        const { data: conv } = await supabase.from("conversations").select("*").eq("id", (data as any).conversation_id).maybeSingle();
        if (conv) {
          setConversation({ ...conv, other_name: (prof as any)?.display_name ?? "Caller" });
        }
      }
      // Mark as active if we just joined
      if ((data as any).status === "ringing") {
        await supabase.from("call_sessions").update({ status: "active", started_at: new Date().toISOString() }).eq("id", sessionId);
      }
    };
    load();
  }, [sessionId, user, navigate]);

  // Local media
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (localVideoRef.current) localVideoRef.current.srcObject = s;
      })
      .catch(() => toast.error("Camera/microphone unavailable"));
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Toggle mic/cam
  useEffect(() => { stream?.getAudioTracks().forEach(t => t.enabled = mic); }, [mic, stream]);
  useEffect(() => { stream?.getVideoTracks().forEach(t => t.enabled = cam); }, [cam, stream]);

  const end = async () => {
    if (sessionId) {
      await supabase.from("call_sessions").update({
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: time,
      }).eq("id", sessionId);
    }
    stream?.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background p-4 md:p-6 flex">
      <div className={`relative flex-1 rounded-3xl overflow-hidden bg-surface-1 border border-white/10 ${showPanel ? "lg:mr-4" : ""}`}>
        {/* Remote placeholder */}
        <div className="absolute inset-0 grid place-items-center"
             style={{ background: "radial-gradient(circle at center, hsl(215 50% 14%), hsl(215 70% 5%))" }}>
          <div className="text-center">
            <div className="relative h-32 w-32 mx-auto mb-4">
              <span className="absolute inset-0 rounded-full bg-secondary/20 animate-pulse-ring" />
              <div className="relative h-32 w-32 rounded-3xl bg-gradient-coral grid place-items-center font-display text-5xl text-white">
                {otherName.split(" ").slice(-1)[0]?.[0]}
              </div>
            </div>
            <div className="font-display text-2xl">{otherName}</div>
            <div className="text-sm text-muted-foreground mt-1">Connecting…</div>
          </div>
        </div>

        {/* Local PiP */}
        <motion.div drag dragMomentum={false}
          className="absolute bottom-24 right-4 w-40 h-28 rounded-2xl overflow-hidden border-2 border-primary/60 shadow-coral cursor-move bg-surface-3">
          {cam ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-xs text-muted-foreground font-mono">Camera off</div>
          )}
        </motion.div>

        {/* Timer */}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full glass-strong text-xs font-mono text-secondary">
          ● LIVE · {String(Math.floor(time / 60)).padStart(2, "0")}:{String(time % 60).padStart(2, "0")}
        </div>

        {/* Toggle panel button */}
        <button onClick={() => setShowPanel(v => !v)}
          className="hidden lg:grid absolute top-4 right-4 h-10 w-10 rounded-xl glass-strong place-items-center hover:border-white/20">
          <MessageSquare className="h-4 w-4" />
        </button>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 glass-strong rounded-full">
          <CtrlBtn active={mic} onClick={() => setMic(!mic)} On={Mic} Off={MicOff} />
          <CtrlBtn active={cam} onClick={() => setCam(!cam)} On={Video} Off={VideoOff} />
          <CtrlBtn active onClick={() => toast.info("Use the chat panel to share an ECG file")} On={FileUp} Off={FileUp} />
          <button onClick={end} className="h-14 w-14 rounded-full bg-destructive grid place-items-center hover:bg-destructive/90 transition active:scale-95">
            <PhoneOff className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Side panel: embedded chat */}
      {showPanel && conversation && (
        <aside className="hidden lg:flex flex-col w-[360px] glass rounded-3xl overflow-hidden">
          <Thread conversation={conversation} embedded />
        </aside>
      )}
    </div>
  );
};

const CtrlBtn = ({ active, onClick, On, Off }: any) => (
  <button onClick={onClick} className={`h-12 w-12 rounded-full grid place-items-center transition active:scale-95 ${
    active ? "bg-white/10 hover:bg-white/15" : "bg-destructive/20 text-destructive"
  }`}>
    {active ? <On className="h-5 w-5" /> : <Off className="h-5 w-5" />}
  </button>
);

export default Call;
