import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { ChatMessage, JobOffer } from '@/lib/api/models';
import { addBubbleOffer, removeBubbleOffer, setBubbleJob } from '@/lib/driver-bubble';
import { queryKeys } from '@/lib/queries/keys';
import { driverChannel, subscribeToDriverChannel } from '@/lib/realtime/driver-socket';

import { useCacheJob } from './use-jobs';

/**
 * Keeps the query cache in step with server pushes on the driver's channel
 * while signed in. Screens just read their queries.
 */
export function useDriverRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  const cacheJob = useCacheJob();

  useEffect(() => {
    if (!userId) return;
    return subscribeToDriverChannel(driverChannel(userId), (event) => {
      switch (event.type) {
        case 'offer.new':
          addBubbleOffer(event.offer);
          queryClient.setQueryData<JobOffer[]>(queryKeys.offers, (offers = []) => [
            ...offers.filter((o) => o.id !== event.offer.id),
            event.offer,
          ]);
          break;
        case 'offer.expired':
          removeBubbleOffer(event.offerId);
          queryClient.setQueryData<JobOffer[]>(queryKeys.offers, (offers) =>
            offers?.filter((o) => o.id !== event.offerId),
          );
          break;
        case 'job.updated':
          cacheJob(event.job);
          setBubbleJob(event.job);
          break;
        case 'chat.message':
          queryClient.setQueryData<ChatMessage[]>(
            queryKeys.messages(event.message.orderId),
            (list) =>
              list && !list.some((m) => m.id === event.message.id)
                ? [...list, event.message]
                : list,
          );
          break;
        case 'payment.received':
          queryClient.invalidateQueries({ queryKey: queryKeys.job(event.orderId) });
          break;
        case 'profile.updated':
          queryClient.invalidateQueries({ queryKey: queryKeys.profile });
          queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
          break;
      }
    });
    // cacheJob is rebuilt each render but only closes over the stable queryClient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, queryClient]);
}
