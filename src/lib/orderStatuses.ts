/**
 * orderStatuses.ts
 * Shared constants for order statuses, safe for both Client and Server Components.
 */

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Ready for Shipment',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Completed',
  'Payment Pending',
  'Payment Failed',
  'Cancelled',
  'Return Requested',
  'Returned',
  'Refund Processing',
  'Refunded',
  'Failed Delivery',
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number];
