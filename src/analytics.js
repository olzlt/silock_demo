const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

function hasValidMeasurementId() {
  return /^G-[A-Z0-9]+$/i.test(measurementId || "");
}

export function initAnalytics() {
  if (typeof window === "undefined" || !hasValidMeasurementId()) return false;
  if (window.gtag) return true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.silockAnalytics = "true";
  document.head.appendChild(script);
  return true;
}

export function trackEvent(name, parameters = {}) {
  if (!hasValidMeasurementId() || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, parameters);
}
