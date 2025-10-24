export function MagicLinkEmail({ link }: { link: string }) {
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; line-height:1.5">
    <h2>NaviGoPlan – Sign in</h2>
    <p>Πάτα το κουμπί για να συνδεθείς. Ο σύνδεσμος λήγει σε 15 λεπτά.</p>
    <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Sign in</a></p>
    <p>Αν δεν βλέπεις το κουμπί, άνοιξε αυτό το URL:</p>
    <code style="word-break:break-all">${link}</code>
  </div>
  `;
}
