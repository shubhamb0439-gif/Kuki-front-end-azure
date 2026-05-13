import React, { useState } from 'react';
import { Camera, LogOut, Save, X, Briefcase, Eye, EyeOff, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { profiles } from '../../lib/api';
import { Header } from '../common/Header';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import LanguageSelector from '../common/LanguageSelector';

const PROFESSIONS = [
  { id: 'gardener', name: 'Gardener' },
  { id: 'maid', name: 'Maid' },
  { id: 'driver', name: 'Driver' },
  { id: 'cook', name: 'Cook' },
  { id: 'nanny', name: 'Nanny' },
  { id: 'cleaner', name: 'Cleaner' },
  { id: 'caretaker', name: 'Caretaker' },
  { id: 'security', name: 'Security Guard' },
  { id: 'maintenance', name: 'Maintenance Worker' },
  { id: 'laundry', name: 'Laundry Worker' },
  { id: 'pet_care', name: 'Pet Care' },
  { id: 'tutor', name: 'Tutor' }
];

const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'USD - US Dollar', symbol: '$' },
  { code: 'EUR', name: 'EUR - Euro', symbol: '€' },
  { code: 'GBP', name: 'GBP - British Pound', symbol: '£' },
  { code: 'INR', name: 'INR - Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'JPY - Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'CNY - Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'AUD - Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'CAD - Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'CHF - Swiss Franc', symbol: 'Fr' },
  { code: 'SGD', name: 'SGD - Singapore Dollar', symbol: 'S$' },
  { code: 'MXN', name: 'MXN - Mexican Peso', symbol: 'Mex$' },
  { code: 'BRL', name: 'BRL - Brazilian Real', symbol: 'R$' },
  { code: 'KES', name: 'KES - Kenyan Shilling', symbol: 'KSh' }
];

interface EditProfilePageProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function EditProfilePage({ onReferFriend, onMessages }: EditProfilePageProps) {
  const { user, signOut, refreshUser, updateUser } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const { setShowOnboarding } = useOnboarding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [canEditEmail, setCanEditEmail] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const primaryColor = 'bg-blue-600';
  const primaryHoverColor = 'hover:bg-blue-700';
  const focusRingColor = 'focus:ring-blue-500 focus:border-blue-500';

  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setIsLoadingProfile(true);
      const { data } = await profiles.get(user.id);
      // Always apply from API; fall back to auth state field-by-field
      setName(data?.name ?? user.name ?? '');
      setPhone(data?.phone ?? user.phone ?? '');
      setEmail(data?.email ?? user.email ?? '');
      setProfession(data?.profession ?? user.profession ?? '');
      setCurrency(data?.currency ?? 'USD');
      setPhotoPreview(data?.profile_photo ?? user.profile_photo ?? undefined);
      setCanEditEmail(!(data?.email ?? user.email));
      setIsLoadingProfile(false);
    };
    loadProfile();
  }, [user]);

  const handleMessages = () => {
    window.location.hash = '#/messages';
  };

  useSwipeGesture({
    onSwipeLeft: () => {
      window.location.hash = '#/messages';
    }
  });

  const handleReferFriend = () => {
    toast.showInfo('Coming Soon', 'Refer a friend feature coming soon!');
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate that at least email or phone is provided
    if (!email && !phone) {
      toast.showWarning('Missing Information', 'Please provide at least an email or phone number');
      return;
    }

    // Validate email format if provided
    if (email && !email.includes('@')) {
      toast.showWarning('Invalid Email', 'Please enter a valid email address');
      return;
    }

    // Validate phone format if provided
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s-]/g, ''))) {
      toast.showWarning('Invalid Phone', 'Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    setSaving(true);
    try {
      // profile_photo intentionally excluded — handled by POST /profiles/{id}/photo
      const updateData: Record<string, any> = { name, phone, currency };

      if (canEditEmail && email) {
        updateData.email = email;
      }

      if (user.role === 'employee') {
        updateData.profession = profession;
      }

      const { error } = await profiles.update(user.id, updateData);
      if (error) throw new Error(error);

      updateUser({ name, phone: phone || undefined, currency, profession: user.role === 'employee' ? profession : undefined });
      toast.showSuccess('Success', 'Profile updated successfully!');
      window.location.hash = '#/home';
    } catch (error: any) {
      toast.showError('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.showWarning('File Too Large', 'File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.showWarning('Invalid File', 'Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const { data: profile, error: uploadError } = await profiles.uploadPhoto(user.id, file);
      if (uploadError) throw new Error(uploadError);

      if (profile) {
        // Backend returns the full updated profile — apply everything at once
        if (profile.profile_photo) setPhotoPreview(profile.profile_photo);
        if (profile.name) setName(profile.name);
        if (profile.phone) setPhone(profile.phone);
        if (profile.profession) setProfession(profile.profession);
        if (profile.currency) setCurrency(profile.currency);
        updateUser({
          profile_photo: profile.profile_photo,
          name: profile.name,
          phone: profile.phone,
          profession: profile.profession,
        });
      }
      toast.showSuccess('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      toast.showError('Error', 'Error uploading photo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const ProfilePhoto = ({ name, photo }: { name: string; photo?: string }) => {
    if (photo) {
      return (
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-emerald-400 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-4xl">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={0}
      />
      <div className="max-w-md mx-auto bg-white min-h-screen pt-[75px]">
        {/* Page Header */}
        <div className={`${primaryColor} text-white px-4 py-4 flex items-center justify-between`}>
          <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">{t('profile.edit')}</h1>
          <div className="w-10"></div>
        </div>

        {isLoadingProfile ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
        <div className="p-6">
          {/* Profile Photo */}
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <ProfilePhoto name={name} photo={photoPreview} />
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="text-white text-sm">Uploading...</div>
                </div>
              )}
              <label
                htmlFor="photo-upload"
                className={`absolute bottom-0 right-0 w-10 h-10 ${primaryColor} rounded-full flex items-center justify-center shadow-lg ${isUploading ? 'cursor-not-allowed opacity-50' : `cursor-pointer ${primaryHoverColor}`} transition-colors`}
              >
                <Camera className="w-5 h-5 text-white" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-gray-600">
              {isUploading ? 'Uploading photo...' : t('profile.uploadPhoto')}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.fullName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${focusRingColor}`}
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canEditEmail}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${
                  canEditEmail
                    ? `focus:ring-2 ${focusRingColor}`
                    : 'bg-gray-100 text-gray-600 cursor-not-allowed'
                }`}
                placeholder={canEditEmail ? 'Add your email address' : t('auth.email')}
              />
              {!canEditEmail && (
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              )}
              {canEditEmail && !email && (
                <p className="text-xs text-blue-600 mt-1">
                  Add your email to receive statement notifications
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${focusRingColor}`}
                placeholder={phone ? t('auth.phone') : 'Add your phone number'}
              />
              {!phone && email && (
                <p className="text-xs text-blue-600 mt-1">
                  Add your phone number for SMS notifications
                </p>
              )}
            </div>

            {/* Profession (Employee Only) */}
            {user?.role === 'employee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  {t('profile.profession')}
                </label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${focusRingColor}`}
                >
                  <option value="">{t('profile.selectProfession')}</option>
                  {PROFESSIONS.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.currency')}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${focusRingColor}`}
              >
                {CURRENCY_OPTIONS.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                This currency will be used for all your transactions
              </p>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.language')}
              </label>
              <LanguageSelector />
              <p className="text-xs text-gray-500 mt-2">
                This language will be used throughout the app
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full ${primaryColor} ${primaryHoverColor} text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:bg-gray-400`}
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? t('common.loading') : t('profile.save')}</span>
            </button>

            {/* View Guide Button */}
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <BookOpen className="w-5 h-5" />
              <span>View Beginner's Guide</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('home.logout')}</span>
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
