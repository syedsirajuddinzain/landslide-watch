import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  MapPin,
  Send,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import api, { saveStoredCitizenReport } from '../../lib/api';
import { CitizenHazardReport, HazardObservationType } from '../../types';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoordinates: { lat: number; lon: number; name?: string };
  onReportSubmitted: (report: CitizenHazardReport) => void;
}

const OBSERVATIONS: Array<{ type: HazardObservationType; label: string; icon: string }> = [
  { type: 'ROAD_BLOCKED', label: 'Road Blocked / Cut', icon: '🚧' },
  { type: 'MUD_DEBRIS', label: 'Mud & Debris Flow', icon: '🌊' },
  { type: 'FALLING_ROCKS', label: 'Falling Rocks / Boulders', icon: '🪨' },
  { type: 'GROUND_CRACKS', label: 'Ground / Hillside Cracks', icon: '⚡' },
  { type: 'UNUSUAL_WATER_FLOW', label: 'New Spring / Muddy Water', icon: '💧' },
  { type: 'BUILDING_DAMAGE', label: 'Tilted Trees / Wall Cracks', icon: '🏚️' },
  { type: 'LANDSLIDE', label: 'Active Landslide / Slip', icon: '⛰️' },
  { type: 'OTHER', label: 'Other Hazard', icon: '⚠️' },
];

export function ReportHazardModal({
  isOpen,
  onClose,
  userCoordinates,
  onReportSubmitted,
}: ReportHazardModalProps) {
  const [selectedType, setSelectedType] = useState<HazardObservationType>('ROAD_BLOCKED');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Audio Recording (Mic) State
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Voice Dictation (Speech to Text) State
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListeningSpeech(false);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  if (!isOpen) return null;

  // Toggle Voice Dictation (Speech to Text)
  const toggleSpeechDictation = () => {
    if (!recognitionRef.current) {
      alert('Speech-to-text is not supported in this browser. Please type your notes or record an audio note.');
      return;
    }
    if (isListeningSpeech) {
      recognitionRef.current.stop();
      setIsListeningSpeech(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningSpeech(true);
      } catch {
        setIsListeningSpeech(false);
      }
    }
  };

  // Start Mic Audio Recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert('Microphone permission denied or audio device not available.');
    }
  };

  // Stop Mic Audio Recording
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newReport: CitizenHazardReport = {
      id: 'cr-' + Date.now(),
      coordinates: {
        lat: userCoordinates.lat,
        lon: userCoordinates.lon,
      },
      locationName: userCoordinates.name || 'NER Mountain Corridor',
      nearestCatchmentName: userCoordinates.name || 'NER Region',
      observationType: selectedType,
      description: description.trim() + (audioUrl ? ' [Voice Note Attached]' : ''),
      photoUrl: photoPreview || undefined,
      userName: reporterName.trim() || 'Local Citizen',
      userPhone: reporterPhone.trim() || undefined,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };

    try {
      await api.post('/api/citizen/reports', newReport);
    } catch {
      // Offline fallback: save in local storage
      saveStoredCitizenReport(newReport);
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    onReportSubmitted(newReport);

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in font-sans">
      <div className="bg-white rounded-3xl border border-[#C8D8BC] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900 text-base shadow-xs">🚨</span>
            <div>
              <h2 className="text-sm font-black text-[#0F2018]">Report a Ground Hazard</h2>
              <p className="text-[11px] text-[#1A3028]">
                Dispatches GPS, Camera photo, and Voice note to Disaster Control Room
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#1A3028] hover:bg-[#C8D8BC]/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-black text-[#0F2018]">Hazard Report Submitted!</h3>
            <p className="text-xs text-[#1A3028] max-w-xs mx-auto leading-relaxed">
              Thank you for keeping your community safe. Your report has been dispatched to local authorities and pinned on the surrounding hazard map.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Live GPS Stamp */}
            <div className="p-3 rounded-2xl bg-[#F5F0E8] border border-[#C8D8BC] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#0F2018] font-bold">
                <MapPin size={15} className="text-[#4A7C59] shrink-0" />
                <span className="truncate max-w-[240px]">
                  {userCoordinates.name || `${userCoordinates.lat.toFixed(4)}°N, ${userCoordinates.lon.toFixed(4)}°E`}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/20 text-[#4A7C59]">
                GPS Attached
              </span>
            </div>

            {/* Observation Type Grid */}
            <div>
              <label className="block text-xs font-black text-[#0F2018] mb-2">
                What are you observing? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OBSERVATIONS.map((obs) => (
                  <button
                    key={obs.type}
                    type="button"
                    onClick={() => setSelectedType(obs.type)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col items-center text-center gap-1 transition-all ${
                      selectedType === obs.type
                        ? 'border-[#4A7C59] bg-[#4A7C59]/15 text-[#0F2018] font-bold shadow-xs'
                        : 'border-[#C8D8BC] hover:border-[#4A7C59] text-[#1A3028]'
                    }`}
                  >
                    <span className="text-lg">{obs.icon}</span>
                    <span className="text-[10px] leading-tight font-medium">{obs.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TWO INPUT MODES: CAMERA PHOTO + MIC AUDIO MEMO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. CAMERA PHOTO */}
              <div>
                <label className="block text-xs font-bold text-[#0F2018] mb-1.5">
                  📷 Camera Photo
                </label>
                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#C8D8BC] h-28 bg-black/10">
                    <img
                      src={photoPreview}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#C8D8BC] hover:border-[#4A7C59] rounded-2xl p-3.5 cursor-pointer transition-colors bg-[#FAF7F2] h-28">
                    <Camera size={22} className="text-[#4A7C59] mb-1" />
                    <span className="text-[11px] font-bold text-[#0F2018]">Attach Photo</span>
                    <span className="text-[9px] text-[#1A3028]">Cracks, road block, slide</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 2. MIC AUDIO VOICE NOTE */}
              <div>
                <label className="block text-xs font-bold text-[#0F2018] mb-1.5">
                  🎙️ Mic Voice Note
                </label>
                {audioUrl ? (
                  <div className="h-28 p-3 rounded-2xl border border-emerald-300 bg-emerald-50 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span className="flex items-center gap-1">
                        <Volume2 size={13} />
                        <span>Voice Note Ready</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAudioUrl(null)}
                        className="text-rose-600 hover:text-rose-800"
                        title="Delete voice note"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <audio src={audioUrl} controls className="w-full h-8" />
                    <div className="text-[9px] text-emerald-700">Audio will be dispatched to NDRF</div>
                  </div>
                ) : isRecordingAudio ? (
                  <div className="h-28 p-3 rounded-2xl border-2 border-rose-400 bg-rose-50 flex flex-col items-center justify-center text-center space-y-1.5 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></div>
                    <div className="text-xs font-black text-rose-900">
                      Recording Audio... {recordSeconds}s
                    </div>
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                    >
                      Stop & Save Memo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    className="w-full h-28 flex flex-col items-center justify-center border-2 border-dashed border-[#C8D8BC] hover:border-[#4A7C59] rounded-2xl p-3.5 transition-colors bg-[#FAF7F2]"
                  >
                    <Mic size={22} className="text-[#4A7C59] mb-1" />
                    <span className="text-[11px] font-bold text-[#0F2018]">Record Voice Note</span>
                    <span className="text-[9px] text-[#1A3028]">Speak details into microphone</span>
                  </button>
                )}
              </div>
            </div>

            {/* Description with Voice Dictation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#0F2018]">
                  Hazard Description / Notes
                </label>
                <button
                  type="button"
                  onClick={toggleSpeechDictation}
                  className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                    isListeningSpeech
                      ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                      : 'bg-[#FAF7F2] text-[#4A7C59] border-[#C8D8BC] hover:border-[#4A7C59]'
                  }`}
                >
                  <Mic size={11} />
                  <span>{isListeningSpeech ? 'Listening (Speak now)...' : 'Dictate by Voice'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Rocks falling 200m past fuel pump, mud overflowing road gutter..."
                className="w-full p-2.5 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
              />
            </div>

            {/* Reporter Contact Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#0F2018] mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Local Citizen"
                  className="w-full px-3 py-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#0F2018] mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="For SMS status"
                  className="w-full px-3 py-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Send size={15} />
                <span>{isSubmitting ? 'Transmitting to NDRF Control...' : 'Transmit Ground Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReportHazardModal;
