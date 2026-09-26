import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { IS_MOCK_API } from '@/lib/api/config';
import { request } from '@/lib/api/client';
import { jobsApi } from '@/lib/api/jobs';
import type { ChatMessage, DriverJob, JobOffer, VerifyStopInput } from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';

export function useOffers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.offers,
    queryFn: ({ signal }) => jobsApi.getOffers(signal),
    enabled,
    // The socket pushes offers; polling is the safety net if a frame is lost.
    refetchInterval: enabled ? 20_000 : false,
  });
}

export function useActiveJob() {
  return useQuery({
    queryKey: queryKeys.activeJob,
    queryFn: ({ signal }) => jobsApi.getActiveJob(signal),
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.job(id ?? ''),
    queryFn: ({ signal }) => jobsApi.getJob(id!, signal),
    enabled: Boolean(id),
  });
}

/** Stores an authoritative job in the detail and active-job caches. */
export function useCacheJob() {
  const queryClient = useQueryClient();
  return (job: DriverJob) => {
    queryClient.setQueryData(queryKeys.job(job.id), job);
    const isActive = job.status !== 'delivered' && job.status !== 'cancelled';
    queryClient.setQueryData(queryKeys.activeJob, isActive ? job : null);
    if (!isActive) {
      queryClient.invalidateQueries({ queryKey: queryKeys.trips });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: ['driver', 'earnings'] });
    }
  };
}

function removeOffer(queryClient: ReturnType<typeof useQueryClient>, offerId: string) {
  queryClient.setQueryData<JobOffer[]>(queryKeys.offers, (offers) =>
    offers?.filter((o) => o.id !== offerId),
  );
}

export function useAcceptOffer() {
  const queryClient = useQueryClient();
  const cacheJob = useCacheJob();
  return useMutation({
    mutationFn: (offerId: string) => jobsApi.acceptOffer(offerId),
    onSuccess: (job, offerId) => {
      removeOffer(queryClient, offerId);
      cacheJob(job);
    },
    onError: (_error, offerId) => removeOffer(queryClient, offerId),
  });
}

export function useRejectOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason: string }) =>
      jobsApi.rejectOffer(offerId, reason),
    onMutate: ({ offerId }) => removeOffer(queryClient, offerId),
  });
}

function useJobMutation<TInput>(mutationFn: (input: TInput) => Promise<DriverJob>) {
  const cacheJob = useCacheJob();
  return useMutation({ mutationFn, onSuccess: cacheJob });
}

export function useArriveAtPickup() {
  return useJobMutation((id: string) => jobsApi.arriveAtPickup(id));
}

export function useVerifyPickup() {
  return useJobMutation(({ id, ...input }: VerifyStopInput & { id: string }) =>
    jobsApi.verifyPickup(id, input),
  );
}

export function useArriveAtDrop() {
  return useJobMutation((id: string) => jobsApi.arriveAtDrop(id));
}

export function useVerifyDrop() {
  return useJobMutation(({ id, ...input }: VerifyStopInput & { id: string }) =>
    jobsApi.verifyDrop(id, input),
  );
}

export function useCancelJob() {
  return useJobMutation(({ id, reason }: { id: string; reason: string }) =>
    jobsApi.cancel(id, reason),
  );
}

export function useCollectCash() {
  return useJobMutation((id: string) => jobsApi.collectCash(id));
}

export function usePaymentQr(jobId: string | undefined) {
  return useQuery({
    queryKey: ['driver', 'jobs', jobId ?? '', 'payment-qr'],
    queryFn: () => jobsApi.createPaymentQr(jobId!),
    enabled: Boolean(jobId),
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useMessages(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages(jobId ?? ''),
    queryFn: ({ signal }) => jobsApi.getMessages(jobId!, signal),
    enabled: Boolean(jobId),
  });
}

export function useSendMessage(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => jobsApi.sendMessage(jobId, text),
    onSuccess: (message) =>
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(jobId), (list) =>
        list ? [...list, message] : [message],
      ),
  });
}

export function useMarkMessagesRead(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobsApi.markMessagesRead(jobId!),
    onSuccess: () => {
      queryClient.setQueryData<DriverJob | null>(queryKeys.activeJob, (job) =>
        job ? { ...job, unreadMessages: 0 } : job,
      );
    },
  });
}

/**
 * Demo-only: the OTPs the sender/receiver would read in the customer app.
 * Disabled against a real backend, which never exposes them to drivers.
 */
export function useDemoOtps(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.demoOtps(jobId ?? ''),
    queryFn: () =>
      request<{ pickupOtp: string; deliveryOtp: string }>({ url: `/dev/jobs/${jobId}/otps` }),
    enabled: IS_MOCK_API && __DEV__ && Boolean(jobId),
    staleTime: Infinity,
  });
}
