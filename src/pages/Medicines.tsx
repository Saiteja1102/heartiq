import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Pill, AlertTriangle, Ban, Ruler, Repeat, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockMedicines } from "@/data/mock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Medicines = () => {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const suggestions = q ? mockMedicines.filter(m => m.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  const lookup = async (name: string) => {
    setSelected(name); setQ(name); setInfo(null); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("medicine-info", { body: { medicine: name } });
      if (error) throw error;
      setInfo(data);
    } catch (e: any) {
      toast.error("Couldn't fetch info");
      // fallback structure
      setInfo({
        name, generic: mockMedicines.find(m => m.name === name)?.generic ?? name,
        class: mockMedicines.find(m => m.name === name)?.class ?? "—",
        what_it_is: "Information temporarily unavailable. Please try again.",
        uses: [], side_effects: { common: [], serious: [], rare: [] }, do_not_use: [], dosage: [], alternatives: [],
      });
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-3">Medicine AI</p>
        <h1 className="font-display text-4xl md:text-5xl">Understand any cardiac medicine.</h1>
      </div>

      <div className="relative mb-12">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setSelected(null); }} placeholder="Search any medicine… e.g. Metoprolol"
          className="pl-12 h-16 text-lg bg-input/40 rounded-2xl" />
        {suggestions.length > 0 && !selected && (
          <div className="absolute top-full mt-2 inset-x-0 glass-strong rounded-2xl p-2 z-10">
            {suggestions.map(s => (
              <button key={s.name} onClick={() => lookup(s.name)} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.generic}</div>
                </div>
                <span className="text-[10px] font-mono text-secondary px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/20">{s.class}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-12 text-center">
            <Sparkles className="h-8 w-8 text-secondary mx-auto mb-3 animate-pulse" />
            <p className="text-muted-foreground font-mono text-sm">Generating clinical summary…</p>
          </motion.div>
        )}
        {info && !loading && (
          <motion.div key={info.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-3xl p-8 md:p-10">
            <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-3xl">{info.name}</h2>
                <p className="text-muted-foreground text-sm mt-1">{info.generic}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-secondary/10 border border-secondary/30 text-secondary font-mono">{info.class}</span>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/10 border border-primary/30 text-primary font-mono flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI generated
                </span>
              </div>
            </div>

            <Section icon={Pill} title="What it is" tone="secondary">
              <p className="text-sm text-muted-foreground leading-relaxed">{info.what_it_is}</p>
            </Section>

            {info.uses?.length > 0 && (
              <Section icon={CheckCircle2} title="Uses" tone="success">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {info.uses.map((u: string, i: number) => <li key={i} className="flex gap-2"><span className="text-success">▸</span>{u}</li>)}
                </ul>
              </Section>
            )}

            {info.side_effects && (
              <Section icon={AlertTriangle} title="Side effects" tone="warning">
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <SideGroup label="Common" items={info.side_effects.common} color="text-warning" />
                  <SideGroup label="Serious" items={info.side_effects.serious} color="text-destructive" />
                  <SideGroup label="Rare" items={info.side_effects.rare} color="text-muted-foreground" />
                </div>
              </Section>
            )}

            {info.do_not_use?.length > 0 && (
              <div className="mt-6 rounded-2xl bg-destructive/10 border border-destructive/30 p-5">
                <div className="flex items-center gap-2 text-destructive font-display mb-3"><Ban className="h-4 w-4" /> Do NOT take if</div>
                <ul className="space-y-1.5 text-sm text-foreground/80">
                  {info.do_not_use.map((d: string, i: number) => <li key={i}>• {d}</li>)}
                </ul>
              </div>
            )}

            {info.dosage?.length > 0 && (
              <Section icon={Ruler} title="Dosage guide" tone="secondary">
                <div className="overflow-hidden rounded-xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead className="bg-white/[0.03] text-xs font-mono uppercase text-muted-foreground">
                      <tr><th className="text-left p-3">Population</th><th className="text-left p-3">Dose</th></tr>
                    </thead>
                    <tbody>
                      {info.dosage.map((d: any, i: number) => (
                        <tr key={i} className="border-t border-white/5"><td className="p-3">{d.group}</td><td className="p-3 font-mono">{d.dose}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {info.alternatives?.length > 0 && (
              <Section icon={Repeat} title="Alternatives" tone="secondary">
                <div className="flex flex-wrap gap-2">
                  {info.alternatives.map((a: string) => (
                    <button key={a} onClick={() => lookup(a)} className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 hover:border-secondary/40 hover:text-secondary transition">{a}</button>
                  ))}
                </div>
              </Section>
            )}
          </motion.div>
        )}
        {!info && !loading && !selected && (
          <div className="text-center text-muted-foreground/60 text-sm font-mono">Try: Metoprolol · Apixaban · Atorvastatin</div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Section = ({ icon: Icon, title, tone, children }: any) => (
  <div className="mt-6">
    <div className={`flex items-center gap-2 font-display text-lg mb-3 ${tone === "secondary" ? "text-secondary" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : ""}`}>
      <Icon className="h-4 w-4" /> {title}
    </div>
    {children}
  </div>
);

const SideGroup = ({ label, items, color }: any) => (
  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
    <div className={`text-xs font-mono uppercase tracking-wider mb-2 ${color}`}>{label}</div>
    <ul className="space-y-1 text-muted-foreground">
      {items?.length ? items.map((s: string, i: number) => <li key={i}>• {s}</li>) : <li className="text-muted-foreground/50">—</li>}
    </ul>
  </div>
);

export default Medicines;
