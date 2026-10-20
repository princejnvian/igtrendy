import YoutentLogo from "@/components/YoutentLogo";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculatePlatformFee } from "@/lib/platform-fee";
import PaymentButton from "./PaymentButton";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PaymentPage({ params }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Get project
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id,
      client_id,
      freelancer_id,
      title,
      description,
      budget,
      deadline,
      status
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  // Only project members can access
  if (
    project.client_id !== user.id &&
    project.freelancer_id !== user.id
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center youtent-app-bg px-6 text-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">
            Access Denied
          </h1>

          <p className="mt-3 text-gray-600">
            You are not allowed to access this payment page.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Only client can pay
  if (project.client_id !== user.id) {
    return (
      <main className="flex min-h-screen items-center justify-center youtent-app-bg px-6 text-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 text-3xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            Payment is for the Client
          </h1>

          <p className="mt-3 text-gray-600">
            Only the client who created this project can make the payment.
          </p>

          <Link
            href={`/projects/${project.id}`}
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            ← Back to Project
          </Link>
        </div>
      </main>
    );
  }

  // Invalid budget
  if (project.budget === null || Number(project.budget) <= 0) {
    return (
      <main className="min-h-screen youtent-app-bg text-gray-900">
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <YoutentLogo href="/dashboard" />

            <Link
              href={`/projects/${project.id}`}
              className="text-sm font-semibold text-gray-600 hover:text-blue-600"
            >
              ← Back to Project
            </Link>
          </div>
        </nav>

        <section className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
              ⚠️
            </div>

            <h1 className="mt-5 text-2xl font-bold text-gray-900">
              Payment amount unavailable
            </h1>

            <p className="mt-3 text-gray-600">
              This project does not have a valid payment amount.
            </p>

            <Link
              href={`/projects/${project.id}`}
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Back to Project
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Check existing payment
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      currency,
      status,
      payment_gateway,
      gateway_payment_id,
      gateway_order_id,
      paid_at
    `)
    .eq("project_id", project.id)
    .maybeSingle();

  if (paymentError) {
    console.error("Payment fetch error:", paymentError);
  }

  const amount = Number(project.budget);
  const platformFee = calculatePlatformFee(amount);
  const totalAmount = amount + platformFee;

  // Payment already completed
  if (payment?.status === "paid") {
    return (
      <main className="min-h-screen youtent-app-bg text-gray-900">
        <nav className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <YoutentLogo href="/dashboard" />

            <Link
              href={`/projects/${project.id}`}
              className="text-sm font-semibold text-gray-600 hover:text-blue-600"
            >
              ← Back to Project
            </Link>
          </div>
        </nav>

        <section className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-3xl border border-green-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-4xl">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-bold text-gray-900">
              Payment Already Completed
            </h1>

            <p className="mt-3 text-gray-600">
              This project has already been paid successfully.
            </p>

            <div className="mt-6 rounded-2xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                Project
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {project.title}
              </p>

              <p className="mt-4 text-sm text-gray-500">
                Amount Paid
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                ₹{amount.toLocaleString("en-IN")}
              </p>
            </div>

            <Link
              href={`/projects/${project.id}`}
              className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              ← Back to Project
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen youtent-app-bg text-gray-900">
      {/* Navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <YoutentLogo href="/dashboard" />

          <Link
            href={`/projects/${project.id}`}
            className="text-sm font-semibold text-gray-600 hover:text-blue-600"
          >
            ← Back to Project
          </Link>
        </div>
      </nav>

      {/* Payment Section */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Secure Payment
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Complete Your Payment
          </h1>

          <p className="mt-3 text-gray-600">
            Pay securely through Razorpay to continue with your project.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Project Information */}
          <div className="border-b border-gray-200 pb-6">
            <p className="text-sm text-gray-500">
              Project
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {project.title}
            </h2>

            {project.description && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {project.description}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="border-b border-gray-200 py-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Project amount</span>
                <span className="font-semibold text-gray-900">₹{amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">YOUTENT platform fee</span>
                <span className="font-semibold text-gray-900">₹{platformFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                <span className="font-bold text-gray-900">Total payable</span>
                <span className="text-2xl font-extrabold text-gray-900">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="my-6 rounded-2xl bg-blue-50 p-5">
            <div className="flex gap-3">
              <div className="text-xl">
                🔐
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Secure Razorpay Checkout
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  You will be redirected to Razorpay Checkout to complete
                  your payment securely.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <PaymentButton
            projectId={project.id}
            amount={amount}
            projectTitle={project.title}
            platformFee={platformFee}
          />

          <p className="mt-4 text-center text-xs text-gray-500">
            Your payment will be verified securely by YOUTENT before it is
            marked as paid.
          </p>
        </div>
      </section>
    </main>
  );
}