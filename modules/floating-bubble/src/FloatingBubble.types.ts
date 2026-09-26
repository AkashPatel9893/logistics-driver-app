export interface BubbleOfferItem {
  id: string;
  orderNumber: string;
  vehicleName: string;
  earning: string;
  pickupAddress: string;
  dropAddress: string;
  pickupDistance: string;
  tripDistance: string;
  estimatedTime: string;
  deepLink: string;
}

export interface BubbleActiveJobItem {
  id: string;
  orderNumber: string;
  stageTitle: string;
  targetAddress: string;
  customerName?: string;
  earning?: string;
  deepLink: string;
}

export interface BubbleOverlayData {
  isOnline: boolean;
  summaryTitle: string;
  summarySubtitle: string;
  defaultDeepLink: string;
  highlight?: boolean;
  autoExpand?: boolean;
  offers: BubbleOfferItem[];
  activeJob?: BubbleActiveJobItem | null;
}

export interface BubbleContent {
  title: string;
  subtitle: string;
  /** Opened in the app when the bubble is tapped, e.g. logisticsdriverapp://active-delivery. */
  deepLink: string;
  /** Pulses the bubble (e.g. a new request is waiting). */
  highlight?: boolean;
}
