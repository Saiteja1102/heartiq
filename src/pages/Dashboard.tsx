import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Activity, Heart, CalendarClock, Gauge, Upload, ArrowUpRight, FileText, Stethoscope } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mockEcgHistory, mockResults } from "@/data/mock";
import { useAuth } from "@/context/AuthContext";

const ranges = ["7D", "30D", "3M"] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<typeof ranges[number]>("7D");
  const lastResult = mockResults[0];
  const statusTone = lastResult.status === "normal" ? "text-success border-success/30 bg-success/10" :
                     lastResult.status === "warning" ? "text-warning border-warning/30 bg-warning/10" :
                     "text-destructive border-destructive/30 bg-destructive/10";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-mono">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-display text-4xl mt-1">Hi, {user?.email?.split("@")[0]}</h1>
        </div>
        <Link to="/upload"><Button variant="hero"><Upload className="h-4 w-4" /> New ECG</Button></Link>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <Card delay={0}>
          <CardHeader icon={Heart} label="Last ECG" />
          <div className="mt-3 flex items-center justify-between">
            <div className="font-display text-2xl">{lastResult.diagnosis}</div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase border ${statusTone}`}>{lastResult.status}</span>
          </div>
          <Link to={`/results/${lastResult.id}`} className="mt-4 inline-flex items-center gap-1 text-xs text-secondary hover:underline">
            View report <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Card>

        <Card delay={0.05}>
          <CardHeader icon={Activity} label="Avg Heart Rate" />
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl">75</span>
            <span className="text-xs text-muted-foreground font-mono">BPM · 7d</span>
          </div>
          <div className="mt-3 h-12 -mx-2">
            <ResponsiveContainer><LineChart data={mockEcgHistory}><Line type="monotone" dataKey="bpm" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </div>
        </Card>

        <Card delay={0.1}>
          <CardHeader icon={CalendarClock} label="Upcoming" />
          <div className="mt-3">
            <div className="font-display text-xl">Dr. Aanya Mehta</div>
            <div className="text-xs text-muted-foreground mt-1">Tomorrow, 4:30 PM · Video</div>
          </div>
          <Link to="/consult"><Button variant="ghost" size="sm" className="mt-4">Manage <ArrowUpRight className="h-3 w-3" /></Button></Link>
        </Card>

        <Card delay={0.15}>
          <CardHeader icon={Gauge} label="Risk Score" />
          <div className="mt-3 flex items-center gap-4">
            <RiskGauge value={22} />
            <div>
              <div className="font-display text-xl">Low</div>
              <div className="text-xs text-muted-foreground font-mono">22 / 100</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart + activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-xl">Heart rate trend</h3>
              <p className="text-xs text-muted-foreground font-mono">Past {range}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
              {ranges.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={mockEcgHistory}>
                <defs>
                  <linearGradient id="rate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[50, 110]} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, backdropFilter: "blur(20px)" }} />
                <Area type="monotone" dataKey="bpm" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-3xl p-6">
          <h3 className="font-display text-xl mb-6">Recent activity</h3>
          <div className="space-y-4">
            {[
              { icon: FileText, title: "ECG analyzed", desc: "Normal sinus rhythm · 96% confidence", time: "2h ago", color: "text-secondary" },
              { icon: Stethoscope, title: "Booked consultation", desc: "Dr. Mehta · Tomorrow 4:30 PM", time: "5h ago", color: "text-primary" },
              { icon: Upload, title: "ECG uploaded", desc: "lead-II-strip.pdf", time: "Yesterday", color: "text-secondary" },
              { icon: Heart, title: "Resting HR drop", desc: "−8 BPM week-over-week", time: "2d ago", color: "text-success" },
            ].map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center shrink-0">
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Card = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass rounded-2xl p-5">
    {children}
  </motion.div>
);

const CardHeader = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
    <Icon className="h-3.5 w-3.5" /> {label}
  </div>
);

const RiskGauge = ({ value }: { value: number }) => {
  const r = 28; const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const color = value < 33 ? "hsl(var(--success))" : value < 66 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <svg width={70} height={70} className="-rotate-90">
      <circle cx="35" cy="35" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
      <circle cx="35" cy="35" r={r} stroke={color} strokeWidth="6" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s" }} />
    </svg>
  );
};

export default Dashboard;
