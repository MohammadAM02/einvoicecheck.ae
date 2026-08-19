type EventName =
  | 'validator_input_selected'
  | 'validator_success'
  | 'validator_error'
  | 'generator_import_action'
  | 'generator_import_open_in_form'
  | 'validator_repair_applied'
  | 'validator_repair_mismatch'
  | 'validator_repair_download'
  | 'api_cta_clicked'
  | 'curl_copied'
  | 'auth_modal_opened'
  | 'plan_selected';

type EventProperties = Record<string, string | number | boolean>;

export function trackEvent(name: EventName, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'production') {
    console.log('[Analytics]', name, properties);
    // Example: gtag('event', name, properties);
    // Example: posthog.capture(name, properties);
  }
}

if (typeof window !== 'undefined') {
  (window as any).trackEvent = trackEvent;
}
