// supabase removed - using api.ts
import { supabase } from './supabase';

export interface LinkedAccountInfo {
  id: string;
  isPrimary: boolean;
  accessType: 'read_only' | 'read_write';
  sharesSubscription: boolean;
}

export async function getLinkedAccountIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('account_links')
      .select('primary_account_id, linked_account_id')
      .or(`primary_account_id.eq.${userId},linked_account_id.eq.${userId}`)
      .eq('status', 'active');

    if (error || !data) return [userId];

    const linkedIds = new Set<string>([userId]);
    data.forEach(link => {
      linkedIds.add(link.primary_account_id);
      if (link.linked_account_id) {
        linkedIds.add(link.linked_account_id);
      }
    });

    return Array.from(linkedIds);
  } catch (error) {
    console.error('Error getting linked accounts:', error);
    return [userId];
  }
}

export async function getLinkedAccounts(userId: string): Promise<string[]> {
  return getLinkedAccountIds(userId);
}

export async function getLinkedAccountsWithPermissions(userId: string): Promise<Map<string, LinkedAccountInfo>> {
  try {
    const { data, error } = await supabase
      .from('account_links')
      .select('*')
      .or(`primary_account_id.eq.${userId},linked_account_id.eq.${userId}`)
      .eq('status', 'active');

    if (error || !data) {
      const selfMap = new Map<string, LinkedAccountInfo>();
      selfMap.set(userId, {
        id: userId,
        isPrimary: true,
        accessType: 'read_write',
        sharesSubscription: false
      });
      return selfMap;
    }

    const accountMap = new Map<string, LinkedAccountInfo>();

    accountMap.set(userId, {
      id: userId,
      isPrimary: true,
      accessType: 'read_write',
      sharesSubscription: false
    });

    data.forEach(link => {
      if (link.primary_account_id === userId && link.linked_account_id) {
        accountMap.set(link.linked_account_id, {
          id: link.linked_account_id,
          isPrimary: false,
          accessType: link.access_type,
          sharesSubscription: link.shares_subscription
        });
      } else if (link.linked_account_id === userId) {
        accountMap.set(link.primary_account_id, {
          id: link.primary_account_id,
          isPrimary: true,
          accessType: link.access_type,
          sharesSubscription: link.shares_subscription
        });
      }
    });

    return accountMap;
  } catch (error) {
    console.error('Error getting linked accounts with permissions:', error);
    const selfMap = new Map<string, LinkedAccountInfo>();
    selfMap.set(userId, {
      id: userId,
      isPrimary: true,
      accessType: 'read_write',
      sharesSubscription: false
    });
    return selfMap;
  }
}

export function canWrite(accountInfo: LinkedAccountInfo | undefined): boolean {
  if (!accountInfo) return false;
  return accountInfo.isPrimary || accountInfo.accessType === 'read_write';
}

export function canRead(accountInfo: LinkedAccountInfo | undefined): boolean {
  return !!accountInfo;
}

export async function hasAccessToAccount(currentUserId: string, targetAccountId: string): Promise<boolean> {
  if (currentUserId === targetAccountId) return true;

  try {
    const { data, error } = await supabase
      .from('account_links')
      .select('id')
      .or(`primary_account_id.eq.${currentUserId},linked_account_id.eq.${currentUserId}`)
      .or(`primary_account_id.eq.${targetAccountId},linked_account_id.eq.${targetAccountId}`)
      .eq('status', 'active')
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Error checking account access:', error);
    return false;
  }
}
