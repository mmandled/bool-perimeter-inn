import { useState } from "react";
import logo from "../assets/logo.png";

type Props = {
  onNav: (targetId: "home" | "rooms" | "booking" | "contact") => void;
};

export function Navbar({ onNav }: Props) {
  const [open, setOpen] = useState(false);

  function navTo(target: "home" | "rooms" | "booking" | "contact") {
    onNav(target);
    setOpen(false);
  }

  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-5 text-white sm:px-5 md:px-6">
        <button
          type="button"
          onClick={() => navTo("home")}
          className="flex items-center gap-3 text-left"
        >
          <img
            src={logo}
            alt="Bool Perimeter's Inn Logo"
            className="h-12 w-12 rounded-full object-cover"
          />
          <span className="font-heading text-base tracking-wide">
            Bool Perimeter&apos;s Inn
          </span>
        </button>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <button
            type="button"
            onClick={() => navTo("home")}
            className="hover:opacity-90"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navTo("rooms")}
            className="hover:opacity-90"
          >
            Rooms
          </button>
          <button
            type="button"
            onClick={() => navTo("booking")}
            className="hover:opacity-90"
          >
            Booking
          </button>
          <button
            type="button"
            onClick={() => navTo("contact")}
            className="hover:opacity-90"
          >
            Contact
          </button>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 p-2 backdrop-blur transition hover:bg-white/15 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative h-4 w-5" aria-hidden="true">
            <span
              className={`absolute left-0 top-0 block h-[2px] w-5 bg-white transition-transform duration-200 ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] block h-[2px] w-5 bg-white transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] block h-[2px] w-5 bg-white transition-transform duration-200 ${
                open ? "translate-y-[-7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        className={`md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        } transition-opacity duration-200`}
      >
        <div className="mx-4 rounded-2xl bg-black/50 p-4 text-white shadow-soft ring-1 ring-white/10 backdrop-blur-md sm:mx-5">
          <nav className="flex flex-col gap-2 text-sm font-semibold">
            <button
              type="button"
              onClick={() => navTo("home")}
              className="rounded-xl px-4 py-3 text-left hover:bg-white/10"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navTo("rooms")}
              className="rounded-xl px-4 py-3 text-left hover:bg-white/10"
            >
              Rooms
            </button>
            <button
              type="button"
              onClick={() => navTo("booking")}
              className="rounded-xl px-4 py-3 text-left hover:bg-white/10"
            >
              Booking
            </button>
            <button
              type="button"
              onClick={() => navTo("contact")}
              className="rounded-xl px-4 py-3 text-left hover:bg-white/10"
            >
              Contact
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
