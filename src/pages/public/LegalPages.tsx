import { GlassCard } from '@/components/glass/GlassPrimitives';

export function PrivacyPolicyPage() {
  return (
    <GlassCard variant="strong" className="p-6 sm:p-8 space-y-4 text-sm leading-relaxed text-[#777078]">
      <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">Legal &amp; Privacy</p>
      <h1 className="font-display text-2xl font-extrabold text-[#29262B]">Privacy Policy</h1>
      <p>
        Pamasahe Tracker – Oriental Mindoro respects commuter privacy in accordance with the
        Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
      </p>
      <h2 className="font-bold text-base text-[#29262B]">1. Data We Collect</h2>
      <p>
        When you register, we collect your name, email address, optional home municipality, and
        any fare reports or supporting receipt/matrix images you choose to submit.
      </p>
      <h2 className="font-bold text-base text-[#29262B]">2. Evidence Storage &amp; Access Control</h2>
      <p>
        Uploaded supporting evidence is stored in a private Supabase Storage bucket protected by
        Row Level Security. Only the submitting user and authorized platform administrators can
        access uploaded evidence files via short-lived signed URLs.
      </p>
      <h2 className="font-bold text-base text-[#29262B]">3. Public Transparency</h2>
      <p>
        Verified official fares and reviewed community estimates published to the Fare Matrix do
        not expose commuter personal email addresses or uploaded personal evidence files.
      </p>
    </GlassCard>
  );
}

export function TermsPage() {
  return (
    <GlassCard variant="strong" className="p-6 sm:p-8 space-y-4 text-sm leading-relaxed text-[#777078]">
      <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">Platform Terms</p>
      <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
        Terms and Conditions
      </h1>
      <h2 className="font-bold text-base text-[#29262B]">1. Official vs. Community Estimates</h2>
      <p>
        Only fare records explicitly labeled <strong className="text-[#29262B]">VERIFIED OFFICIAL FARE</strong> with an
        authorized government or operator reference represent official tariff postings. Entries
        labeled <strong className="text-[#29262B]">COMMUNITY ESTIMATE</strong> are informational only and do not supersede
        LTFRB Region IV-B orders or municipal LGU ordinances.
      </p>
      <h2 className="font-bold text-base text-[#29262B]">2. Accurate Reporting</h2>
      <p>
        Users must submit truthful fare observations. Submitting fabricated fare claims, spam, or
        unrelated files may lead to report rejection, flagging, or account suspension.
      </p>
      <h2 className="font-bold text-base text-[#29262B]">3. Formal Regulatory Disputes</h2>
      <p>
        For official enforcement or overcharging complaints, commuters should contact the LTFRB
        24/7 Hotline at 1342 or the local LGU Tricycle Regulatory Unit.
      </p>
    </GlassCard>
  );
}
