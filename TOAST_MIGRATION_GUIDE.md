# Toast Notification System - Migration Guide

## Overview

The app now uses a professional toast notification system instead of browser `alert()` popups. This provides a much better user experience with beautiful, non-blocking notifications.

## How to Use

### 1. Import the hook
```typescript
import { useToast } from '../../contexts/ToastContext';
```

### 2. Get toast functions in your component
```typescript
const { showSuccess, showError, showWarning, showInfo } = useToast();
```

### 3. Use toast notifications

#### Success Messages
```typescript
showSuccess('Title', 'Optional description message', 5000);
// Example:
showSuccess('Email Sent', 'Your invitation has been sent successfully!');
```

#### Error Messages
```typescript
showError('Title', 'Optional description message', 5000);
// Example:
showError('Upload Failed', 'The file size is too large');
```

#### Warning Messages
```typescript
showWarning('Title', 'Optional description message', 5000);
// Example:
showWarning('Invalid Input', 'Please enter a valid email address');
```

#### Info Messages
```typescript
showInfo('Title', 'Optional description message', 5000);
// Example:
showInfo('Processing', 'Your request is being processed...');
```

## Features

- **Non-blocking**: Toasts appear in the top-right corner and don't interrupt the user
- **Auto-dismiss**: Automatically disappear after the specified duration (default 5000ms)
- **Manual dismiss**: Users can click the X button to dismiss immediately
- **Beautiful animations**: Smooth slide-in and fade-out effects
- **Color-coded**: Each type has a distinct color scheme for quick recognition
  - Success: Green
  - Error: Red
  - Warning: Amber
  - Info: Blue
- **Stacking**: Multiple toasts stack vertically
- **Long messages**: Automatically wraps long text

## Migration Examples

### Before (Alert)
```typescript
alert('Employee added successfully!');
```

### After (Toast)
```typescript
showSuccess('Employee Added', 'The employee has been added to your team');
```

---

### Before (Alert with error)
```typescript
alert('Error: ' + error.message);
```

### After (Toast)
```typescript
showError('Error', error.message);
```

---

### Before (Multi-line alert)
```typescript
alert(`Email sent to ${email}!\n\nA confirmation has been sent.`);
```

### After (Toast)
```typescript
showSuccess(
  `Email sent to ${email}`,
  'A confirmation has been sent.',
  6000
);
```

## Files Already Updated

The following files have been updated to use the new toast system:

1. ✅ `/src/components/common/ReferFriendModal.tsx` - Referral invitations (email/SMS)
2. ✅ `/src/components/employer/EmployerHome.tsx` - QR transactions, attendance, subscriptions
3. ✅ `/src/components/employee/EmployeeHome.tsx` - QR scanning, attendance, transactions
4. ✅ `/src/components/employer/EmployeeProfileModal.tsx` - Loans, bonuses, advances, wages, foreclosures

## Remaining Files to Update

The following files still use `alert()` and should be migrated:

- `/src/components/admin/PlanChangeRequestsSection.tsx`
- `/src/components/admin/PaymentApprovalsSection.tsx`
- `/src/components/common/PaymentSelectionModal.tsx`
- `/src/components/common/UpgradeToPlusModal.tsx`
- `/src/components/pages/AdminDashboard.tsx`
- `/src/components/pages/CalendarPage.tsx`
- `/src/components/pages/EditProfilePage.tsx`
- `/src/components/pages/EmployeeAttendancePage.tsx`
- `/src/components/pages/LinkedAccountsPage.tsx`
- `/src/components/pages/ManageEmployeesPage.tsx`
- `/src/components/pages/MessagesPage.tsx`
- `/src/components/pages/ProfessionSelectionPage.tsx`
- `/src/components/pages/RatingPage.tsx`
- `/src/components/pages/SearchPage.tsx`
- `/src/components/pages/SubscriptionManagementPage.tsx`
- `/src/components/pages/UpgradePlanPage.tsx`
- `/src/components/pages/WagesPage.tsx`

## Helper Functions

Use the helper functions in `/src/lib/toastHelper.ts` for common patterns:

```typescript
import { useToast } from '../../contexts/ToastContext';
import { createToastHelpers } from '../../lib/toastHelper';

const toast = useToast();
const helpers = createToastHelpers(toast);

// Quick common notifications
helpers.emailSent('user@example.com');
helpers.employeeAdded('John Doe');
helpers.statementGenerated();
helpers.loanClosed();
helpers.profileUpdated();
// etc.
```

## Best Practices

1. **Keep titles short**: 2-4 words maximum
2. **Make messages actionable**: Tell users what happened and what's next (if applicable)
3. **Use appropriate types**: Success for confirmations, Error for failures, Warning for cautions, Info for neutral updates
4. **Adjust duration for message length**: Longer messages need more time (6000-8000ms)
5. **Don't overuse**: Only show toasts for important events that require user awareness
