import React, { useState, useEffect } from 'react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Crown, Users, TrendingUp, Check, X, Calendar, DollarSign, Filter, Search } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  account_tier: string;
  account_type: string;
  subscription_plan: string;
  max_employees: number;
  can_track_attendance: boolean;
  can_access_full_statements: boolean;
  subscription_expires_at: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  payment_method_added: boolean;
  created_at: string;
}

interface SubscriptionTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  from_tier: string | null;
  to_tier: string | null;
  from_plan: string | null;
  to_plan: string | null;
  amount: number;
  currency: string;
  payment_status: string;
  transaction_date: string;
  notes: string | null;
}

export function SubscriptionManagementPage() {
  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterTrialStatus, setFilterTrialStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [upgradeData, setUpgradeData] = useState({
    targetTier: '',
    targetPlan: '',
    amount: '',
    currency: 'USD',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadTransactions()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await profiles.list();
      if (!error && data) {
        setUsers((data as any[]).filter((p: any) => p.role === 'employer'));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTransactions = async () => {
    // Transactions loaded via admin subscriptions endpoint
    try {
      const { data, error } = await admin.subscriptions.list();
      if (!error && data) setTransactions(data as any);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const openUpgradeModal = (user: UserProfile) => {
    setSelectedUser(user);
    setUpgradeData({
      targetTier: user.account_tier,
      targetPlan: user.subscription_plan,
      amount: '',
      currency: 'USD',
      notes: ''
    });
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    if (!selectedUser) return;

    try {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const { error: updateError } = await profiles.update(selectedUser.id, {
        account_tier: upgradeData.targetTier,
        subscription_plan: upgradeData.targetPlan,
        subscription_status: 'active',
        subscription_expires_at: expiryDate.toISOString()
      });

      if (updateError) throw new Error(updateError);

      setShowUpgradeModal(false);
      setSelectedUser(null);
      loadData();
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      toast.showError('Error', 'Failed to upgrade subscription');
    }
  };

  const getPlanBadgeColor = (plan: string, isOnTrial: boolean) => {
    if (isOnTrial) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'core':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pro':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pro_plus':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDaysRemaining = (trialEndsAt: string | null): number => {
    if (!trialEndsAt) return 0;
    const now = new Date();
    const endDate = new Date(trialEndsAt);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };


  const filteredUsers = users.filter(user => {
    const matchesPlan = filterPlan === 'all' || user.subscription_plan === filterPlan;
    const matchesTrialStatus =
      filterTrialStatus === 'all' ||
      (filterTrialStatus === 'trial' && user.trial_ends_at !== null) ||
      (filterTrialStatus === 'no_trial' && user.trial_ends_at === null);
    const matchesSearch = searchQuery === '' ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);

    return matchesPlan && matchesTrialStatus && matchesSearch;
  });

  const stats = {
    totalUsers: filteredUsers.length,
    freeUsers: filteredUsers.filter(u => u.subscription_plan === 'free').length,
    coreUsers: filteredUsers.filter(u => u.subscription_plan === 'core').length,
    proUsers: filteredUsers.filter(u => u.subscription_plan === 'pro').length,
    proPlusUsers: filteredUsers.filter(u => u.subscription_plan === 'pro_plus').length,
    trialUsers: filteredUsers.filter(u => u.trial_ends_at !== null).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Crown className="w-6 h-6" />
            Subscription Management
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">FREE</div>
              <div className="text-2xl font-bold text-gray-600">{stats.freeUsers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">CORE</div>
              <div className="text-2xl font-bold text-green-600">{stats.coreUsers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">PRO</div>
              <div className="text-2xl font-bold text-blue-600">{stats.proUsers}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">PRO PLUS</div>
              <div className="text-2xl font-bold text-purple-600">{stats.proPlusUsers}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
              <div className="text-sm text-yellow-800 font-semibold">ON TRIAL</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.trialUsers}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Plans</option>
                <option value="free">FREE</option>
                <option value="core">CORE</option>
                <option value="pro">PRO</option>
                <option value="pro_plus">PRO PLUS</option>
              </select>
              <select
                value={filterTrialStatus}
                onChange={(e) => setFilterTrialStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="trial">On Trial</option>
                <option value="no_trial">Regular Subscription</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Features</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const isOnTrial = user.trial_ends_at !== null;
                  const daysRemaining = isOnTrial ? calculateDaysRemaining(user.trial_ends_at) : 0;

                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isOnTrial ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-600">{user.email || user.phone}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPlanBadgeColor(user.subscription_plan, isOnTrial)}`}>
                            {user.subscription_plan.toUpperCase().replace('_', ' ')}
                          </span>
                          {isOnTrial && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-200 text-yellow-900 border border-yellow-400">
                              <Calendar className="w-3 h-3 mr-1" />
                              TRIAL: {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                            </span>
                          )}
                        </div>
                      </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{user.max_employees} employees</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {user.can_track_attendance ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <X className="w-3 h-3 text-red-600" />
                          )}
                          <span>Attendance</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {user.can_access_full_statements ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <X className="w-3 h-3 text-red-600" />
                          )}
                          <span>Full Statements</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.subscription_status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openUpgradeModal(user)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Manage
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showUpgradeModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Manage Subscription - {selectedUser.name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Plan
                </label>
                <select
                  value={upgradeData.targetPlan}
                  onChange={(e) => setUpgradeData({ ...upgradeData, targetPlan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">FREE - 1 employee, limited statements, no attendance</option>
                  <option value="core">CORE - 3 employees, full statements, attendance - $4.95/mo</option>
                  <option value="pro">PRO - 6 employees, multi-user, single ad - $19.95/mo</option>
                  <option value="pro_plus">PRO PLUS - 12 employees, multi-user shareable, no ads - $29.95/mo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={upgradeData.amount}
                    onChange={(e) => setUpgradeData({ ...upgradeData, amount: e.target.value })}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={upgradeData.currency}
                    onChange={(e) => setUpgradeData({ ...upgradeData, currency: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="KES">KES</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={upgradeData.notes}
                  onChange={(e) => setUpgradeData({ ...upgradeData, notes: e.target.value })}
                  placeholder="Add any notes about this transaction..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpgrade}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Update Subscription
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
