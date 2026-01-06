import { apiBaseURL } from "../services/api";

export class ExportCsvError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ExportCsvError";
    this.status = status;
  }
}

const resolveFilename = (contentDisposition: string | null, month: string) => {
  const fallback = `expenses_${month}.csv`;
  if (!contentDisposition) return fallback;

  const match = contentDisposition.match(/filename="([^"]+)"/i);
  if (match?.[1]) return match[1];

  return fallback;
};

export async function exportExpensesCsv(month: string, token: string) {
  const baseUrl = apiBaseURL.replace(/\/+$/, "");
  const url = `${baseUrl}/api/admin/exports/expenses.csv?month=${encodeURIComponent(month)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const msg = (await res.text()).trim();
    throw new ExportCsvError(msg || `Erro ao exportar CSV (${res.status})`, res.status);
  }

  const blob = await res.blob();
  const filename = resolveFilename(res.headers.get("Content-Disposition"), month);
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
