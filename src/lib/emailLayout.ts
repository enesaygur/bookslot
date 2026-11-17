import { escapeHtml } from "./html";

type LayoutOptions = {
  heading: string;
  bodyHtml: string;
  button?: { label: string; url: string };
};

export function emailLayout({
  heading,
  bodyHtml,
  button,
}: LayoutOptions): string {
  const buttonHtml = button
    ? `<p><a href="${button.url}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(button.label)}</a></p>
<p style="color:#6b7280;font-size:13px">Düğme çalışmazsa bu adresi tarayıcına yapıştır:<br>${button.url}</p>`
    : "";

  return `<!doctype html>
<html lang="tr">
<body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
<div style="max-width:520px;margin:24px auto;background:#ffffff;border-radius:12px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>
${bodyHtml}
${buttonHtml}
</div>
</body>
</html>`;
}
