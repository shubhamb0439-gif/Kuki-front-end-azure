// supabase removed - using api.ts

export interface PaymentRequest {
  id: string;
  user_id: string;
  plan: 'free' | 'plus' | 'business' | 'premium';
  amount: number;
  payment_method: 'paisa_waise' | 'razorpay' | 'manual';
  payment_proof?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  notes?: string;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface PlanPricing {
  plan: 'free' | 'plus' | 'business' | 'premium';
  name: string;
  price: number;
  currency: string;
  features: string[];
  maxLinkedAccounts: number;
  hasAds: boolean;
}

export const PLAN_PRICING: Record<string, PlanPricing> = {
  free: {
    plan: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    features: ['Basic features', 'View ads'],
    maxLinkedAccounts: 0,
    hasAds: true
  },
  plus: {
    plan: 'plus',
    name: 'Plus',
    price: 4.99,
    currency: 'USD',
    features: ['All Free features', 'No ads', 'Priority support'],
    maxLinkedAccounts: 0,
    hasAds: false
  },
  business: {
    plan: 'business',
    name: 'Business',
    price: 9.99,
    currency: 'USD',
    features: ['All Plus features', 'Link up to 3 accounts', 'Advanced analytics'],
    maxLinkedAccounts: 3,
    hasAds: false
  },
  premium: {
    plan: 'premium',
    name: 'Premium',
    price: 14.99,
    currency: 'USD',
    features: ['All Business features', 'Unlimited account linking', 'Premium support'],
    maxLinkedAccounts: -1, // -1 means unlimited
    hasAds: false
  }
};

export function getPlanPrice(plan: string): number {
  return PLAN_PRICING[plan]?.price || 0;
}

export function getPlanName(plan: string): string {
  return PLAN_PRICING[plan]?.name || 'Unknown';
}

export async function createPaymentRequest(
  userId: string,
  plan: 'free' | 'plus' | 'business' | 'premium',
  paymentMethod: 'paisa_waise' | 'razorpay' | 'manual',
  paymentProof?: string
): Promise<{ success: boolean; error?: string; data?: PaymentRequest }> {
  try {
    const amount = getPlanPrice(plan);

    const { data, error } = await supabase
      .from('payment_requests')
      .insert({
        user_id: userId,
        plan,
        amount,
        payment_method: paymentMethod,
        payment_proof: paymentProof,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception creating payment request:', err);
    return { success: false, error: 'Failed to create payment request' };
  }
}

export async function getUserPaymentRequests(
  userId: string
): Promise<{ success: boolean; data?: PaymentRequest[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: 'Failed to fetch payment requests' };
  }
}

export async function getAllPendingPaymentRequests(): Promise<{
  success: boolean;
  data?: (PaymentRequest & { user_name?: string; user_email?: string })[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(`
        *,
        profiles:user_id (
          name,
          email
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const formattedData = data?.map((req: any) => ({
      ...req,
      user_name: req.profiles?.name,
      user_email: req.profiles?.email
    }));

    return { success: true, data: formattedData || [] };
  } catch (err) {
    return { success: false, error: 'Failed to fetch pending requests' };
  }
}

export async function approvePaymentRequest(
  requestId: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the payment request details
    const { data: request, error: fetchError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Payment request not found' };
    }

    // Update payment request to approved
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: adminId,
        notes: notes || 'Manual payment approved'
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update user's subscription plan
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: request.plan,
        is_manual_upgrade: request.payment_method === 'manual',
        manual_upgrade_note: notes || 'Manual payment approved',
        upgrade_highlighted: request.payment_method === 'manual',
        trial_ends_at: null, // Clear trial
        subscription_status: 'active',
        subscription_expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString() // 30 days from now
      })
      .eq('id', request.user_id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // Create subscription transaction record
    await admin.subscriptions.list(); // replaced: use API

    return { success: true };
  } catch (err) {
    console.error('Error approving payment:', err);
    return { success: false, error: 'Failed to approve payment' };
  }
}

export async function rejectPaymentRequest(
  requestId: string,
  adminId: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: adminId,
        rejection_reason: rejectionReason
      })
      .eq('id', requestId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to reject payment request' };
  }
}

// Payment Gateway Integration Helpers
export function initializePaisaWaise(config: { merchantId: string; apiKey: string }) {
  // Placeholder for Paisa Waise integration
  console.log('Paisa Waise initialized:', config);
}

export function initializeRazorpay(config: { keyId: string; keySecret: string }) {
  // Placeholder for Razorpay integration
  console.log('Razorpay initialized:', config);
}

export async function processOnlinePayment(
  gateway: 'paisa_waise' | 'razorpay',
  amount: number,
  userId: string,
  plan: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // This will be implemented with actual payment gateway SDKs
  // For now, return a placeholder
  return {
    success: false,
    error: 'Online payment integration coming soon. Please use manual payment.'
  };
}
