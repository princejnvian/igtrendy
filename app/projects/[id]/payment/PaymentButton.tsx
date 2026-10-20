"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailedResponse = {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill: {
    name: string;
    email: string;
  };
  notes: {
    project_id: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    callback: (response: RazorpayFailedResponse) => void
  ) => void;
};

type RazorpayConstructor = new (
  options: RazorpayOptions
) => RazorpayInstance;

type Props = {
  projectId: string;
  amount: number;
  projectTitle: string;
  platformFee?: number;
};

export default function PaymentButton({
  projectId,
  amount,
  projectTitle,
  platformFee = 0,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function loadRazorpayScript(): Promise<boolean> {
    if ((window as Window & { Razorpay?: RazorpayConstructor }).Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  }

  async function handlePayment() {
    try {
      setLoading(true);

      // --------------------------------
      // 1. Load Razorpay Checkout
      // --------------------------------

      const scriptLoaded =
        await loadRazorpayScript();

      if (!scriptLoaded) {
        alert(
          "Unable to load Razorpay Checkout. Please check your internet connection."
        );

        setLoading(false);
        return;
      }

      // --------------------------------
      // 2. Create Razorpay Order
      // --------------------------------

      const response = await fetch(
        `/projects/${projectId}/payment/create-order`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            projectId,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        const text = await response.text();

        console.error(
          "Create order server response:",
          text
        );

        throw new Error(
          `Payment server error (${response.status}). Please check the server.`
        );
      }

      const data = await response.json();

      console.log(
        "Create order response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create payment order."
        );
      }

      if (!data.orderId || !data.keyId) {
        throw new Error(
          "Razorpay order information is missing."
        );
      }

      // --------------------------------
      // 3. Open Razorpay Checkout
      // --------------------------------

      const options: RazorpayOptions = {
        key: data.keyId,

        amount: data.amount,

        currency: data.currency || "INR",

        name: "YOUTENT",

        description: projectTitle,

        order_id: data.orderId,

        // --------------------------------
        // 4. Payment Successful
        // --------------------------------

        handler: async function (
          paymentResponse
        ) {
          try {
            setLoading(true);

            console.log(
              "Razorpay payment successful:",
              paymentResponse
            );

            // --------------------------------
            // 5. Verify Payment on Server
            // --------------------------------

            const verifyResponse =
              await fetch(
                `/projects/${projectId}/payment/verify`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    razorpay_payment_id:
                      paymentResponse.razorpay_payment_id,

                    razorpay_order_id:
                      paymentResponse.razorpay_order_id,

                    razorpay_signature:
                      paymentResponse.razorpay_signature,
                  }),
                }
              );

            const verifyContentType =
              verifyResponse.headers.get(
                "content-type"
              );

            if (
              !verifyContentType?.includes(
                "application/json"
              )
            ) {
              const text =
                await verifyResponse.text();

              console.error(
                "Verify server response:",
                text
              );

              throw new Error(
                `Payment verification server error (${verifyResponse.status}).`
              );
            }

            const verifyData =
              await verifyResponse.json();

            console.log(
              "YOUTENT verification response:",
              verifyData
            );

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.error ||
                  "Payment verification failed."
              );
            }

            // --------------------------------
            // 6. Payment Verified
            // --------------------------------

            // --------------------------------
            // 7. Return to the project with a success state
            // --------------------------------
            // The project page shows a clear payment-success banner
            // and the verified project status after the redirect.
            router.replace(`/projects/${projectId}?payment=success`);
            router.refresh();
          } catch (error: unknown) {
            console.error(
              "Payment verification error:",
              error
            );

            alert(
              error instanceof Error
                ? error.message
                : "Payment was successful, but verification failed."
            );

            setLoading(false);
          }
        },

        prefill: {
          name: "",
          email: "",
        },

        notes: {
          project_id: projectId,
        },

        theme: {
          color: "#2563eb",
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      // --------------------------------
      // 8. Create Razorpay Instance
      // --------------------------------

      const RazorpayCtor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!RazorpayCtor) {
        throw new Error("Razorpay Checkout is unavailable. Please refresh and try again.");
      }
      const razorpay = new RazorpayCtor(options);

      // --------------------------------
      // 9. Payment Failed
      // --------------------------------

      razorpay.on(
        "payment.failed",
        function (failedResponse: RazorpayFailedResponse) {
          console.error(
            "Payment failed:",
            failedResponse
          );

          alert(
            failedResponse.error
              ?.description ||
              "Payment failed. Please try again."
          );

          setLoading(false);
        }
      );

      // --------------------------------
      // 10. Open Checkout
      // --------------------------------

      razorpay.open();
    } catch (error: unknown) {
      console.error(
        "Payment error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while starting payment."
      );

      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePayment}
      disabled={loading}
      className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading
        ? "Processing Payment..."
        : `Pay ₹${(Number(amount) + Number(platformFee)).toLocaleString("en-IN")} →`}
    </button>
  );
}