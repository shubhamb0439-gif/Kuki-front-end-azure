import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload } from 'lucide-react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { detectCurrency } from '../../lib/currencyHelper';
import { useAuth } from '../../contexts/AuthContext';

interface ProfilePhotoUploadPageProps {
  onComplete: () => void;
}

export function ProfilePhotoUploadPage({ onComplete }: ProfilePhotoUploadPageProps) {
  const { user } = useAuth();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setShowCamera(true);
    } catch (err) {
      setError('Unable to access camera. Please upload a photo instead.');
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
            const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
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

  const handleSubmit = async () => {
    if (!photoFile || !user) {
      setError('Profile photo is required');
      return;
    }

    setLoading(true);
    try {
      const { data: uploadData, error: uploadError } = await profiles.uploadPhoto(user.id, photoFile);
      if (uploadError || !uploadData) throw new Error(uploadError || 'Upload failed');

      const currency = await detectCurrency();
      const { error: updateError } = await profiles.update(user.id, { currency });
      if (updateError) throw new Error(updateError);

      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img
              src="/logo-kuki.png"
              alt="KUKI"
              className="w-24 h-24 mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-bold text-gray-900">Add Profile Photo</h1>
            <p className="text-gray-600">Please upload your profile photo to continue</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo *
              </label>
              {!profilePhoto ? (
                <div className="flex flex-col space-y-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full px-4 py-3 border-2 border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center space-x-2 text-emerald-700 font-medium"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-blue-700 font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Upload Photo</span>
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
                <div className="relative">
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePhoto(null);
                      setPhotoFile(null);
                    }}
                    className="absolute top-0 right-1/2 translate-x-16 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!profilePhoto || loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Uploading...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Take Photo</h2>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <button
              onClick={capturePhoto}
              className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>Capture</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
