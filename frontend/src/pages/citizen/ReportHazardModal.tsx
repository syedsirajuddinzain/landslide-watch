import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Mic, MicOff, MapPin, Send, CheckCircle2, RotateCw, Video, AlertTriangle } from 'lucide-react';
import api, { saveStoredCitizenReport } from '../../lib/api';
import { CitizenHazardReport, HazardObservationType } from '../../types';

interface ReportHazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCoordinates: { lat: number; lon: number; name?: string };
  onReportSubmitted: (report: CitizenHazardReport) => void;
}

const OBSERVATIONS: Array<{ type: HazardObservationType; label: string; icon: string }> = [
  { type: 'LANDSLIDE', label: 'Landslide / Active Slip', icon: '⛰️' },
  { type: 'ROAD_BLOCKED', label: 'Road Blocked / Cut', icon: '🚧' },
  { type: 'FALLING_ROCKS', label: 'Falling Rocks / Rockfall', icon: '🪨' },
  { type: 'MUD_DEBRIS', label: 'Mud & Debris Flow', icon: '🌊' },
  { type: 'GROUND_CRACKS', label: 'Ground / Hillside Cracks', icon: '⚡' },
  { type: 'UNUSUAL_WATER_FLOW', label: 'Unusual Water / Muddy Surge', icon: '💧' },
  { type: 'BUILDING_DAMAGE', label: 'Damaged Building / Walls', icon: '🏚️' },
  { type: 'OTHER', label: 'Damaged Bridge / Other', icon: '🌉' },
];

export function ReportHazardModal({
  isOpen,
  onClose,
  userCoordinates,
  onReportSubmitted,
}: ReportHazardModalProps) {
  const [selectedType, setSelectedType] = useState<HazardObservationType>('LANDSLIDE');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Microphone state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Safe camera stop helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup camera and speech on modal close or unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [stopCamera]);

  // Start live device camera viewfinder
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch {
      // If camera access is denied or not supported, user can still use file input
      setIsCameraActive(false);
    }
  };

  const snapPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoPreview(dataUrl);
    }
    stopCamera();
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    setTimeout(() => startCamera(), 100);
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

  // Microphone Speech-to-Text
  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported by your browser.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English / general

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setSpeechError(`Voice input: ${event.error || 'Could not understand audio'}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setSpeechError('Microphone access unavailable');
      setIsListening(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    stopCamera();

    const newReport: CitizenHazardReport = {
      id: 'cr-' + Date.now(),
      coordinates: {
        lat: userCoordinates.lat,
        lon: userCoordinates.lon,
      },
      locationName: userCoordinates.name || 'NER Mountain Corridor',
      nearestCatchmentName: userCoordinates.name || 'NER Region',
      observationType: selectedType,
      description: description.trim(),
      photoUrl: photoPreview || undefined,
      userName: reporterName.trim() || 'Citizen Observer',
      userPhone: reporterPhone.trim() || undefined,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };

    try {
      await api.post('/api/citizen/reports', newReport);
    } catch {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#C8D8BC] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-900 text-base">🚨</span>
            <div>
              <h2 className="text-sm font-black text-[#0F2018]">REPORT A GROUND HAZARD</h2>
              <p className="text-[11px] text-[#2C4A3E]">
                Dispatches GPS evidence to District Disaster Emergency Centers
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-bold text-[#0F2018]">Report Dispatched Successfully!</h3>
            <p className="text-xs text-[#2C4A3E] max-w-xs mx-auto">
              Your photo and GPS location coordinates have been submitted. Local disaster management authorities will review the signal for ground verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
            {/* Auto-attached Location Badge */}
            <div className="p-3 rounded-2xl bg-[#F5F0E8] border border-[#C8D8BC] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#4A7C59] shrink-0" />
                <div>
                  <div className="font-bold text-[#0F2018]">{userCoordinates.name || 'NER Location'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    GPS: {userCoordinates.lat.toFixed(4)}°N, {userCoordinates.lon.toFixed(4)}°E
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                GPS Locked
              </span>
            </div>

            {/* CAMERA SECTION: Live Camera Viewfinder + Photo Evidence */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#0F2018]">
                Camera Photo Evidence
              </label>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col justify-between border-2 border-emerald-500">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={switchCameraFacing}
                      className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80"
                      title="Switch camera"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-2 rounded-xl bg-black/60 text-white hover:bg-black/80"
                      title="Close viewfinder"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
                    <button
                      type="button"
                      onClick={snapPhoto}
                      className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-lg flex items-center gap-2"
                    >
                      <Camera size={16} />
                      <span>SNAP PHOTO</span>
                    </button>
                  </div>
                </div>
              ) : photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#C8D8BC] aspect-video">
                  <img src={photoPreview} alt="Captured hazard" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 text-white hover:bg-black text-xs font-bold flex items-center gap-1 shadow-md"
                  >
                    <X size={14} />
                    <span>Retake</span>
                  </button>
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/70 text-white text-[10px] font-mono">
                    Evidence Attached
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-3 px-3 rounded-2xl border-2 border-dashed border-[#C8D8BC] hover:border-[#4A7C59] bg-[#FAF7F2] text-xs font-bold text-[#0F2018] flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <Camera size={20} className="text-[#4A7C59]" />
                    <span>Open Live Camera</span>
                  </button>

                  <label className="py-3 px-3 rounded-2xl border-2 border-dashed border-[#C8D8BC] hover:border-[#4A7C59] bg-[#FAF7F2] text-xs font-bold text-[#0F2018] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer">
                    <Video size={20} className="text-amber-700" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Select Hazard Type */}
            <div>
              <label className="block text-xs font-bold text-[#0F2018] mb-1.5">
                Select Observed Hazard Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {OBSERVATIONS.map((obs) => {
                  const isSelected = selectedType === obs.type;
                  return (
                    <button
                      key={obs.type}
                      type="button"
                      onClick={() => setSelectedType(obs.type)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-[#4A7C59] bg-emerald-50 text-[#0F2018] font-bold shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-base">{obs.icon}</span>
                      <span className="text-xs truncate">{obs.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MICROPHONE VOICE REPORTING + Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0F2018]">
                  Hazard Description
                </label>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                  }`}
                  title="Speak to dictate description"
                >
                  {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isListening ? 'Listening... Tap to stop' : '🎙️ Report by Voice'}</span>
                </button>
              </div>

              {speechError && (
                <div className="mb-1 text-[11px] text-rose-600 font-medium">{speechError}</div>
              )}

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you see (e.g. mud blocking the road near kilometer 14, or new cracks on slope)..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#4A7C59] focus:ring-1 focus:ring-[#4A7C59]"
              />
            </div>

            {/* Reporter Contact Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Local resident / traveler"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone (For Verification)
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="+91 9XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#4A7C59] hover:bg-[#3B6647] text-white font-black text-xs tracking-wide shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Send size={16} />
                <span>{isSubmitting ? 'DISPATCHING REPORT...' : 'SUBMIT HAZARD REPORT'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
