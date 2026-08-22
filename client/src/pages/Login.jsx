import React, { useState } from 'react';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('admin@scheduler.io');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Dynamic Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md relative z-10 space-y-6">
                {/* Brand */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-100 tracking-tight">PulseScheduler</h1>
                    <p className="text-xs text-slate-400">Distributed Job Scheduler & Developer Console</p>
                </div>

                {error && (
                    <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-lg text-xs text-rose-400 text-center font-mono">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                    <div>
                        <label className="text-slate-400 block mb-1 font-sans font-medium">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-slate-400 block mb-1 font-sans font-medium">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-sans font-semibold py-2.5 rounded-lg shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs"
                    >
                        {submitting ? 'Authenticating...' : 'Sign In to Developer Console'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                {/* 1-Click Demo Shortcut */}
                <div className="pt-4 border-t border-slate-800/80 text-center">
                    <p className="text-[11px] text-slate-500 mb-2">Evaluating this assignment?</p>
                    <button
                        onClick={() => {
                            setEmail('admin@scheduler.io');
                            setPassword('password123');
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline flex items-center justify-center gap-1 mx-auto"
                    >
                        <ShieldCheck className="w-3.5 h-3.5" /> Fill Demo Credentials
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
