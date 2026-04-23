import { useState, useRef, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileCheck2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeuralLoader } from "@/components/NeuralLoader";
import { Logo } from "@/components/Logo";

const stages = [
  "Preprocessing signal…",
  "Detecting P-Q-R-S-T waves…",
  "Running CNN inference…",
  "Cross-checking with cardiology atlas…",
  "Generating report…",
];

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onFile = (f: File) => setFile(f);

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  };

  const submit = () => {
    if (!file) return;
    setAnalyzing(true);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setStage(i);
      if (i >= stages.length - 1) {
        clearInterval(t);
        setTimeout(() => navigate("/results/ecg_001"), 1200);
      }
    }, 900);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 grid place-items-center relative">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <p className="text-xs text-secondary font-mono tracking-widest uppercase mb-3">Upload ECG</p>
          <h1 className="font-display text-4xl md:text-5xl">Drop your ECG. Get answers.</h1>
          <p className="text-muted-foreground mt-3">Photo, PDF, or raw signal CSV — we handle them all.</p>
        </div>

        {!file ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed cursor-pointer p-16 text-center transition-all
              ${drag ? "border-primary bg-primary/5 scale-[1.01]" : "border-primary/40 hover:border-primary/60 hover:bg-white/[0.02]"}`}>
            <motion.div animate={drag ? { y: -6 } : { y: 0 }} className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mb-6">
              <UploadCloud className="h-9 w-9 text-primary" />
            </motion.div>
            <h3 className="font-display text-2xl mb-2">Drag & drop your ECG file</h3>
            <p className="text-muted-foreground text-sm mb-4">or click to browse</p>
            <p className="text-xs text-muted-foreground/60 font-mono">.JPG · .PNG · .PDF · .CSV (max 25 MB)</p>
            <input ref={inputRef} type="file" hidden accept=".jpg,.jpeg,.png,.pdf,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-secondary/10 border border-secondary/30 grid place-items-center">
                <FileCheck2 className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{(file.size / 1024).toFixed(1)} KB · {file.name.endsWith(".csv") ? "Signal file detected ✓" : "Image file detected ✓"}</div>
              </div>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-full bg-gradient-coral animate-shimmer" />
            </div>
            <Button variant="hero" size="lg" className="w-full mt-6" onClick={submit}>Analyze with AI</Button>
          </motion.div>
        )}
      </div>

      {/* Analyzing overlay */}
      <AnimatePresence>
        {analyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur-xl">
            <div className="text-center">
              <div className="relative mx-auto w-60 h-60 mb-8">
                <NeuralLoader size={240} />
                <div className="absolute inset-0 grid place-items-center">
                  <Logo size="lg" />
                </div>
              </div>
              <h2 className="font-display text-2xl mb-2">AI is analyzing your ECG…</h2>
              <motion.p key={stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-muted-foreground font-mono text-sm">
                {stages[stage]}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadPage;
