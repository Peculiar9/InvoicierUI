import type { Invoice } from '@/types';
import type { BusinessProfile } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/utils/format';

/** Base URL for public links, explicit override, else the current origin
 *  (localhost in dev, the deployed domain on Vercel/Netlify). */
export const appBaseUrl = () => {
  const configured = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return typeof window !== 'undefined' ? window.location.origin : '';
};

/**
 * The base for a shared/copied payment link. In production the pay surface is
 * its own subdomain, so a pay link must point at pay.invoicier.app, never the
 * app domain. Staging and localhost have no pay subdomain, so the link stays on
 * the current app origin (their /pay works). VITE_PAY_URL overrides if ever set.
 */
export const payLinkBase = () => {
  const configured = import.meta.env.VITE_PAY_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host === 'invoicier.app' || host === 'www.invoicier.app') {
    return 'https://pay.invoicier.app';
  }
  return appBaseUrl();
};

export const invoicePayLink = (invoice: Invoice) => `${payLinkBase()}/pay/${invoice.id}`;

/** Full, email-client-safe HTML, generated here so EmailJS only needs a {{{content}}} passthrough. */
function invoiceEmailHtml(opts: {
  toName: string;
  fromName: string;
  invoice_number: string;
  amount: string;
  due_date: string;
  payLink: string;
  notes: string;
}): string {
  const { toName, fromName, invoice_number, amount, due_date, payLink, notes } = opts;
  return `<style>
  @media only screen and (max-width:600px){
    .inv-card{width:100%!important;border-radius:0!important}
    .inv-head{padding:22px!important}
    .inv-pad{padding-left:22px!important;padding-right:22px!important}
    .inv-amount{font-size:23px!important}
    .inv-num{float:none!important;display:block!important;margin-top:6px!important}
    .inv-btn a{display:block!important;text-align:center!important}
  }
</style>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f8;margin:0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" class="inv-card" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #ececf3;border-radius:18px;overflow:hidden;">
      <tr><td class="inv-head" style="background:#924ee9;padding:28px 32px;">
        <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">Invoicier</span>
        <span class="inv-num" style="float:right;font-size:13px;color:rgba(255,255,255,0.85);">Invoice ${invoice_number}</span>
      </td></tr>
      <tr><td class="inv-pad" style="padding:36px 32px 8px;">
        <p style="margin:0 0 4px;font-size:13px;color:#8a8a99;">New invoice from ${fromName}</p>
        <h1 class="inv-amount" style="margin:0 0 18px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#1d1b2e;">${amount}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5f5d72;">Hi ${toName}, here is invoice <strong>${invoice_number}</strong> for <strong>${amount}</strong>, due <strong>${due_date}</strong>.</p>
        <table role="presentation" class="inv-btn" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:10px;background:#924ee9;">
          <a href="${payLink}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Pay invoice &rarr;</a>
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;border:1px solid #ececf3;border-radius:12px;">
          <tr><td style="padding:14px 18px;font-size:13px;color:#8a8a99;border-bottom:1px solid #f1eff7;">Invoice</td><td style="padding:14px 18px;font-size:13px;font-weight:600;color:#1d1b2e;text-align:right;border-bottom:1px solid #f1eff7;">${invoice_number}</td></tr>
          <tr><td style="padding:14px 18px;font-size:13px;color:#8a8a99;border-bottom:1px solid #f1eff7;">Amount due</td><td style="padding:14px 18px;font-size:13px;font-weight:600;color:#1d1b2e;text-align:right;border-bottom:1px solid #f1eff7;">${amount}</td></tr>
          <tr><td style="padding:14px 18px;font-size:13px;color:#8a8a99;">Due date</td><td style="padding:14px 18px;font-size:13px;font-weight:600;color:#1d1b2e;text-align:right;">${due_date}</td></tr>
        </table>
        <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#5f5d72;">${notes}</p>
        <p style="margin:18px 0 0;font-size:14px;color:#1d1b2e;">Thank you,<br /><strong>${fromName}</strong></p>
      </td></tr>
      <tr><td class="inv-pad" style="padding:24px 32px;border-top:1px solid #ececf3;">
        <p style="margin:0;font-size:12px;color:#a3a3b0;">If the button doesn't work, paste this link into your browser:<br /><a href="${payLink}" style="color:#924ee9;word-break:break-all;">${payLink}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

export function buildInvoiceEmail(invoice: Invoice, profile: BusinessProfile) {
  const link = invoicePayLink(invoice);
  const amount = formatCurrency(invoice.total, invoice.currency);
  const due_date = formatDate(invoice.due_date);
  const subject = `Invoice ${invoice.invoice_number} from ${profile.name}`;
  const notes = invoice.notes || 'Thank you for your business.';
  // client is null for an ad-hoc recipient; the flat bill_to_* fields carry it
  const clientName = invoice.client?.name ?? invoice.bill_to_name ?? 'there';
  const clientEmail = invoice.client?.email ?? invoice.bill_to_email ?? '';
  const body = [
    `Hi ${clientName},`,
    '',
    `Here is invoice ${invoice.invoice_number} for ${amount}.`,
    `Due ${due_date}.`,
    '',
    `Pay online: ${link}`,
    '',
    'Thank you,',
    profile.name,
  ].join('\n');

  const content = invoiceEmailHtml({
    toName: clientName,
    fromName: profile.name,
    invoice_number: invoice.invoice_number,
    amount,
    due_date,
    payLink: link,
    notes,
  });

  // Everything the EmailJS template might reference. A one-line passthrough
  // template ({{{content}}}) is enough; structured fields are there too.
  const params = {
    to_email: clientEmail,
    to_name: clientName,
    from_name: profile.name,
    reply_to: profile.email,
    subject,
    invoice_number: invoice.invoice_number,
    amount,
    currency: invoice.currency,
    due_date: due_date,
    pay_link: link,
    notes,
    content,
    message: body,
  };

  return { to: clientEmail, subject, body, link, params };
}
