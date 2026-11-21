import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/session';
import type { TanamRow } from './tanamView';

export function useTanam() {
  return useQuery({
    queryKey: ['tanam'],
    queryFn: async () => {
      const r = await api.get<{ list?: TanamRow[] }>('/tanam');
      if (!Array.isArray(r?.list)) throw new Error('Respons tanam tidak sesuai kontrak.');
      return r.list;
    },
  });
}
