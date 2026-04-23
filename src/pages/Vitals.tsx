import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bluetooth, Activity, Heart, Droplet, Footprints, AlertTriangle, X, Phone } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis, XAxis } from "recharts";
import { useSmartwatch } from "@/context/SmartWatchContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Vitals = () => {
  const sw = useSmartwatch();
  const [name, setName] = useState(sw.threshold.emergency_contact_name ?? "");
  const [phone, setPhone] = useState(sw.threshold.emergency_contact_phone ?? "");
  const [maxHr, setMaxHr] = useState(sw.threshold.max_heart_rate);
  const [minHr, setMinHr] = useState(sw.threshold.min_heart_rate);
  const [minSpo2, setMinSpo2] = useState(sw.threshold.min_spo2);

  useEffect(() => {
    setName(sw.threshold.emergency_contact_name ?? "");
    setPhone(sw.threshold.emergency_contact_phone ?? "");
    setMaxHr(sw.threshold.max_heart_rate);
    setMinHr(sw.threshold.min_heart_rate);
    setMinSpo2(sw.threshold.min_spo2);
  }, [sw.threshold]);

  const chartData = sw.liveHistory.map((r, i) => ({ i, hr: r.heartRate }));
  const beatDuration = sw.current ? 60 / Math.max(40, sw.current.heartRate) : 1;

  const sosLink = phone
    ? `sms:${phone.replace(/\s+/g, "")}?body=${encodeURIComponent("Emergency: HeartIQ detected critical vitals. Please check on me.")}`
    : "#";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <p className="text-xs text-[#00e5cc] font-mono tracking-widest uppercase mb-2">Live monitoring</p>
        <h1 className="font-display font-bold text-4xl text-white">Vitals</h1>
      </div>

      {/* Connection panel */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        {!sw.isConnected ? (
          <>
            <h2 className="font-display font-bold text-xl text-white mb-4">Connect your device</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <ConnectCard
                icon={Bluetooth} color="text-[#00e5cc]"
                title="Bluetooth Wearable"
                desc="WearOS, Fitbit, Garmin, BLE heart rate monitors"
                btnLabel={sw.isConnecting ? "Connecting…" : "Connect via Bluetooth"}
                onClick={sw.connectBluetooth}
                hint="Not supported on iOS Safari"
              />
              <ConnectCard
                icon={Activity} color="text-purple-400"
                title="Simulated Device"
                desc="Demo mode with realistic simulated data"
                btnLabel="Start Simulation"
                onClick={sw.startSimulation}
              />
              <ConnectCard
                icon={Heart} color="text-white"
                title="Apple Health / Google Fit"
                desc="Import historical heart-rate CSV export"
                btnLabel="Upload CSV"
                onClick={() => document.getElementById("hf-csv")?.click()}
              />
              <ConnectCard
                icon={Footprints} color="text-amber-400"
                title="Manual Entry"
                desc="Log a single reading"
                btnLabel="Add reading"
                onClick={() => {
                  const hr = parseInt(prompt("Heart rate (BPM)?") ?? "0", 10);
                  if (hr > 0) sw.saveManualReading({ heartRate: hr });
                }}
              />
            </div>
            <input id="hf-csv" type="file" accept=".csv" hidden
              onChange={(e) => e.target.files?.[0] && sw.importHealthCsv(e.target.files[0], "google_fit")} />
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-green-500/40 animate-ping" />
              <span className="relative block h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium">{sw.deviceName}</div>
              <div className="text-xs text-white/60 font-mono">Connected · Live · {sw.connectionType}</div>
            </div>
            <Button variant="outline" size="sm" onClick={sw.disconnect}
              className="border-white/20 bg-transparent hover:bg-white/10 text-white rounded-xl">
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Live dashboard */}
      {sw.isConnected && sw.current && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Heart Rate" value={sw.current.heartRate} unit="BPM" color="text-[#ff2d55]"
              icon={
                <Heart className="h-5 w-5 text-[#ff2d55]" style={{ animation: `heartbeat ${beatDuration}s ease-in-out infinite` }} />
              } />
            <MetricCard label="SpO2" value={sw.current.spo2} unit="%" color="text-[#00e5cc]" icon={<Droplet className="h-5 w-5 text-[#00e5cc]" />} />
            <MetricCard label="Steps" value={sw.current.steps} unit="today" color="text-white" icon={<Footprints className="h-5 w-5 text-white" />}
              progress={Math.min(100, (sw.current.steps / 10000) * 100)} />
            <MetricCard label="HRV" value={sw.current.hrv} unit="ms" color="text-amber-400" icon={<Activity className="h-5 w-5 text-amber-400" />} />
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <div className="text-xs font-mono uppercase text-white/60 mb-3">Live Heart Rate · last 2 minutes</div>
            <div className="h-32">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <XAxis dataKey="i" hide />
                  <YAxis domain={["dataMin - 10", "dataMax + 10"]} hide />
                  <ReferenceLine y={sw.threshold.max_heart_rate} stroke="#fbbf24" strokeDasharray="4 4" />
                  <ReferenceLine y={sw.threshold.min_heart_rate} stroke="#00e5cc" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="hr" stroke="#ff2d55" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Alerts */}
      {sw.alerts.length > 0 && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#ff2d55]" /> Active Alerts
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff2d55] text-white font-mono">{sw.alerts.length}</span>
            </h3>
          </div>
          <div className="space-y-2">
            {sw.alerts.map((a) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border-l-4 border-[#ff2d55]">
                <AlertTriangle className="h-4 w-4 text-[#ff2d55] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{a.title}</div>
                  <div className="text-xs text-white/60">{a.description}</div>
                </div>
                <button onClick={() => sw.dismissAlert(a.id)} className="text-white/60 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
          {sw.alerts.some((a) => a.severity === "critical") && phone && (
            <a href={sosLink} className="mt-4 block">
              <Button className="w-full bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-xl">
                <Phone className="h-4 w-4 mr-2" /> Emergency SOS — Alert {name || "contact"}
              </Button>
            </a>
          )}
        </div>
      )}

      {/* Threshold settings */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-lg text-white mb-4">Alert Thresholds</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={`Max Heart Rate: ${maxHr} BPM`}>
            <input type="range" min={80} max={180} value={maxHr} onChange={(e) => setMaxHr(+e.target.value)} className="w-full accent-[#ff2d55]" />
          </Field>
          <Field label={`Min Heart Rate: ${minHr} BPM`}>
            <input type="range" min={30} max={70} value={minHr} onChange={(e) => setMinHr(+e.target.value)} className="w-full accent-[#00e5cc]" />
          </Field>
          <Field label={`Min SpO2: ${minSpo2}%`}>
            <input type="range" min={85} max={98} value={minSpo2} onChange={(e) => setMinSpo2(+e.target.value)} className="w-full accent-[#00e5cc]" />
          </Field>
          <Field label="Emergency contact name">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl" />
          </Field>
          <Field label="Emergency contact phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1…" className="bg-white/10 border-white/10 focus:border-[#00e5cc] text-white rounded-xl" />
          </Field>
        </div>
        <Button
          className="mt-4 bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-xl"
          onClick={() =>
            sw.saveThreshold({
              max_heart_rate: maxHr,
              min_heart_rate: minHr,
              min_spo2: minSpo2,
              emergency_contact_name: name || null,
              emergency_contact_phone: phone || null,
              alerts_enabled: true,
            })
          }
        >
          Save thresholds
        </Button>
      </div>
    </motion.div>
  );
};

const ConnectCard = ({ icon: Icon, color, title, desc, btnLabel, onClick, hint }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition">
    <Icon className={`h-6 w-6 ${color} mb-3`} />
    <div className="text-white font-medium">{title}</div>
    <div className="text-xs text-white/60 mt-1 mb-3">{desc}</div>
    <Button onClick={onClick} className="w-full bg-[#ff2d55] hover:bg-[#ff2d55]/90 text-white rounded-xl">{btnLabel}</Button>
    {hint && <div className="text-[10px] text-white/40 mt-2 font-mono">{hint}</div>}
  </div>
);

const MetricCard = ({ label, value, unit, color, icon, progress }: any) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-mono uppercase text-white/60">{label}</div>
      {icon}
    </div>
    <div className={`font-mono text-4xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-white/60 mt-1">{unit}</div>
    {progress != null && (
      <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-[#00e5cc]" style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

const Field = ({ label, children }: any) => (
  <div>
    <Label className="text-xs text-white/60 mb-2 block">{label}</Label>
    {children}
  </div>
);

export default Vitals;
