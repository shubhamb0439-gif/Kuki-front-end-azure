import React, { useState, useEffect } from 'react';
import { LogOut, QrCode } from 'lucide-react';
import QRCodeComponent from 'react-qr-code';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

export function DesktopEmployerPage() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [qrCode, setQrCode] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [employerName, setEmployerName] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchEmployerProfile();
    }
  }, [user]);

  const fetchEmployerProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();

    if (profile) {
      setEmployerName(profile.name);
    }
  };

  const handleGenerateQR = () => {
    const timestamp = Date.now();
    const qrCodeValue = `qr:mark_attendance:${user?.id}:universal:${timestamp}`;
    setQrCode(qrCodeValue);
    setShowQR(true);

    supabase
      .from('qr_transactions')
      .insert({
        qr_code: qrCodeValue,
        transaction_type: 'mark_attendance',
        employee_id: null,
        employer_id: user?.id,
        status: 'pending',
        metadata: { type: 'universal_attendance' }
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error creating QR transaction:', error);
        }
      });
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 md:p-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">KUKI</h1>
            <p className="text-gray-600 mt-1">Employer Attendance Station</p>
            {employerName && (
              <p className="text-sm text-gray-500 mt-2">Welcome, {employerName}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <QrCode className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Attendance QR Code</h2>
            <p className="text-gray-600 mb-6">
              Generate a QR code for employees to scan and mark their attendance
            </p>

            {!showQR ? (
              <button
                onClick={handleGenerateQR}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Generate Attendance QR Code
              </button>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Universal Attendance QR Code
                  </h3>
                  <p className="text-sm text-gray-600">
                    Employees can scan this code to log in or log out
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border-4 border-blue-200 mb-6 inline-block">
                  <QRCodeComponent value={qrCode} size={280} />
                </div>

                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>How it works:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 text-left">
                    <li>• Employee scans this QR code with their phone</li>
                    <li>• If not logged in today, they will be logged in</li>
                    <li>• If already logged in, they will be logged out</li>
                    <li>• Attendance is automatically tracked in the system</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowQR(false)}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-xl transition-colors"
                >
                  Hide QR Code
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-amber-600">ℹ️</span>
            Desktop/Tablet Mode
          </h3>
          <p className="text-sm text-gray-600">
            This interface is designed for large screens. Only attendance QR code generation is available.
            For full functionality, please use the mobile app.
          </p>
        </div>
      </div>
    </div>
  );
}
