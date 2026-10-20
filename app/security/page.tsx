import InfoPage, { InfoSection } from "@/components/InfoPage";
export const metadata = { title: "Security | YOUTENT", description: "YOUTENT account and payment security practices." };
export default function SecurityPage() { return <InfoPage eyebrow="Security" title="Security is part of the product." intro="YOUTENT uses authentication, authorization and payment verification checks to protect accounts and project funds.">
  <InfoSection title="Authentication"><p>User sessions are handled through Supabase Auth. Server routes verify the authenticated user before accessing account, project or payment operations.</p></InfoSection>
  <InfoSection title="Payment verification"><p>Razorpay order IDs, amounts, currency, payment status and HMAC signatures are verified on the server. The browser never decides whether a payment is successful.</p></InfoSection>
  <InfoSection title="Escrow controls"><p>Captured project funds are tracked separately from the freelancer's available balance. Release is tied to the project completion flow and uses an idempotent payment ledger.</p></InfoSection>
  <InfoSection title="Account protection"><p>Do not share passwords, OTPs, API keys or payment credentials. YOUTENT support will not ask you to paste a secret into chat.</p></InfoSection>
</InfoPage>; }
