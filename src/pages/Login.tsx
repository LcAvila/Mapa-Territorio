import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Map, Eye, EyeOff, User, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

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
                login(data.token, data.role, data.tipo, data.repCode);
                toast.success('Bem-vindo ao sistema!');
                navigate(data.role === 'admin' ? '/admin' : '/');
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
        <div className="login-root">
            {/* Animated coordinate grid */}
            <div className="login-grid" aria-hidden="true" />

            {/* Floating decorative pins */}
            <div className="login-decoration" aria-hidden="true">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`login-pin login-pin-${i + 1}`}>
                        <Map className="w-5 h-5" />
                    </div>
                ))}
            </div>

            {/* Radar pulse rings */}
            <div className="login-radar" aria-hidden="true">
                <div className="login-radar-ring login-radar-ring-1" />
                <div className="login-radar-ring login-radar-ring-2" />
                <div className="login-radar-ring login-radar-ring-3" />
            </div>

            {/* Card */}
            <div className="login-card-wrapper">
                <div className="login-card">

                    {/* Header */}
                    <div className="login-card-header">
                        <div className="login-logo">
                            <div className="login-logo-icon">
                                {localStorage.getItem('brand_logo') ? (
                                    <img src={localStorage.getItem('brand_logo')!} alt="Logo" className="w-10 h-10 object-contain" />
                                ) : (
                                    <Map className="w-7 h-7" />
                                )}
                            </div>
                            {!localStorage.getItem('brand_logo') && <div className="login-radar-dot" />}
                        </div>
                        <h1 className="login-title">{localStorage.getItem('brand_name') || 'Mapa Território'}</h1>
                        <p className="login-subtitle">Sistema de Gestão de Territórios Comerciais</p>
                        <div className="login-title-line" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Username */}
                        <div className="login-field">
                            <label className="login-label" htmlFor="username">Usuário</label>
                            <div className="login-input-wrap">
                                <User className="login-input-icon" />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Digite seu usuário"
                                    required
                                    autoComplete="username"
                                    className="login-input"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="login-field">
                            <label className="login-label" htmlFor="password">Senha</label>
                            <div className="login-input-wrap">
                                <Lock className="login-input-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="login-input login-input-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="login-eye-btn"
                                    tabIndex={-1}
                                >
                                    {showPassword
                                        ? <EyeOff className="w-4 h-4" />
                                        : <Eye className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="login-btn"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    <Map className="w-4 h-4" />
                                    Acessar Sistema
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer note */}
                    <div className="login-footer">
                        <span className="login-footer-dot" />
                        <p>Acesso restrito — apenas usuários autorizados</p>
                        <span className="login-footer-dot" />
                    </div>
                </div>

                {/* Glow effect under card */}
                <div className="login-card-glow" aria-hidden="true" />
            </div>
        </div>
    );
}
