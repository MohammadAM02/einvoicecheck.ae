/**
 * Test env. These are FAKE values — no real Dodo Payments credentials exist in
 * this repo or in CI. Everything Dodo-facing is exercised against a mocked SDK
 * (see test/helpers/dodoMock.ts). A real test-mode E2E is still outstanding and
 * must be run by the operator once credentials exist.
 */
process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-auth-secret';
process.env.DODO_PAYMENTS_API_KEY = 'fake_test_mode_key_not_a_real_credential';
// Standard Webhooks secrets are base64 after the `whsec_` prefix.
process.env.DODO_PAYMENTS_WEBHOOK_KEY = `whsec_${Buffer.from('test-webhook-signing-secret').toString('base64')}`;
process.env.DODO_PRODUCT_ID_TRIAL = 'pdt_trial_fake';
process.env.DODO_PRODUCT_ID_STARTER = 'pdt_starter_fake';
process.env.DODO_PRODUCT_ID_PRO = 'pdt_pro_fake';
process.env.DODO_RETURN_URL = 'https://einvoicecheck.ae/dashboard?checkout=success';
process.env.NEXT_PUBLIC_SITE_URL = 'https://einvoicecheck.ae';
