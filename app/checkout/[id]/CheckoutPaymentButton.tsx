"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPaymentButton({
  checkoutId, orderId, amount, packageName,
}: { checkoutId: string; orderId: string | null; amount: number; packageName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pay() {
    try {
      setLoading(true);
      if (!orderId) throw new Error("Payment order is not ready. Please refresh and try again.");

      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
          document.body.appendChild(script);
        });
      }

      const configResponse = await fetch(`/api/checkout-orders/${checkoutId}/payment-config`, { cache: "no-store" });
      const config = await configResponse.json();
      if (!configResponse.ok) throw new Error(config.error || "Unable to prepare payment.");

      const razorpay = new window.Razorpay({
        key: config.keyId,
        amount,
        currency: "INR",
        name: "YOUTENT",
        description: packageName,
        order_id: orderId,
        theme: { color: "#2563eb" },
        handler: async (response: any) => {
          const verifyResponse = await fetch(`/api/checkout-orders/${checkoutId}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const result = await verifyResponse.json();
          if (!verifyResponse.ok) throw new Error(result.error || "Payment verification failed.");
          router.replace(`/projects/${result.projectId}?payment=success`);
          router.refresh();
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      razorpay.open();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to start payment.");
      setLoading(false);
    }
  }

  return <button type="button" onClick={pay} disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60">{loading ? "Opening secure payment..." : `Continue to Pay ₹${(amount / 100).toLocaleString("en-IN")}`}</button>;
}