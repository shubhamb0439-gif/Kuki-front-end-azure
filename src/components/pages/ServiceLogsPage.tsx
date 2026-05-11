import React, { useState, useEffect } from 'react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Activity, User, Calendar, Monitor, Smartphone, Tablet, Mail, Phone, Filter, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginLog {
  id: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  account_type: string | null;
  login_time: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  login_method: string | null;
  created_at: string;
}

export function ServiceLogsPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAccountType, setFilterAccountType] = useState<string>('all');
  const [filterDeviceType, setFilterDeviceType] = useState<string>('all');
  const [filterLoginMethod, setFilterLoginMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('login_logs')
        .select('*')
        .order('login_time', { ascending: false })
        .limit(500);

      if (!error && data) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Error loading login logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      case 'desktop':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getLoginMethodIcon = (method: string | null) => {
    return method === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Date/Time', 'Name', 'Email', 'Phone', 'Account Type', 'Device', 'Login Method'];
    const rows = filteredLogs.map(log => [
      formatDateTime(log.login_time),
      log.name || 'N/A',
      log.email || 'N/A',
      log.phone || 'N/A',
      log.account_type || 'N/A',
      log.device_type || 'N/A',
      log.login_method || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(log => {
    const matchesAccountType = filterAccountType === 'all' || log.account_type === filterAccountType;
    const matchesDeviceType = filterDeviceType === 'all' || log.device_type === filterDeviceType;
    const matchesLoginMethod = filterLoginMethod === 'all' || log.login_method === filterLoginMethod;
    const matchesSearch = searchQuery === '' ||
      log.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.phone?.includes(searchQuery);

    return matchesAccountType && matchesDeviceType && matchesLoginMethod && matchesSearch;
  });

  const stats = {
    total: filteredLogs.length,
    employers: filteredLogs.filter(l => l.account_type === 'employer').length,
    employees: filteredLogs.filter(l => l.account_type === 'employee').length,
    mobile: filteredLogs.filter(l => l.device_type === 'mobile').length,
    desktop: filteredLogs.filter(l => l.device_type === 'desktop').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-6 h-6" />
                Service Logs
              </h1>
              <p className="text-sm text-gray-600 mt-1">Monitor all user login activity</p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Total Logins</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Employers</div>
              <div className="text-2xl font-bold text-blue-600">{stats.employers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Employees</div>
              <div className="text-2xl font-bold text-green-600">{stats.employees}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Mobile</div>
              <div className="text-2xl font-bold text-purple-600">{stats.mobile}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Desktop</div>
              <div className="text-2xl font-bold text-orange-600">{stats.desktop}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Search name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterAccountType}
                onChange={(e) => setFilterAccountType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Account Types</option>
                <option value="employer">Employer</option>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={filterDeviceType}
                onChange={(e) => setFilterDeviceType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
              <select
                value={filterLoginMethod}
                onChange={(e) => setFilterLoginMethod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Account Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No login logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDateTime(log.login_time)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {log.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="space-y-1">
                          {log.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-xs">{log.email}</span>
                            </div>
                          )}
                          {log.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-xs">{log.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.account_type === 'employer'
                            ? 'bg-blue-100 text-blue-800'
                            : log.account_type === 'employee'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {log.account_type || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          {getDeviceIcon(log.device_type)}
                          <span className="capitalize">{log.device_type || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          {getLoginMethodIcon(log.login_method)}
                          <span className="capitalize">{log.login_method || 'Unknown'}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredLogs.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} total login records
          </div>
        )}
      </div>
    </div>
  );
}
