import type { ReactNode } from "react";
import { useReveal } from "../lib/useReveal";

export function FeaturesSection() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <section id="contact" className="w-full bg-white py-12">
      <div
        ref={ref}
        className={`max-w-7xl mx-auto grid grid-cols-1 gap-10 px-6 md:grid-cols-3 reveal ${shown ? "reveal-show" : ""}`}
      >
        <Feature
          title="Location"
          lines={["Siquijor Circumferential Rd, San", "Juan, 6227 Siquijor"]}
          icon={<LocationIcon />}
        />
        <Feature title="Free Wi-Fi" lines={["Stay Connected with high-speed", "internet"]} icon={<WifiIcon />} />
        <Feature
          title="Contact"
          lines={[
            "Email: boolresidences@gmail.com",
            "Phone Number: 0996-784-5075",
          ]}
          icon={<ContactIcon />}
        />
      </div>
    </section>
  );
}

function Feature({ title, lines, icon }: { title: string; lines: string[]; icon: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-1 ring-brand-200" aria-hidden="true">
        {icon}
      </div>
      <div className="text-left">
        <div className="text-xs font-semibold text-neutral-900">{title}</div>
        <div className="mt-1 space-y-0.5 text-[11px] text-neutral-600">
          {lines.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M3.5 9.5a13 13 0 0 1 17 0" />
      <path d="M6.7 12.8a8.4 8.4 0 0 1 10.6 0" />
      <path d="M10.1 16.1a3.8 3.8 0 0 1 3.8 0" />
      <circle cx="12" cy="19" r="1" className="fill-current stroke-0" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="m5 7 7 5 7-5" />
    </svg>
  );
}

