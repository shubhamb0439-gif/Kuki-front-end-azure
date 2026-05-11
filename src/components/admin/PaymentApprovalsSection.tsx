import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ExternalLink, User, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  getAllPendingPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
  PLAN_PRICING,
  PaymentRequest
} from '../../lib/paymentHelper';

interface PaymentRequestWithUser extends PaymentRequest {
  user_name?: string;
  user_email?: string;
}

export function PaymentApprovalsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<PaymentRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequestWithUser | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const result = await getAllPendingPaymentRequests();
    if (result.success && result.data) {
      setRequests(result.data);
    }
    setLoading(false);
  };

  const handleApproveClick = (request: PaymentRequestWithUser) => {
    setSelectedRequest(request);
    setAdminNotes('Manual payment approved');
    setShowApproveModal(true);
  };

  const handleRejectClick = (request: PaymentRequestWithUser) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;

    setProcessingId(selectedRequest.id);
    const result = await approvePaymentRequest(selectedRequest.id, user.id, adminNotes);

    if (result.success) {
      setShowApproveModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      loadRequests();
    } else {
      toast.showError('Approval Failed', result.error);
    }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!selectedRequest || !user || !rejectionReason.trim()) {
      toast.showWarning('Validation Error', 'Please provide a rejection reason');
      return;
    }

    setProcessingId(selectedRequest.id);
    const result = await rejectPaymentRequest(selectedRequest.id, user.id, rejectionReason);

    if (result.success) {
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadRequests();
    } else {
      toast.showError('Rejection Failed', result.error);
    }
    setProcessingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">All Caught Up!</h3>
        <p className="text-gray-600">No pending payment requests to review.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Payment Approvals</h2>
        <p className="text-gray-600">Review and approve manual payment requests from users</p>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white border-2 border-yellow-200 rounded-xl p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                {/* User Info */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {request.user_name || 'Unknown User'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {request.user_email || 'No email'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(request.requested_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Pending
              </span>
            </div>

            {/* Plan Details */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Requested Plan</h4>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {PLAN_PRICING[request.plan].name}
                  </span>
                  <span className="text-lg font-semibold text-gray-700">
                    ${request.amount.toFixed(2)}/mo
                  </span>
                </div>
                <div className="space-y-1">
                  {PLAN_PRICING[request.plan].features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">
                      Method: <span className="font-medium">{request.payment_method.replace('_', ' ').toUpperCase()}</span>
                    </span>
                  </div>
                  {request.payment_proof && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <a
                        href={request.payment_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View Payment Proof
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => handleApproveClick(request)}
                disabled={processingId === request.id}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve & Activate
              </button>
              <button
                onClick={() => handleRejectClick(request)}
                disabled={processingId === request.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Payment Request</h3>

            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                <strong>{selectedRequest.user_name}</strong> will be upgraded to <strong>{PLAN_PRICING[selectedRequest.plan].name}</strong> plan.
              </p>
              <p className="text-xs text-green-700">
                Subscription will be active for 30 days from approval.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={!!processingId}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-medium transition-colors"
              >
                {processingId ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Payment Request</h3>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 mb-1">
                  This will reject <strong>{selectedRequest.user_name}</strong>'s payment request.
                </p>
                <p className="text-xs text-red-700">
                  Please provide a clear reason for rejection.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Payment proof not clear, incorrect amount, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!processingId || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
              >
                {processingId ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
