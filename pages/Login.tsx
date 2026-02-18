import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useSpatialNav } from '../hooks/useSpatialNavigation';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC<{ onLogin: () => void; onAdminAccess?: () => void }> = ({ onLogin, onAdminAccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setPosition } = useSpatialNav();

  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Preencha e-mail e senha");
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await signIn(trimmedEmail, password);
      if (error) {
        setError("Falha ao entrar: " + error);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        onLogin();
      }
    } catch (err) {
      setError("Erro de conexão");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden font-sans"
      data-nav-row="0"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(40,20,60,0.6) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(20,10,40,0.4) 0%, transparent 50%), linear-gradient(180deg, #0a0a12 0%, #0d0b18 40%, #090910 100%)',
      }}
    >
      {/* Ambient light orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #E50914 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />

      {/* Main glass card */}
      <div className="relative z-10 w-full max-w-[420px] px-5">
        <div
          className="rounded-[28px] p-8 flex flex-col gap-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(60px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(60px) saturate(1.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.3) inset',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <img
              src="/logored.png"
              alt="REDX"
              className="h-12 w-auto object-contain drop-shadow-[0_2px_20px_rgba(229,9,20,0.3)]"
            />
            <p className="text-[11px] font-medium tracking-[0.3em] uppercase text-white/30">
              Streaming Experience
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="rounded-2xl px-4 py-3 text-[12px] font-semibold text-red-300 text-center"
              style={{
                background: 'rgba(229,9,20,0.1)',
                border: '1px solid rgba(229,9,20,0.2)',
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] ml-1">
                E-mail
              </label>
              <div className="relative group">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/50 transition-colors duration-300"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Backspace' || e.key === 'Enter') return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setPosition(0, 1); (document.querySelector('[data-nav-col="1"]') as HTMLElement)?.focus(); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); }
                  }}
                  onFocus={() => setPosition(0, 0)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-white placeholder-white/15 outline-none transition-all duration-300 focus:ring-1 focus:ring-white/20"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(10px)',
                  }}
                  data-nav-item
                  data-nav-col="0"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 tracking-[0.2em] ml-1">
                Senha
              </label>
              <div className="relative group">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-white/50 transition-colors duration-300"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Backspace' || e.key === 'Enter') return;
                    if (e.key === 'ArrowUp') { e.preventDefault(); setPosition(0, 0); (document.querySelector('[data-nav-col="0"]') as HTMLElement)?.focus(); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); setPosition(0, 2); (document.getElementById('login-submit') as HTMLElement)?.focus(); }
                  }}
                  onFocus={() => setPosition(0, 1)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl py-3.5 pl-11 pr-12 text-[13px] font-medium text-white placeholder-white/15 outline-none transition-all duration-300 focus:ring-1 focus:ring-white/20"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(10px)',
                  }}
                  data-nav-item
                  data-nav-col="1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors duration-300"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between px-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative w-4 h-4">
                  <input
                    type="checkbox"
                    className="peer w-4 h-4 rounded-md appearance-none cursor-pointer transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  <svg
                    className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </div>
                <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors duration-200">
                  Lembrar-me
                </span>
              </label>
              <button
                type="button"
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors duration-200"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') { e.preventDefault(); setPosition(0, 1); }
                if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLButtonElement).click(); }
              }}
              className="relative w-full py-3.5 rounded-2xl font-bold text-[13px] tracking-wide flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(229,9,20,0.9) 0%, rgba(178,7,16,0.9) 100%)',
                boxShadow: '0 8px 32px rgba(229,9,20,0.25), 0 2px 0 rgba(255,255,255,0.1) inset',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
              }}
              data-nav-item
              data-nav-col="2"
            >
              {/* Hover shine effect */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                }}
              />
              <span className="relative z-10 flex items-center gap-2.5">
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-medium text-white/20 uppercase tracking-[0.2em]">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[12px] text-white/30">
              Novo por aqui?{' '}
              <button className="text-white/70 font-semibold hover:text-white transition-colors duration-200">
                Criar conta
              </button>
            </p>
            <button
              type="button"
              onClick={() => onAdminAccess?.()}
              className="text-[9px] text-white/10 hover:text-white/30 transition-colors duration-300 uppercase tracking-[0.4em] font-bold"
            >
              Acesso Admin
            </button>
          </div>
        </div>

        {/* Subtle bottom reflection */}
        <div
          className="mx-auto mt-[-1px] w-[80%] h-[60px] rounded-b-[28px] opacity-30 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
            filter: 'blur(20px)',
          }}
        />
      </div>
    </div>
  );
};

export default Login;
