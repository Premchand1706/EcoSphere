import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import { Leaf, Lock, Mail, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      navigate('/');
    },
    onError: (err: any) => {
      setErrorMsg(err.detail || 'Authentication failed. Please verify credentials.');
    }
  });

  const onSubmit = (data: any) => {
    setErrorMsg(null);
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background decoration bubbles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10">
        {/* Logo Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-3">
            <Leaf className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wider">EcoSphere Login</h2>
          <p className="text-slate-400 text-xs mt-1">Enterprise ESG Management Portal</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-3">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                placeholder="name@company.com"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email pattern' }
                })}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm glass-input"
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-red-400 mt-1.5 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm glass-input"
              />
            </div>
            {errors.password && (
              <p className="text-[10px] text-red-400 mt-1.5 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Trigger */}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
            ) : (
              <span>Sign In to Environment</span>
            )}
          </button>
        </form>

        {/* Demo Helper box */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          <p className="font-semibold text-slate-400 mb-1">Hackathon 2026 Admin Seed Accounts:</p>
          <p>Admin: <span className="text-emerald-400">admin@ecocorp.com</span> | Password: <span className="text-emerald-400">Password123</span></p>
          <p>Employee: <span className="text-emerald-400">dev.one@ecocorp.com</span> | Password: <span className="text-emerald-400">Password123</span></p>
        </div>
      </div>
    </div>
  );
}
