import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { apiClient } from '../services/api-client';
import { Leaf, Plus, ShieldCheck, FileText, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function Environmental() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch logged carbon records
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['carbonLogs'],
    queryFn: async () => {
      const res = await apiClient.get('/carbon/logs');
      return res.data;
    }
  });

  // Fetch active user context to check permissions
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data;
    }
  });

  // Fetch available factors
  const { data: factors } = useQuery({
    queryKey: ['emissionFactors'],
    queryFn: async () => {
      const res = await apiClient.get('/carbon/factors');
      return res.data;
    }
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      departmentId: '',
      activityType: '',
      category: 'SCOPE_2',
      quantity: 0,
      unit: '',
      emissionFactorId: '',
      logDate: '',
      notes: ''
    }
  });

  // Watch factor ID to preview math multiplier
  const selectedFactorId = watch('emissionFactorId');
  const activeFactor = factors?.find((f: any) => f.id === selectedFactorId);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/carbon/logs', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbonLogs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] }); // Level/XP might change
      reset();
      setShowForm(false);
    },
    onError: (err: any) => {
      setErrorMsg(err.detail || 'Failed to submit carbon log.');
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'APPROVED' | 'REJECTED' }) => {
      const res = await apiClient.post(`/carbon/logs/${id}/approve`, { action });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbonLogs'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });

  const onSubmit = (data: any) => {
    setErrorMsg(null);
    createMutation.mutate({
      ...data,
      quantity: Number(data.quantity),
      departmentId: user?.departmentId || data.departmentId // default user dept
    });
  };

  const isManager = user?.role === 'ORG_ADMIN' || user?.role === 'DEPT_MANAGER';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Environmental Accounting</h1>
          <p className="text-slate-400 text-xs mt-1">Audit-ready Scope 1, 2, and 3 GHG carbon log ingestion desk.</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg hover:shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log Carbon Data
          </button>
        )}
      </div>

      {/* Dynamic Log Ingestion Form */}
      {showForm && (
        <div className="glass-panel p-6 rounded-2xl max-w-2xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6 flex items-center">
            <Plus className="h-4.5 w-4.5 text-emerald-400 mr-2" />
            Ingest Carbon Output
          </h3>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Scope selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Scope Category</label>
                <select 
                  {...register('category', { required: true })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                >
                  <option value="SCOPE_1">Scope 1 (Direct Fuels)</option>
                  <option value="SCOPE_2">Scope 2 (Electricity)</option>
                  <option value="SCOPE_3">Scope 3 (Value Chain)</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Log Date</label>
                <input
                  type="date"
                  {...register('logDate', { required: 'Date is required' })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                />
                {errors.logDate && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.logDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Activity description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Activity Type</label>
                <input
                  type="text"
                  placeholder="e.g. IT server room grid power"
                  {...register('activityType', { required: 'Activity type is required' })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                />
                {errors.activityType && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.activityType.message}</p>}
              </div>

              {/* Emission Factor lookup */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Emission Factor Coefficient</label>
                <select
                  {...register('emissionFactorId', { required: 'Emission Factor is required' })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                >
                  <option value="">Select Coefficient</option>
                  {factors?.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.activityType} ({f.source} - {f.year})</option>
                  ))}
                </select>
                {errors.emissionFactorId && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.emissionFactorId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Quantity</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  {...register('quantity', { required: 'Quantity is required', min: 0.0001 })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                />
                {errors.quantity && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.quantity.message}</p>}
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Unit of Measure</label>
                <input
                  type="text"
                  placeholder="e.g. kWh, Gallons"
                  {...register('unit', { required: 'Unit is required' })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                />
                {errors.unit && <p className="text-[10px] text-red-400 mt-1 font-medium">{errors.unit.message}</p>}
              </div>
            </div>

            {/* Calculations math preview */}
            {activeFactor && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[10px] text-emerald-400 flex items-center space-x-1.5 font-semibold">
                <Leaf className="h-4 w-4" />
                <span>Calculations Preview: Quantity * {activeFactor.factor} {activeFactor.unit} = carbon footprint outputs.</span>
              </div>
            )}

            {/* Department Assignment if super admin */}
            {user?.role === 'ORG_ADMIN' && !user?.departmentId && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Department Assignment</label>
                <input
                  type="text"
                  placeholder="Department ID UUID"
                  {...register('departmentId', { required: 'Department ID is required when organization admin has no department' })}
                  className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Additional details</label>
              <textarea
                rows={2}
                placeholder="Attach notes or reference invoice identifiers..."
                {...register('notes')}
                className="w-full py-2.5 px-3 rounded-lg text-sm glass-input"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold shadow-md hover:shadow-emerald-600/10 cursor-pointer"
              >
                Submit Carbon Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Carbon Logs Ledger */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Historical Emissions Logs Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase font-semibold">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Activity Description</th>
                <th className="px-6 py-4">Scope</th>
                <th className="px-6 py-4">Activity Logged</th>
                <th className="px-6 py-4">Calculated Footprint</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {logsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading carbon logs...</td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No carbon records logged yet.</td>
                </tr>
              ) : (
                logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/30">
                    <td className="px-6 py-4 text-slate-400">{new Date(log.logDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-200">{log.activityType}</span>
                      {log.notes && <p className="text-[10px] text-slate-500 truncate mt-0.5 max-w-xs">{log.notes}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        log.category === 'SCOPE_1' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        log.category === 'SCOPE_2' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {log.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{log.quantity} {log.unit}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">{Number(log.calculatedCo2e).toFixed(4)} tCO2e</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                        log.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                        log.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/25' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'
                      }`}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.status === 'PENDING_APPROVAL' && isManager ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => approveMutation.mutate({ id: log.id, action: 'APPROVED' })}
                            className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-emerald-500 rounded text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => approveMutation.mutate({ id: log.id, action: 'REJECTED' })}
                            className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 rounded text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Locked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
