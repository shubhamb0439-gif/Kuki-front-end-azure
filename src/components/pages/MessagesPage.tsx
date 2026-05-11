import React, { useState, useEffect } from 'react';
import { MessageSquare, User, Mail, Phone, MapPin, Clock, CheckCircle, XCircle, FileText, Trash2, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { employees, profiles, attendance, wages, messages, admin } from '../../lib/api';
import { Header } from '../common/Header';
import { ConfirmModal } from '../common/ConfirmModal';

interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  status: string;
  message: string | null;
  created_at: string;
  job_postings: {
    title: string;
    profession: string;
    description: string;
  };
  applicant: {
    name: string;
    email: string;
    profile_photo?: string;
    profession?: string;
  };
  rating?: {
    average_rating: number;
    total_ratings: number;
  };
}

interface Statement {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
  recipient_name?: string;
  generator_name?: string;
}

interface MessagesPageProps {
  onReferFriend: () => void;
  onMessages: () => void;
}

export function MessagesPage({ onReferFriend, onMessages }: MessagesPageProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [employeeRatings, setEmployeeRatings] = useState<Record<string, { average: number; total: number }>>({});
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const handleMessagesNav = () => {
    window.location.hash = '#/messages';
  };

  const handleReferFriend = () => {
    toast.showInfo('Coming Soon', 'Refer a friend feature coming soon!');
  };

  useEffect(() => {
    if (user) {
      loadApplications();
      loadStatements();
    }
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;

    try {
      // Job applications are fetched via messages.jobs API
      // Employer-side applications endpoint not yet available; applications will be empty
      setApplications([]);
    } catch (error) {
      console.error('Error in loadApplications:', error);
    }
  };

  const loadProfilePhotos = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      const photos: Record<string, string> = {};
      await Promise.all(
        userIds.map(async (id) => {
          const { data } = await profiles.get(id);
          if (data?.profile_photo) {
            photos[id] = data.profile_photo;
          }
        })
      );
      setProfilePhotos(prev => ({ ...prev, ...photos }));
    } catch (error) {
      console.error('Error loading profile photos:', error);
    }
  };

  const loadEmployeeRatings = async (employeeIds: string[]) => {
    if (employeeIds.length === 0) return;

    try {
      const ratingsMap: Record<string, { average: number; total: number }> = {};
      await Promise.all(
        employeeIds.map(async (id) => {
          const { data } = await admin.ratings.listByEmployee(id);
          if (data && data.length > 0) {
            const sum = data.reduce((acc: number, r: any) => acc + r.rating, 0);
            ratingsMap[id] = { average: sum / data.length, total: data.length };
          } else {
            ratingsMap[id] = { average: 0, total: 0 };
          }
        })
      );
      setEmployeeRatings(prev => ({ ...prev, ...ratingsMap }));
    } catch (error) {
      console.error('Error loading employee ratings:', error);
    }
  };

  const loadStatements = async () => {
    if (!user) return;

    try {
      const { data, error } = await wages.statements.list({ user_id: user.id });

      if (error) {
        console.error('Error loading statements:', error);
        return;
      }

      if (data) {
        setStatements(data);
      }
    } catch (error) {
      console.error('Error in loadStatements:', error);
    }
  };

  const handleClearMessages = () => {
    if (!user) return;
    setConfirmAction({
      message: 'Are you sure you want to clear all messages? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          setStatements([]);
          setApplications([]);
          toast.showSuccess('Success', 'All messages cleared successfully!');
        } catch (error: any) {
          toast.showError('Error', 'Error clearing messages: ' + error.message);
        }
      }
    });
  };

  const subscribeToApplications = () => {
    if (!user) return;
    return () => {};
  };

  const subscribeToStatements = () => {
    if (!user) return;
    return () => {};
  };

  const handleUpdateStatus = async (applicationId: string, status: 'accepted' | 'rejected') => {
    toast.showError('Not Available', 'Application status update is not yet available');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const ProfilePhoto = ({ name, photo }: { name: string; photo?: string }) => {
    if (photo) {
      return (
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-emerald-400 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold text-lg">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <>
    <div className="flex-1 bg-gray-50 pb-20">
      <Header
        onReferFriend={onReferFriend}
        onMessages={onMessages}
        unreadCount={pendingApplications.length}
      />
      <div className="max-w-md mx-auto bg-white min-h-screen pt-[75px]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            {(applications.length > 0 || statements.length > 0) && (
              <button
                onClick={handleClearMessages}
                className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {applications.length === 0 && statements.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">Applications and statements will appear here</p>
            </div>
          ) : (
            <>
              {/* Statements Section */}
              {statements.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Statements ({statements.length})
                  </h2>
                  <div className="space-y-3">
                    {statements.map((statement) => (
                      <div
                        key={statement.id}
                        className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedStatement(statement)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-12 h-12 mr-3 rounded-full flex items-center justify-center bg-blue-500">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                Statement
                              </h3>
                              <p className="text-sm text-gray-600">
                                Statement from KUKI System
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeAgo(statement.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Applications */}
              {pendingApplications.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Pending Applications ({pendingApplications.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingApplications.map((application) => (
                      <div
                        key={application.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-12 h-12 mr-3">
                              <ProfilePhoto
                                name={application.applicant?.name || 'Unknown'}
                                photo={profilePhotos[application.applicant_id]}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{application.applicant?.name || 'Unknown'}</h3>
                              <p className="text-sm text-gray-600">{application.job_postings?.title || 'Job posting unavailable'}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeAgo(application.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewed Applications */}
              {reviewedApplications.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Reviewed ({reviewedApplications.length})
                  </h2>
                  <div className="space-y-3">
                    {reviewedApplications.map((application) => (
                      <div
                        key={application.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="w-12 h-12 mr-3">
                              <ProfilePhoto
                                name={application.applicant?.name || 'Unknown'}
                                photo={profilePhotos[application.applicant_id]}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{application.applicant?.name || 'Unknown'}</h3>
                              <p className="text-sm text-gray-600">{application.job_postings?.title || 'Job posting unavailable'}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeAgo(application.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Statement Detail Modal */}
        {selectedStatement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 pb-24 z-50 overflow-hidden">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden flex-1 p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    Statement Personnel
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Generated Statement
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">Statement Content</p>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono break-words max-w-full overflow-hidden">{selectedStatement.message}</pre>
                  </div>

                  <div className="flex items-center text-gray-700">
                    <Clock className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Generated</p>
                      <p className="text-sm">{getTimeAgo(selectedStatement.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-4 border-t border-gray-100 bg-white shrink-0">
                <button
                  onClick={() => setSelectedStatement(null)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Application Detail Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4">
                  <ProfilePhoto
                    name={selectedApplication.applicant?.name || 'Unknown'}
                    photo={profilePhotos[selectedApplication.applicant_id]}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {selectedApplication.applicant?.name || 'Unknown'}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Applied for {selectedApplication.job_postings?.title || 'Job posting unavailable'}
                </p>
                {employeeRatings[selectedApplication.applicant_id] && (
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(employeeRatings[selectedApplication.applicant_id].average)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {employeeRatings[selectedApplication.applicant_id].average.toFixed(1)}
                      ({employeeRatings[selectedApplication.applicant_id].total} {employeeRatings[selectedApplication.applicant_id].total === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                )}
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                  {selectedApplication.status}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center text-gray-700">
                  <Mail className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm">{selectedApplication.applicant?.email || 'Not available'}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <User className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Profession</p>
                    <p className="text-sm">{selectedApplication.applicant?.profession || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-700">
                  <Clock className="w-5 h-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Applied</p>
                    <p className="text-sm">{getTimeAgo(selectedApplication.created_at)}</p>
                  </div>
                </div>

                {selectedApplication.message && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">Message from applicant</p>
                    <p className="text-sm text-gray-700">{selectedApplication.message}</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                {selectedApplication.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'accepted')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Accept</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {confirmAction && (
      <ConfirmModal
        message={confirmAction.message}
        onConfirm={confirmAction.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    )}
    </>
  );
}
