import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { 
  Leaf, 
  Users, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function Dashboard() {
  // Fetch ESG score details
  const { data: esgData, isLoading: esgLoading } = useQuery({
    queryKey: ['esgScore'],
    queryFn: async () => {
      const res = await apiClient.get('/esg/score');
      return res.data;
    }
  });

  // Fetch carbon analytical totals
  const { data: carbonData, isLoading: carbonLoading } = useQuery({
    queryKey: ['carbonAnalytics'],
    queryFn: async () => {
      const res = await apiClient.get('/carbon/analytics');
      return res.data;
    }
  });

  const isLoading = esgLoading || carbonLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-emerald-500">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  // Carbon Month-over-month trend data
  const trendData = [
    { month: 'Jan', Scope1: 15, Scope2: 30, Scope3: 5 },
    { month: 'Feb', Scope1: 12, Scope2: 28, Scope3: 7 },
    { month: 'Mar', Scope1: 18, Scope2: 35, Scope3: 4 },
    { month: 'Apr', Scope1: 14, Scope2: 26, Scope3: 8 },
    { month: 'May', Scope1: 10, Scope2: 22, Scope3: 6 },
    { month: 'Jun', Scope1: 8, Scope2: 18, Scope3: 5 }
  ];

  const subScoreBreakdown = [
    { name: 'Environmental', score: esgData?.environmental || 0, color: '#10b981' },
    { name: 'Social', score: esgData?.social || 0, color: '#06b6d4' },
    { name: 'Governance', score: esgData?.governance || 0, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Executive ESG Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1">Real-time organizational compliance and sustainability ledger.</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 text-xs font-semibold">
          <TrendingDown className="h-4 w-4" />
          <span>Carbon Intensity decreased 8.4% this quarter</span>
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Core Score card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl flex flex-col justify-between items-center text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unified ESG Rating</span>
          <div className="relative my-4 flex items-center justify-center">
            {/* Dynamic Ring indicator */}
            <div className="h-32 w-32 rounded-full border-4 border-slate-800 flex items-center justify-center">
              <span className="text-4xl font-extrabold text-slate-100">{esgData?.overallScore}</span>
            </div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full animate-pulse border-t-transparent border-r-transparent"></div>
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center font-bold">
            <ArrowUpRight className="h-4.5 w-4.5 mr-0.5" />
            <span>+3.2% vs baseline reference</span>
          </div>
        </div>

        {/* Environmental KPI Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Environmental</span>
              <p className="text-2xl font-extrabold text-slate-100 mt-2">
                {carbonData?.total ? Number(carbonData.total).toFixed(2) : '0.00'} <span className="text-xs font-medium text-slate-400">tCO2e</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Leaf className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>Scope Subscore: {esgData?.environmental}/100</span>
            <span className="text-emerald-400">Active Goals</span>
          </div>
        </div>

        {/* Social KPI Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Social Impact</span>
              <p className="text-2xl font-extrabold text-slate-100 mt-2">
                24.5 <span className="text-xs font-medium text-slate-400">volunteer hrs/capita</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>Social Subscore: {esgData?.social}/100</span>
            <span className="text-cyan-400">84% Participation</span>
          </div>
        </div>

        {/* Governance KPI Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Governance</span>
              <p className="text-2xl font-extrabold text-slate-100 mt-2">
                100% <span className="text-xs font-medium text-slate-400">policy sign-off</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>Governance Subscore: {esgData?.governance}/100</span>
            <span className="text-red-400">0 compliance issues</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carbon stack trends */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">Emissions Trend (Metric Tons CO2e)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorS1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorS2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorS3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="Scope1" name="Scope 1 (Direct)" stroke="#10b981" fillOpacity={1} fill="url(#colorS1)" />
                <Area type="monotone" dataKey="Scope2" name="Scope 2 (Energy)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorS2)" />
                <Area type="monotone" dataKey="Scope3" name="Scope 3 (Travel)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorS3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ESG breakdown comparison */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">Sub-Score Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subScoreBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '12px', fontSize: '10px' }} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {
                    subScoreBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
