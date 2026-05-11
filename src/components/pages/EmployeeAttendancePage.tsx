import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileText, Clock, CheckCircle2, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { Header } from '../common/Header';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useLanguage } from '../../contexts/LanguageContext';

interface AttendanceRecord {
  id?: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'leave' | 'sick_leave';
  scanned_at?: string;
  login_time?: string;
  logout_time?: string;
  total_hours?: number;
  employer_id?: string;
  employer_name?: string;
}

interface DayData {
  records: AttendanceRecord[];
  // Aggregate display state for the calendar cell
  hasLogin: boolean;
  hasAnyPending: boolean;
  hasAnyCompleted: boolean;
}

interface EmployeeAttendancePageProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

const toDateStr = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function EmployeeAttendancePage({ onReferFriend, onMessages }: EmployeeAttendancePageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Map of dateStr -> all records for that day
  const [attendanceData, setAttendanceData] = useState<Record<string, DayData>>({});
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  const [employerNames, setEmployerNames] = useState<Record<string, string>>({});
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [empList, setEmpList] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [filterMode, setFilterMode] = useState<'today' | 'week' | 'month'>('month');

  useSwipeGesture({
    onSwipeLeft: () => { window.location.hash = '#/messages'; }
  });

  useEffect(() => {
    fetchAttendance();
  }, [user, currentDate, selectedEmpId, filterMode]);

  useEffect(() => {
    if (!user || user.role !== 'employer') return;
    employees.list().then(({ data }) => { if (data) setEmpList(data); });
  }, [user]);

  const fetchAttendance = async () => {
    if (!user) return;

    const now = new Date();
    let startDateStr: string;
    let endDateStr: string;

    if (user.role === 'employer' && selectedEmpId && filterMode !== 'month') {
      if (filterMode === 'today') {
        startDateStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
        endDateStr = startDateStr;
      } else {
        // week: Sunday to Saturday of current week
        const dayOfWeek = now.getDay();
        const sunday = new Date(now);
        sunday.setDate(now.getDate() - dayOfWeek);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        startDateStr = toDateStr(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());
        endDateStr = toDateStr(saturday.getFullYear(), saturday.getMonth(), saturday.getDate());
      }
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      startDateStr = toDateStr(year, month, 1);
      endDateStr = toDateStr(year, month, new Date(year, month + 1, 0).getDate());
    }

    const params: Record<string, string> = { from: startDateStr, to: endDateStr };
    if (user.role === 'employer' && selectedEmpId) {
      params.employee_id = selectedEmpId;
    }
    const { data, error } = await attendance.list(params);

    if (error || !data) return;

    // Collect unique employer IDs to fetch names
    const employerIds = [...new Set(data.map((r: any) => r.employer_id).filter(Boolean))] as string[];
    const nameMap: Record<string, string> = { ...employerNames };

    if (employerIds.length > 0) {
      await Promise.all(
        employerIds.map(async (empId: string) => {
          if (!nameMap[empId]) {
            const { data: profileData } = await profiles.get(empId);
            if (profileData) nameMap[empId] = profileData.name;
          }
        })
      );
      setEmployerNames({ ...nameMap });
    }

    // Group all records by date
    const dayMap: Record<string, DayData> = {};
    data.forEach((record: any) => {
      const dateStr = record.attendance_date;
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { records: [], hasLogin: false, hasAnyPending: false, hasAnyCompleted: false };
      }
      dayMap[dateStr].records.push({
        attendance_date: record.attendance_date,
        status: record.status,
        scanned_at: record.scanned_at,
        login_time: record.login_time,
        logout_time: record.logout_time,
        total_hours: record.total_hours ? Number(record.total_hours) : undefined,
        employer_id: record.employer_id,
        employer_name: nameMap[record.employer_id] || record.employer_id,
      });
      if (record.login_time) dayMap[dateStr].hasLogin = true;
      if (record.login_time && !record.logout_time) dayMap[dateStr].hasAnyPending = true;
      if (record.login_time && record.logout_time) dayMap[dateStr].hasAnyCompleted = true;
    });

    setAttendanceData(dayMap);

    // Refresh selected day if open
    if (selectedDate) {
      const ds = toDateStr(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setSelectedDayData(dayMap[ds] || null);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return {
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      startingDayOfWeek: new Date(year, month, 1).getDay(),
    };
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), 1));
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    const dateStr = toDateStr(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDayData(attendanceData[dateStr] || null);
  };

  const getMonthName = (month: number) =>
    ['January','February','March','April','May','June',
     'July','August','September','October','November','December'][month - 1];

  const generateAttendanceStatement = async () => {
    if (!user) return;
    setGeneratingStatement(true);
    try {
      const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
      const endDate = new Date(endYear, endMonth, 0);
      const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const targetId = selectedEmpId || user.id;
      const { data: records, error } = await attendance.list({ employee_id: targetId, from: startDateStr, to: endDateStr });

      if (error) throw new Error(error);
      if (!records || records.length === 0) {
        toast.showInfo('No Records', 'No attendance records found for the selected period');
        return;
      }

      let totalHours = 0, presentDays = 0, absentDays = 0, leaveDays = 0, sickDays = 0;
      let content = `ATTENDANCE STATEMENT\nPeriod: ${getMonthName(startMonth)} ${startYear} - ${getMonthName(endMonth)} ${endYear}\n\n${'='.repeat(60)}\n\n`;

      records.forEach((r: any) => {
        const dateStr = new Date(r.attendance_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        content += `Date: ${dateStr}\nStatus: ${r.status}\n`;
        if (r.status === 'present') {
          presentDays++;
          content += `Login: ${r.login_time ? formatTime(r.login_time) : 'Not recorded'}\n`;
          content += `Logout: ${r.logout_time ? formatTime(r.logout_time) : 'Pending'}\n`;
          content += `Hours: ${r.total_hours ? Number(r.total_hours).toFixed(2) : '0.00'} hrs\n`;
          if (r.total_hours) totalHours += Number(r.total_hours);
        } else if (r.status === 'absent') absentDays++;
        else if (r.status === 'leave') leaveDays++;
        else if (r.status === 'sick_leave') sickDays++;
        content += `${'-'.repeat(60)}\n`;
      });

      const h = Math.floor(totalHours), m = Math.round((totalHours - h) * 60);
      content += `\nSUMMARY\n${'='.repeat(60)}\nPresent: ${presentDays} days\nAbsent: ${absentDays} days\nLeave: ${leaveDays} days\nSick Leave: ${sickDays} days\nTotal Hours: ${h}h ${m}m\n`;

      const { error: stmtErr } = await wages.statements.create({ user_id: user.id, message: content });
      if (stmtErr) throw new Error(stmtErr);

      toast.showSuccess('Success', 'Attendance statement generated! Check the wages page to view it.');
      setShowStatementModal(false);
    } catch (err) {
      toast.showError('Error', 'Failed to generate attendance statement');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onReferFriend={onReferFriend} onMessages={onMessages} />

      <div className="max-w-lg mx-auto p-4 pt-20 pb-8">
        {/* Employee dropdown for employers */}
        {user?.role === 'employer' && empList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">View Attendance For</label>
              <select
                value={selectedEmpId}
                onChange={e => { setSelectedEmpId(e.target.value); setFilterMode('month'); setSelectedDate(null); setSelectedDayData(null); }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select an employee</option>
                {empList.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
                ))}
              </select>
            </div>
            {selectedEmpId && (
              <div className="flex gap-2">
                {(['today', 'week', 'month'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setFilterMode(mode); setSelectedDate(null); setSelectedDayData(null); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      filterMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mode === 'today' ? 'Today' : mode === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigateMonth('prev')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <button onClick={() => navigateMonth('next')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDayOfWeek }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayData = attendanceData[dateStr];
              const isToday = today.getFullYear() === currentDate.getFullYear() &&
                today.getMonth() === currentDate.getMonth() &&
                today.getDate() === day;
              const isSelected = selectedDate?.getDate() === day &&
                selectedDate?.getMonth() === currentDate.getMonth() &&
                selectedDate?.getFullYear() === currentDate.getFullYear();

              const isPast = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

              let cellBg = '';
              let textColor = 'text-gray-700';
              let indicator = null;

              if (dayData) {
                if (dayData.hasAnyPending && !dayData.hasAnyCompleted) {
                  cellBg = 'bg-yellow-100';
                  textColor = 'text-yellow-800';
                  indicator = <Clock className="w-2.5 h-2.5 text-yellow-600" />;
                } else if (dayData.hasAnyCompleted) {
                  cellBg = 'bg-green-100';
                  textColor = 'text-green-800';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />;
                  if (dayData.hasAnyPending) {
                    indicator = <Clock className="w-2.5 h-2.5 text-yellow-600" />;
                  }
                } else if (dayData.records.some(r => r.status === 'leave')) {
                  cellBg = 'bg-orange-100';
                  textColor = 'text-orange-800';
                } else if (dayData.records.some(r => r.status === 'sick_leave')) {
                  cellBg = 'bg-indigo-100';
                  textColor = 'text-indigo-800';
                } else if (dayData.records.some(r => r.status === 'absent')) {
                  cellBg = 'bg-red-100';
                  textColor = 'text-red-800';
                }
              } else if (isPast && !isToday) {
                cellBg = 'bg-red-100';
                textColor = 'text-red-700';
              }

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5
                    text-sm font-semibold transition-all
                    ${cellBg || 'bg-gray-50 hover:bg-gray-100'}
                    ${textColor}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${isSelected ? 'ring-2 ring-blue-400 shadow-md' : ''}
                    ${dayData?.hasAnyPending ? 'ring-2 ring-yellow-400' : ''}
                  `}
                >
                  <span>{day}</span>
                  {indicator}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-green-100 rounded flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
              </div>
              <span className="text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-red-100 rounded" />
              <span className="text-gray-600">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-orange-100 rounded" />
              <span className="text-gray-600">Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-indigo-100 rounded" />
              <span className="text-gray-600">Sick Leave</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <div className="w-3.5 h-3.5 bg-yellow-100 rounded flex items-center justify-center">
                <Clock className="w-2 h-2 text-yellow-600" />
              </div>
              <span className="text-gray-600">Pending Logout</span>
            </div>
          </div>

          <button
            onClick={() => setShowStatementModal(true)}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Generate Attendance Statement
          </button>
        </div>

        {/* Date detail panel */}
        {selectedDate && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>

            {!selectedDayData ? (
              <p className="text-sm text-gray-400">No attendance record for this date.</p>
            ) : (
              <div className="space-y-3">
                {selectedDayData.records.map((record, idx) => (
                  <div key={idx} className={`rounded-xl p-4 border ${
                    record.login_time && !record.logout_time
                      ? 'bg-yellow-50 border-yellow-200'
                      : record.login_time && record.logout_time
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}>
                    {/* Employer name if multiple */}
                    {selectedDayData.records.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {record.employer_name || 'Employer'}
                        </span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">Status</span>
                      {record.login_time && !record.logout_time ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> Pending Logout
                        </span>
                      ) : record.login_time && record.logout_time ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Present
                        </span>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          record.status === 'absent' ? 'bg-red-100 text-red-700' :
                          record.status === 'leave' ? 'bg-blue-100 text-blue-700' :
                          record.status === 'sick_leave' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {record.status === 'sick_leave' ? 'Sick Leave' :
                           record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      )}
                    </div>

                    {/* Login / Logout times */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="text-center bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">Login</p>
                        <p className={`text-sm font-bold ${record.login_time ? 'text-green-600' : 'text-gray-300'}`}>
                          {record.login_time ? formatTime(record.login_time) : '--:--'}
                        </p>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">Logout</p>
                        <p className={`text-sm font-bold ${record.logout_time ? 'text-green-600' : record.login_time ? 'text-yellow-600' : 'text-gray-300'}`}>
                          {record.logout_time ? formatTime(record.logout_time) : record.login_time ? 'Pending' : '--:--'}
                        </p>
                      </div>
                    </div>

                    {/* Total hours */}
                    {record.total_hours != null && record.total_hours > 0 && (
                      <div className="mt-2 text-center">
                        <span className="text-xs text-gray-500">Total: </span>
                        <span className="text-xs font-semibold text-gray-700">
                          {Math.floor(record.total_hours)}h {Math.round((record.total_hours % 1) * 60)}m
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statement modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Generate Attendance Statement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Month</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
                  </select>
                  <select value={startYear} onChange={e => setStartYear(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    {Array.from({ length: 11 }, (_, i) => { const y = 2020+i; return <option key={y} value={y}>{y}</option>; })}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Month</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
                  </select>
                  <select value={endYear} onChange={e => setEndYear(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    {Array.from({ length: 11 }, (_, i) => { const y = 2020+i; return <option key={y} value={y}>{y}</option>; })}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowStatementModal(false)} disabled={generatingStatement} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={generateAttendanceStatement} disabled={generatingStatement} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {generatingStatement ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
