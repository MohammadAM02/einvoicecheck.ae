/**
 * Neutral browser utilities for XML documents (download/copy). Extracted from
 * the retired Repairer browser client so the Generator and Validator share one
 * implementation without depending on a removed product surface.
 */

export function downloadXml(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyXml(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
}
