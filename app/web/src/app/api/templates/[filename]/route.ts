import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/templates/[filename]
 *
 * Serves a template XML file by reading it from public/templates/ directly.
 * This is more reliable than relying on Next.js standalone static file serving,
 * which can be inconsistent in Docker/Railway environments.
 *
 * Response: the XML file content with application/xml Content-Type.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params;

  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json(
      { ok: false, error: 'Invalid filename' },
      { status: 400 }
    );
  }

  // Must end with .xml
  if (!filename.toLowerCase().endsWith('.xml')) {
    return NextResponse.json(
      { ok: false, error: 'Only XML files are served' },
      { status: 400 }
    );
  }

  try {
    // Try multiple paths: first standalone (Docker), then dev (source)
    const paths = [
      join(process.cwd(), 'public', 'templates', filename),
      join(process.cwd(), '.next', 'standalone', 'public', 'templates', filename),
    ];

    let content: string | null = null;
    let usedPath: string | null = null;

    for (const p of paths) {
      try {
        content = readFileSync(p, 'utf-8');
        usedPath = p;
        break;
      } catch {
        // try next path
      }
    }

    if (content === null) {
      return NextResponse.json(
        { ok: false, error: 'Template file not found' },
        { status: 404 }
      );
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Failed to read template file' },
      { status: 500 }
    );
  }
}
