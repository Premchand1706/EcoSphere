import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiClient } from '../services/api-client';
import { ShieldCheck, BookOpen, AlertCircle, FileSpreadsheet, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';

export default function Governance() {
  const queryClient = useQueryClient();
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  // Fetch Policies
  const { data: policies, isLoading: polsLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await apiClient.get('/governance/policies');
      return res.data;
    }
  });

  // Fetch Compliance Issues
  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['complianceIssues'],
    queryFn: async () => {
      const res = await apiClient.get('/governance/compliance-issues');
      return res.data;
    }
  });

  // Fetch Audit Logs Trail
  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await apiClient.get('/governance/audit-logs');
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

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      resolutionDetails: ''
    }
  });

  const ackMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const res = await apiClient.post(`/governance/policies/${policyId}/acknowledge`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // xp details
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.post(`/governance/compliance-issues/${id}/resolve`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceIssues'] });
      setActiveIssueId(null);
      reset();
    }
  });

  const onResolveSubmit = (data: any) => {
    if (!activeIssueId) return;
    resolveMutation.mutate({ id: activeIssueId, data });
  };

  const isAuditor = user?.role === 'AUDITOR' || user?.role === 'ORG_ADMIN';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Governance & Compliance</h1>
        <p className="text-slate-400 text-xs mt-1">Review active corporate codes, verify policy acknowledgments, and manage audit findings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Policies Column */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <BookOpen className="h-4.5 w-4.5 text-amber-500 mr-2" />
            Active Compliance Policies
          </h3>
          <div className="space-y-4">
            {polsLoading ? (
              <p className="text-slate-500 text-xs">Loading policies...</p>
            ) : policies?.length === 0 ? (
              <p className="text-slate-500 text-xs">No governance policies published.</p>
            ) : (
              policies?.map((pol: any) => {
                const hasSigned = pol.signatures && pol.signatures.length > 0;
                return (
                  <div key={pol.id} className="glass-panel p-5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-200">{pol.title}</h4>
                        <span className="text-[10px] text-slate-500">Version {pol.version} • {pol.category}</span>
                      </div>
                      <ShieldCheck className="h-4.5 w-4.5 text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{pol.content}</p>
                    
                    <div className="pt-2">
                      {hasSigned ? (
                        <div className="flex items-center text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-lg font-semibold justify-center">
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          <span>Signed Acknowledgment</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => ackMutation.mutate(pol.id)}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer"
                        >
                          Read & Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Compliance Issues Column */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <AlertCircle className="h-4.5 w-4.5 text-red-500 mr-2" />
            Compliance Issues Board
          </h3>

          {activeIssueId && (
            <div className="glass-panel p-5 rounded-2xl max-w-md">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider mb-3">Resolve Finding</h4>
              <form onSubmit={handleSubmit(onResolveSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resolution Details & Auditing Proof</label>
                  <textarea
                    rows={3}
                    placeholder="Provide description of correction action taken..."
                    {...register('resolutionDetails', { required: true })}
                    className="w-full py-2 px-3 rounded-lg text-xs glass-input"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setActiveIssueId(null)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-[10px] font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded text-[10px] font-bold cursor-pointer"
                  >
                    Submit Resolution
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {issuesLoading ? (
              <p className="text-slate-500 text-xs">Loading issues...</p>
            ) : issues?.length === 0 ? (
              <p className="text-slate-500 text-xs">No active compliance issues logged.</p>
            ) : (
              issues?.map((issue: any) => {
                const isOwner = issue.ownerId === user?.id;
                const canResolve = isOwner && issue.status !== 'RESOLVED';

                return (
                  <div key={issue.id} className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          issue.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          issue.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {issue.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          issue.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          issue.status === 'OVERDUE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {issue.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200">{issue.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{issue.description}</p>
                      
                      <div className="flex space-x-6 text-[10px] text-slate-500 font-semibold pt-1">
                        <span>Owner: {issue.owner.firstName} {issue.owner.lastName}</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {new Date(issue.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center md:pl-4">
                      {canResolve ? (
                        <button
                          onClick={() => setActiveIssueId(issue.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-lg hover:shadow-emerald-600/15"
                        >
                          Resolve
                        </button>
                      ) : issue.status === 'RESOLVED' ? (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 italic block">Resolved on {new Date(issue.resolvedAt).toLocaleDateString()}</span>
                          <p className="text-[10px] text-emerald-400 font-semibold max-w-xs truncate mt-0.5">{issue.resolutionDetails}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Locked</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Auditor Audit Log records table */}
      {isAuditor && (
        <div className="glass-panel rounded-2xl overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center">
              <FileSpreadsheet className="h-4.5 w-4.5 text-cyan-400 mr-2" />
              Administrative Audit Logs Trail
            </h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-2.5 py-1 rounded">Read-Only</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Table</th>
                  <th className="px-6 py-4">Modified By</th>
                  <th className="px-6 py-4">State Pre-Update</th>
                  <th className="px-6 py-4">State Post-Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs font-mono">
                {auditLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-sans">No audit events recorded.</td>
                  </tr>
                ) : (
                  auditLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-900/20">
                      <td className="px-6 py-4 text-slate-500 text-[10px]">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-200 font-bold">{log.action}</td>
                      <td className="px-6 py-4 text-slate-400">{log.entityType}</td>
                      <td className="px-6 py-4 text-slate-300 font-sans">{log.user?.firstName} {log.user?.lastName}</td>
                      <td className="px-6 py-4 text-red-400 max-w-xs truncate text-[10px]">{JSON.stringify(log.preState)}</td>
                      <td className="px-6 py-4 text-emerald-400 max-w-xs truncate text-[10px]">{JSON.stringify(log.postState)}</td>
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
