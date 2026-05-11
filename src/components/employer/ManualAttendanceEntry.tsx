import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle } from 'lucide-react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';

interface Employee {
  id: string;
  name: string;
  profession: string;
}

interface ManualAttendanceEntryProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualAttendanceEntry({ onClose, onSuccess }: ManualAttendanceEntryProps) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loginTime, setLoginTime] = useState('09:00');
  const [logoutTime, setLogoutTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, profession')
        .eq('employer_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEmployee) return;

    setLoading(true);
    setError('');

    try {
      const loginDateTime = new Date(`${date}T${loginTime}`);
      const logoutDateTime = new Date(`${date}T${logoutTime}`);

      if (logoutDateTime <= loginDateTime) {
        setError('Logout time must be after login time');
        setLoading(false);
        return;
      }

      const hoursWorked = (logoutDateTime.getTime() - loginDateTime.getTime()) / (1000 * 60 * 60);

      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert([{
          employee_id: selectedEmployee,
          employer_id: user.id,
          date: date,
          login_time: loginDateTime.toISOString(),
          logout_time: logoutDateTime.toISOString(),
          hours_worked: hoursWorked,
          created_at: new Date().toISOString()
        }]);

      if (attendanceError) {
        if (attendanceError.message.includes('duplicate')) {
          setError('Attendance for this employee on this date already exists');
        } else {
          throw attendanceError;
        }
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding attendance:', err);
      setError(err.message || 'Failed to add attendance');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="md" closeOnBackdropClick={false}>
      <div className="bg-white rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${colors.primaryLight} rounded-lg`}>
              <Calendar className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>
              <p className="text-sm text-gray-600">Manually record employee attendance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-8">
              <div className={`w-8 h-8 border-4 ${colors.primary} border-t-transparent rounded-full animate-spin`} />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No active employees found. Please add employees first.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring}`}
                  required
                >
                  <option value="">Choose an employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.profession})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring}`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Login Time *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="time"
                      value={loginTime}
                      onChange={(e) => setLoginTime(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring}`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logout Time *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="time"
                      value={logoutTime}
                      onChange={(e) => setLogoutTime(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${colors.ring}`}
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || employees.length === 0}
                  className={`flex-1 ${colors.primary} ${colors.primaryHover} disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center`}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Mark Attendance
                    </>
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
            </>
          )}
        </form>
      </div>
    </Modal>
  );
}
