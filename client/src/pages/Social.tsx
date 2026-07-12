import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiClient } from '../services/api-client';
import { Users, Heart, Award, FileText, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

export default function Social() {
  const queryClient = useQueryClient();
  const [activeRegId, setActiveRegId] = useState<string | null>(null);

  // Fetch CSR Activities
  const { data: activities, isLoading: actsLoading } = useQuery({
    queryKey: ['csrActivities'],
    queryFn: async () => {
      const res = await apiClient.get('/csr/activities');
      return res.data;
    }
  });

  // Fetch current user details
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    }
  });

  // Fetch current registrations pending approval
  const { data: registrations, isLoading: regsLoading } = useQuery({
    queryKey: ['csrRegistrations'],
    queryFn: async () => {
      const res = await apiClient.get('/csr/registrations');
      return res.data;
    }
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      loggedHours: 0,
      evidenceUrl: ''
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const res = await apiClient.post(`/csr/activities/${activityId}/register`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrActivities'] });
      queryClient.invalidateQueries({ queryKey: ['csrRegistrations'] });
    }
  });

  const logHoursMutation = useMutation({
    mutationFn: async ({ regId, data }: { regId: string; data: any }) => {
      const res = await apiClient.post(`/csr/registrations/${regId}/log-hours`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrActivities'] });
      queryClient.invalidateQueries({ queryKey: ['csrRegistrations'] });
      setActiveRegId(null);
      reset();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ regId, action }: { regId: string; action: 'APPROVED' | 'REJECTED' }) => {
      const res = await apiClient.post(`/csr/registrations/${regId}/approve`, { action });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrRegistrations'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // level details
    }
  });

  const isEmployee = user?.role === 'EMPLOYEE';
  const isManager = user?.role === 'ORG_ADMIN' || user?.role === 'DEPT_MANAGER';

  const onLogSubmit = (data: any) => {
    if (!activeRegId) return;
    logHoursMutation.mutate({
      regId: activeRegId,
      data: {
        ...data,
        loggedHours: Number(data.loggedHours)
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Social Capital & CSR</h1>
        <p className="text-slate-400 text-xs mt-1">Track volunteering participation rates, logged hours, and charity program targets.</p>
      </div>

      {/* Activities Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Active Programs Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actsLoading ? (
            <p className="text-slate-500 text-xs">Loading programs...</p>
          ) : activities?.length === 0 ? (
            <p className="text-slate-500 text-xs">No active CSR activities cataloged.</p>
          ) : (
            activities?.map((act: any) => {
              // Check if user is registered for this activity (mock registry matches check)
              const userReg = registrations?.find((r: any) => r.csrActivityId === act.id && r.user.email === user?.email);

              return (
                <div key={act.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                        {act.type.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-base text-slate-200 mt-2">{act.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{act.description}</p>
                    </div>
                    <Heart className="h-5 w-5 text-red-400 shrink-0" />
                  </div>

                  <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="text-slate-300 font-semibold">{new Date(act.startDate).toLocaleDateString()}</span>
                    </div>
                    {act.requiredHours > 0 && (
                      <div className="flex justify-between">
                        <span>Target volunteering credit:</span>
                        <span className="text-slate-300 font-semibold">{act.requiredHours} Hours</span>
                      </div>
                    )}
                    {act.targetFund > 0 && (
                      <div className="flex justify-between">
                        <span>Fundraising target:</span>
                        <span className="text-slate-300 font-semibold">${act.targetFund}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {isEmployee && (
                      <>
                        {!userReg ? (
                          <button
                            onClick={() => registerMutation.mutate(act.id)}
                            disabled={registerMutation.isPending}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            Register Participation
                          </button>
                        ) : userReg.status === 'REGISTERED' ? (
                          <div className="space-y-2">
                            <span className="block text-[10px] text-cyan-400 text-center font-bold">Registered (Attendance Pending)</span>
                            <button
                              onClick={() => setActiveRegId(act.id === activeRegId ? null : userReg.id)}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition-all cursor-pointer"
                            >
                              {activeRegId === userReg.id ? 'Close Log' : 'Log Hours & Proof'}
                            </button>
                          </div>
                        ) : (
                          <span className="block text-[10px] text-emerald-400 text-center font-bold flex items-center justify-center space-x-1.5 py-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                            <CheckCircle className="h-4 w-4" />
                            <span>Participated ({userReg.approvalStatus})</span>
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Log Hours Drawer Form */}
      {activeRegId && (
        <div className="glass-panel p-6 rounded-2xl max-w-md">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex items-center">
            <Clock className="h-4.5 w-4.5 text-cyan-400 mr-2" />
            Log Hours Completed
          </h3>
          <form onSubmit={handleSubmit(onLogSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Hours Completed</label>
              <input
                type="number"
                step="0.5"
                placeholder="0.0"
                {...register('loggedHours', { required: true, min: 0.5 })}
                className="w-full py-2 px-3 rounded-lg text-xs glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Evidence Document URL</label>
              <input
                type="text"
                placeholder="https://storage.local/proofs/volunteer-image.png"
                {...register('evidenceUrl', { required: true })}
                className="w-full py-2 px-3 rounded-lg text-xs glass-input"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveRegId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded text-xs font-bold cursor-pointer"
              >
                Submit Evidence
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Registrations Review Matrix for Admins */}
      {isManager && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">CSR Registrations Inbound Approvals Desk</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Activity Name</th>
                  <th className="px-6 py-4">Hours Logged</th>
                  <th className="px-6 py-4">Evidence</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {regsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading registrations...</td>
                  </tr>
                ) : registrations?.filter((r: any) => r.status === 'PARTICIPATED').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No pending participation claims needing validation.</td>
                  </tr>
                ) : (
                  registrations?.filter((r: any) => r.status === 'PARTICIPATED').map((reg: any) => (
                    <tr key={reg.id} className="hover:bg-slate-900/30">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-200">{reg.user.firstName} {reg.user.lastName}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">{reg.user.email}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">{reg.csrActivity.title}</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">{reg.loggedHours} Hours</td>
                      <td className="px-6 py-4">
                        {reg.evidenceUrl ? (
                          <a 
                            href={reg.evidenceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center text-[10px] text-cyan-400 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            View Evidence Link
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No Evidence</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          reg.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          reg.approvalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {reg.approvalStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {reg.approvalStatus === 'PENDING' ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => approveMutation.mutate({ regId: reg.id, action: 'APPROVED' })}
                              className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-emerald-500 rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => approveMutation.mutate({ regId: reg.id, action: 'REJECTED' })}
                              className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
