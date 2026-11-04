import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';

import { jobsApi } from '@/lib/api/jobs';
import type { ChatMessage, DriverJob, JobOffer, VerifyStopInput } from '@/lib/api/models';
import { queryKeys } from '@/lib/queries/keys';
import {
  isOfferStreamLive,
  onOfferStreamLiveChange,
  subscribeToOfferStream,
} from '@/lib/realtime/offer-stream';

export function useOffers(enabled: boolean) {
  useEffect(() => (enabled ? subscribeToOfferStream() : undefined), [enabled]);
  const streamLive = useSyncExternalStore(onOfferStreamLiveChange, isOfferStreamLive);
  return useQuery({
    queryKey: queryKeys.offers,
    queryFn: ({ signal }) => jobsApi.getOffers(signal),
    enabled,
    // The offer stream pushes new offers at once; polling only backs it up. Without the stream,
    // poll fast: an offer lives ~30 s.
    refetchInterval: enabled ? (streamLive ? 30_000 : 4_000) : false,
    // The floating overlay shows offers while the app is in the background, so keep polling there.
    refetchIntervalInBackground: true,
  });
}

export function useActiveJob() {
  return useQuery({
    queryKey: queryKeys.activeJob,
    queryFn: ({ signal }) => jobsApi.getActiveJob(signal),
    // Picks up a customer cancellation or ops change while the driver is on the trip.
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
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

/** The trip just ended: drop it from Home now rather than at the next poll. */
export function useClearFinishedJob() {
  const queryClient = useQueryClient();
  return (jobId: string) => {
    queryClient.setQueryData(queryKeys.activeJob, null);
    queryClient.invalidateQueries({ queryKey: queryKeys.activeJob });
    // The summary screen needs the delivery time, which the cached job doesn't have yet.
    queryClient.invalidateQueries({ queryKey: queryKeys.job(jobId) });
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
  return useJobMutation((job: DriverJob) => jobsApi.collectCash(job));
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
