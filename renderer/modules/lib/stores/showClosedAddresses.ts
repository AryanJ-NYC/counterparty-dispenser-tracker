import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Store from 'electron-store';

const key = 'showClosedDispensers';
const store = new Store({ name: 'ui' });

const getShowClosedDispensers = (): boolean => {
  const showClosedDispensers = store.get(key, true);
  return showClosedDispensers as boolean;
};

export const useShowClosedDispensers = () => {
  const queryClient = useQueryClient();
  const { data: showClosedDispensers } = useQuery([key], getShowClosedDispensers, {
    initialData: getShowClosedDispensers() ?? true,
    staleTime: 30 * 60 * 1_000,
  });

  const mutation = useMutation(
    // @ts-expect-error
    (showClosedDispensers: boolean) => {
      store.set(key, showClosedDispensers);
      return showClosedDispensers;
    },
    {
      onSuccess: (showClosedDispensers: boolean) =>
        queryClient.setQueryData([key], showClosedDispensers),
    }
  );

  return [showClosedDispensers, mutation.mutate] as const;
};
