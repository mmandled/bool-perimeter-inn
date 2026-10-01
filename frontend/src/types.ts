export type Room = {
  id: "single" | "bunk" | "double";
  name: string;
  guests: number;
  bedsLabel: string;
  pricePhpPerNight: number;
  imageUrl: string;
  gallery: string[];
  shortDescription: string;
  sizeLabel: string;
  bedType: string;
  capacityLabel: string;
  amenities: { key: string; label: string }[];
  inventoryCount: number;
  bookingSource: "website" | "airbnb" | "booking_com";
  externalUrl?: string;
  externalCtaLabel?: string;
};

export type BookingStatus = "pending" | "confirmed" | "archived";
export type BookingType = "online" | "walk-in" | "manual";
export type PaymentMethod = "gcash" | "card";
export type BookingSource = "website" | "airbnb" | "booking_com" | "manual_occupied";

export type RoomManualStatus = "available" | "occupied";

export type Booking = {
  id: string;
  ticketNumber: string;
  source: BookingSource;
  fullName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  roomId: Room["id"];
  roomName: string;
  type: BookingType;
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  createdAt: string;
  notes: string;
};

