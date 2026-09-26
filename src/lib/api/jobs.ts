import { request } from './client';
import type { ChatMessage, DriverJob, JobOffer, PaymentQr, VerifyStopInput } from './models';

export const jobsApi = {
  /** Live offers for this driver (usually zero or one). */
  getOffers: (signal?: AbortSignal) => request<JobOffer[]>({ url: '/driver/offers', signal }),

  acceptOffer: (offerId: string) =>
    request<DriverJob>({ method: 'POST', url: `/driver/offers/${offerId}/accept` }),

  rejectOffer: (offerId: string, reason: string) =>
    request<null>({ method: 'POST', url: `/driver/offers/${offerId}/reject`, data: { reason } }),

  /** The job in progress, or null. */
  getActiveJob: (signal?: AbortSignal) =>
    request<DriverJob | null>({ url: '/driver/jobs/active', signal }),

  getJob: (id: string, signal?: AbortSignal) =>
    request<DriverJob>({ url: `/driver/jobs/${id}`, signal }),

  arriveAtPickup: (id: string) =>
    request<DriverJob>({ method: 'POST', url: `/driver/jobs/${id}/arrive-pickup` }),

  verifyPickup: (id: string, input: VerifyStopInput) =>
    request<DriverJob>({ method: 'POST', url: `/driver/jobs/${id}/verify-pickup`, data: input }),

  arriveAtDrop: (id: string) =>
    request<DriverJob>({ method: 'POST', url: `/driver/jobs/${id}/arrive-drop` }),

  verifyDrop: (id: string, input: VerifyStopInput) =>
    request<DriverJob>({ method: 'POST', url: `/driver/jobs/${id}/verify-drop`, data: input }),

  cancel: (id: string, reason: string) =>
    request<DriverJob>({ method: 'POST', url: `/driver/jobs/${id}/cancel`, data: { reason } }),

  createPaymentQr: (id: string) =>
    request<PaymentQr>({ method: 'POST', url: `/driver/jobs/${id}/payment/qr` }),

  collectCash: (id: string) =>
    request<DriverJob>({ method: 'POST', url: `/driver/jobs/${id}/payment/cash` }),

  getMessages: (id: string, signal?: AbortSignal) =>
    request<ChatMessage[]>({ url: `/driver/jobs/${id}/messages`, signal }),

  sendMessage: (id: string, text: string) =>
    request<ChatMessage>({ method: 'POST', url: `/driver/jobs/${id}/messages`, data: { text } }),

  markMessagesRead: (id: string) =>
    request<null>({ method: 'POST', url: `/driver/jobs/${id}/messages/read` }),
};
