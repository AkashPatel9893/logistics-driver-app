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

/*
 * Polling rules: only the signed-in session (DriverSession in the tabs layout) polls offers and
 * the active job, so one timer runs however many screens read them. Screens pass nothing and just
 * read the cache, which server pushes (offer.new, job.updated) keep current.
 */
/** Offer stream connected: polling only backs it up. */
const OFFERS_BACKUP_POLL_MS = 30_000;
/** Offer stream down: an offer lives ~30 s, so check often. */
const OFFERS_NO_STREAM_POLL_MS = 4_000;
/** On a trip: job.updated pushes changes; this catches a missed push (customer cancel, ops change). */
const ACTIVE_JOB_ON_TRIP_POLL_MS = 30_000;
/** No trip: new jobs arrive as offers, so a slow check is enough. */
const ACTIVE_JOB_IDLE_POLL_MS = 60_000;

export function useOffers(enabled: boolean, { poll = false }: { poll?: boolean } = {}) {
  useEffect(() => (enabled ? subscribeToOfferStream() : undefined), [enabled]);
  const streamLive = useSyncExternalStore(onOfferStreamLiveChange, isOfferStreamLive);
  const polling = enabled && poll;
  return useQuery({
    queryKey: queryKeys.offers,
    queryFn: ({ signal }) => jobsApi.getOffers(signal),
    enabled,
    refetchInterval: polling
      ? streamLive
        ? OFFERS_BACKUP_POLL_MS
        : OFFERS_NO_STREAM_POLL_MS
      : false,
    // The floating overlay shows offers while the app is in the background, so keep polling there.
    refetchIntervalInBackground: polling,
  });
}

export function useActiveJob({ poll = false }: { poll?: boolean } = {}) {
  const queryClient = useQueryClient();
  const onTrip = Boolean(queryClient.getQueryData(queryKeys.activeJob));
  return useQuery({
    queryKey: queryKeys.activeJob,
    queryFn: ({ signal }) => jobsApi.getActiveJob(signal),
    refetchInterval: poll ? (onTrip ? ACTIVE_JOB_ON_TRIP_POLL_MS : ACTIVE_JOB_IDLE_POLL_MS) : false,
    // Keep checking in the background only during a trip, when a cancellation matters.
    refetchIntervalInBackground: poll && onTrip,
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
    if (!isActive) invalidateTripTotals(queryClient);
  };
}

/** A finished trip changes the trip count, earnings and wallet balance shown on Home. */
function invalidateTripTotals(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.trips });
  queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  queryClient.invalidateQueries({ queryKey: ['driver', 'earnings'] });
}

/** The trip just ended: drop it from Home now rather than at the next poll. */
export function useClearFinishedJob() {
  const queryClient = useQueryClient();
  return (jobId: string) => {
    queryClient.setQueryData(queryKeys.activeJob, null);
    queryClient.invalidateQueries({ queryKey: queryKeys.activeJob });
    // The summary screen needs the delivery time, which the cached job doesn't have yet.
    queryClient.invalidateQueries({ queryKey: queryKeys.job(jobId) });
    invalidateTripTotals(queryClient);
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
    mutationFn: (offer: Pick<JobOffer, 'id' | 'orderId'>) =>
      jobsApi.acceptOffer(offer.id, offer.orderId),
    onSuccess: (job) => {
      // Accepting one offer cancels the driver's other open offer too.
      queryClient.setQueryData<JobOffer[]>(queryKeys.offers, []);
      cacheJob(job);
    },
    onError: (_error, offer) => removeOffer(queryClient, offer.id),
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

export function useResendDeliveryCode() {
  return useMutation({ mutationFn: (jobId: string) => jobsApi.resendDeliveryCode(jobId) });
}

export function useCancelJob() {
  return useJobMutation(({ id, reason }: { id: string; reason: string }) =>
    jobsApi.cancel(id, reason),
  );
}

/** A delivery stop could not be completed. Another stop may remain; if not, the trip is over. */
export function useFailStop() {
  const queryClient = useQueryClient();
  const cacheJob = useCacheJob();
  return useMutation({
    mutationFn: (reason: string) => jobsApi.failStop(reason),
    onSuccess: (job) => {
      if (job) {
        cacheJob(job);
      } else {
        queryClient.setQueryData(queryKeys.activeJob, null);
        queryClient.invalidateQueries({ queryKey: queryKeys.activeJob });
        invalidateTripTotals(queryClient);
      }
    },
  });
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
