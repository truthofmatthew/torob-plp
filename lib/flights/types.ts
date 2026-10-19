// Shapes the flight UI depends on. No upstream field names here: a source
// change only touches lib/flights/normalize.ts.

export type Party = { adults: number; children: number; infants: number };

export type TicketType = "charter" | "system" | "unknown";
export type Cabin = "economy" | "business";

/**
 * Refund tier, read from the seller's cancellation-penalty table (the penalty
 * for cancelling early, i.e. the first row). The upstream "refundable" flag is
 * true on every offer, so it is ignored.
 *  - low:     penalty ≤ 30 %
 *  - partial: 31–60 %
 *  - none:    > 60 %. You get little back.
 *  - unknown: the seller published no table.
 */
export type RefundKind = "low" | "partial" | "none" | "unknown";

export type RefundPolicy = {
  kind: RefundKind;
  /** Penalty % when cancelling early; null when unknown. */
  firstPenalty: number | null;
  /** The seller's table, verbatim labels: «از زمان صدور بلیط تا ۲۴ ساعت قبل از پرواز» → 30. */
  rows: { label: string; penalty: number }[];
};

/** One way to buy a seat on a flight: a supplier/fare-class offer. */
export type FlightFare = {
  id: string;
  /** Where you'd buy it (the OTA), e.g. «علی‌بابا». */
  sellerName: string;
  /** Who supplies the seat, when the source gives it: a charter supplier number or the airline's own fare. */
  supplierLabel: string;
  ticketType: TicketType;
  fareClass: string;
  /** Toman per person. 0 = not given. */
  price: { adult: number; child: number; infant: number };
  /** Toman for the whole party. */
  total: number;
  baggageKg: number | null;
  seatsLeft: number | null;
  refund: RefundPolicy;
  /** Paid placement. Never recommended. */
  sponsored: boolean;
  /** «نرخ رسمی ایرلاین» and similar seller notes, verbatim. */
  note: string;
  /** The seller's results page for this search (the source has no per-offer link). */
  sellerUrl: string;
  bookable: boolean;
};

export type Airport = { code: string; city: string };

/** One physical flight (airline + number + departure + cabin), merged across all its offers. */
export type FlightGroup = {
  id: string;
  airline: { code: string; name: string; logo: string | null };
  flightNumber: string;
  aircraft: string;
  origin: Airport;
  destination: Airport;
  terminal: string;
  /** Local Tehran time, ISO without zone: 2026-10-22T06:50:00. */
  departure: string;
  arrival: string;
  durationMin: number;
  stops: number;
  cabin: Cabin;
  /** Bookable fares first, cheapest first. */
  fares: FlightFare[];
  status: "available" | "full" | "cancelled";
};

export type CalendarDay = {
  /** Jalali yyyy-mm-dd, the URL format. */
  date: string;
  /** Cheapest adult fare that day (Toman), null when none. */
  minPrice: number | null;
};

export type FlightQuery = {
  from: string;
  to: string;
  /** Jalali yyyy-mm-dd. */
  date: string;
  party: Party;
};

export type FlightSearchResponse = {
  source: "live" | "cache" | "sample";
  query: FlightQuery;
  groups: FlightGroup[];
  /** Raw offer count before merging, for «N پیشنهاد → M پرواز». */
  offerCount: number;
  note?: string;
};

export type CalendarResponse = {
  source: "live" | "cache" | "sample";
  days: CalendarDay[];
};
