import React, { useState, useEffect } from 'react';
import { Users, Briefcase, TrendingUp, Activity, Plus, CreditCard as Edit2, Trash2, Save, X, LogOut, DollarSign, Eye, EyeOff, RefreshCw, Video, FileText, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { Header } from '../common/Header';
import { ConfirmModal } from '../common/ConfirmModal';
import { isLargeScreen } from '../../lib/deviceHelper';
import { ServiceLogsPage } from './ServiceLogsPage';
import { SubscriptionManagementPage } from './SubscriptionManagementPage';
import { PaymentApprovalsSection } from '../admin/PaymentApprovalsSection';
import { PlanChangeRequestsSection } from '../admin/PlanChangeRequestsSection';

interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  totalEmployers: number;
  activeJobPosts: number;
  totalApplications: number;
  activeApplications: number;
  totalLoans: number;
  totalBonuses: number;
  activeEmployments: number;
}

interface JobRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  ads_enabled: boolean;
  created_at: string;
}

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: 'url' | 'upload';
  video_file_path: string | null;
  is_active: boolean;
  brand_name: string;
  rate_per_display: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface AdImpression {
  ad_id: string;
  count: number;
}

interface BrandRevenue {
  brand_name: string;
  currency: string;
  total_displays: number;
  total_revenue: number;
  ads: Array<{
    title: string;
    displays: number;
    rate: number;
    revenue: number;
  }>;
}

interface AdminDashboardProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function AdminDashboard({ onReferFriend, onMessages }: AdminDashboardProps) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalEmployees: 0,
    totalEmployers: 0,
    activeJobPosts: 0,
    totalApplications: 0,
    activeApplications: 0,
    totalLoans: 0,
    totalBonuses: 0,
    activeEmployments: 0
  });
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [adImpressions, setAdImpressions] = useState<Record<string, number>>({});
  const [brandRevenues, setBrandRevenues] = useState<BrandRevenue[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingAd, setEditingAd] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [editRole, setEditRole] = useState({ name: '', description: '' });
  const [newAd, setNewAd] = useState({ title: '', description: '', video_url: '', video_type: 'url' as 'url' | 'upload', video_file: null as File | null, brand_name: '', rate_per_display: '0.00', currency: 'USD' });
  const [editAd, setEditAd] = useState({ title: '', description: '', video_url: '', video_type: 'url' as 'url' | 'upload', video_file: null as File | null, brand_name: '', rate_per_display: '0.00', currency: 'USD' });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'roles' | 'users' | 'ads' | 'logs' | 'subscriptions' | 'payments' | 'plan_requests'>('roles');
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(isLargeScreen());
    const handleResize = () => setIsDesktop(isLargeScreen());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        loadAllData();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [user]);

  useEffect(() => {
    if (advertisements.length > 0) {
      calculateBrandRevenues();
    }
  }, [advertisements, adImpressions]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadJobRoles(),
      loadUsers(),
      loadAdvertisements(),
      loadAdImpressions()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const { data: statsData, error: statsError } = await admin.stats();
      if (statsError || !statsData) return;
      setStats({
        totalUsers: statsData.totalUsers || 0,
        totalEmployees: statsData.totalEmployees || 0,
        totalEmployers: statsData.totalEmployers || 0,
        activeJobPosts: statsData.activeJobPosts || 0,
        totalApplications: statsData.totalApplications || 0,
        activeApplications: 0,
        totalLoans: statsData.totalLoans || 0,
        totalBonuses: statsData.totalBonuses || 0,
        activeEmployments: statsData.activeEmployments || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadJobRoles = async () => {
    try {
      const { data, error } = await admin.jobRoles.list();
      if (!error && data) setJobRoles(data as any);
    } catch (error) {
      console.error('Error loading job roles:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await profiles.list();
      if (!error && data) setUsers(data as any);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAdvertisements = async () => {
    try {
      const { data, error } = await admin.ads.list();
      if (!error && data) setAdvertisements(data as any);
    } catch (error) {
      console.error('Error loading advertisements:', error);
    }
  };

  const loadAdImpressions = async () => {
    try {
      const { data, error } = await admin.ads.impressions();
      if (!error && data) setAdImpressions(data);
    } catch (error) {
      console.error('Error loading ad impressions:', error);
    }
  };

  const calculateBrandRevenues = () => {
    const brandMap: Record<string, BrandRevenue> = {};

    advertisements.forEach((ad) => {
      const displays = adImpressions[ad.id] || 0;
      const revenue = displays * ad.rate_per_display;

      if (!brandMap[ad.brand_name]) {
        brandMap[ad.brand_name] = {
          brand_name: ad.brand_name,
          currency: ad.currency,
          total_displays: 0,
          total_revenue: 0,
          ads: []
        };
      }

      brandMap[ad.brand_name].total_displays += displays;
      brandMap[ad.brand_name].total_revenue += revenue;
      brandMap[ad.brand_name].ads.push({
        title: ad.title,
        displays,
        rate: ad.rate_per_display,
        revenue
      });
    });

    setBrandRevenues(Object.values(brandMap));
  };

  const toggleAds = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await profiles.toggleAds(userId, !currentStatus);
      if (!error) loadUsers();
    } catch (error) {
      console.error('Error toggling ads:', error);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name.trim()) return;

    try {
      const { error } = await admin.jobRoles.create({
        name: newRole.name.trim(),
        description: newRole.description.trim() || null,
        is_active: true
      });

      if (!error) {
        setNewRole({ name: '', description: '' });
        setIsAddingRole(false);
        loadJobRoles();
      }
    } catch (error) {
      console.error('Error adding job role:', error);
    }
  };

  const handleUpdateRole = async (id: string) => {
    if (!editRole.name.trim()) return;

    try {
      const { error } = await admin.jobRoles.update(id, {
        name: editRole.name.trim(),
        description: editRole.description.trim() || null
      });

      if (!error) {
        setEditingRole(null);
        loadJobRoles();
      }
    } catch (error) {
      console.error('Error updating job role:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await admin.jobRoles.update(id, { is_active: !currentStatus });
      if (!error) loadJobRoles();
    } catch (error) {
      console.error('Error toggling job role status:', error);
    }
  };

  const handleDeleteRole = (id: string) => {
    setConfirmAction({
      message: 'Are you sure you want to delete this job role? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const { error } = await admin.jobRoles.delete(id);
          if (!error) loadJobRoles();
        } catch (error) {
          console.error('Error deleting job role:', error);
        }
      }
    });
  };

  const startEditing = (role: JobRole) => {
    setEditingRole(role.id);
    setEditRole({ name: role.name, description: role.description || '' });
  };

  const handleAddAd = async () => {
    if (!newAd.title.trim() || !newAd.brand_name.trim() || !newAd.rate_per_display) return;

    if (newAd.video_type === 'url' && !newAd.video_url.trim()) {
      toast.showWarning('Validation Error', 'Please enter a video URL');
      return;
    }

    if (newAd.video_type === 'upload' && !newAd.video_file) {
      toast.showWarning('Validation Error', 'Please select a video file');
      return;
    }

    try {
      setUploadingVideo(true);
      let videoFilePath = null;

      if (newAd.video_type === 'upload' && newAd.video_file) {
        const fileExt = newAd.video_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        // TODO: video upload via Azure Blob Storage API
        videoFilePath = fileName;
      }

      const { error } = await admin.ads.create({
        title: newAd.title.trim(),
        description: newAd.description.trim() || null,
        video_url: newAd.video_type === 'url' ? newAd.video_url.trim() : '',
        video_type: newAd.video_type,
        video_file_path: videoFilePath,
        brand_name: newAd.brand_name.trim(),
        rate_per_display: parseFloat(newAd.rate_per_display),
        currency: newAd.currency,
        is_active: true,
        created_by: user?.id
      });

      if (!error) {
        setNewAd({ title: '', description: '', video_url: '', video_type: 'url', video_file: null, brand_name: '', rate_per_display: '0.00', currency: 'USD' });
        setIsAddingAd(false);
        loadAdvertisements();
      }
    } catch (error) {
      console.error('Error adding advertisement:', error);
      toast.showError('Error', 'Failed to add advertisement. Please try again');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUpdateAd = async (id: string) => {
    if (!editAd.title.trim() || !editAd.brand_name.trim() || !editAd.rate_per_display) return;

    if (editAd.video_type === 'url' && !editAd.video_url.trim()) {
      toast.showWarning('Validation Error', 'Please enter a video URL');
      return;
    }

    if (editAd.video_type === 'upload' && !editAd.video_file && !editAd.video_url) {
      toast.showWarning('Validation Error', 'Please select a video file');
      return;
    }

    try {
      setUploadingVideo(true);
      let videoFilePath = editAd.video_url;

      if (editAd.video_type === 'upload' && editAd.video_file) {
        const fileExt = editAd.video_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        // TODO: video upload via Azure Blob Storage API
        videoFilePath = fileName;
      }

      const { error } = await admin.ads.update(id, {
        title: editAd.title.trim(),
        description: editAd.description.trim() || null,
        video_url: editAd.video_type === 'url' ? editAd.video_url.trim() : videoFilePath || '',
        video_type: editAd.video_type,
        video_file_path: editAd.video_type === 'upload' ? videoFilePath : null,
        brand_name: editAd.brand_name.trim(),
        rate_per_display: parseFloat(editAd.rate_per_display),
        currency: editAd.currency
      });

      if (!error) {
        setEditingAd(null);
        loadAdvertisements();
      }
    } catch (error) {
      console.error('Error updating advertisement:', error);
      toast.showError('Error', 'Failed to update advertisement. Please try again');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleToggleAdActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await admin.ads.update(id, { is_active: !currentStatus });
      if (!error) loadAdvertisements();
    } catch (error) {
      console.error('Error toggling advertisement status:', error);
    }
  };

  const handleDeleteAd = (id: string) => {
    setConfirmAction({
      message: 'Are you sure you want to delete this advertisement? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const { error } = await admin.ads.delete(id);
          if (!error) loadAdvertisements();
        } catch (error) {
          console.error('Error deleting advertisement:', error);
        }
      }
    });
  };

  const startEditingAd = (ad: Advertisement) => {
    setEditingAd(ad.id);
    setEditAd({
      title: ad.title,
      description: ad.description || '',
      video_url: ad.video_type === 'upload' ? (ad.video_file_path || '') : ad.video_url,
      video_type: ad.video_type,
      video_file: null,
      brand_name: ad.brand_name,
      rate_per_display: ad.rate_per_display.toString(),
      currency: ad.currency
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {!isDesktop && <Header onReferFriend={onReferFriend} onMessages={onMessages} />}

      <div className={`${isDesktop ? 'pt-8' : 'pt-20'} ${isDesktop ? 'pb-8' : 'pb-24'} px-4`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your platform and monitor key metrics</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadAllData}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Refresh</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.totalUsers}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Users</h3>
              <p className="text-xs text-gray-500">
                {stats.totalEmployees} employees, {stats.totalEmployers} employers
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Briefcase className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.activeJobPosts}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Active Job Posts</h3>
              <p className="text-xs text-gray-500">Currently open positions</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.activeApplications}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Pending Applications</h3>
              <p className="text-xs text-gray-500">
                {stats.totalApplications} total applications
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.activeEmployments}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Active Employments</h3>
              <p className="text-xs text-gray-500">Current employee relationships</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.totalLoans}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Loans</h3>
              <p className="text-xs text-gray-500">Employee loans issued</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.totalBonuses}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Bonuses</h3>
              <p className="text-xs text-gray-500">Employee bonuses given</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Management Panel</h2>
                <div className="flex space-x-2 flex-wrap gap-y-2">
                  <button onClick={() => setSelectedTab('roles')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'roles' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Job Roles</button>
                  <button onClick={() => setSelectedTab('ads')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'ads' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Advertisements</button>
                  <button onClick={() => setSelectedTab('users')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>User Ads Control</button>
                  <button onClick={() => setSelectedTab('logs')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'logs' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Service Logs</button>
                  <button onClick={() => setSelectedTab('subscriptions')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'subscriptions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Subscriptions</button>
                  <button onClick={() => setSelectedTab('payments')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'payments' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Payment Approvals</button>
                  <button onClick={() => setSelectedTab('plan_requests')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === 'plan_requests' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Plan Changes</button>
                </div>
              </div>
              {selectedTab === 'roles' && (
                <button onClick={() => setIsAddingRole(true)} className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  <Plus className="w-5 h-5" />
                  <span>Add Role</span>
                </button>
              )}
              {selectedTab === 'ads' && (
                <button onClick={() => setIsAddingAd(true)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  <Plus className="w-5 h-5" />
                  <span>Add Advertisement</span>
                </button>
              )}
            </div>

            {selectedTab === 'roles' && (
              <>
                {isAddingRole && (
              <div className="mb-6 p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-3">Add New Job Role</h3>
                <input type="text" placeholder="Role name (e.g., Chef, Butler)" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <textarea placeholder="Description (optional)" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <div className="flex space-x-3">
                  <button onClick={handleAddRole} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"><Save className="w-4 h-4" /><span>Save</span></button>
                  <button onClick={() => { setIsAddingRole(false); setNewRole({ name: '', description: '' }); }} className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"><X className="w-4 h-4" /><span>Cancel</span></button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {jobRoles.map((role) => (
                <div key={role.id} className={`p-4 rounded-xl border-2 transition-all ${role.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                  {editingRole === role.id ? (
                    <div>
                      <input type="text" value={editRole.name} onChange={(e) => setEditRole({ ...editRole, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <textarea value={editRole.description} onChange={(e) => setEditRole({ ...editRole, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <div className="flex space-x-2">
                        <button onClick={() => handleUpdateRole(role.id)} className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><Save className="w-4 h-4" /><span>Save</span></button>
                        <button onClick={() => setEditingRole(null)} className="flex items-center space-x-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"><X className="w-4 h-4" /><span>Cancel</span></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        {role.description && <p className="text-sm text-gray-600 mt-1">{role.description}</p>}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button onClick={() => handleToggleActive(role.id, role.is_active)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${role.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{role.is_active ? 'Active' : 'Inactive'}</button>
                        <button onClick={() => startEditing(role)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </>
            )}

            {selectedTab === 'ads' && (
              <>
                {brandRevenues.length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center space-x-2"><DollarSign className="w-5 h-5 text-green-600" /><span>Brand Revenue Summary</span></h3>
                      <button onClick={() => setSelectedBrand(null)} className="text-sm text-blue-600 hover:underline">{selectedBrand ? 'Show All Brands' : 'View Details'}</button>
                    </div>

                    {selectedBrand === null ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {brandRevenues.map((brand) => (
                          <div key={brand.brand_name} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBrand(brand.brand_name)}>
                            <h4 className="font-semibold text-gray-900 mb-2">{brand.brand_name}</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span className="text-gray-600">Total Displays:</span><span className="font-medium">{brand.total_displays}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Total Revenue:</span><span className="font-semibold text-green-600">{brand.currency} {brand.total_revenue.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-600">Ads Count:</span><span className="font-medium">{brand.ads.length}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        {brandRevenues.filter((b) => b.brand_name === selectedBrand).map((brand) => (
                          <div key={brand.brand_name}>
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                              <div><h4 className="text-xl font-bold text-gray-900">{brand.brand_name}</h4><p className="text-sm text-gray-600">Brand Statement</p></div>
                              <div className="text-right"><p className="text-2xl font-bold text-green-600">{brand.currency} {brand.total_revenue.toFixed(2)}</p><p className="text-sm text-gray-600">{brand.total_displays} total displays</p></div>
                            </div>
                            <div className="space-y-3">
                              {brand.ads.map((adDetail, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex-1"><p className="font-medium text-gray-900">{adDetail.title}</p><p className="text-sm text-gray-600">{adDetail.displays} displays × {brand.currency} {adDetail.rate.toFixed(2)}</p></div>
                                  <div className="text-right"><p className="font-semibold text-green-600">{brand.currency} {adDetail.revenue.toFixed(2)}</p></div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                              <button onClick={() => setSelectedBrand(null)} className="text-blue-600 hover:underline text-sm">Back to all brands</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isAddingAd && (
                  <div className="mb-6 p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                    <h3 className="font-semibold text-gray-900 mb-3">Add New Advertisement</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" placeholder="Brand name *" value={newAd.brand_name} onChange={(e) => setNewAd({ ...newAd, brand_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <input type="text" placeholder="Ad title *" value={newAd.title} onChange={(e) => setNewAd({ ...newAd, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Video Source *</label>
                      <div className="flex space-x-4 mb-3">
                        <label className="flex items-center"><input type="radio" checked={newAd.video_type === 'url'} onChange={() => setNewAd({ ...newAd, video_type: 'url', video_file: null })} className="mr-2" /><span className="text-sm">Video URL</span></label>
                        <label className="flex items-center"><input type="radio" checked={newAd.video_type === 'upload'} onChange={() => setNewAd({ ...newAd, video_type: 'upload', video_url: '' })} className="mr-2" /><span className="text-sm">Upload Video</span></label>
                      </div>
                    </div>
                    {newAd.video_type === 'url' ? (
                      <input type="url" placeholder="Video URL *" value={newAd.video_url} onChange={(e) => setNewAd({ ...newAd, video_url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={(e) => { const file = e.target.files?.[0]; if (file) setNewAd({ ...newAd, video_file: file }); }} className="hidden" id="new-video-upload" />
                        <label htmlFor="new-video-upload" className="cursor-pointer flex flex-col items-center"><Video className="w-12 h-12 text-gray-400 mb-2" />{newAd.video_file ? <p className="text-sm text-gray-700 font-medium">{newAd.video_file.name}</p> : <p className="text-sm text-gray-600">Click to upload video</p>}</label>
                      </div>
                    )}
                    <textarea placeholder="Description (optional)" value={newAd.description} onChange={(e) => setNewAd({ ...newAd, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg mt-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <input type="number" step="0.01" min="0" placeholder="Rate per display *" value={newAd.rate_per_display} onChange={(e) => setNewAd({ ...newAd, rate_per_display: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      <select value={newAd.currency} onChange={(e) => setNewAd({ ...newAd, currency: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="INR">INR</option><option value="KES">KES</option>
                      </select>
                    </div>
                    <div className="flex space-x-3 mt-3">
                      <button onClick={handleAddAd} disabled={uploadingVideo} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">{uploadingVideo ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Uploading...</span></> : <><Save className="w-4 h-4" /><span>Save</span></>}</button>
                      <button onClick={() => { setIsAddingAd(false); setNewAd({ title: '', description: '', video_url: '', video_type: 'url', video_file: null, brand_name: '', rate_per_display: '0.00', currency: 'USD' }); }} className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"><X className="w-4 h-4" /><span>Cancel</span></button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {advertisements.map((ad) => (
                    <div key={ad.id} className={`p-4 rounded-xl border-2 transition-all ${ad.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'}`}>
                      {editingAd === ad.id ? (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <input type="text" placeholder="Brand name" value={editAd.brand_name} onChange={(e) => setEditAd({ ...editAd, brand_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            <input type="text" placeholder="Ad title" value={editAd.title} onChange={(e) => setEditAd({ ...editAd, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                          </div>
                          {editAd.video_type === 'url' ? (
                            <input type="url" placeholder="Video URL" value={editAd.video_url} onChange={(e) => setEditAd({ ...editAd, video_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 mb-2">
                              <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={(e) => { const file = e.target.files?.[0]; if (file) setEditAd({ ...editAd, video_file: file }); }} className="hidden" id={`edit-video-${ad.id}`} />
                              <label htmlFor={`edit-video-${ad.id}`} className="cursor-pointer"><Video className="w-6 h-6 text-gray-400 inline mr-2" />{editAd.video_file ? editAd.video_file.name : 'Click to select video'}</label>
                            </div>
                          )}
                          <textarea placeholder="Description" value={editAd.description} onChange={(e) => setEditAd({ ...editAd, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <input type="number" step="0.01" min="0" value={editAd.rate_per_display} onChange={(e) => setEditAd({ ...editAd, rate_per_display: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                            <select value={editAd.currency} onChange={(e) => setEditAd({ ...editAd, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                              <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="INR">INR</option><option value="KES">KES</option>
                            </select>
                          </div>
                          <div className="flex space-x-2">
                            <button onClick={() => handleUpdateAd(ad.id)} disabled={uploadingVideo} className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"><Save className="w-4 h-4" /><span>Save</span></button>
                            <button onClick={() => setEditingAd(null)} className="flex items-center space-x-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium"><X className="w-4 h-4" /><span>Cancel</span></button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Video className="w-5 h-5 text-blue-600" />
                              <div><h3 className="font-semibold text-gray-900">{ad.title}</h3><p className="text-xs text-gray-500">Brand: {ad.brand_name}</p></div>
                            </div>
                            {ad.description && <p className="text-sm text-gray-600 mb-2">{ad.description}</p>}
                            <a href={ad.video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all">{ad.video_url}</a>
                            <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div><p className="text-gray-600 text-xs">Displays</p><p className="font-semibold text-gray-900">{adImpressions[ad.id] || 0}</p></div>
                                <div><p className="text-gray-600 text-xs">Rate</p><p className="font-semibold text-gray-900">{ad.currency} {ad.rate_per_display.toFixed(2)}</p></div>
                                <div><p className="text-gray-600 text-xs">Revenue</p><p className="font-semibold text-green-600">{ad.currency} {((adImpressions[ad.id] || 0) * ad.rate_per_display).toFixed(2)}</p></div>
                                <div><p className="text-gray-600 text-xs">Created</p><p className="font-semibold text-gray-900">{new Date(ad.created_at).toLocaleDateString()}</p></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button onClick={() => handleToggleAdActive(ad.id, ad.is_active)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${ad.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{ad.is_active ? 'Active' : 'Inactive'}</button>
                            <button onClick={() => startEditingAd(ad)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteAd(ad.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {advertisements.length === 0 && (
                    <div className="text-center py-12 text-gray-500"><Video className="w-12 h-12 mx-auto mb-3 text-gray-400" /><p className="font-medium">No advertisements yet</p><p className="text-sm">Add your first ad to get started</p></div>
                  )}
                </div>
              </>
            )}

            {selectedTab === 'users' && (
              <div>
                <p className="text-sm text-gray-600 mb-4">Control ad visibility for individual users.</p>
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{u.name}</h3>
                        <p className="text-sm text-gray-600">{u.email || u.phone} • {u.role}</p>
                        <p className="text-xs text-gray-500 mt-1">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => toggleAds(u.id, u.ads_enabled)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${u.ads_enabled ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}`}>
                        {u.ads_enabled ? <><Eye className="w-4 h-4" /><span>Ads On</span></> : <><EyeOff className="w-4 h-4" /><span>Ads Off</span></>}
                      </button>
                    </div>
                  ))}
                  {users.length === 0 && <div className="text-center py-8 text-gray-500"><p>No users found</p></div>}
                </div>
              </div>
            )}

            {selectedTab === 'logs' && <div className="-m-6"><ServiceLogsPage /></div>}
            {selectedTab === 'subscriptions' && <div className="-m-6"><SubscriptionManagementPage /></div>}
            {selectedTab === 'payments' && <PaymentApprovalsSection />}
            {selectedTab === 'plan_requests' && <PlanChangeRequestsSection />}
          </div>
        </div>
      </div>
    </div>

    {confirmAction && (
      <ConfirmModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />
    )}
    </>
  );
}