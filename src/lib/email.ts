import emailjs from '@emailjs/browser';
import type { Invoice } from '@/types';
import type { BusinessProfile } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/utils/format';

const config = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

/** Base URL for public links — explicit override, else the current origin
 *  (localhost in dev, the deployed domain on Vercel/Netlify). */
export const appBaseUrl = () => {
  const configured = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return typeof window !== 'undefined' ? window.location.origin : '';
};

export const invoicePayLink = (invoice: Invoice) => `${appBaseUrl()}/pay/${invoice.id}`;

/** Full, email-client-safe HTML — generated here so EmailJS only needs a {{{content}}} passthrough. */
function invoiceEmailHtml(opts: {
  toName: string;
  fromName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  payLink: string;
  notes: string;
}): string {
  const { toName, fromName, invoiceNumber, amount, dueDate, payLink, notes } = opts;
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
        <span class="inv-num" style="float:right;font-size:13px;color:rgba(255,255,255,0.85);">Invoice ${invoiceNumber}</span>
      </td></tr>
      <tr><td class="inv-pad" style="padding:36px 32px 8px;">
        <p style="margin:0 0 4px;font-size:13px;color:#8a8a99;">New invoice from ${fromName}</p>
        <h1 class="inv-amount" style="margin:0 0 18px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#1d1b2e;">${amount}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5f5d72;">Hi ${toName}, here is invoice <strong>${invoiceNumber}</strong> for <strong>${amount}</strong>, due <strong>${dueDate}</strong>.</p>
        <table role="presentation" class="inv-btn" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:10px;background:#924ee9;">
          <a href="${payLink}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Pay invoice &rarr;</a>
        </td></tr></table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;border:1px solid #ececf3;border-radius:12px;">
          <tr><td style="padding:14px 18px;font-size:13px;color:#8a8a99;border-bottom:1px solid #f1eff7;">Invoice</td><td style="padding:14px 18px;font-size:13px;font-weight:600;color:#1d1b2e;text-align:right;border-bottom:1px solid #f1eff7;">${invoiceNumber}</td></tr>
          <tr><td style="padding:14px 18px;font-size:13px;color:#8a8a99;border-bottom:1px solid #f1eff7;">Amount due</td><td style="padding:14px 18px;font-size:13px;font-weight:600;color:#1d1b2e;text-align:right;border-bottom:1px solid #f1eff7;">${amount}</td></tr>
          <tr><td style="padding:14px 18px;font-size:13px;color:#8a8a99;">Due date</td><td style="padding:14px 18px;font-size:13px;font-weight:600;color:#1d1b2e;text-align:right;">${dueDate}</td></tr>
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
  const dueDate = formatDate(invoice.dueDate);
  const subject = `Invoice ${invoice.invoiceNumber} from ${profile.name}`;
  const notes = invoice.notes || 'Thank you for your business.';
  const body = [
    `Hi ${invoice.client.name},`,
    '',
    `Here is invoice ${invoice.invoiceNumber} for ${amount}.`,
    `Due ${dueDate}.`,
    '',
    `Pay online: ${link}`,
    '',
    'Thank you,',
    profile.name,
  ].join('\n');

  const content = invoiceEmailHtml({
    toName: invoice.client.name,
    fromName: profile.name,
    invoiceNumber: invoice.invoiceNumber,
    amount,
    dueDate,
    payLink: link,
    notes,
  });

  // Everything the EmailJS template might reference. A one-line passthrough
  // template ({{{content}}}) is enough; structured fields are there too.
  const params = {
    to_email: invoice.client.email,
    to_name: invoice.client.name,
    from_name: profile.name,
    reply_to: profile.email,
    subject,
    invoice_number: invoice.invoiceNumber,
    amount,
    currency: invoice.currency,
    due_date: dueDate,
    pay_link: link,
    notes,
    content,
    message: body,
  };

  return { to: invoice.client.email, subject, body, link, params };
}

export type EmailResult = 'emailjs' | 'mailto' | 'none';

/**
 * Sends an invoice email entirely from the client:
 *  - if EmailJS env vars are set, sends for real via the EmailJS browser SDK
 *    (works on the free tier from your origin — no allowlist/subscription needed);
 *  - otherwise opens the user's mail composer prefilled (mailto:).
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  profile: BusinessProfile
): Promise<EmailResult> {
  const { to, subject, body, params } = buildInvoiceEmail(invoice, profile);
  if (!to) return 'none';

  if (config.serviceId && config.templateId && config.publicKey) {
    try {
      await emailjs.send(config.serviceId, config.templateId, params, {
        publicKey: config.publicKey,
      });
      return 'emailjs';
    } catch {
      /* fall through to mailto */
    }
  }

  if (typeof window !== 'undefined') {
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }
  return 'mailto';
}
