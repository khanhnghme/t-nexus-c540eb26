import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AddonType = 'projects' | 'storage' | 'members';

export interface UserAddon {
  addon_type: AddonType;
  quantity: number;
}

interface UseUserAddonsReturn {
  addons: UserAddon[];
  isLoading: boolean;
  getQuantity: (type: AddonType) => number;
  getBonus: (type: AddonType) => number;
  updateAddon: (type: AddonType, quantity: number) => Promise<void>;
  refresh: () => void;
}

const UNITS_PER_PACKAGE: Record<AddonType, number> = {
  projects: 5,
  storage: 5 * 1024, // 5 GB in MB
  members: 5,
};

export function useUserAddons(): UseUserAddonsReturn {
  const { user } = useAuth();
  const [addons, setAddons] = useState<UserAddon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAddons = useCallback(async () => {
    if (!user) {
      setAddons([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_addons')
        .select('addon_type, quantity')
        .eq('user_id', user.id);

      setAddons(
        (data || []).map(d => ({
          addon_type: d.addon_type as AddonType,
          quantity: d.quantity,
        }))
      );
    } catch (err) {
      console.warn('Error fetching addons:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const getQuantity = (type: AddonType) =>
    addons.find(a => a.addon_type === type)?.quantity ?? 0;

  const getBonus = (type: AddonType) =>
    getQuantity(type) * UNITS_PER_PACKAGE[type];

  const updateAddon = async (type: AddonType, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await supabase
        .from('user_addons')
        .delete()
        .eq('user_id', user.id)
        .eq('addon_type', type);
    } else {
      await supabase
        .from('user_addons')
        .upsert(
          { user_id: user.id, addon_type: type, quantity },
          { onConflict: 'user_id,addon_type' }
        );
    }

    await fetchAddons();
  };

  return {
    addons,
    isLoading,
    getQuantity,
    getBonus,
    updateAddon,
    refresh: fetchAddons,
  };
}
