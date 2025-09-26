// lib/razorpay.ts

/**
 * Dynamically loads the Razorpay checkout script
 * Returns a Promise that resolves to true on success, false on failure
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const scriptId = "razorpay-script";

    // Already loaded
    if (document.getElementById(scriptId)) return resolve(true);

    // Create script element
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;

    // Load success
    script.onload = () => {
      console.info("✅ Razorpay script loaded successfully.");
      resolve(true);
    };

    // Load error
    script.onerror = () => {
      console.error("❌ Failed to load Razorpay script.");
      resolve(false);
    };

    // Fallback timeout (10s)
    setTimeout(() => {
      if (!document.getElementById(scriptId)) {
        console.error("❌ Razorpay script loading timed out.");
        resolve(false);
      }
    }, 10000);

    document.body.appendChild(script);
  });
};
