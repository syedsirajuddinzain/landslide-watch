import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../../lib/api';
import { Location, RiskAssessment } from '../../types';
import { X, Radio, Volume2, VolumeX, Send, AlertTriangle, Globe, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CapBroadcastModal({ isOpen, onClose }: Props) {
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'as' | 'kha' | 'miz' | 'hi'>('en');
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [copied, setCopied] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  const { data: locData } = useQuery(
    'locations-cap',
    () => api.get('/api/locations').then((r) => r.data.data as Array<Location & { latestRisk?: RiskAssessment }>),
    { enabled: isOpen }
  );

  if (!isOpen) return null;

  const locations = locData || [];
  const criticalLocs = locations.filter(
    (l) => (l.latestRisk?.priorityLevel || 'P4') === 'P1' || (l.latestRisk?.priorityLevel || 'P4') === 'P2'
  );

  const targetNames = criticalLocs.map((l) => l.name).join(', ') || 'Northeast India Monitored Catchments';

  // Multilingual alert messages
  const BROADCAST_MESSAGES = {
    en: `⚠️ EMERGENCY ADVISORY: Landslide Watch Early Warning alert issued for ${targetNames}. Heavy rainfall has saturated hill slopes. Residents near steep terrain are advised to remain vigilant and avoid vulnerable gorge routes. - State Disaster Management Authority`,
    as: `⚠️ জৰুৰী সতৰ্কবাৰ্তা: ${targetNames} অঞ্চলৰ বাবে ভূমিস্খলনৰ সতৰ্কবাৰ্তা জাৰি কৰা হৈছে। প্ৰৱল বৰষুণৰ ফলত পাহাৰীয়া ঢালসমূহ বিপদজনক হৈ পৰিছে। সতৰ্ক থাকক। - অসম ৰাজ্যিক দুৰ্যোগ ব্যৱস্থাপনা প্ৰাধিকৰণ`,
    kha: `⚠️ PYNTIP SHIKHADDUH: Ka jingma na ka jingtwad khyndew ha ${targetNames}. Ka jingjur u slap ka la pynlong ia ki riat ban tlot. Khie pynkhreh bad kiar na ki jaka ba ma. - Meghalaya State Disaster Management Authority`,
    miz: `⚠️ HRIATTIRNA PAWIMAWH: ${targetNames} hmuna leimin hlauhawm thleng thei lakah vauhnan pek a ni. Ruah tui tam lutukin tlang a ti hnawng a, fimkhur turin kan inhriattir e. - Mizoram Disaster Management Authority`,
    hi: `⚠️ आपातकालीन चेतावनी: ${targetNames} के लिए भूस्खलन पूर्व-चेतावनी जारी की गई है। अत्यधिक वर्षा के कारण ढलान अस्थिर हैं। ढलान वाले क्षेत्रों के निवासी सतर्क रहें। - राज्य आपदा प्रबंधन प्राधिकरण`,
  };

  // Web Audio API Synthesizer Siren (zero external packages)
  const toggleSiren = () => {
    if (isPlayingSiren) {
      setIsPlayingSiren(false);
      return;
    }

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.4);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.2);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.6);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 2.0);

      setIsPlayingSiren(true);
      setTimeout(() => setIsPlayingSiren(false), 2000);
    } catch (e) {
      console.error('Audio synthesis failed', e);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(BROADCAST_MESSAGES[selectedLanguage]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendBroadcast = () => {
    setBroadcastSent(true);
    toggleSiren();
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-400">
              <Radio size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Common Alerting Protocol (CAP-Sachet) Broadcast Console
              </h2>
              <p className="text-[11px] text-slate-400">NDMA / ITU Standard Emergency Public Warning Generator</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Audio Siren Alert Test */}
          <div className="p-3.5 bg-surface rounded-xl border border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleSiren}
                className={`p-2.5 rounded-lg border transition-all ${
                  isPlayingSiren
                    ? 'bg-red-600 text-white border-red-500 animate-bounce'
                    : 'bg-surface-elevated text-slate-300 hover:text-white border-surface-border'
                }`}
              >
                {isPlayingSiren ? <Volume2 size={16} /> : <Volume2 size={16} />}
              </button>
              <div>
                <div className="text-white font-bold">Emergency Audio Broadcast Siren</div>
                <div className="text-[11px] text-slate-400">Test the acoustic alert tone for mobile broadcast</div>
              </div>
            </div>
            <button
              onClick={toggleSiren}
              className="text-xs px-3 py-1.5 rounded bg-surface-card border border-surface-border text-slate-300 hover:text-white"
            >
              {isPlayingSiren ? 'Playing Siren...' : 'Test Siren Tone'}
            </button>
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <label className="font-bold text-white flex items-center gap-1.5">
              <Globe size={14} className="text-brand-light" /> Select Local Language Broadcast:
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'en', label: 'English' },
                { id: 'as', label: 'Assamese (অসমীয়া)' },
                { id: 'kha', label: 'Khasi (Meghalaya)' },
                { id: 'miz', label: 'Mizo (Mizoram)' },
                { id: 'hi', label: 'Hindi (हिंदी)' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id as any)}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium transition-all ${
                    selectedLanguage === lang.id
                      ? 'bg-brand text-white border border-brand-light'
                      : 'bg-surface border border-surface-border text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Message Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Broadcast Message Preview:</span>
              <button
                onClick={handleCopy}
                className="text-[11px] text-brand-light hover:text-white flex items-center gap-1"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-3.5 bg-surface rounded-xl border border-surface-border font-serif text-slate-200 leading-relaxed text-xs">
              {BROADCAST_MESSAGES[selectedLanguage]}
            </div>
          </div>

          {/* Target Catchments */}
          <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl space-y-1">
            <div className="text-[11px] text-red-300 font-bold flex items-center gap-1.5">
              <AlertTriangle size={13} /> Active Geo-Targeting Cells:
            </div>
            <div className="text-[11px] text-red-200 font-mono">
              {criticalLocs.length > 0 ? (
                criticalLocs.map((l) => `${l.name} (${l.latestRisk?.priorityLevel})`).join(' · ')
              ) : (
                'All 20 NER Monitored Catchments (General Advisory Mode)'
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button onClick={onClose} className="btn-ghost text-xs py-2 px-4 border border-surface-border">
              Cancel
            </button>
            <button
              onClick={handleSendBroadcast}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-2 shadow-lg"
            >
              <Send size={14} />
              <span>{broadcastSent ? '✅ Broadcast Dispatched to Sachet!' : 'Transmit CAP Public Warning'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default CapBroadcastModal;
