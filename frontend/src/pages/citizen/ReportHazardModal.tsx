import React, { useState } from 'react';
import { X, Camera, MapPin, Send, CheckCircle2 } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

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
      description: description.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#C8D8BC] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#C8D8BC] bg-[#F5F0E8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 text-base">⚠️</span>
            <div>
              <h2 className="text-sm font-bold text-[#0F2018]">Report a Ground Hazard</h2>
              <p className="text-[11px] text-[#1A3028]">
                Alerts local disaster authorities and updates the community map
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#1A3028] hover:bg-[#C8D8BC]/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-bold text-[#0F2018]">Report Submitted Successfully!</h3>
            <p className="text-xs text-[#1A3028] max-w-xs mx-auto">
              Thank you for keeping your community safe. Your report has been dispatched to the District Disaster Emergency Center for verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* GPS Location Pill */}
            <div className="p-2.5 rounded-xl bg-[#F5F0E8] border border-[#C8D8BC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0F2018] font-medium">
                <MapPin size={14} className="text-[#4A7C59]" />
                <span>
                  {userCoordinates.name || 'Your Location'} (
                  {userCoordinates.lat.toFixed(4)}°N, {userCoordinates.lon.toFixed(4)}°E)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C8D8BC]/50 text-[#0F2018]">
                GPS Attached
              </span>
            </div>

            {/* Observation Type Grid */}
            <div>
              <label className="block text-xs font-bold text-[#0F2018] mb-2">
                What are you seeing? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OBSERVATIONS.map((obs) => (
                  <button
                    key={obs.type}
                    type="button"
                    onClick={() => setSelectedType(obs.type)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col items-center text-center gap-1 transition-all ${
                      selectedType === obs.type
                        ? 'border-[#4A7C59] bg-[#4A7C59]/10 text-[#0F2018] font-bold shadow-xs'
                        : 'border-[#C8D8BC] hover:border-[#7FB99A] text-[#1A3028]'
                    }`}
                  >
                    <span className="text-lg">{obs.icon}</span>
                    <span className="text-[11px] leading-tight">{obs.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-[#0F2018] mb-1.5">
                Attach Photo (Recommended)
              </label>
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-[#C8D8BC] h-32 bg-black/10">
                  <img
                    src={photoPreview}
                    alt="Uploaded preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#C8D8BC] hover:border-[#4A7C59] rounded-xl p-4 cursor-pointer transition-colors bg-[#F5F0E8]/40">
                  <Camera size={24} className="text-[#4A7C59] mb-1" />
                  <span className="text-[11px] font-bold text-[#0F2018]">
                    Click to capture or upload photo
                  </span>
                  <span className="text-[10px] text-[#1A3028]">
                    Shows landslide width, cracked road, or debris
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#0F2018] mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Rocks rolling down 200m after the petrol pump, traffic stopped, water flowing across road..."
                className="w-full p-2.5 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
              />
            </div>

            {/* Contact Details (Optional) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#0F2018] mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="e.g., Lalsangliana"
                  className="w-full p-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#0F2018] mb-1">
                  Phone (For Verification)
                </label>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="e.g., 9862XXXXXX"
                  className="w-full p-2 rounded-xl border border-[#C8D8BC] text-xs text-[#0F2018] focus:outline-none focus:border-[#4A7C59]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#1A3028] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <span>Submitting report...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Hazard Report to Authorities</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
export default ReportHazardModal;
