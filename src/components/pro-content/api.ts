export async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as unknown;
    if (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string") {
      return (data as { error: string }).error;
    }
  } catch {
    // ignore
  }

  try {
    const text = await res.text();
    if (text?.trim()) return text;
  } catch {
    // ignore
  }

  return `HTTP ${res.status}`;
}

export function toLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function fromLines(list: unknown): string {
  if (!Array.isArray(list)) return "";
  return list
    .map((s) => (typeof s === "string" ? s : ""))
    .filter(Boolean)
    .join("\n");
}
