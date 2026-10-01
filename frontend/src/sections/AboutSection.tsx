export function AboutSection() {
  return (
    <section id="about" className="w-full bg-white py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-[760px] rounded-2xl bg-neutral-50 px-6 py-8 text-center ring-1 ring-black/5 md:px-10">
          <div className="text-[10px] font-semibold tracking-[0.22em] text-yellow-700/80">ABOUT US</div>
          <h2 className="mt-3 font-heading text-3xl text-neutral-900">About Bool Perimeter&apos;s Inn</h2>
          <p className="mt-2 text-sm font-medium text-brand-700">Your second home in Siquijor.</p>

          <div className="mt-5 space-y-4 text-left text-sm leading-relaxed text-neutral-600">
            <p>
              Founded in February 2025, Bool Perimeter&apos;s Inn was created to provide travelers with the comfort of
              hotel-like service while maintaining the warmth of a home away from home. Designed for couples and solo
              travelers, our inn offers a welcoming space where guests can feel comfortable, safe, and happy throughout
              their stay.
            </p>
            <p>
              With thoughtfully prepared amenities including free Wi-Fi, a shared kitchen, an outdoor dining area, and
              CCTV security, we strive to make every visit relaxing, convenient, and memorable.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <Highlight label="Year Established" value="February 2025" />
            <Highlight label="Guest Type" value="Couples & Solo Travelers" />
            <Highlight label="Atmosphere" value="Comfortable, Safe & Home-like" />
          </div>

          <div className="mt-6 rounded-xl bg-white px-5 py-4 text-left ring-1 ring-black/5">
            <div className="text-xs font-semibold text-neutral-900">Amenities</div>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              <li>• Free WiFi</li>
              <li>• Shared Kitchen</li>
              <li>• Outdoor Dining Area</li>
              <li>• CCTV Security</li>
              <li>• Free Parking</li>
            </ul>
          </div>

          <p className="mt-6 text-sm italic text-neutral-700">
            &ldquo;Come as a guest, leave feeling at home.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-black/5">
      <div className="text-[10px] font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-xs font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
