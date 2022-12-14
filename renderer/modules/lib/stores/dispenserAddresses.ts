import Store from 'electron-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const key = 'dispenserAddresses';
const store = new Store({ name: 'dispenser-addresses' });

const getDispenserAddresses = (): string[] => {
  const _dispenserAddresses = store.get(key, [] as string[]);
  return _dispenserAddresses as string[];
};

export const useDispenserAddresses = () => {
  const queryClient = useQueryClient();
  const { data: dispenserAddresses } = useQuery([key], getDispenserAddresses, {
    initialData: getDispenserAddresses() ?? [],
    staleTime: 30 * 60 * 1_000,
  });

  const mutation = useMutation(
    // @ts-expect-error
    (_dispAddresses: string[]) => {
      store.set(key, _dispAddresses);
      return _dispAddresses;
    },
    { onSuccess: (_dispAddresses: string[]) => queryClient.setQueryData([key], _dispAddresses) }
  );

  return [dispenserAddresses, mutation.mutate] as const;
};
