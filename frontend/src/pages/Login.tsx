import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context-core';
import { Map, Eye, EyeOff, User, Lock, Loader2, ShieldCheck, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const brandName = localStorage.getItem('brand_name') || 'Mapa Território';
    const brandLogo = localStorage.getItem('brand_logo');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (response.ok) {
                login(
                    data.token,
                    data.role,
                    data.user.full_name,
                    data.user.type,
                    data.user.repCode,
                    data.user.estado_end,
                    data.user.default_workspace,
                    data.user.inactivity_limit
                );
                toast.success(`Bem-vindo, ${data.user.full_name || 'Usuário'}!`);
                
                // Redirecionar TODOS os usuários para a Home Social, conforme solicitado
                setTimeout(() => navigate('/'), 400);
            } else {
                toast.error(data.message || 'Credenciais inválidas');
            }
        } catch {
            toast.error('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root font-sans">
            {/* Animated Mesh Background (CSS handles this) */}
            <div className="login-grid" aria-hidden="true" />

            {/* Decorative Map Clusters */}
            <div className="login-decoration" aria-hidden="true">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className={`login-pin login-pin-${(i % 6) + 1}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.1, 0.3, 0.1], y: [0, -15, 0] }}
                        transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
                    >
                        <Map className="w-4 h-4" />
                    </motion.div>
                ))}
            </div>

            <main className="relative z-10 w-full max-w-[440px] px-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="login-card p-8 sm:p-10 relative overflow-hidden"
                >
                    {/* Top Glow Accent */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <header className="login-card-header mb-10">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="login-logo mb-6"
                        >
                            <div className="login-logo-icon relative group">
                                {brandLogo ? (
                                    <img src={brandLogo} alt="Logo" className="w-12 h-12 object-contain p-2" />
                                ) : (
                                    <Globe className="w-8 h-8 text-primary shadow-primary/20" />
                                )}
                                <div className="absolute -inset-2 bg-primary/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="h-[1px] w-6 bg-primary/30" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary/80">Acesso Restrito</span>
                                <span className="h-[1px] w-6 bg-primary/30" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">{brandName}</h1>
                            <p className="text-xs text-muted-foreground/70 font-medium">Autenticação por Código e Senha</p>
                        </motion.div>
                    </header>

                    <form onSubmit={handleSubmit} className="login-form space-y-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-4">
                            <div className="login-field">
                                <label className="login-label block mb-1.5" htmlFor="username">Código de Acesso</label>
                                <div className="login-input-wrap group">
                                    <User className="login-input-icon transition-colors group-focus-within:text-primary" />
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Ex: CLI001"
                                        required
                                        autoComplete="username"
                                        className="login-input bg-black/20 border-white/5 focus:border-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="login-label" htmlFor="password">Chave de Segurança</label>
                                </div>
                                <div className="login-input-wrap group">
                                    <Lock className="login-input-icon transition-colors group-focus-within:text-primary" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                        className="login-input bg-black/20 border-white/5 focus:border-primary/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="login-eye-btn hover:bg-white/5"
                                        tabIndex={-1}
                                    >
                                        <AnimatePresence mode="wait">
                                            {showPassword ? (
                                                <motion.div key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <EyeOff className="w-4 h-4" />
                                                </motion.div>
                                            ) : (
                                                <motion.div key="on" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <Eye className="w-4 h-4" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="login-btn w-full mt-2 relative py-4"
                        >
                            <AnimatePresence mode="wait">
                                {loading ? (
                                    <motion.div 
                                        key="loading" 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        className="flex items-center gap-2"
                                    >
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Autenticando...</span>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="default" 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        className="flex items-center gap-2"
                                    >
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="font-bold">INICIAR SESSÃO</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </form>

                    <footer className="mt-10 flex flex-col items-center gap-4">
                        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground/40 tracking-widest uppercase">
                            <ShieldCheck className="w-3 h-3 opacity-50" />
                            <span>Criptografia de Ponta a Ponta Ativa</span>
                        </div>
                    </footer>
                </motion.div>

                {/* Bottom decorative light */}
                <div className="login-card-glow" />
            </main>
        </div>
    );
}
