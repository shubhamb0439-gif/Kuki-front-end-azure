import React, { useState, useEffect } from 'react';
import { Users, Crown, Link as LinkIcon, X, Check, UserPlus, Copy, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { Header } from '../common/Header';
import { getPlanDisplayName } from '../../lib/subscriptionHelper';
import { supabase } from '../../lib/supabase';

interface LinkedAccount {
  id: string;
  primary_account_id: string;
  linked_account_id: string;
  link_type: string;
  status: string;
  referral_code: string;
  shares_subscription: boolean;
  access_type: string;
  created_at: string;
  accepted_at: string | null;
  primary_account?: {
    name: string;
    profile_photo: string | null;
    subscription_plan: string;
  };
  linked_account?: {
    name: string;
    profile_photo: string | null;
  };
}

export function LinkedAccountsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<'read_only' | 'read_write'>('read_only');
  const [referralLink, setReferralLink] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGoldOrPlus, setIsGoldOrPlus] = useState(false);
  const [joiningAccount, setJoiningAccount] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const { hasToasts } = toast;

  useEffect(() => {
    if (user) {
      checkSubscriptionTier();
      loadLinkedAccounts();
    }
  }, [user]);

  const checkSubscriptionTier = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsGoldOrPlus(['pro_plus'].includes(data.subscription_plan || ''));
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const loadLinkedAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('account_links')
        .select(`
          *,
          primary_account:profiles!account_links_primary_account_id_fkey(name, profile_photo, subscription_plan),
          linked_account:profiles!account_links_linked_account_id_fkey(name, profile_photo)
        `)
        .or(`primary_account_id.eq.${user.id},linked_account_id.eq.${user.id}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLinkedAccounts(data as any);
      }
    } catch (error) {
      console.error('Error loading linked accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = () => {
    if (!isGoldOrPlus) {
      toast.showWarning('Upgrade Required', 'Only PRO PLUS subscribers can create account links. Please upgrade your subscription to PRO PLUS.');
      return;
    }
    setShowPermissionModal(true);
  };

  const generateInviteLink = async () => {
    if (!user) return;

    try {
      const linkToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase
        .rpc('generate_referral_code', { user_id: user.id });

      if (error) throw error;

      const code = data as string;
      const { error: insertError } = await supabase
        .from('account_links')
        .insert({
          primary_account_id: user.id,
          link_type: 'family',
          status: 'pending',
          referral_code: code,
          link_token: linkToken,
          access_type: selectedPermission,
          shares_subscription: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (insertError) throw insertError;

      const link = linkToken;
      setReferralLink(link);
      setShowPermissionModal(false);
      setShowInviteModal(true);
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast.showError('Error', 'Failed to generate invite link');
    }
  };

  const joinWithCode = async () => {
    if (!user || !joinCode.trim()) {
      toast.showWarning('Missing Code', 'Please enter a valid link code');
      return;
    }

    if (joiningAccount) return;
    setJoiningAccount(true);

    try {
      const { data: linkData, error: findError } = await supabase
        .from('account_links')
        .select('*, primary_account:profiles!account_links_primary_account_id_fkey(name, subscription_plan)')
        .eq('link_token', joinCode.trim())
        .eq('status', 'pending')
        .maybeSingle();

      if (findError || !linkData) {
        toast.showError('Invalid Code', 'Invalid or expired link code');
        setJoiningAccount(false);
        return;
      }

      if (new Date(linkData.expires_at) < new Date()) {
        toast.showWarning('Link Expired', 'This link has expired');
        setJoiningAccount(false);
        return;
      }

      if (linkData.primary_account_id === user.id) {
        toast.showWarning('Invalid Action', 'You cannot link to your own account');
        setJoiningAccount(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('account_links')
        .update({
          linked_account_id: user.id,
          status: 'active',
          accepted_at: new Date().toISOString()
        })
        .eq('link_token', joinCode.trim());

      if (updateError) throw updateError;

      toast.showSuccess('Success', 'Successfully linked to account!');
      setShowJoinModal(false);
      setJoinCode('');
      loadLinkedAccounts();
    } catch (error) {
      console.error('Error joining with code:', error);
      toast.showError('Error', 'Failed to link account');
    } finally {
      setJoiningAccount(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelLink = (linkId: string) => {
    setConfirmAction({
      message: 'Are you sure you want to remove this linked account?',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const { error } = await supabase
            .from('account_links')
            .delete()
            .eq('id', linkId);
          if (error) throw error;
          loadLinkedAccounts();
        } catch (error) {
          console.error('Error removing linked account:', error);
          toast.showError('Error', 'Failed to remove linked account');
        }
      }
    });
  };

  const handleAcceptLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('account_links')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString()
        })
        .eq('id', linkId);

      if (error) throw error;

      loadLinkedAccounts();
    } catch (error) {
      console.error('Error accepting link:', error);
      toast.showError('Error', 'Failed to accept link');
    }
  };

  const handleRejectLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('account_links')
        .update({ status: 'rejected' })
        .eq('id', linkId);

      if (error) throw error;

      loadLinkedAccounts();
    } catch (error) {
      console.error('Error rejecting link:', error);
      toast.showError('Error', 'Failed to reject link');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rejected</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onReferFriend={() => {}}
        onMessages={() => window.location.hash = '#/messages'}
      />

      <div className="max-w-4xl mx-auto px-4 py-8" style={{ paddingTop: 'calc(75px + env(safe-area-inset-top))', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Linked Accounts</h1>
                <p className="text-sm text-gray-600">Share your subscription with family & friends</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <LinkIcon className="w-5 h-5" />
              Join
            </button>
            <button
              onClick={handleGenerateLink}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
                isGoldOrPlus
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!isGoldOrPlus}
            >
              <UserPlus className="w-5 h-5" />
              Create Link
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              How Account Linking Works
            </h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900 mb-2">To Share Your Account (Pro/Pro Plus Only):</p>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600">1.</span>
                    <span>Click "Create Link" and set permissions (Read Only or Read & Write)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600">2.</span>
                    <span>Share the generated code with the person you want to link</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600">3.</span>
                    <span>They use the code to link to your account</span>
                  </li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">To Join Another Account:</p>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600">1.</span>
                    <span>Click "Join" button</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600">2.</span>
                    <span>Enter the link code shared with you</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-blue-600">3.</span>
                    <span>Your account will be linked and you can access their data based on permissions</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {!isGoldOrPlus && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">Upgrade to PRO or PRO PLUS</p>
                  <p className="text-sm text-gray-700">Only PRO and PRO PLUS subscribers can create account links and share their subscription</p>
                </div>
              </div>
            </div>
          )}

          {isGoldOrPlus && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-gray-900">{user?.subscription_plan === 'pro_plus' ? 'Pro Plus Account' : 'Pro Account'}</p>
                  <p className="text-sm text-gray-700">You can create links to share your account with others!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : linkedAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Linked Accounts</h3>
            <p className="text-gray-600 mb-6">
              {isGoldOrPlus
                ? 'Create a link to share your account or join another account'
                : 'Join another account using their link code'
              }
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center gap-2"
              >
                <LinkIcon className="w-5 h-5" />
                Join Account
              </button>
              {isGoldOrPlus && (
                <button
                  onClick={handleGenerateLink}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Create Link
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {linkedAccounts.map((link) => {
              const isPrimary = link.primary_account_id === user?.id;
              const displayAccount = isPrimary ? link.linked_account : link.primary_account;
              const displayName = displayAccount?.name || 'Unknown User';

              return (
                <div key={link.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-lg">
                        {displayAccount?.profile_photo ? (
                          <img src={displayAccount.profile_photo} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-xl">{displayName[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
                        <p className="text-sm text-gray-500 mb-1">
                          {isPrimary ? 'You invited this person' : 'This person invited you'}
                        </p>
                        {isPrimary && link.primary_account?.subscription_plan && (
                          <p className="text-xs text-gray-600 mb-1">
                            Sharing: {getPlanDisplayName(link.primary_account.subscription_plan)} Plan
                          </p>
                        )}
                        {!isPrimary && link.primary_account?.subscription_plan && (
                          <p className="text-xs text-green-600 font-medium mb-1">
                            You have access to: {getPlanDisplayName(link.primary_account.subscription_plan)} Plan
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap mt-1">
                          {link.shares_subscription && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              Subscription shared
                            </span>
                          )}
                          {link.access_type && (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {link.access_type === 'read_only' ? 'Can view data' : 'Can view & edit data'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(link.status)}

                      {link.status === 'pending' && link.linked_account_id === user?.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptLink(link.id)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Accept"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectLink(link.id)}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Reject"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      )}

                      {(link.status === 'active' || (link.status === 'pending' && isPrimary)) && (
                        <button
                          onClick={() => handleCancelLink(link.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Set Permissions</h2>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">Choose what the linked account can do:</p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedPermission('read_only')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPermission === 'read_only'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPermission === 'read_only' ? 'border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedPermission === 'read_only' && (
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Read Only</p>
                    <p className="text-sm text-gray-600">Can view data but cannot make changes</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPermission('read_write')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPermission === 'read_write'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPermission === 'read_write' ? 'border-blue-600' : 'border-gray-300'
                  }`}>
                    {selectedPermission === 'read_write' && (
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Read & Write</p>
                    <p className="text-sm text-gray-600">Can view and modify data</p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={generateInviteLink}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Generate Link
            </button>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Link Code Created</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">Share this code with the person you want to link:</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-xl text-gray-900 break-all font-mono text-center tracking-wider">{referralLink}</p>
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                Permission: <span className="font-semibold">{selectedPermission === 'read_only' ? 'Read Only' : 'Read & Write'}</span>
              </p>
              <p className="text-sm text-blue-800 mt-1">
                This code expires in 7 days.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                The person should go to their Linked Accounts page and click "Join" to enter this code.
              </p>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Join Account</h2>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">Enter the link code shared with you:</p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter code here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-center tracking-wider"
              />
            </div>

            <button
              onClick={joinWithCode}
              disabled={!joinCode.trim() || joiningAccount || hasToasts}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {joiningAccount ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Link Account'
              )}
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                You will be able to access the primary account's data based on the permissions they set.
              </p>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
