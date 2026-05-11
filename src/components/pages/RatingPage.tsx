import React, { useState } from 'react';
import { Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { Header } from '../common/Header';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { supabase } from '../../lib/supabase';

interface PerformanceRating {
  id: string;
  rating_date: string;
  rating: number;
  comment: string;
}

interface RatingPageProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function RatingPage({ onReferFriend, onMessages }: RatingPageProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceRating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showEmployerRatingModal, setShowEmployerRatingModal] = useState(false);
  const [employers, setEmployers] = useState<any[]>([]);
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [employerRating, setEmployerRating] = useState(0);
  const [employerComment, setEmployerComment] = useState('');

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

  React.useEffect(() => {
    if (user?.role === 'employer') {
      fetchEmployees();
    } else if (user?.role === 'employee') {
      fetchMyPerformance();
      fetchEmployers();
    }
  }, [user]);

  const fetchEmployees = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        user_id,
        email,
        name,
        profession,
        profiles!employees_user_id_fkey(name, profile_photo)
      `)
      .eq('employer_id', user.id)
      .eq('status', 'active');

    if (!error && data) {
      const formattedEmployees = data.map(emp => ({
        id: emp.user_id || emp.id, // Use employee record ID for manual employees
        name: emp.user_id ? (emp.profiles?.name || emp.email) : emp.name || emp.email,
        email: emp.email,
        profile_photo: emp.profiles?.profile_photo,
        isManualEmployee: !emp.user_id, // Flag to identify manual employees
        employeeRecordId: emp.id, // Keep track of the employee record ID
      }));
      setEmployees(formattedEmployees);
    }
  };

  const fetchMyPerformance = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('performance_ratings')
      .select('*')
      .eq('employee_id', user.id)
      .order('rating_date', { ascending: false });

    if (!error && data) {
      setPerformanceData(data);
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    }
  };

  const fetchEmployers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .select(`
        employer_id,
        employer:profiles!employees_employer_id_fkey(id, name, profile_photo)
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      const formattedEmployers = data.map(emp => ({
        id: emp.employer_id,
        name: emp.employer.name,
        profile_photo: emp.employer.profile_photo,
      }));
      setEmployers(formattedEmployers);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isFutureDate = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d > today;
  };

  const handleDateClick = (date: Date) => {
    if (isFutureDate(date)) return;
    setSelectedDate(date);
    setShowRatingModal(true);
    setRating(0);
    setComment('');
    setSelectedEmployee(null);
  };

  const handleSubmitRating = async () => {
    if (!selectedEmployee || !selectedDate || rating === 0) {
      toast.showWarning('Missing Information', 'Please select an employee and provide a rating');
      return;
    }

    if (isFutureDate(selectedDate)) {
      toast.showWarning('Invalid Date', 'You cannot submit a rating for a future date');
      return;
    }

    try {
      const ratingDate = selectedDate.toISOString().split('T')[0];

      // For manual employees (no user account), use the employee record ID
      const employeeIdForRating = selectedEmployee.isManualEmployee
        ? selectedEmployee.employeeRecordId
        : selectedEmployee.id;

      const ratingData: any = {
        employer_id: user?.id,
        employee_id: employeeIdForRating,
        employee_record_id: selectedEmployee.employeeRecordId,
        rating_date: ratingDate,
        rating: rating,
        comment: comment.trim(),
        updated_at: new Date().toISOString()
      };

      const { error: ratingError } = await supabase
        .from('performance_ratings')
        .upsert(ratingData);

      if (ratingError) throw ratingError;

      // Only send statement if employee has a user account
      if (comment.trim() && !selectedEmployee.isManualEmployee) {
        const { error: messageError } = await supabase
          .from('statements')
          .insert({
            user_id: selectedEmployee.id,
            message: `PERFORMANCE RATING RECEIVED\n\nFrom: ${user?.name}\nDate: ${ratingDate}\nRating: ${rating} stars\n\nComment:\n${comment}\n\n- Performance Review System`
          });

        if (messageError) throw messageError;
      }

      setShowRatingModal(false);
      setSelectedEmployee(null);
      setRating(0);
      setComment('');
      setSelectedDate(null);

      const successMessage = selectedEmployee.isManualEmployee
        ? 'Performance rating saved successfully! (Record keeper entry - no notification sent)'
        : 'Performance rating saved successfully!';

      toast.showSuccess('Success', successMessage);
    } catch (error: any) {
      toast.showError('Error', 'Error saving rating: ' + error.message);
    }
  };

  const handleSubmitEmployerRating = async () => {
    if (!selectedEmployer || employerRating === 0) {
      toast.showWarning('Missing Information', 'Please select an employer and provide a rating');
      return;
    }

    try {
      const { error: ratingError } = await supabase
        .from('employer_ratings')
        .upsert({
          employer_id: selectedEmployer.id,
          employee_id: user?.id,
          rating: employerRating,
          comment: employerComment.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'employer_id,employee_id'
        });

      if (ratingError) throw ratingError;

      if (employerComment.trim()) {
        const { error: messageError } = await supabase
          .from('statements')
          .insert({
            user_id: selectedEmployer.id,
            message: `EMPLOYER RATING RECEIVED\n\nFrom: ${user?.name}\nRating: ${employerRating} stars\n\nComment:\n${employerComment}\n\n- Rating System`
          });

        if (messageError) throw messageError;
      }

      setShowEmployerRatingModal(false);
      setSelectedEmployer(null);
      setEmployerRating(0);
      setEmployerComment('');
      toast.showSuccess('Success', 'Employer rating submitted successfully!');
    } catch (error: any) {
      toast.showError('Error', 'Error submitting rating: ' + error.message);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        const next = new Date(prev);
        next.setMonth(prev.getMonth() + 1);
        const now = new Date();
        if (next.getFullYear() > now.getFullYear() || (next.getFullYear() === now.getFullYear() && next.getMonth() > now.getMonth())) {
          return prev;
        }
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const StarRating = ({ currentRating, onRate, readonly = false }: {
    currentRating: number;
    onRate?: (rating: number) => void;
    readonly?: boolean;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => !readonly && onRate && onRate(star)}
            disabled={readonly}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${
              star <= currentRating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 pb-20">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={0}
      />
      <div className="max-w-md mx-auto bg-white min-h-screen pt-[75px]">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {user?.role === 'employer' ? 'Performance' : 'My Performance'}
          </h1>

          {user?.role === 'employer' ? (
            <>
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-blue-600" />
                  </button>
                  <h2 className="text-lg font-semibold text-blue-900">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  {(() => {
                    const now = new Date();
                    const isCurrentMonth = currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth();
                    return (
                      <button
                        onClick={() => navigateMonth('next')}
                        disabled={isCurrentMonth}
                        className={`p-2 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-100'}`}
                      >
                        <ChevronRight className="w-5 h-5 text-blue-600" />
                      </button>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-blue-600 py-2">
                      {day}
                    </div>
                  ))}
                  {getDaysInMonth(currentDate).map((date, index) => {
                    const future = date ? isFutureDate(date) : false;
                    return (
                      <button
                        key={index}
                        onClick={() => date && handleDateClick(date)}
                        disabled={!date || future}
                        className={`aspect-square text-sm rounded-lg transition-colors ${
                          !date
                            ? 'text-transparent cursor-default'
                            : future
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'hover:bg-blue-100 text-blue-900 font-medium cursor-pointer'
                        }`}
                      >
                        {date?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg p-6 mb-6">
                <div className="text-center">
                  <p className="text-sm opacity-90 mb-2">Overall Rating</p>
                  <div className="flex justify-center items-center mb-2">
                    <span className="text-4xl font-bold mr-3">{averageRating.toFixed(1)}</span>
                    <StarRating currentRating={Math.round(averageRating)} readonly />
                  </div>
                  <p className="text-sm opacity-90">Based on {performanceData.length} reviews</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Performance Reviews</h3>
                {performanceData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No performance reviews yet</p>
                  </div>
                ) : (
                  performanceData.slice(0, 10).map((perf) => (
                    <div key={perf.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(perf.rating_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <StarRating currentRating={perf.rating} readonly />
                      </div>
                      {perf.comment && (
                        <p className="text-sm text-gray-600 mt-2">{perf.comment}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-4">Rate Your Employer</h3>
                <p className="text-sm text-gray-600 mb-4">Share your experience and help others make informed decisions</p>
                <button
                  onClick={() => setShowEmployerRatingModal(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Star className="w-5 h-5" />
                  Rate Employer
                </button>
              </div>
            </>
          )}

          {showRatingModal && selectedDate && user?.role === 'employer' && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  Rate Performance
                </h3>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Employee
                  </label>
                  <select
                    value={selectedEmployee?.id || ''}
                    onChange={(e) => {
                      const emp = employees.find(emp => emp.id === e.target.value);
                      setSelectedEmployee(emp || null);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose an employee...</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (0 = Poor, 5 = Excellent)
                  </label>
                  <div className="flex justify-center">
                    <StarRating
                      currentRating={rating}
                      onRate={setRating}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (Optional)
                  </label>
                  <textarea
                    placeholder="Enter your performance remarks..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRatingModal(false);
                      setSelectedEmployee(null);
                      setRating(0);
                      setComment('');
                      setSelectedDate(null);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitRating}
                    disabled={!selectedEmployee || rating === 0}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEmployerRatingModal && user?.role === 'employee' && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  Rate Your Employer
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Employer
                  </label>
                  <select
                    value={selectedEmployer?.id || ''}
                    onChange={(e) => {
                      const emp = employers.find(emp => emp.id === e.target.value);
                      setSelectedEmployer(emp || null);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose an employer...</option>
                    {employers.map((employer) => (
                      <option key={employer.id} value={employer.id}>
                        {employer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (1 = Poor, 5 = Excellent)
                  </label>
                  <div className="flex justify-center">
                    <StarRating
                      currentRating={employerRating}
                      onRate={setEmployerRating}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (Optional)
                  </label>
                  <textarea
                    placeholder="Share your experience working with this employer..."
                    value={employerComment}
                    onChange={(e) => setEmployerComment(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowEmployerRatingModal(false);
                      setSelectedEmployer(null);
                      setEmployerRating(0);
                      setEmployerComment('');
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitEmployerRating}
                    disabled={!selectedEmployer || employerRating === 0}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
