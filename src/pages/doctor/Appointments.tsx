import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Appointments = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("consultations").select("*").order("scheduled_at", { ascending: true }).then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-2">Schedule</p>
        <h1 className="font-display text-4xl">Appointments</h1>
      </div>
      {items.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No appointments scheduled
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 flex items-center gap-5">
              <div className="text-center">
                <div className="font-display text-2xl">{new Date(a.scheduled_at).getDate()}</div>
                <div className="text-xs font-mono text-muted-foreground uppercase">
                  {new Date(a.scheduled_at).toLocaleString("en-US", { month: "short" })}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium">{a.doctor_name}</div>
                <div className="text-xs text-muted-foreground">{a.specialty}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono ${
                a.status === "scheduled" ? "bg-secondary/10 text-secondary border border-secondary/30" : "bg-white/5 text-muted-foreground border border-white/10"
              }`}>{a.status}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;
