import React, { useState, useRef, useEffect } from 'react';
import { Page, UserProfile } from '../types';
import { Search } from 'lucide-react';
import { playSelectSound } from '../utils/soundEffects';

interface ProfileMenuItem {
  id: string;
  label: string;
  tab?: string;
  subView?: string;
}

const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  { id: 'overview', label: 'Visão geral', tab: 'overview' },
  { id: 'subscription', label: 'Assinatura', tab: 'subscription' },
  { id: 'security', label: 'Segurança', tab: 'security' },
  { id: 'devices', label: 'Aparelhos', tab: 'devices' },
  { id: 'profiles', label: 'Perfis', tab: 'profiles' },
  { id: 'change-password', label: 'Alterar Senha', tab: 'security', subView: 'change-password' },
  { id: 'passkeys', label: 'Gerenciar Chaves de Acesso', tab: 'security', subView: 'passkeys' },
  { id: 'sign-out-all', label: 'Encerrar sessão em todos os aparelhos', tab: 'security', subView: 'sign-out-all' },
];

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  profile: UserProfile | null;
  onProfileClick: () => void;
  onProfileMenuSelect?: (tab: string, subView?: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, profile, onProfileClick, onProfileMenuSelect }) => {
  const [showSubmenu, setShowSubmenu] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);

  // Fechar submenu ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!showSubmenu) return;
    const handleClick = (e: MouseEvent) => {
      const el = e.target as Node;
      if (submenuRef.current?.contains(el) || profileBtnRef.current?.contains(el)) return;
      setShowSubmenu(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSubmenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showSubmenu]);
  const navItems = [
    { id: Page.HOME, label: 'Início' },
    { id: Page.MOVIES, label: 'Filmes' },
    { id: Page.SERIES, label: 'Séries' },
    { id: Page.KIDS, label: 'Kids' },
    { id: Page.LIVE, label: 'Canais' },
    { id: Page.MY_LIST, label: 'Minha Lista' },
  ];

  return (
    <nav className="flex items-center justify-between w-full" data-nav-row={0}>
      {/* Esquerda: Logo + Links */}
      <div className="flex items-center gap-4">
        {/* Logo REDX */}
        <img
          src="/logored.png"
          alt="Redflix"
          className="h-6 w-auto object-contain drop-shadow-md cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onNavigate(Page.HOME)}
        />

        {/* Menu Links */}
        <div className="flex items-center gap-6">
          {navItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => { playSelectSound(); onNavigate(item.id); }}
              className={`text-[15px] font-medium transition-all outline-none px-4 py-2 rounded-xl
                ${currentPage === item.id
                  ? 'nav-item-selected font-bold'
                  : 'text-gray-300 hover:text-white focus:text-white focus:scale-105'}`}
              tabIndex={0}
              data-nav-item
              data-nav-col={idx}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  playSelectSound();
                  onNavigate(item.id);
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direita: Busca + Perfil */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => { playSelectSound(); onNavigate(Page.SEARCH); }}
          className="text-gray-300 hover:text-white transition-colors outline-none focus:scale-110"
          aria-label="Buscar"
          data-nav-item
          data-nav-col={navItems.length}
        >
          <Search size={20} />
        </button>

        <div className="relative">
          <button
            ref={profileBtnRef}
            onClick={() => {
              playSelectSound();
              if (onProfileMenuSelect) {
                setShowSubmenu(s => !s);
              } else {
                onProfileClick();
              }
            }}
            className="w-8 h-8 rounded-full overflow-hidden border border-transparent hover:border-white transition-all focus:outline-none focus:ring-2 focus:ring-white"
            data-nav-item
            data-nav-col={navItems.length + 1}
          >
            <img src={profile?.avatar || '/logored.png'} alt={profile?.name || 'Perfil'} className="w-full h-full object-cover" />
          </button>

          {/* Submenu glass — estilo referência (dropdown Prime) */}
          {showSubmenu && onProfileMenuSelect && (
            <div
              ref={submenuRef}
              className="absolute right-0 top-full mt-2 w-64 glass-effect rounded-2xl py-3 shadow-2xl border border-white/10 z-[100]"
            >
              {PROFILE_MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    playSelectSound();
                    setShowSubmenu(false);
                    onProfileMenuSelect(item.tab || 'overview', item.subView);
                  }}
                  className="w-full px-5 py-2.5 text-left text-sm text-white/90 hover:bg-white/10 hover:text-white transition-colors first:pt-2 last:pb-2"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
