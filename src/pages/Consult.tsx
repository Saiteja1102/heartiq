import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Star, MessageSquare, Phone, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockDoctors } from "@/data/mock";

const Consult = () => {
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const filtered = mockDoctors.filter(d => d.name.toLowerCase().includes(q.toLowerCase()) || d.specialty.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Consultations</p>
        <h1 className="font-display text-4xl">Talk to a cardiologist</h1>
      </div>

      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by specialty, language…" className="pl-10 h-12 bg-input/40 rounded-full" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-3xl p-6 hover:border-primary/30 transition">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-coral grid place-items-center font-display text-xl text-white">
                  {d.name.split(" ").slice(-1)[0][0]}
                </div>
                {d.online && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg leading-tight">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.specialty}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mb-4">
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {d.rating}</span>
              <span>·</span>
              <span>{d.years} yrs</span>
              <span>·</span>
              <span className="truncate">{d.languages.join(", ")}</span>
            </div>
            <div className="text-xs text-secondary font-mono mb-4">Next: {d.next}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="hero" size="sm" onClick={() => setActive(d.id)}>Book now</Button>
              <Button variant="ghost" size="sm" onClick={() => setActive(d.id)}><MessageSquare className="h-3 w-3" /> Chat</Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Active consult overlay */}
      <AnimatePresence>
        {active && <CallUI doctor={mockDoctors.find(d => d.id === active)!} onEnd={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  );
};

const CallUI = ({ doctor, onEnd }: { doctor: typeof mockDoctors[number]; onEnd: () => void }) => {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [time, setTime] = useState(0);
  useState(() => { const t = setInterval(() => setTime(s => s + 1), 1000); return () => clearInterval(t); });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-4 md:p-8">
      <div className="h-full grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Main video */}
        <div className="relative rounded-3xl overflow-hidden bg-surface-1 border border-white/10">
          <div className="absolute inset-0 grid place-items-center"
               style={{ background: "radial-gradient(circle at center, hsl(215 50% 14%), hsl(215 70% 5%))" }}>
            <div className="text-center">
              <div className="h-32 w-32 rounded-3xl bg-gradient-coral grid place-items-center font-display text-5xl text-white mx-auto mb-4">
                {doctor.name.split(" ").slice(-1)[0][0]}
              </div>
              <div className="font-display text-2xl">{doctor.name}</div>
              <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
            </div>
          </div>
          {/* Local video */}
          <div className="absolute bottom-4 right-4 w-40 h-28 rounded-2xl bg-gradient-to-br from-surface-3 to-surface-1 border border-white/15 grid place-items-center">
            <span className="text-xs text-muted-foreground font-mono">You</span>
          </div>
          {/* Timer */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full glass-strong text-xs font-mono">
            ● LIVE · {String(Math.floor(time / 60)).padStart(2, "0")}:{String(time % 60).padStart(2, "0")}
          </div>
          {/* Controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 glass-strong rounded-full">
            <CtrlBtn active={mic} onClick={() => setMic(!mic)} on={Mic} off={MicOff} />
            <CtrlBtn active={cam} onClick={() => setCam(!cam)} on={Video} off={VideoOff} />
            <CtrlBtn active onClick={() => {}} on={MonitorUp} off={MonitorUp} />
            <button onClick={onEnd} className="h-12 w-12 rounded-full bg-destructive grid place-items-center hover:bg-destructive/90 transition">
              <PhoneOff className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="hidden lg:flex flex-col gap-3 glass rounded-3xl p-4 overflow-hidden">
          <h4 className="font-display text-lg">Session chat</h4>
          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            <Msg side="dr">Hi! I'm reviewing your ECG now.</Msg>
            <Msg side="me">Thank you, doctor.</Msg>
            <Msg side="dr">Your last reading shows mild sinus tachycardia. Have you had more caffeine than usual?</Msg>
          </div>
          <Input placeholder="Type a message…" className="bg-input/40 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
};

const CtrlBtn = ({ active, onClick, on: On, off: Off }: any) => (
  <button onClick={onClick} className={`h-12 w-12 rounded-full grid place-items-center transition ${active ? "bg-white/10 hover:bg-white/15" : "bg-destructive/20 text-destructive"}`}>
    {active ? <On className="h-5 w-5" /> : <Off className="h-5 w-5" />}
  </button>
);

const Msg = ({ side, children }: { side: "me" | "dr"; children: React.ReactNode }) => (
  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${side === "me" ? "bg-primary/15 ml-auto rounded-br-sm" : "bg-white/5 rounded-bl-sm"}`}>
    {children}
  </div>
);

export default Consult;
