import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/session';
import { loadAlerts } from './alertView';

export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: () => loadAlerts(api), refetchInterval: 30_000 });
}
