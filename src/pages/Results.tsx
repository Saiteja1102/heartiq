import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Download, ArrowRight, ChevronDown, ChevronUp, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EcgCanvas } from "@/components/EcgCanvas";
import { mockResults } from "@/data/mock";

const Results = () => {
  const { id } = useParams();
  const result = mockResults.find(r => r.id === id) ?? mockResults[0];
  const [open, setOpen] = useState(true);
  const [conf, setConf] = useState(0);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setConf(result.confidence), 200);
    return () => clearTimeout(t);
  }, [result.confidence]);

  const tone = result.status === "normal" ? { bg: "bg-secondary/10", border: "border-secondary/30", text: "text-secondary" }
             : result.status === "warning" ? { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning" }
             : { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs text-muted-foreground font-mono">RESULT · {result.id.toUpperCase()} · {result.date}</p>
        <h1 className="font-display text-4xl mt-1">ECG Analysis</h1>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left — ECG visualization */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 glass rounded-3xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg">Lead II · Rhythm Strip</h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-xs font-mono w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.2))}><ZoomIn className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-1/50 p-4 overflow-hidden">
            <div style={{ transform: `scaleY(${zoom})`, transformOrigin: "center" }}>
              <EcgCanvas height={260} speed={0} />
            </div>
            <div className="flex flex-wrap gap-3 mt-4 text-xs">
              <Tag color="bg-secondary/15 text-secondary border-secondary/30">P wave</Tag>
              <Tag color="bg-primary/15 text-primary border-primary/30">QRS complex</Tag>
              <Tag color="bg-warning/15 text-warning border-warning/30">T wave</Tag>
            </div>
          </div>
        </motion.div>

        {/* Right — Diagnosis */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-5">
          <div className={`glass rounded-3xl p-6 border ${tone.border}`}>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Diagnosis</p>
            <h2 className={`font-display text-2xl mb-5 ${tone.text}`}>{result.diagnosis.toUpperCase()}</h2>

            <div className="flex items-center gap-5">
              <ConfidenceRing value={conf} />
              <div>
                <div className="text-xs text-muted-foreground font-mono uppercase">Confidence</div>
                <div className="font-mono text-3xl">{conf}%</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-lg mb-3">In plain English</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
          </div>

          <div className="glass rounded-3xl p-6">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
              <h3 className="font-display text-lg">Technical findings</h3>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {open && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-2.5">
                {result.findings.map(f => (
                  <div key={f.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${f.normal ? "bg-success" : "bg-warning"}`} />
                      <span className="text-sm">{f.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">{f.value}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{f.range}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {result.risks.length > 0 && (
            <div className="glass rounded-3xl p-6">
              <h3 className="font-display text-lg mb-3">Risk factors detected</h3>
              <div className="flex flex-wrap gap-2">
                {result.risks.map(r => (
                  <span key={r} className="px-3 py-1 rounded-full text-xs bg-warning/10 border border-warning/30 text-warning">{r}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link to="/consult"><Button variant="hero" className="w-full">Schedule consult <ArrowRight /></Button></Link>
            <Button variant="ghost"><Download className="h-4 w-4" /> Report PDF</Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Tag = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className={`px-2.5 py-1 rounded-full border font-mono ${color}`}>{children}</span>
);

const ConfidenceRing = ({ value }: { value: number }) => {
  const r = 38; const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
      <circle cx="50" cy="50" r={r} stroke="hsl(var(--secondary))" strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)", filter: "drop-shadow(0 0 8px hsl(var(--secondary) / 0.6))" }} />
    </svg>
  );
};

export default Results;
