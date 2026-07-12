import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { Trophy, Award, Target, ShoppingBag, Crown, Zap } from 'lucide-react';
import { useState } from 'react';

export default function Gamification() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'individual' | 'department'>('individual');
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Fetch current user details
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    }
  });

  // Fetch Leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await apiClient.get('/gamification/leaderboard');
      return res.data;
    }
  });

  // Fetch earned badges
  const { data: myBadges } = useQuery({
    queryKey: ['myBadges'],
    queryFn: async () => {
      const res = await apiClient.get('/gamification/badges/me');
      return res.data;
    }
  });

  // Fetch all badges
  const { data: allBadges } = useQuery({
    queryKey: ['allBadges'],
    queryFn: async () => {
      const res = await apiClient.get('/gamification/badges');
      return res.data;
    }
  });

  // Fetch rewards catalog
  const { data: rewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const res = await apiClient.get('/gamification/rewards');
      return res.data;
    }
  });

  // Fetch challenges
  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await apiClient.get('/gamification/challenges');
      return res.data;
    }
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const res = await apiClient.post('/gamification/rewards/redeem', { rewardId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] }); // deducts XP
      queryClient.invalidateQueries({ queryKey: ['rewards'] }); // decrements stock
      setRedeemSuccess('Redemption processing! Check notifications for status.');
      setTimeout(() => setRedeemSuccess(null), 5000);
    }
  });

  const nextLevelXp = Math.pow(user?.level || 1, 2) * 100;
  const currentLevelXp = Math.pow((user?.level || 1) - 1, 2) * 100;
  const xpRequiredForNext = nextLevelXp - currentLevelXp;
  const xpInCurrentLevel = (user?.xp || 0) - currentLevelXp;
  const xpPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNext) * 100));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Gamification Arena</h1>
        <p className="text-slate-400 text-xs mt-1">Level up your green profile, unlock rare sustainability badges, and redeem eco-rewards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Level Profile Card & Badges */}
        <div className="space-y-6">
          {/* Level Progress */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <Zap className="h-4.5 w-4.5 text-amber-500 mr-2" />
              User Profile Progress
            </h3>
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col items-center justify-center text-amber-500 font-black">
                <span className="text-xs">LEVEL</span>
                <span className="text-2xl -mt-1">{user?.level}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1">
                  <span>{user?.xp} total XP</span>
                  <span>{nextLevelXp} XP to Lvl {user?.level + 1}</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <Award className="h-4.5 w-4.5 text-emerald-500 mr-2" />
              Achievements Showroom
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {allBadges?.map((badge: any) => {
                const isUnlocked = myBadges?.some((b: any) => b.id === badge.id);
                return (
                  <div 
                    key={badge.id} 
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isUnlocked 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' 
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-40'
                    }`}
                  >
                    <Trophy className={`h-8 w-8 mb-1.5 ${isUnlocked ? 'text-amber-500' : 'text-slate-600'}`} />
                    <span className="text-[10px] font-bold block truncate w-full">{badge.name}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 line-clamp-1">{badge.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center column: Active Challenges & Rewards Shop */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Challenges */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <Target className="h-4.5 w-4.5 text-red-500 mr-2" />
              Active Target Challenges
            </h3>
            <div className="space-y-4">
              {challenges?.length === 0 ? (
                <p className="text-slate-500 text-xs">No active challenges currently published.</p>
              ) : (
                challenges?.map((chall: any) => {
                  const userChallenge = chall.userChallenges && chall.userChallenges[0];
                  const currentVal = userChallenge ? Number(userChallenge.currentValue) : 0;
                  const targetVal = Number(chall.targetValue);
                  const progressPct = Math.min(100, (currentVal / targetVal) * 100);

                  return (
                    <div key={chall.id} className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-slate-200">{chall.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{chall.description}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold rounded">
                          +{chall.xpReward} XP
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Progress: {currentVal} / {targetVal}</span>
                          <span>{progressPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rewards Shop */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
              <ShoppingBag className="h-4.5 w-4.5 text-cyan-500 mr-2" />
              XP Rewards Store
            </h3>
            {redeemSuccess && (
              <p className="text-xs text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">{redeemSuccess}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mock items + database catalog items */}
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xs text-slate-200">Plant a tree in your name</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Offset carbon footprint directly.</p>
                  <span className="text-[10px] font-bold text-amber-500 block mt-2">1,000 XP Cost</span>
                </div>
                <button
                  onClick={() => {
                    setRedeemSuccess('Redeemed successfully! 1000 XP deducted.');
                    setTimeout(() => setRedeemSuccess(null), 5000);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] transition-all cursor-pointer"
                >
                  Purchase
                </button>
              </div>

              {rewards?.map((reward: any) => (
                <div key={reward.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{reward.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{reward.description}</p>
                    <span className="text-[10px] font-bold text-amber-500 block mt-2">{reward.xpCost} XP Cost</span>
                  </div>
                  <button
                    onClick={() => redeemMutation.mutate(reward.id)}
                    disabled={user?.xp < reward.xpCost || reward.stock <= 0}
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[10px] transition-all cursor-pointer disabled:opacity-40"
                  >
                    Purchase
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard tables */}
      <div className="glass-panel rounded-2xl overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <Crown className="h-4.5 w-4.5 text-amber-500 mr-2" />
            Competitive Benchmarks Leaderboard
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('individual')}
              className={`p-1.5 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'individual' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Employees
            </button>
            <button
              onClick={() => setActiveTab('department')}
              className={`p-1.5 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'department' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Departments
            </button>
          </div>
        </div>

        {activeTab === 'individual' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <th className="px-6 py-4 w-16">Rank</th>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4 text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {leaderboard?.organizationLeaderboard.map((item: any) => (
                  <tr key={item.userId} className="hover:bg-slate-900/25">
                    <td className="px-6 py-4 font-bold text-slate-400">#{item.rank}</td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold rounded">
                        Lvl {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-300">{item.xp} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <th className="px-6 py-4 w-16">Rank</th>
                  <th className="px-6 py-4">Department Name</th>
                  <th className="px-6 py-4 text-right">Average XP per Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {leaderboard?.departmentRankings.map((item: any) => (
                  <tr key={item.departmentId} className="hover:bg-slate-900/25">
                    <td className="px-6 py-4 font-bold text-slate-400">#{item.rank}</td>
                    <td className="px-6 py-4 font-semibold text-slate-200">{item.name}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">{item.averageXpPerMember} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
