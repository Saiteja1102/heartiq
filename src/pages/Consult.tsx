import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Search, Star, MessageSquare, Phone, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversation } from "@/hooks/useConversations";
import { toast } from "sonner";

type Doc = {
  id: string;
  user_id?: string | null;
  display_name: string;
  specialty: string;
  consultation_fee: number | null;
  available: boolean;
  bio: string | null;
  years_experience: number | null;
  rating?: number;
  is_real: boolean;
};

const FILTERS = ["All", "Cardiologist", "General Physician", "Emergency", "Available Now"] as const;
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

const Consult = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");

  const [bookingDoc, setBookingDoc] = useState<Doc | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: real }, { data: mock }] = await Promise.all([
        supabase.from("profiles").select("id, user_id, display_name, specialty, consultation_fee, available, bio, years_experience").eq("role", "doctor").eq("is_verified", true),
        supabase.from("mock_doctors").select("*"),
      ]);
      const realMapped: Doc[] = (real ?? []).map((d: any) => ({ ...d, rating: 4.8, is_real: true }));
      const mockMapped: Doc[] = (mock ?? []).map((d: any) => ({ ...d, user_id: null, is_real: false, rating: d.rating ?? 4.8 }));
      setDocs([...realMapped, ...mockMapped]);
    };
    load();
  }, []);

  const filtered = docs.filter((d) => {
    if (q && !`${d.display_name} ${d.specialty}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "All") return true;
    if (filter === "Available Now") return d.available;
    return d.specialty === filter;
  });

  const onChat = async (d: Doc) => {
    if (!user) return;
    if (!d.is_real || !d.user_id) {
      toast.info("This is a demo doctor profile. Real chat requires a registered clinician account.");
      return;
    }
    const cid = await getOrCreateConversation(user.id, d.user_id);
    if (cid) navigate(`/chat?c=${cid}`);
  };

  const onCall = async (d: Doc) => {
    if (!user) return;
    if (!d.is_real || !d.user_id) {
      toast.info("Demo doctor — video call needs a real clinician account.");
      return;
    }
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({ initiator_id: user.id, receiver_id: d.user_id, status: "ringing" })
      .select("id").single();
    if (error) { toast.error("Could not start call"); return; }
    await supabase.from("notifications").insert({
      user_id: d.user_id, type: "incoming_call", title: "Incoming video call",
      body: "Tap to answer", related_id: (data as any).id,
    });
    navigate(`/call/${(data as any).id}`);
  };

  const openBooking = (d: Doc) => {
    setBookingDoc(d);
    setDate(undefined);
    setSlot(null);
  };

  const confirmBooking = async () => {
    if (!user || !bookingDoc || !date || !slot) return;
    setSubmitting(true);
    const [h, m] = slot.split(":").map(Number);
    const when = new Date(date);
    when.setHours(h, m, 0, 0);

    const payload: any = {
      user_id: user.id,
      doctor_name: bookingDoc.display_name,
      specialty: bookingDoc.specialty,
      scheduled_at: when.toISOString(),
      status: "scheduled",
    };
    if (bookingDoc.is_real && bookingDoc.user_id) payload.doctor_id = bookingDoc.user_id;

    const { error } = await supabase.from("consultations").insert(payload);
    if (error) {
      toast.error("Booking failed");
      setSubmitting(false);
      return;
    }

    if (bookingDoc.is_real && bookingDoc.user_id) {
      await supabase.from("notifications").insert({
        user_id: bookingDoc.user_id,
        type: "appointment_confirmed",
        title: "New appointment booked",
        body: `${when.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} — patient consultation`,
      });
    }

    toast.success(`Booked with ${bookingDoc.display_name} on ${format(when, "PPP 'at' p")}`);
    setSubmitting(false);
    setBookingDoc(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Consultations</p>
        <h1 className="font-display text-4xl">Talk to a cardiologist</h1>
      </div>

      <div className="relative mb-6 max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by specialty…" className="pl-10 h-12 bg-input/40 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-mono transition border ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-mono text-sm">No doctors match your filters.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-3xl p-6 hover:border-primary/30 transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-coral grid place-items-center font-display text-xl text-white">
                    {d.display_name.split(" ").slice(-1)[0][0]}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${d.available ? "bg-success" : "bg-muted"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg leading-tight">{d.display_name}</div>
                  <div className="text-xs text-muted-foreground">{d.specialty}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mb-4">
                <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {d.rating ?? 4.8}</span>
                {d.years_experience && <><span>·</span><span>{d.years_experience} yrs</span></>}
                {d.consultation_fee && <><span>·</span><span className="text-secondary">${d.consultation_fee}</span></>}
              </div>
              {d.bio && <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{d.bio}</p>}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="ghost" size="sm" onClick={() => onChat(d)}><MessageSquare className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onCall(d)}><Phone className="h-3 w-3" /></Button>
                <Button variant="hero" size="sm" onClick={() => openBooking(d)}><CalendarIcon className="h-3 w-3" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!bookingDoc} onOpenChange={(o) => !o && setBookingDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book appointment</DialogTitle>
            <DialogDescription>
              {bookingDoc && <>with <span className="text-foreground">{bookingDoc.display_name}</span> · {bookingDoc.specialty}</>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">Select date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">Select time slot</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button key={t} onClick={() => setSlot(t)}
                    className={`px-2 py-2 rounded-lg text-xs font-mono border transition ${
                      slot === t ? "bg-primary text-primary-foreground border-primary" : "bg-white/[0.03] border-white/10 hover:border-white/20"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBookingDoc(null)}>Cancel</Button>
            <Button variant="hero" disabled={!date || !slot || submitting} onClick={confirmBooking}>
              {submitting ? "Booking…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Consult;
