import Link from "next/link";

export function Disclaimer() {
  return (
    <section className="border-b border-[var(--border)] bg-[#fff8ef] text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl px-4 py-2.5 text-sm leading-6 sm:px-6 lg:px-8">
        Cutoff data shown here is compiled from publicly available{" "}
        <Link
          className="font-semibold text-[var(--primary)] underline underline-offset-2"
          href="https://josaa.admissions.nic.in/Applicant/SeatAllotmentResult/CurrentORCR.aspx"
        >
          JoSAA opening and closing rank pages
        </Link>
        . While care is taken during import, parsing or data-entry errors may occur. Please verify important counselling decisions on the official JoSAA website.
      </div>
    </section>
  );
}
