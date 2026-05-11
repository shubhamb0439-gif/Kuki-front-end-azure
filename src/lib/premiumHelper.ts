// supabase removed - using api.ts

export const checkPremiumAccess = async (userId: string): Promise<boolean> => {
  // First check if user has direct premium access
  const { data } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_status, subscription_expires_at')
    .eq('id', userId)
    .maybeSingle();

  if (!data) return false;

  // Check direct premium access
  if (data.subscription_plan && ['silver', 'gold'].includes(data.subscription_plan)) {
    if (data.subscription_status === 'active') {
      // Check expiry if exists
      if (data.subscription_expires_at) {
        const expiryDate = new Date(data.subscription_expires_at);
        const now = new Date();
        if (expiryDate > now) {
          return true;
        }
      } else {
        return true;
      }
    }
  }

  // Check if user has premium access through linked accounts
  const { data: linkedData } = await supabase
    .rpc('check_premium_access_with_links', { user_id: userId });

  return linkedData === true;
};

export const getDeviceSharingLimit = (tier: string): number => {
  switch (tier) {
    case 'bronze':
      return 2;
    case 'silver':
      return 5;
    case 'gold':
      return 999;
    default:
      return 1;
  }
};
