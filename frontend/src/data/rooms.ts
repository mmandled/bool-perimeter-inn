import type { Room } from "../types";
import stdImg1 from "../assets/STD1.jpeg";
import stdImg2 from "../assets/STD2.jpeg";
import stdImg3 from "../assets/STD3.jpeg";
import stdImg31 from "../assets/Do1.jpg";
import stdImg32 from "../assets/Do3.jpg";
import stdImg33 from "../assets/Do2.jpg";
import stdImg21 from "../assets/827490083.jpg";
import stdImg11 from "../assets/Sm1.jpg";
import stdImg12 from "../assets/Sm2.jpg";

export const rooms: Room[] = [
  {
    id: "single",
    name: "Standard Small",
    guests: 1,
    bedsLabel: "1 bed",
    pricePhpPerNight: 950,
    imageUrl: stdImg1,
    gallery: [stdImg1, stdImg11, stdImg12],
    shortDescription: "A calm, cozy space for quiet island nights and easy mornings.",
    sizeLabel: "18 sqm",
    bedType: "Single bed",
    capacityLabel: "1 guest",
    amenities: [
      { key: "wifi", label: "Wi‑Fi" },
      { key: "towel", label: "Towels" },
      { key: "shower", label: "Cold shower" },
      { key: "desk", label: "Work desk" },
      { key: "water", label: "Drinking water" },
    ],
    inventoryCount: 1,
    bookingSource: "booking_com",
    externalUrl: "https://www.booking.com/hotel/ph/bool-perimeters-inn.html",
    externalCtaLabel: "Book on Booking.com",
  },
  {
    id: "bunk",
    name: "Standard Bunk Bed",
    guests: 4,
    bedsLabel: "1 bunk bed",
    pricePhpPerNight: 1350,
    imageUrl: stdImg2,
    gallery: [stdImg2, stdImg33, stdImg21],
    shortDescription: "Shared comfort made for groups—simple, clean, and friendly.",
    sizeLabel: "28 sqm",
    bedType: "Bunk beds",
    capacityLabel: "4 guests",
    amenities: [
      { key: "wifi", label: "Wi‑Fi" },
      { key: "shower", label: "Cold shower" },
      { key: "desk", label: "Work desk" },
      { key: "outlet", label: "Outlets" },
      { key: "water", label: "Drinking water" },
    ],
    inventoryCount: 1,
    bookingSource: "website",
  },
  {
    id: "double",
    name: "Large Double",
    guests: 2,
    bedsLabel: "1 large bed",
    pricePhpPerNight: 1500,
    imageUrl: stdImg3,
    gallery: [stdImg3, stdImg31, stdImg32],
    shortDescription: "A bright, spacious room for couples—rest well and reset.",
    sizeLabel: "24 sqm",
    bedType: "Large bed",
    capacityLabel: "2 guests",
    amenities: [
      { key: "wifi", label: "Wi‑Fi" },
      { key: "shower", label: "Cold shower" },
      { key: "desk", label: "Work desk" },
      { key: "coffee", label: "Coffee" },
      { key: "water", label: "Drinking water" },
    ],
    inventoryCount: 2,
    bookingSource: "airbnb",
    externalUrl: "https://www.airbnb.com/rooms/1336679099127935662",
    externalCtaLabel: "Book on Airbnb",
  },
];

export function getRoomById(id: Room["id"]) {
  return rooms.find((r) => r.id === id);
}
