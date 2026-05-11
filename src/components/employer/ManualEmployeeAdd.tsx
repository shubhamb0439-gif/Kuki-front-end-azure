import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, DollarSign, Camera, Upload, User, ChevronDown, Lock, Crown } from 'lucide-react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Modal } from '../common/Modal';

interface ManualEmployeeAddProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface JobRole {
  id: string;
  name: string;
  description: string | null;
}

export function ManualEmployeeAdd({ onClose, onSuccess }: ManualEmployeeAddProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    profession: '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract',
    workingHoursPerDay: '8',
    workingDaysPerMonth: '26'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadJobRoles();
    return () => {
      stopCamera();
    };
  }, []);

  const videoRefCallback = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  };

  const loadJobRoles = async () => {
    try {
      const { data, error } = await admin.jobRoles.list();
      if (!error && data) {
        setJobRoles(data);
      }
    } catch (err) {
      console.error('Error loading job roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setShowCamera(true);
      } catch {
        setError('Unable to access camera. Please upload a photo instead.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg');
        setProfilePhoto(photoData);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'employee-photo.jpg', { type: 'image/jpeg' });
            setPhotoFile(file);
          }
        }, 'image/jpeg');

        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
        setPhotoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Block contract type for non-pro_plus plans
    const plan = user.subscription_plan || 'free';
    if (formData.employmentType === 'contract' && plan !== 'pro_plus') {
      setError('Contract employment type is only available with Pro Plus subscription');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let photoUrl: string | null = null;

      if (photoFile && user) {
        const { data: uploadData, error: uploadError } = await profiles.uploadPhoto(user.id, photoFile);
        if (uploadError) {
          console.error('Photo upload error:', uploadError);
        } else if (uploadData) {
          photoUrl = uploadData.profile_photo;
        }
      }

      const employeeData: any = {
        employer_id: user.id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        profession: formData.profession.trim(),
        status: 'active',
        employment_type: formData.employmentType,
        photo_url: photoUrl,
        created_at: new Date().toISOString()
      };

      if (formData.employmentType === 'part_time') {
        employeeData.working_hours_per_day = parseFloat(formData.workingHoursPerDay);
        employeeData.working_days_per_month = parseInt(formData.workingDaysPerMonth);
      }

      const { data: employee, error: employeeError } = await employees.add(employeeData);

      if (employeeError) throw new Error(employeeError);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding employee:', err);
      setError(err.message || 'Failed to add employee');
      setLoading(false);
    }
  };

  return (
    <>
    <Modal isOpen={true} onClose={onClose} size="2xl" closeOnBackdropClick={false}>
      <div className="bg-white rounded-2xl max-h-[70vh] flex flex-col shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl flex-shrink-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Employee</h2>
              <p className="text-sm text-gray-600">Manually create employee record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-emerald-500`}
              placeholder="Enter employee name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Photo (Optional)
            </label>
            {!profilePhoto ? (
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 px-4 py-3 border-2 border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center space-x-2 text-emerald-700 font-medium"
                >
                  <Camera className="w-5 h-5" />
                  <span>Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 px-4 py-3 border-2 ${colors.ring.replace('ring-', 'border-')} rounded-lg ${colors.primaryLight} transition-colors flex items-center justify-center space-x-2 ${colors.text} font-medium`}
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <img
                  src={profilePhoto}
                  alt="Employee"
                  className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setProfilePhoto(null);
                    setPhotoFile(null);
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-emerald-500`}
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Role / Profession *
            </label>
            {loadingRoles ? (
              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-gray-600 text-sm">Loading roles...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-emerald-500 appearance-none bg-white pr-10`}
                  required
                >
                  <option value="">Select a job role...</option>
                  {jobRoles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            )}
            {jobRoles.length === 0 && !loadingRoles && (
              <p className="text-sm text-amber-600 mt-2">
                No job roles available. Please contact admin to add job roles.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employment Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['full_time', 'part_time'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, employmentType: type as any })}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    formData.employmentType === type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'full_time' ? 'Full Time' : 'Part Time'}
                </button>
              ))}
              {(user?.subscription_plan === 'pro_plus') ? (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, employmentType: 'contract' })}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    formData.employmentType === 'contract'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Contract
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-3 rounded-lg font-medium bg-gray-200 text-gray-400 cursor-not-allowed flex items-center justify-center space-x-1 relative"
                  title="Pro Plus subscription required"
                >
                  <Lock className="w-3 h-3" />
                  <span className="text-xs">Contract</span>
                  <Crown className="w-3 h-3 text-amber-400" />
                </button>
              )}
            </div>
          </div>

          {formData.employmentType === 'part_time' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hours Per Day
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={formData.workingHoursPerDay}
                  onChange={(e) => setFormData({ ...formData, workingHoursPerDay: Math.min(24, Math.max(0, parseFloat(e.target.value) || 0)).toString() })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-emerald-500`}
                  placeholder="8"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days Per Month
                </label>
                <input
                  type="number"
                  min="0"
                  max="31"
                  value={formData.workingDaysPerMonth}
                  onChange={(e) => setFormData({ ...formData, workingDaysPerMonth: Math.min(31, Math.max(0, parseInt(e.target.value) || 0)).toString() })}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring.replace('ring-', 'focus:ring-')} focus:border-emerald-500`}
                  placeholder="26"
                  required
                />
              </div>
            </div>
          ) : null}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          </div>

          <div className="bg-white border-t border-gray-200 p-6 flex space-x-3 flex-shrink-0 rounded-b-2xl">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding...</span>
                </div>
              ) : (
                'Add Employee'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

    </Modal>

    {showCamera && createPortal(
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={stopCamera} />
        <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Take Photo</h3>
            <button onClick={stopCamera} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRefCallback}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl"
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button
            onClick={capturePhoto}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Camera className="w-5 h-5" />
            <span>Capture Photo</span>
          </button>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
