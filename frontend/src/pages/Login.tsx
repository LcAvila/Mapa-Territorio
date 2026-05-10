import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context-core';
import { Eye, EyeOff, User, Lock, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api-base';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const brandName = localStorage.getItem('brand_name') || 'Mapa Território';
    const brandLogo = localStorage.getItem('brand_logo') || '/Logo.png';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: username.includes('@') ? username : `${username}@mapaterritorio.com`,
                password: password,
            });

            if (authError) {
                toast.error(authError.message || 'Credenciais inválidas');
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/me?login=true`, {
                headers: { 'Authorization': `Bearer ${authData.session?.access_token}` },
            });

            if (response.ok) {
                const userData = await response.json();
                login(
                    authData.session?.access_token || '',
                    userData.id,
                    userData.role,
                    userData.full_name,
                    userData.tipo,
                    userData.estado_end,
                    userData.default_workspace,
                    userData.inactivity_limit,
                    userData.token_version
                );
                toast.success(`Bem-vindo de volta!`);
                setTimeout(() => navigate('/'), 400);
            } else {
                toast.error('Perfil não sincronizado');
            }
        } catch {
            toast.error('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-root">
            {/* Full Background Image */}
            <img
                src="/background login.jpg"
                alt="Space Adventure"
                className="login-bg-img-full"
            />
            <div className="login-overlay-full" />

            {/* Left Side: Visual Space Content */}
            <section className="login-visual">
                <header className="login-visual-brand">
                    <img src={brandLogo} alt="Logo" className="login-brand-logo-img" />
                </header>

                <div className="login-visual-content">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <p className="login-visual-eyebrow">Gestão Inteligente de</p>
                        <h2 className="login-visual-title">Território</h2>
                        <h2 className="login-visual-subtitle">& Rotas</h2>
                        <p className="login-visual-desc">
                            Visualize, planeje e controle<br />
                            seus times em tempo real.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Right Side: Auth Form */}
            <section className="login-auth-section">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="login-form-container"
                >
                    <header className="login-form-header">
                        <h1 className="login-form-title">Entrar</h1>
                        <p className="login-form-subtitle">Acesse com seu código</p>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="login-input-group">
                            <div className="login-input-wrapper">
                                <User className="login-input-icon" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Usuário ou Código"
                                    required
                                    className="login-custom-input"
                                />
                            </div>
                        </div>

                        <div className="login-input-group">
                            <div className="login-input-wrapper">
                                <Lock className="login-input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Senha"
                                    required
                                    className="login-custom-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="login-eye-toggle"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="login-submit-btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    <span>Autenticando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Iniciar Sessão</span>
                                    <ChevronRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                </motion.div>
            </section>
        </div>
    );
}
