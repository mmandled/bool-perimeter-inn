import { parseYmd } from "./dates";

export function countNights(checkIn: string, checkOut: string) {
  const inD = parseYmd(checkIn);
  const outD = parseYmd(checkOut);
  if (!inD || !outD) return 0;
  const ms = outD.getTime() - inD.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function calculateBookingAmount(checkIn: string, checkOut: string, pricePhpPerNight: number) {
  const nights = countNights(checkIn, checkOut);
  return Math.max(pricePhpPerNight, nights * pricePhpPerNight);
}
