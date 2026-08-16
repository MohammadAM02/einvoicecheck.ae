import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * RETIRED — free-tool converter proxy (Part B).
 *
 * The standalone Repairer and POST /v1/convert are retired. The only remaining
 * repair surface is Validator-integrated safe repair behind an explicit UI
 * action (POST /v2/validate carries the additive safeRepair analysis). Any
 * stale caller of this endpoint receives 410 Gone instead of converter output.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        'The XML Repairer tool and POST /v1/convert are retired. Run validation at /tools/uae-e-invoice-validator; ' +
        'safe repair is offered there when a deterministic candidate exists.',
    },
    { status: 410 },
  );
}
