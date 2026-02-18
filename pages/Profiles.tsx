import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSpatialNav } from '../hooks/useSpatialNavigation';
import { createProfile, getProfiles, updateProfile, deleteProfile, AVATAR_COLORS, PARENTAL_RATINGS, verifyParentalPin } from '../services/profileService';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Lock, Baby, Trash2, Check, X, Loader2 } from 'lucide-react';
import { playSelectSound, playNavigateSound, playBackSound } from '../utils/soundEffects';

interface ProfilesProps {
  onSelect: (profile: UserProfile) => void;
}

const Profiles: React.FC<ProfilesProps> = ({ onSelect }) => {
  const { user } = useAuth();
  const { setPosition } = useSpatialNav();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinError, setPinError] = useState('');
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    isKids: false,
    avatarColor: AVATAR_COLORS[0],
    parentalRating: 'L',
    parentalPin: '',
    autoPlayNext: true,
  });

  const loadProfiles = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await Promise.race([
        getProfiles(user.id),
        new Promise<UserProfile[]>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
      ]);
      setProfiles(data || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  useEffect(() => {
    if (!loading && profiles.length > 0) {
      setTimeout(() => {
        setPosition(0, 0);
        const firstBtn = document.querySelector('[data-nav-item]') as HTMLElement;
        if (firstBtn) firstBtn.focus();
      }, 100);
    }
  }, [loading, profiles, setPosition]);

  const handleProfileClick = (profile: UserProfile) => {
    if (!profile) return;
    playSelectSound();
    if (isEditMode) {
      setSelectedProfile(profile);
      setFormData({
        name: profile.name,
        isKids: profile.isKids,
        avatarColor: profile.avatarColor || AVATAR_COLORS[0],
        parentalRating: profile.parentalRating || 'L',
        parentalPin: profile.parentalPin || '',
        autoPlayNext: profile.autoPlayNext,
      });
      setShowEditModal(true);
    } else {
      if (profile.parentalPin) {
        setSelectedProfile(profile);
        setPinCurrent('');
        setPinError('');
        setShowPinModal(true);
      } else {
        onSelect(profile);
      }
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedProfile) return;
    if (verifyParentalPin(selectedProfile, pinCurrent)) {
      playSelectSound();
      setShowPinModal(false);
      onSelect(selectedProfile);
    } else {
      playBackSound();
      setPinError('PIN Incorreto');
      setPinCurrent('');
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !formData.name?.trim()) return;
    playSelectSound();
    try {
      if (selectedProfile) {
        const updated = await updateProfile(selectedProfile.id, user.id, {
          name: formData.name,
          isKids: formData.isKids,
          avatarColor: formData.avatarColor,
          parentalRating: formData.parentalRating,
          parentalPin: formData.parentalPin,
        });
        if (updated) setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const newProfile = await createProfile(user.id, {
          name: formData.name,
          isKids: formData.isKids || false,
          avatarColor: formData.avatarColor,
          parentalRating: formData.parentalRating,
          parentalPin: formData.parentalPin,
        });
        if (newProfile) setProfiles(prev => [...prev, newProfile]);
      }
      setShowEditModal(false);
      setSelectedProfile(null);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile) return;
    if (window.confirm(`Tem certeza que deseja excluir o perfil ${selectedProfile.name}?`)) {
      await deleteProfile(selectedProfile.id);
      setProfiles(prev => prev.filter(p => p.id !== selectedProfile.id));
      setShowEditModal(false);
      setSelectedProfile(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', isKids: false, avatarColor: AVATAR_COLORS[0], parentalRating: 'L', parentalPin: '' });
  };

  const toggleEditMode = () => { setIsEditMode(!isEditMode); playSelectSound(); };

  useEffect(() => {
    if (!showPinModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pinCurrent.length < 4) { setPinCurrent(prev => prev + e.key); playNavigateSound(); }
      } else if (e.key === 'Backspace') { setPinCurrent(prev => prev.slice(0, -1)); playBackSound(); }
      else if (e.key === 'Enter') { if (pinCurrent.length === 4) handlePinSubmit(); }
      else if (e.key === 'Escape') { setShowPinModal(false); setPinCurrent(''); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, pinCurrent, selectedProfile]);

  /* ---- Shared glass style ---- */
  const glassCard = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
    backdropFilter: 'blur(60px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(60px) saturate(1.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.3) inset',
  };

  const glassInput: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
  };

  /* ===== RENDER ===== */
  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center text-white overflow-hidden font-sans"
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

      {/* Main content */}
      <main className="relative z-10 w-full max-w-3xl flex flex-col items-center px-5">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full flex flex-col items-center rounded-[28px] p-10 md:p-14"
          style={glassCard}
        >
          {/* Logo */}
          <img
            src="/logored.png"
            alt="REDX"
            className="h-10 w-auto object-contain mb-8 drop-shadow-[0_2px_20px_rgba(229,9,20,0.3)]"
          />

          {/* Title */}
          <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-white text-balance text-center">
            Quem est&aacute; assistindo?
          </h1>
          {isEditMode && (
            <p className="text-[11px] text-white/30 mt-2 uppercase tracking-[0.2em] font-medium">
              Selecione um perfil para editar
            </p>
          )}

          {/* Profiles grid */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-10 mt-10" data-nav-row="0">
            {loading ? (
              <div className="flex items-center gap-3 py-8">
                <Loader2 size={20} className="animate-spin text-[#E50914]" />
                <span className="text-white/40 text-sm font-medium">Carregando perfis...</span>
              </div>
            ) : (
              <>
                {profiles.map((profile, idx) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: idx * 0.06 }}
                    className="group flex flex-col items-center gap-3 cursor-pointer"
                  >
                    <button
                      id={profile.id}
                      className="relative w-[100px] h-[100px] md:w-[110px] md:h-[110px] rounded-[22px] overflow-hidden transition-all duration-300
                        outline-none group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(229,9,20,0.2)]
                        focus-visible:scale-105 focus-visible:shadow-[0_0_30px_rgba(229,9,20,0.25)]"
                      style={{
                        border: '2px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                      onClick={() => handleProfileClick(profile)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleProfileClick(profile); } }}
                      onFocus={() => playNavigateSound()}
                      data-nav-item
                      data-profile-btn
                      data-nav-col={idx}
                    >
                      <div className={`w-full h-full ${profile.avatarColor || 'bg-gray-600'} flex items-center justify-center relative`}>
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl md:text-4xl font-bold uppercase select-none text-white/90 drop-shadow-lg">
                            {profile.name?.[0] || '?'}
                          </span>
                        )}

                        {/* Edit overlay */}
                        <AnimatePresence>
                          {isEditMode && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"
                            >
                              <Pencil size={22} className="text-white/80" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Lock badge */}
                        {!isEditMode && profile.parentalPin && (
                          <div
                            className="absolute top-2 right-2 p-1.5 rounded-full"
                            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
                          >
                            <Lock size={10} className="text-white/70" />
                          </div>
                        )}

                        {/* Kids badge */}
                        {profile.isKids && (
                          <div
                            className="absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-white/90"
                            style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
                          >
                            Kids
                          </div>
                        )}
                      </div>
                    </button>
                    <span className="text-white/50 group-hover:text-white/90 text-[13px] font-medium transition-colors duration-300 max-w-[110px] truncate">
                      {profile.name || 'Sem nome'}
                    </span>
                  </motion.div>
                ))}

                {/* Add profile button */}
                {profiles.length < 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: profiles.length * 0.06 }}
                    className="group flex flex-col items-center gap-3 cursor-pointer"
                  >
                    <button
                      id="add-profile-btn"
                      className="relative w-[100px] h-[100px] md:w-[110px] md:h-[110px] rounded-[22px] overflow-hidden transition-all duration-300
                        outline-none group-hover:scale-105 group-hover:border-white/20
                        focus-visible:scale-105 focus-visible:border-white/20 flex items-center justify-center"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      }}
                      data-nav-item
                      data-profile-btn
                      data-nav-col={profiles.length}
                      onClick={() => { resetForm(); setSelectedProfile(null); setShowEditModal(true); playSelectSound(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); resetForm(); setSelectedProfile(null); setShowEditModal(true); playSelectSound(); }
                      }}
                      onFocus={() => playNavigateSound()}
                    >
                      <Plus size={28} className="text-white/20 group-hover:text-white/60 transition-colors duration-300" />
                    </button>
                    <span className="text-white/30 group-hover:text-white/60 text-[13px] font-medium transition-colors duration-300 whitespace-nowrap">
                      Adicionar
                    </span>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Manage profiles button */}
          <div className="mt-10" data-nav-row="1">
            <button
              className="px-7 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50
                hover:text-white/90 hover:bg-white/[0.06] transition-all duration-300
                focus-visible:text-white/90 focus-visible:bg-white/[0.06] outline-none"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
              }}
              onClick={toggleEditMode}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); toggleEditMode(); } }}
              data-nav-item
              data-nav-col="0"
            >
              {isEditMode ? 'Conclu\u00eddo' : 'Gerenciar perfis'}
            </button>
          </div>
        </motion.section>

        {/* Subtle bottom reflection */}
        <div
          className="mx-auto mt-[-1px] w-[70%] h-[50px] rounded-b-[28px] opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
            filter: 'blur(20px)',
          }}
        />
      </main>

      {/* ===== PIN Modal ===== */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="p-8 rounded-[28px] max-w-sm w-full mx-5 flex flex-col items-center gap-5"
              style={glassCard}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
                style={{ background: 'rgba(229,9,20,0.12)', border: '1px solid rgba(229,9,20,0.2)' }}
              >
                <Lock size={22} className="text-[#E50914]" />
              </div>
              <h3 className="text-lg font-semibold text-white">PIN do Perfil</h3>
              <p className="text-white/30 text-center text-[12px] leading-relaxed">
                Digite o PIN de 4 d&iacute;gitos para acessar <span className="text-white/60 font-medium">{selectedProfile?.name}</span>
              </p>

              <div className="flex gap-3 my-3">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-all duration-200"
                    style={{
                      ...glassInput,
                      borderColor: pinError
                        ? 'rgba(239,68,68,0.5)'
                        : i < pinCurrent.length
                          ? 'rgba(229,9,20,0.4)'
                          : 'rgba(255,255,255,0.06)',
                      background: i < pinCurrent.length ? 'rgba(229,9,20,0.08)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <span className={i < pinCurrent.length ? 'text-white' : 'text-transparent'}>
                      {'\u2022'}
                    </span>
                  </div>
                ))}
              </div>

              {pinError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 font-medium text-[12px]"
                >
                  {pinError}
                </motion.p>
              )}

              <button
                onClick={() => { setShowPinModal(false); setPinCurrent(''); }}
                className="text-white/30 hover:text-white/60 mt-2 text-[11px] uppercase tracking-[0.2em] font-medium transition-colors duration-200"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Edit/Create Modal ===== */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto py-10"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-3xl p-8 md:p-10 rounded-[28px] relative mx-5"
              style={glassCard}
            >
              {/* Close button */}
              <button
                className="absolute top-5 right-5 text-white/20 hover:text-white/60 transition-colors duration-200 p-2 rounded-full hover:bg-white/[0.05]"
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} />
              </button>

              <div className="flex flex-col md:flex-row gap-10">
                {/* Avatar side */}
                <div className="flex flex-col items-center gap-5 min-w-[180px]">
                  <div
                    className={`w-36 h-36 rounded-[22px] overflow-hidden flex items-center justify-center relative ${formData.avatarColor}`}
                    style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                  >
                    {formData.avatar ? (
                      <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl font-bold uppercase text-white/80 drop-shadow-lg">{formData.name?.[0] || '?'}</span>
                    )}
                    {formData.isKids && (
                      <div
                        className="absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] uppercase font-bold tracking-wider text-white/90"
                        style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
                      >
                        Kids
                      </div>
                    )}
                  </div>

                  {/* Color picker */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData(prev => ({ ...prev, avatarColor: color, avatar: undefined }))}
                        className={`w-8 h-8 rounded-full ${color} transition-all duration-200 hover:scale-110 ${formData.avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110' : 'opacity-50 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Form side */}
                <div className="flex-1 flex flex-col gap-5">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    {selectedProfile ? 'Editar Perfil' : 'Novo Perfil'}
                  </h2>

                  {/* Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em] ml-1">Nome</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-2xl py-3 px-4 text-[13px] font-medium text-white placeholder-white/15 outline-none transition-all duration-300 focus:ring-1 focus:ring-white/20"
                      style={glassInput}
                      placeholder="Nome do perfil"
                    />
                  </div>

                  {/* Toggle cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-200 hover:bg-white/[0.03]"
                      style={{ ...glassInput, border: formData.isKids ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)' }}
                      onClick={() => setFormData(prev => ({ ...prev, isKids: !prev.isKids }))}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${formData.isKids ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.06] text-white/25'}`}>
                        <Baby size={18} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white/80">Perfil Kids</div>
                        <div className="text-[10px] text-white/25">Conte&uacute;do at&eacute; 12 anos</div>
                      </div>
                      <div className={`ml-auto w-10 h-5 rounded-full relative transition-colors duration-200 ${formData.isKids ? 'bg-green-500/50' : 'bg-white/10'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${formData.isKids ? 'translate-x-5' : ''}`} />
                      </div>
                    </button>

                    <button
                      className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-200 hover:bg-white/[0.03]"
                      style={glassInput}
                      onClick={() => setFormData(prev => ({ ...prev, autoPlayNext: !prev.autoPlayNext }))}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${formData.autoPlayNext ? 'bg-white/10 text-white/80' : 'bg-white/[0.06] text-white/25'}`}>
                        <Check size={16} className={formData.autoPlayNext ? 'opacity-100' : 'opacity-0'} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white/80">Autoplay</div>
                        <div className="text-[10px] text-white/25">Pr&oacute;ximo epis&oacute;dio</div>
                      </div>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/[0.06] my-1" />

                  {/* Parental controls */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-[13px] font-semibold text-white/70 flex items-center gap-2">
                      <Lock size={14} className="text-[#E50914]" />
                      Controle Parental
                    </h3>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em] ml-1">
                        Classifica&ccedil;&atilde;o Et&aacute;ria M&aacute;xima
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {PARENTAL_RATINGS.map(rating => (
                          <button
                            key={rating.value}
                            onClick={() => setFormData(prev => ({ ...prev, parentalRating: rating.value }))}
                            className={`px-3 py-1.5 rounded-xl text-[12px] font-bold min-w-[46px] transition-all duration-200 ${formData.parentalRating === rating.value ? 'ring-1 ring-white/40 scale-105 opacity-100' : 'opacity-35 hover:opacity-70'} ${rating.color}`}
                            title={rating.description}
                          >
                            {rating.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/25 ml-1">
                        {PARENTAL_RATINGS.find(r => r.value === formData.parentalRating)?.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold text-white/30 tracking-[0.2em] ml-1">
                        PIN de Bloqueio (4 d&iacute;gitos)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        pattern="[0-9]*"
                        value={formData.parentalPin}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 4) setFormData(prev => ({ ...prev, parentalPin: val }));
                        }}
                        className="w-28 rounded-2xl py-2.5 px-4 text-center tracking-[0.5em] font-mono text-[15px] font-medium text-white placeholder-white/15 outline-none transition-all duration-300 focus:ring-1 focus:ring-white/20"
                        style={glassInput}
                        placeholder="----"
                      />
                      <p className="text-[10px] text-white/25 ml-1">Deixe em branco para remover o PIN.</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 pt-4 mt-2 border-t border-white/[0.06]">
                    <button
                      onClick={handleSaveProfile}
                      className="relative px-7 py-2.5 rounded-2xl text-[12px] font-bold uppercase tracking-[0.1em] transition-all duration-300 overflow-hidden group"
                      style={{
                        background: 'linear-gradient(135deg, rgba(229,9,20,0.9) 0%, rgba(178,7,16,0.9) 100%)',
                        boxShadow: '0 8px 32px rgba(229,9,20,0.2), 0 2px 0 rgba(255,255,255,0.1) inset',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#ffffff',
                      }}
                    >
                      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }} />
                      <span className="relative z-10">Salvar</span>
                    </button>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-7 py-2.5 rounded-2xl text-[12px] font-bold uppercase tracking-[0.1em] text-white/40 hover:text-white/70 transition-all duration-200"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      Cancelar
                    </button>

                    {selectedProfile && (
                      <button
                        onClick={handleDeleteProfile}
                        className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200"
                        style={{ border: '1px solid rgba(239,68,68,0.1)' }}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profiles;
