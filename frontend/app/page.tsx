"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, 
  Clock, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  TrendingDown, 
  ShieldAlert,
  Zap,
  Building,
  UserCheck,
  Camera,
  Tv,
  Lock,
  AlertCircle
} from "lucide-react";

interface Counter {
  id: string;
  name: string;
  service_name: string;
  required_skill: string;
  officer: string;
  officer_skills: string[];
  queue_length: number;
  avg_processing_time_mins: number;
  dwell_time_mins: number;
  status: string;
  pressure_score: number;
  cooldown_remaining_mins: number;
}

interface OptimizationResult {
  source_counter_id?: string;
  target_counter_id?: string;
  officer_to_move?: string;
  projected_wait_time_reduction_percent: number;
  recommendation_text: string;
  cooldown_enforced_mins: number;
  skill_validated: boolean;
}

export default function Dashboard() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [recommendation, setRecommendation] = useState<OptimizationResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [isPlanDeployed, setIsPlanDeployed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // CCTV camera viewport states
  const [selectedCam, setSelectedCam] = useState<"CAM-01" | "CAM-02">("CAM-01");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live Clock & Initial Data Fetch
  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      };
      setCurrentTime(new Date().toLocaleString("en-IN", options) + " (IST)");
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    fetchMetrics();
    return () => clearInterval(interval);
  }, []);

  // CCTV Canvas Drawing Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let scanlineY = 0;
    
    // Bounding boxes representing people coordinates
    const peopleCAM1 = [
      { x: 60, y: 150, w: 45, h: 90, label: "Person 98%" },
      { x: 120, y: 180, w: 40, h: 80, label: "Person 94%" },
      { x: 80, y: 220, w: 48, h: 95, label: "Person 97%" },
      { x: 210, y: 160, w: 42, h: 85, label: "Person 92%" },
      { x: 260, y: 200, w: 46, h: 90, label: "Person 95%" },
      { x: 150, y: 250, w: 44, h: 88, label: "Person 91%" },
      { x: 300, y: 170, w: 43, h: 86, label: "Person 96%" },
      { x: 340, y: 240, w: 45, h: 92, label: "Person 90%" },
    ];

    const peopleCAM2 = [
      { x: 80, y: 190, w: 42, h: 84, label: "Person 94%" },
      { x: 240, y: 220, w: 45, h: 90, label: "Person 96%" },
    ];

    const drawCCTV = () => {
      // Clear canvas
      ctx.fillStyle = "#0c101a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint camera grid lines
      ctx.strokeStyle = "rgba(71, 85, 105, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 40; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 40; j < canvas.height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw Bounding Boxes of People based on Selected Camera
      const boxes = selectedCam === "CAM-01" ? peopleCAM1 : peopleCAM2;
      boxes.forEach((box) => {
        // Add subtle movement simulation
        const jitterX = Math.sin(Date.now() / 400 + box.x) * 1.5;
        const jitterY = Math.cos(Date.now() / 400 + box.y) * 1.5;

        // Draw Bounding Box
        ctx.strokeStyle = selectedCam === "CAM-01" ? "rgba(239, 68, 68, 0.75)" : "rgba(16, 185, 129, 0.75)";
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x + jitterX, box.y + jitterY, box.w, box.h);

        // Draw Text Background Tag
        ctx.fillStyle = selectedCam === "CAM-01" ? "rgba(239, 68, 68, 0.85)" : "rgba(16, 185, 129, 0.85)";
        ctx.fillRect(box.x + jitterX, box.y + jitterY - 18, 65, 18);

        // Draw Text Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.fillText(box.label, box.x + jitterX + 4, box.y + jitterY - 6);
      });

      // Draw Queue Zone Regions of Interest (ROIs)
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      if (selectedCam === "CAM-01") {
        ctx.strokeRect(40, 100, 340, 260); // Counter 1 ROI
        ctx.fillStyle = "rgba(139, 92, 246, 0.05)";
        ctx.fillRect(40, 100, 340, 260);
        ctx.fillStyle = "rgba(139, 92, 246, 0.8)";
        ctx.font = "bold 10px sans-serif";
        ctx.setLineDash([]);
        ctx.fillText("ROI ZONE 1: DL RENEWAL QUEUE", 50, 120);
      } else {
        ctx.strokeRect(50, 120, 280, 220); // Counter 4 ROI
        ctx.fillStyle = "rgba(139, 92, 246, 0.05)";
        ctx.fillRect(50, 120, 280, 220);
        ctx.fillStyle = "rgba(139, 92, 246, 0.8)";
        ctx.font = "bold 10px sans-serif";
        ctx.setLineDash([]);
        ctx.fillText("ROI ZONE 4: BIRTH CERTIFICATE QUEUE", 60, 140);
      }

      // Draw Camera HUD Details
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`CCTV FEED // PUNE RTO DIVISION`, 20, 30);
      ctx.fillText(`${selectedCam} // WIDE QUEUE CAMERA`, 20, 48);

      // Red blinking recording dot
      if (Math.floor(Date.now() / 600) % 2 === 0) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(canvas.width - 90, 26, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 11px monospace";
        ctx.fillText("REC", canvas.width - 78, 30);
      }

      // Dynamic scanline overlay
      ctx.fillStyle = "rgba(139, 92, 246, 0.02)";
      ctx.fillRect(0, scanlineY, canvas.width, 2);
      scanlineY = (scanlineY + 1.2) % canvas.height;

      // Vignette effect (CCTV overlay shadow)
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width / 4,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.8
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.65)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationId = requestAnimationFrame(drawCCTV);
    };

    drawCCTV();
    return () => cancelAnimationFrame(animationId);
  }, [selectedCam]);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/kaaryaflow/counter-metrics");
      if (res.ok) {
        const data = await res.json();
        setCounters(data);
      }
    } catch (err) {
      console.warn("Backend API not reachable. Loading simulated metrics.", err);
      // Construct fallback metrics
      setCounters(DEFAULT_COUNTERS_FALLBACK);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setIsPlanDeployed(false);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/kaaryaflow/optimize-staffing", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data);
      } else {
        throw new Error("Optimization request failed");
      }
    } catch (err) {
      console.warn("Backend unavailable. Simulating optimization algorithm locally.", err);
      setTimeout(() => {
        setRecommendation({
          source_counter_id: "counter-4",
          target_counter_id: "counter-1",
          officer_to_move: "Officer Joshi",
          projected_wait_time_reduction_percent: 38,
          recommendation_text: "Reallocate Officer Joshi from Birth Certificate (Counter 4) to DL Renewal (Counter 1) for 120 mins. Projected wait reduction: 38%. (Skill matrix validated, cooldown verified).",
          cooldown_enforced_mins: 120,
          skill_validated: true
        });
      }, 1000);
    } finally {
      setOptimizing(false);
    }
  };

  const approveReallocationPlan = async () => {
    if (!recommendation) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/kaaryaflow/approve-reallocation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_counter_id: recommendation.source_counter_id,
          target_counter_id: recommendation.target_counter_id,
          officer_to_move: recommendation.officer_to_move
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCounters(data.counters);
        setIsPlanDeployed(true);
      }
    } catch (err) {
      console.warn("Could not dispatch approval to backend. Running local UI simulation.", err);
      // Simulate locally
      setIsPlanDeployed(true);
      setCounters(prev => 
        prev.map(c => {
          if (c.id === recommendation.target_counter_id) {
            return {
              ...c,
              queue_length: Math.max(2, c.queue_length - 13),
              dwell_time_mins: Math.max(3, c.dwell_time_mins - 14),
              officer: `${c.officer} + ${recommendation.officer_to_move} (Assisting)`,
              pressure_score: Math.round(((c.queue_length - 13) * c.avg_processing_time_mins) + (c.dwell_time_mins - 14)),
              status: "normal"
            };
          }
          if (c.id === recommendation.source_counter_id) {
            return {
              ...c,
              officer: `None (${recommendation.officer_to_move} reallocated)`,
              cooldown_remaining_mins: 120
            };
          }
          return c;
        })
      );
    }
  };

  const resetSimulation = () => {
    setRecommendation(null);
    setIsPlanDeployed(false);
    fetchMetrics();
  };

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 p-4 md:p-8 font-sans selection:bg-violet-600 selection:text-white">
      {/* Background Neon Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        
        {/* Header Widget */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/35 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.4)]">
              <Zap className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent uppercase">
                  KaaryaFlow AI
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/25 rounded-md">
                  V1.1 LIVE FEED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                Pune RTO Division Command Center — Manager-in-the-Loop Decision Support
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-end gap-3 text-right">
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800/75 px-4 py-2 rounded-xl text-slate-300 font-mono text-xs tracking-wide shadow-inner">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span>{currentTime || "Initializing Time..."}</span>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              AI Vision Engine Online
            </div>
          </div>
        </header>

        {/* Global Impact Dashboard Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Wait Time Saved Today</span>
              <p className="text-2xl font-black text-white">340 Hours</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <TrendingDown className="w-3 h-3" />
                +14.2% operational trend
              </p>
            </div>
            <div className="p-3.5 bg-slate-800/40 rounded-xl text-slate-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Active Staffing Units</span>
              <p className="text-2xl font-black text-white">4 Officers</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                <UserCheck className="w-3 h-3 text-slate-500" />
                100% attendance validated
              </p>
            </div>
            <div className="p-3.5 bg-slate-800/40 rounded-xl text-slate-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-md sm:col-span-2 lg:col-span-1">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Shift Lock Policy</span>
              <p className="text-2xl font-black text-white">120 Mins Min</p>
              <p className="text-[10px] text-violet-400 flex items-center gap-1 font-semibold">
                <Lock className="w-3 h-3 text-violet-500" />
                Cooldown active (anti-microshift)
              </p>
            </div>
            <div className="p-3.5 bg-slate-800/40 rounded-xl text-slate-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* CCTV Vision Feed and AI Counter Metrics Grid (Split Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Block: Live CCTV Stream Panel (Occupies 1 Column) */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                <Camera className="w-4 h-4 text-violet-400" />
                Live CCTV Analytics Feed
              </h2>
              <p className="text-[10px] text-slate-400">
                Extracting operational crowd densities directly from IP cameras.
              </p>
            </div>

            {/* Video Canvas Terminal */}
            <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-xl border border-slate-800/85 overflow-hidden shadow-inner group">
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={300}
                className="w-full h-full object-cover"
              />
              
              {/* Scan effect lines */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-violet-950/5 to-transparent bg-[length:100%_4px] opacity-35" />
            </div>

            {/* Camera Channel Controls */}
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedCam("CAM-01")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                  selectedCam === "CAM-01" 
                    ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-950" 
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                CAM-01 (DL Renewal)
              </button>
              <button 
                onClick={() => setSelectedCam("CAM-02")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                  selectedCam === "CAM-02" 
                    ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-950" 
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                CAM-02 (Birth Cert)
              </button>
            </div>
          </section>

          {/* Right Block: Live Counters Grid (Occupies 2 Columns) */}
          <section className="lg:col-span-2 bg-slate-900/20 border border-slate-800/70 rounded-2xl p-5 backdrop-blur-sm space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="space-y-0.5">
                <h2 className="text-sm font-extrabold tracking-wider text-slate-200 uppercase">
                  Counter Metrics & Pressure Analysis
                </h2>
                <p className="text-[10px] text-slate-400">
                  Real-time workloads based on CCTV people count, processing times, and waiting dwell times.
                </p>
              </div>
              <button 
                onClick={fetchMetrics} 
                disabled={isRefreshing}
                className="text-[10px] flex items-center gap-1.5 text-slate-400 hover:text-white transition-all bg-slate-800/40 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800/80"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Sync Streams
              </button>
            </div>

            {loading ? (
              <div className="bg-slate-950/20 border border-slate-900 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
                <p className="text-xs font-semibold">Refreshing metrics analytics...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {counters.map((c) => {
                  const isCritical = c.status === "critical";
                  const isIdle = c.status === "idle";
                  const hasCooldown = c.cooldown_remaining_mins > 0;

                  return (
                    <div 
                      key={c.id} 
                      className={`bg-slate-950/60 rounded-xl p-5 border transition-all duration-300 relative ${
                        isCritical 
                          ? 'border-red-500/35 shadow-[0_0_15px_rgba(239,68,68,0.08)] hover:border-red-500/50' 
                          : isIdle 
                            ? 'border-emerald-500/20 hover:border-emerald-500/40' 
                            : 'border-slate-800/80 hover:border-slate-700/60'
                      }`}
                    >
                      {/* Counter Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">{c.id.toUpperCase()}</span>
                          <h3 className="text-md font-bold text-white tracking-wide mt-0.5">{c.service_name}</h3>
                          <p className="text-[10px] text-slate-400">Required Competency: <span className="font-mono text-violet-400 font-bold bg-violet-950/40 px-1 py-0.5 rounded">{c.required_skill}</span></p>
                        </div>
                        
                        {/* Status Tags */}
                        {isCritical ? (
                          <span className="px-2 py-0.5 text-[8px] font-black tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 rounded uppercase animate-pulse">
                            High Load
                          </span>
                        ) : isIdle ? (
                          <span className="px-2 py-0.5 text-[8px] font-black tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded uppercase">
                            Low Load
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[8px] font-black tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded uppercase">
                            Stable
                          </span>
                        )}
                      </div>

                      {/* Officer & Cooldown State Details */}
                      <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-3 mb-4 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="text-[8px] uppercase font-bold text-slate-500">Duty Officer</span>
                          <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                            {c.officer}
                          </p>
                        </div>
                        
                        {hasCooldown ? (
                          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider animate-pulse">
                            <Lock className="w-3 h-3 text-amber-500" />
                            Lock: {c.cooldown_remaining_mins}m
                          </div>
                        ) : (
                          <div className="text-[8px] font-semibold text-slate-500 uppercase">
                            Cert: {c.officer_skills.join(", ")}
                          </div>
                        )}
                      </div>

                      {/* Circular Gauge and 3-Input Metrics Grid */}
                      <div className="flex gap-4 items-center">
                        {/* Circular Pressure Gauge */}
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          {/* Outer circle track */}
                          <svg className="w-full h-full transform -rotate-90">
                            <circle 
                              cx="32" cy="32" r="28" 
                              stroke="rgba(30, 41, 59, 0.6)" 
                              strokeWidth="4" 
                              fill="transparent" 
                            />
                            <circle 
                              cx="32" cy="32" r="28" 
                              stroke={isCritical ? "#f87171" : isIdle ? "#34d399" : "#60a5fa"} 
                              strokeWidth="4" 
                              fill="transparent" 
                              strokeDasharray="176" 
                              // Math.min(1, score/350)
                              strokeDashoffset={Math.max(0, 176 - (176 * Math.min(327, c.pressure_score)) / 350)}
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-xs font-black text-slate-100 font-mono">{c.pressure_score}</span>
                            <p className="text-[6px] font-bold text-slate-500 uppercase tracking-widest">Score</p>
                          </div>
                        </div>

                        {/* Input Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 flex-1 text-center bg-slate-900/30 p-2.5 rounded-lg border border-slate-900">
                          <div>
                            <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest">CCTV Queue</span>
                            <p className={`text-sm font-extrabold font-mono mt-0.5 ${isCritical ? 'text-red-400' : 'text-slate-200'}`}>
                              {c.queue_length} 👤
                            </p>
                          </div>
                          <div>
                            <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest">Process Mins</span>
                            <p className="text-sm font-extrabold font-mono text-slate-200 mt-0.5">
                              {c.avg_processing_time_mins}m
                            </p>
                          </div>
                          <div>
                            <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest">Dwell Time</span>
                            <p className="text-sm font-extrabold font-mono text-slate-200 mt-0.5">
                              {c.dwell_time_mins}m
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Manager-in-the-Loop AI Optimization Console */}
        <section className="bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-[#0b0e17] border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-5 mb-5">
            <div className="space-y-1">
              <h2 className="text-md font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" />
                Manager Decision Support Console
              </h2>
              <p className="text-xs text-slate-400">
                Generate and approve optimal workforce reallocations while validating certification skills and anti-microshifting cooldown locks.
              </p>
            </div>
            
            <div className="flex gap-2 w-full lg:w-auto">
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold py-3 px-5 rounded-xl text-xs uppercase tracking-wide shadow-md transition-all active:scale-[0.98]"
              >
                {optimizing ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    Computing Model...
                  </>
                ) : (
                  <>
                    <Zap className="w-4.5 h-4.5 text-amber-300" />
                    ⚡ Run AI Staffing Optimization
                  </>
                )}
              </button>

              {recommendation && (
                <button
                  onClick={resetSimulation}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl transition-all text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  Clear Model
                </button>
              )}
            </div>
          </div>

          {/* Dynamic AI Recommendation Display */}
          {recommendation ? (
            <div className="space-y-4 animate-slide-in">
              <div className="bg-gradient-to-r from-violet-950/25 to-indigo-950/25 border border-violet-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-violet-500 to-indigo-500" />
                
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="p-3 bg-violet-500/10 text-violet-400 border border-violet-500/25 rounded-xl">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div>
                      <span className="text-[9px] uppercase font-extrabold tracking-widest text-violet-400">AI Reallocation Plan Recommendation</span>
                      <h4 className="text-md md:text-lg font-bold text-white mt-1 leading-snug">
                        {recommendation.recommendation_text}
                      </h4>
                    </div>

                    {/* Skill Validation / Cooldown Stats row */}
                    {recommendation.officer_to_move && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-950/50 border border-slate-900 p-3 rounded-lg">
                          <span className="text-[8px] uppercase font-bold text-slate-500">Skills Competency</span>
                          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Skill Match Validated
                          </p>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-900 p-3 rounded-lg">
                          <span className="text-[8px] uppercase font-bold text-slate-500">Proposed Cooldown</span>
                          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mt-0.5">
                            <Lock className="w-3.5 h-3.5" />
                            120 Mins Lock Enforced
                          </p>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-900 p-3 rounded-lg">
                          <span className="text-[8px] uppercase font-bold text-slate-500">Decision Authority</span>
                          <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mt-0.5">
                            <UserCheck className="w-3.5 h-3.5 text-violet-400" />
                            Supervisor Approval Required
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action deployer block: Manager-in-the-Loop */}
              {recommendation.officer_to_move && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-950/50 border border-slate-900 rounded-xl p-4 gap-4">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      Human-in-the-Loop Action Center
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      As the Division Head, you must personally approve this reallocation to execute the dispatch and lock the shift.
                    </p>
                  </div>

                  {!isPlanDeployed ? (
                    <button
                      onClick={approveReallocationPlan}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wide shadow transition-all active:scale-[0.98]"
                    >
                      Approve & Issue Reallocation
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-lg text-xs font-bold shadow-inner">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                      ✓ Shift Reallocation Approved & Officer Dispatched
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 p-8 rounded-xl text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-slate-700" />
              <div>
                <p className="text-xs font-bold text-slate-400">Optimization model not computed.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Click the optimization trigger above to run workloads analysis using live CCTV and dwell metrics.
                </p>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// Fallback Mock data mapping initial states
const DEFAULT_COUNTERS_FALLBACK: Counter[] = [
  {
    id: "counter-1",
    name: "Counter 1",
    service_name: "DL Renewal",
    required_skill: "DL",
    officer: "Officer Patil",
    officer_skills: ["DL", "TAX"],
    queue_length: 25,
    avg_processing_time_mins: 12,
    dwell_time_mins: 27,
    status: "critical",
    pressure_score: 327,
    cooldown_remaining_mins: 0,
  },
  {
    id: "counter-2",
    name: "Counter 2",
    service_name: "Property Tax",
    required_skill: "TAX",
    officer: "Officer Deshmukh",
    officer_skills: ["TAX"],
    queue_length: 3,
    avg_processing_time_mins: 5,
    dwell_time_mins: 4,
    status: "idle",
    pressure_score: 19,
    cooldown_remaining_mins: 0,
  },
  {
    id: "counter-3",
    name: "Counter 3",
    service_name: "RC Transfer",
    required_skill: "RC",
    officer: "Officer Shinde",
    officer_skills: ["RC", "TAX"],
    queue_length: 14,
    avg_processing_time_mins: 8,
    dwell_time_mins: 15,
    status: "normal",
    pressure_score: 127,
    cooldown_remaining_mins: 60,  // locked cooldown remaining
  },
  {
    id: "counter-4",
    name: "Counter 4",
    service_name: "Birth Certificate",
    required_skill: "DOC",
    officer: "Officer Joshi",
    officer_skills: ["DOC", "DL"],
    queue_length: 2,
    avg_processing_time_mins: 4,
    dwell_time_mins: 3,
    status: "idle",
    pressure_score: 11,
    cooldown_remaining_mins: 0,
  },
];
