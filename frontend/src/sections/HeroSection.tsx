import { Navbar } from "../components/Navbar";
import { scrollToId } from "../lib/scrollToId";
import heroBackground from "../assets/background.jpeg";

export function HeroSection() {
  return (
    <section id="home" className="relative w-full h-[78svh] min-h-[560px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <Navbar
        onNav={(target) => {
          if (target === "home") scrollToId("home");
          if (target === "rooms") scrollToId("rooms");
          if (target === "booking") scrollToId("booking");
          if (target === "contact") scrollToId("contact");
        }}
      />

      <div className="relative z-0 flex h-full items-center justify-center px-4">
        <div className="w-full max-w-[560px] rounded-2xl bg-black/45 px-10 py-12 text-center text-white shadow-soft backdrop-blur-md">
          <div className="mb-2 text-[10px] tracking-[0.30em] opacity-90">WELCOME TO</div>
          <h1 className="font-heading text-3xl leading-tight md:text-4xl">
            Come Home to
            <br />
            Bool Perimeter&apos;s Inn
          </h1>
          <p className="mt-3 text-xs opacity-90">Simple stay, island day</p>

          <div className="mt-7 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => scrollToId("booking")}
              className="rounded-full bg-white px-6 py-2 text-xs font-semibold text-neutral-900 shadow transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01]"
            >
              Book Now
            </button>
            <button
              type="button"
              onClick={() => scrollToId("rooms")}
              className="rounded-full border border-white/80 bg-transparent px-6 py-2 text-xs font-semibold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01]"
            >
              View Rooms
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

