import React, { useState, useEffect } from 'react';
import { Briefcase, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ProfessionSelectionPageProps {
  onComplete: () => void;
}

interface JobRole {
  id: string;
  name: string;
  description: string | null;
}

const getIconForProfession = (name: string): string => {
  const iconMap: Record<string, string> = {
    'gardener': '🌱',
    'driver': '🚗',
    'cook': '👨‍🍳',
    'housekeeper': '🧹',
    'nanny': '👶',
    'security guard': '🛡️',
    'electrician': '⚡',
    'plumber': '🔧',
    'carpenter': '🪚',
    'painter': '🎨',
  };
  return iconMap[name.toLowerCase()] || '💼';
};

export function ProfessionSelectionPage({ onComplete }: ProfessionSelectionPageProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [professions, setProfessions] = useState<JobRole[]>([]);

  useEffect(() => {
    loadProfessions();
  }, []);

  const loadProfessions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_roles')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) {
        setProfessions(data);
      }
    } catch (error) {
      console.error('Error loading professions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProfession || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          profession: selectedProfession,
          job_status: 'looking_for_job'
        })
        .eq('id', user.id);

      if (error) throw error;

      onComplete();
    } catch (error: any) {
      toast.showError('Error', 'Failed to set profession: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Profession</h1>
          <p className="text-gray-600">Select the type of work you specialize in</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {professions.map((profession) => (
            <button
              key={profession.id}
              onClick={() => setSelectedProfession(profession.name)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                selectedProfession === profession.name
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              <div className="text-4xl mb-2">{getIconForProfession(profession.name)}</div>
              <p className="font-medium text-gray-900 text-sm">{profession.name}</p>
              {selectedProfession === profession.name && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedProfession || loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
