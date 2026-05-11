// Helper functions for common toast patterns

export const createToastHelpers = (toast: any) => ({
  // Email sent successfully
  emailSent: (email: string) => {
    toast.showSuccess(
      'Email Sent Successfully',
      `A confirmation email has been sent to ${email}`,
      5000
    );
  },

  // SMS sent successfully
  smsSent: (phone: string) => {
    toast.showSuccess(
      'SMS Sent Successfully',
      `A text message has been sent to ${phone}`,
      5000
    );
  },

  // Employee added
  employeeAdded: (name: string) => {
    toast.showSuccess(
      'Employee Added',
      `${name} has been successfully added to your team`,
      5000
    );
  },

  // Statement generated
  statementGenerated: () => {
    toast.showSuccess(
      'Statement Generated',
      'The statement has been created and sent successfully',
      5000
    );
  },

  // Loan closed
  loanClosed: () => {
    toast.showSuccess(
      'Loan Closed',
      'The loan has been successfully closed',
      5000
    );
  },

  // Payment processed
  paymentProcessed: (amount: number, currency: string = 'USD') => {
    toast.showSuccess(
      'Payment Processed',
      `Payment of ${currency} ${amount.toFixed(2)} has been processed successfully`,
      5000
    );
  },

  // Profile updated
  profileUpdated: () => {
    toast.showSuccess(
      'Profile Updated',
      'Your profile has been updated successfully',
      5000
    );
  },

  // Generic error
  genericError: (message?: string) => {
    toast.showError(
      'Error',
      message || 'Something went wrong. Please try again.',
      5000
    );
  },

  // Network error
  networkError: () => {
    toast.showError(
      'Network Error',
      'Unable to connect. Please check your internet connection.',
      5000
    );
  },

  // Unauthorized
  unauthorized: () => {
    toast.showError(
      'Unauthorized',
      'You do not have permission to perform this action',
      5000
    );
  },

  // Validation error
  validationError: (field: string) => {
    toast.showWarning(
      'Validation Error',
      `Please provide a valid ${field}`,
      4000
    );
  },

  // Item deleted
  itemDeleted: (itemName: string) => {
    toast.showSuccess(
      'Deleted',
      `${itemName} has been deleted successfully`,
      4000
    );
  },

  // Action confirmed
  actionConfirmed: (action: string) => {
    toast.showSuccess(
      'Confirmed',
      `${action} has been confirmed`,
      4000
    );
  },

  // Processing
  processing: (message: string = 'Processing your request...') => {
    toast.showInfo(
      'Processing',
      message,
      3000
    );
  }
});
