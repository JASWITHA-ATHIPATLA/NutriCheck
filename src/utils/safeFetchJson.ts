export async function readJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<{ data: T | null; rawText: string }> {
  const rawText = await res.text().catch(() => '');
  if (!rawText) return { data: null, rawText: '' };
  try {
    return { data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { data: null, rawText };
  }
}

export function buildNonJsonErrorMessage(res: Response, fallback: string): string {
  if (res.status === 404) {
    return 'API endpoint unavailable (HTTP 404). Make sure the NutriCheck backend server is running.';
  }
  return `${fallback} (HTTP ${res.status})`;
}
