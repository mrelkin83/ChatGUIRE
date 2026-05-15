"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface TenantConfig {
  id: string;
  name: string;
  vertical: string;
  timezone: string;
  ai_model: string;
  ai_temperature: number;
  ai_max_tokens: number;
  isActive: boolean;
}

export function useTenantConfig(tenantId: string) {
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    async function fetchConfig() {
      try {
        const { data } = await api.get(`/api/tenants/${tenantId}`);
        setConfig(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tenant config');
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [tenantId]);

  return { config, loading, error };
}
