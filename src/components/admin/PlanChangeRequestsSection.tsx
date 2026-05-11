import React, { useState, useEffect } from 'react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Check, X, Clock, ChevronRight, User, Calendar } from 'lucide-react';

interface PlanChangeRequest {
  id: string;
  user_id: string;
  current_plan: string;
  requested_plan: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  profile?: {
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export function PlanChangeRequestsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<PlanChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await admin.planChanges.list();
      if (!error && data) {
        // Enrich with profile data
        const enriched = await Promise.all(
          (data as any[]).map(async (req) => {
            const { data: profileData } = await profiles.get(req.user_id);
            return { ...req, profile: profileData || null };
          })
        );
        setRequests(enriched as any);
      }
    } catch (err) {
      console.error('Error loading plan change requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PlanChangeRequest) => {
    if (!user) return;
    setProcessingId(request.id);

    try {
      const planLimits: Record<string, number> = { free: 1, core: 3, pro: 6, pro_plus: 12 };
      const { error: profileError } = await profiles.update(request.user_id, {
        subscription_plan: request.requested_plan,
        max_employees: planLimits[request.requested_plan] ?? 1
      });
      if (profileError) throw new Error(profileError);

      const { error: requestError } = await admin.planChanges.update(request.id, {
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });
      if (requestError) throw new Error(requestError);

      loadRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      toast.showError('Approval Failed', 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: PlanChangeRequest) => {
    if (!user) return;
    setProcessingId(request.id);

    try {
      const { error } = await admin.planChanges.update(request.id, {
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });
      if (error) throw new Error(error);

      loadRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.showError('Rejection Failed', 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatPlanName = (plan: string) => {
    return plan.replace('_', ' ').toUpperCase();
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'text-gray-600 bg-gray-100';
      case 'core': return 'text-green-600 bg-green-100';
      case 'pro': return 'text-blue-600 bg-blue-100';
      case 'pro_plus': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredRequests = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Plan Change Requests
            {pendingCount > 0 && (
              <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                {pendingCount}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {filterStatus !== 'all' ? filterStatus : ''} plan change requests
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">
                        {request.profile?.name || 'Unknown User'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {request.profile?.email || request.profile?.phone}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${getPlanColor(request.current_plan)}`}>
                      {formatPlanName(request.current_plan)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${getPlanColor(request.requested_plan)}`}>
                      {formatPlanName(request.requested_plan)}
                    </span>
                  </div>

                  {request.reason && (
                    <p className="text-sm text-gray-600 mb-2 italic">
                      "{request.reason}"
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
