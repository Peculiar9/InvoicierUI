import { useEffect, useState } from 'react';
import { InvoiceDocument } from '@/components/InvoiceDocument';
import { ReceiptDocument } from '@/components/ReceiptDocument';
import { Payment } from '@/pages/Payment';
import { Confetti } from '@/components/Confetti';
import type { InvoiceDocData } from '@/components/InvoiceDocument';
import { Modal } from '@/components/Modal';
import {
  useClients,
  useCreateInvoice,
  useDeleteInvoice,
  useDuplicateInvoice,
  useInvoice,
  useMarkInvoicePaid,
  useSendInvoice,
  useUpdateInvoice,
  useCreateClient,
} from '@/hooks';
import { useAuthStore } from '@/stores/authStore';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useServicesStore } from '@/stores/servicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { copyInvoiceLink, printInvoice } from '@/lib/invoiceActions';
import { sendInvoiceEmail } from '@/lib/email';
import { toast } from '@/lib/toast';
import { formatCurrency } from '@/utils/format';
import { isPaid, isSettled } from '@/utils/invoiceStatus';
import { invoicesApi } from '@/api/invoices';
import { useQueryClient } from '@tanstack/react-query';
import type { PaymentRoute } from '@/types';
import type { Invoice } from '@/types';

interface DraftItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem: DraftItem = { description: '', quantity: 1, unitPrice: 0 };

/** Short, human time for the history rows. */
const formatWhen = (iso: string) => {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const InvoicePanel = () => {
  const { open, mode, invoiceId, prefillClientId, close, openView, openEdit, siblings, step } =
    useInvoicePanelStore();
  const profile = useSettingsStore((s) => s.profile);
  const services = useServicesStore((s) => s.services);
  const { data: clientsData } = useClients();
  const clients = clientsData?.data ?? [];

  const { data: invoice } = useInvoice(mode !== 'create' && invoiceId ? invoiceId : '');

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const sendInvoice = useSendInvoice();
  const markPaid = useMarkInvoicePaid();
  const duplicate = useDuplicateInvoice();
  const remove = useDeleteInvoice();
  const createClient = useCreateClient();
  const queryClient = useQueryClient();

  // declining a reported transfer, and voiding an invoice
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [acting, setActing] = useState(false);

  const refreshInvoice = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  /**
   * Do it, then hand back the way out. The snapshot is the invoice as it
   * stood a moment ago, so undo restores the record rather than making a
   * new one that merely looks like it.
   */
  const offerUndo = (message: string, previous: Invoice) => {
    toast.undo(message, async () => {
      await invoicesApi.restore(previous.id, previous);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      openView(previous.id);
      toast.success(`${previous.invoiceNumber} is back`);
    });
  };

  const confirmDecline = async () => {
    if (!invoice) return;
    setActing(true);
    try {
      const previous = invoice;
      await invoicesApi.declineClaim(invoice.id, declineReason.trim());
      refreshInvoice(invoice.id);
      setDeclineOpen(false);
      setDeclineReason('');
      offerUndo('Marked as not received. Your client has been told why.', previous);
    } finally {
      setActing(false);
    }
  };

  const confirmVoid = async () => {
    if (!invoice) return;
    setActing(true);
    try {
      const previous = invoice;
      await invoicesApi.voidInvoice(invoice.id, voidReason.trim());
      refreshInvoice(invoice.id);
      setVoidOpen(false);
      setVoidReason('');
      offerUndo(`${invoice.invoiceNumber} voided. The record stays in your books.`, previous);
    } finally {
      setActing(false);
    }
  };

  const [clientId, setClientId] = useState('');
  // billing someone who is not in the address book yet
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [currency, setCurrency] = useState(profile.currency || 'NGN');
  const [dueDate, setDueDate] = useState('');
  const [vatEnabled, setVatEnabled] = useState(true);
  const [whtExpected, setWhtExpected] = useState(false);
  const [paymentRoute, setPaymentRoute] = useState<PaymentRoute | ''>('');
  const [receivingAccountId, setReceivingAccountId] = useState('');
  const [terms, setTerms] = useState('Payment due within 14 days');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // reading an invoice should not mean closing it to reach the next one
  const at = invoiceId ? siblings.indexOf(invoiceId) : -1;
  const canStep = mode === 'view' && at !== -1;
  const hasPrev = canStep && at > 0;
  const hasNext = canStep && at < siblings.length - 1;
  useHotkeys(
    {
      ArrowLeft: () => hasPrev && step(-1),
      ArrowRight: () => hasNext && step(1),
    },
    open && canStep
  );
  // the sender checking the account details their client will read
  const [clientViewOpen, setClientViewOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ client?: string; items?: string }>({});

  // The three answers that make a payment tax-grade.
  const [paidOpen, setPaidOpen] = useState(false);
  // money landing is the whole point of the product, so it gets a burst
  const [celebrate, setCelebrate] = useState(0);
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payWht, setPayWht] = useState('');

  const emailVerified = useAuthStore((s) => s.user?.emailVerified ?? true);

  const editing = mode === 'create' || mode === 'edit';

  // Reset / prefill the form whenever the panel opens in a form mode.
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      setClientId(prefillClientId ?? '');
      setRecipientName('');
      setRecipientEmail('');
      setCurrency(profile.currency || 'NGN');
      setDueDate('');
      // onboarding answers set the defaults; every invoice can still differ
      setVatEnabled(profile.vatRegistered ?? true);
      setWhtExpected(profile.whtUsual ?? false);
      setPaymentRoute('');
      setReceivingAccountId('');
      setTerms('Payment due within 14 days');
      setNotes('');
      setItems([{ ...emptyItem }]);
      setSavedId(null);
    } else if (mode === 'edit' && invoice) {
      setClientId(invoice.client.id);
      setRecipientName(invoice.client.id ? '' : invoice.client.name);
      setRecipientEmail(invoice.client.id ? '' : (invoice.client.email ?? ''));
      setCurrency(invoice.currency);
      setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : '');
      setVatEnabled(invoice.vatEnabled ?? invoice.taxRate > 0);
      setWhtExpected(invoice.whtExpected ?? false);
      setPaymentRoute(invoice.paymentRoute ?? '');
      setReceivingAccountId(invoice.receivingAccountId ?? '');
      setTerms(invoice.terms ?? '');
      setNotes(invoice.notes ?? '');
      setItems(
        invoice.items.length
          ? invoice.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            }))
          : [{ ...emptyItem }]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, invoice?.id, prefillClientId]);

  const client = clients.find((c) => c.id === clientId) ?? null;
  // either a saved client, or a name typed straight onto the invoice
  const billToName = client?.name ?? recipientName.trim();
  const billToEmail = client?.email ?? recipientEmail.trim();
  const lines = items.map((it) => ({ ...it, total: it.quantity * it.unitPrice }));
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const taxRate = vatEnabled ? 0.075 : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // The flow adds up: a client first, then at least one real item. Save and
  // Send stay asleep until the invoice can actually exist.
  const hasValidItem = items.some(
    (it) => it.description.trim() && it.quantity > 0 && it.unitPrice >= 0
  );
  const formReady = Boolean(billToName) && hasValidItem && subtotal > 0;
  // sending needs somewhere to send it; saving and printing do not
  const canSend = formReady && Boolean(billToEmail);
  const flowHint = !billToName
    ? { step: '1 of 2', text: 'Who is this invoice for?' }
    : !formReady
      ? { step: '2 of 2', text: 'Add at least one item with a price' }
      : null;

  const draftDoc: InvoiceDocData = {
    invoiceNumber: invoice?.invoiceNumber ?? 'DRAFT',
    status: 'draft',
    client:
      client ??
      (billToName
        ? { id: '', name: billToName, email: billToEmail, createdAt: '' }
        : null),
    items: lines,
    subtotal,
    tax,
    taxRate,
    total,
    currency,
    dueDate: dueDate || undefined,
    terms,
    notes,
  };

  const updateItem = (i: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setErrors((er) => ({ ...er, items: undefined }));
  };
  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (i: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const addServiceLine = (id: string) => {
    const svc = services.find((s) => s.id === id);
    if (!svc) return;
    setItems((prev) => [
      ...prev.filter((it) => it.description || it.unitPrice),
      { description: svc.name, quantity: 1, unitPrice: svc.price },
    ]);
  };

  const buildDto = () => ({
    ...(clientId
      ? { clientId }
      : { recipientName: recipientName.trim(), recipientEmail: recipientEmail.trim() }),
    currency,
    dueDate: dueDate || new Date().toISOString().slice(0, 10),
    taxRate,
    vatEnabled,
    whtExpected,
    ...(paymentRoute ? { paymentRoute } : {}),
    ...(receivingAccountId ? { receivingAccountId } : {}),
    notes,
    terms,
    items: items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
  });

  const openPaidDialog = () => {
    if (!invoice) return;
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayAmount(String(invoice.total));
    setPayWht('');
    setPaidOpen(true);
  };

  const confirmPaid = () => {
    if (!invoice) return;
    const amount = Number(payAmount);
    if (!payDate || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Date received and a valid amount are required');
      return;
    }
    const wht = Number(payWht) || 0;
    markPaid.mutate(
      {
        id: invoice.id,
        data: {
          dateReceived: payDate,
          amountReceived: amount,
          ...(wht > 0 ? { whtWithheld: wht } : {}),
        },
      },
      {
        onSuccess: () => {
          setPaidOpen(false);
          setCelebrate((n) => n + 1);
          window.setTimeout(() => setCelebrate(0), 4200);
          toast.success('Payment recorded, receipt on its way');
        },
      }
    );
  };

  const validate = (): boolean => {
    const next: { client?: string; items?: string } = {};
    if (!billToName) next.client = 'Pick a client or type who this is for';
    const hasValidItem = items.some(
      (it) => it.description.trim() && it.quantity > 0 && it.unitPrice >= 0
    );
    if (!hasValidItem || subtotal <= 0) {
      next.items = 'Add at least one item with a description and amount';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Persist the current draft (create once, then update) and return the saved invoice.
  const persist = async (): Promise<Invoice | null> => {
    if (!validate()) {
      toast.error('Please fix the highlighted fields');
      return null;
    }
    try {
      if (mode === 'edit' && invoiceId) {
        return await updateInvoice.mutateAsync({ id: invoiceId, data: buildDto() });
      }
      if (savedId) {
        return await updateInvoice.mutateAsync({ id: savedId, data: buildDto() });
      }
      const created = await createInvoice.mutateAsync(buildDto());
      setSavedId(created.id);
      return created;
    } catch {
      toast.error('Could not save the invoice');
      return null;
    }
  };

  const emailAndSend = async (inv: Invoice) => {
    if (!emailVerified) {
      toast.error('Verify your email first, so invoices go out under your name');
      return;
    }
    const method = await sendInvoiceEmail(inv, profile);
    sendInvoice.mutate(
      { id: inv.id, channel: method === 'none' ? 'link' : method, to: inv.client?.email },
      {
      onSuccess: () =>
        toast.success(
          method === 'emailjs'
            ? `Invoice emailed to ${inv.client.name}`
            : method === 'mailto'
              ? `Email draft opened for ${inv.client.name}`
                : 'Marked as sent (client has no email)'
          ),
      }
    );
  };

  const nudge = async (inv: Invoice) => {
    setBusy('Remind');
    try {
      await sendInvoiceEmail(inv, profile);
      sendInvoice.mutate(
        { id: inv.id, channel: 'reminder', to: inv.client?.email },
        { onSuccess: () => toast.success(`Reminder sent to ${inv.client?.name}`) }
      );
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy('Save');
    try {
      const inv = await persist();
      if (inv) {
        toast.success(mode === 'edit' ? 'Invoice updated' : 'Invoice saved');
        openView(inv.id);
      }
    } finally {
      setBusy(null);
    }
  };
  const handleSend = async () => {
    setBusy('Send');
    try {
      const inv = await persist();
      if (inv) {
        await emailAndSend(inv);
        openView(inv.id);
      }
    } finally {
      setBusy(null);
    }
  };
  const handleCopy = async () => {
    setBusy('Copy Link');
    try {
      const inv = await persist();
      if (inv) await copyInvoiceLink(inv.id);
    } finally {
      setBusy(null);
    }
  };
  const handleDownload = async () => {
    setBusy('Download');
    try {
      if (await persist()) {
        setPreviewOpen(true);
        setTimeout(() => printInvoice(), 250);
      }
    } finally {
      setBusy(null);
    }
  };

  const editActions = [
    { label: 'Save', bx: 'bx-save', primary: true, needsReady: true, needsEmail: false, onClick: handleSave },
    {
      label: 'Send',
      bx: 'bx-send',
      primary: false,
      needsReady: true,
      needsEmail: true,
      onClick: handleSend,
    },
    { label: 'Copy Link', bx: 'bx-link', primary: false, needsReady: true, needsEmail: false, onClick: handleCopy },
    {
      label: 'Download',
      bx: 'bx-download',
      primary: false,
      needsReady: true,
      needsEmail: false,
      onClick: handleDownload,
    },
    {
      label: 'Preview',
      bx: 'bx-show',
      primary: false,
      needsReady: false,
      needsEmail: false,
      onClick: () => setPreviewOpen(true),
    },
  ];

  return (
    <>
      {celebrate > 0 && <Confetti count={54} burstKey={celebrate} />}
      <button
        type="button"
        className={`ipanel-scrim${open ? ' open' : ''}`}
        aria-label="Close panel"
        onClick={close}
      />
      <aside className={`ipanel${open ? ' open' : ''}`} aria-hidden={!open}>
        {open && (
          <>
            <header className="ipanel-head">
              <div className="ipanel-head-title">
                <span className="ipanel-kicker">
                  {mode === 'create' ? 'New invoice' : mode === 'edit' ? 'Editing' : 'Invoice'}
                </span>
                <h2>
                  {mode === 'create'
                    ? 'Create invoice'
                    : `#${invoice?.invoiceNumber ?? '…'}`}
                </h2>
              </div>
              {canStep && siblings.length > 1 && (
                <div className="ipanel-step">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => step(-1)}
                    title="Previous invoice (left arrow)"
                    aria-label="Previous invoice"
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  <span>
                    {at + 1} of {siblings.length}
                  </span>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => step(1)}
                    title="Next invoice (right arrow)"
                    aria-label="Next invoice"
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                </div>
              )}
              <button type="button" className="ipanel-close" onClick={close} aria-label="Close">
                <i className="bx bx-x" />
              </button>
            </header>

            {/* ------------------------------------------------------- VIEW */}
            {mode === 'view' && (
              <>
                <div className="ipanel-actions">
                  {/* a settled invoice is a record, not a draft: editing it
                      would rewrite something the client already has */}
                  {invoice && !isSettled(invoice.status) && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openEdit(invoice.id)}
                    >
                      <i className="bx bx-edit-alt" /> Edit
                    </button>
                  )}
                  {invoice && isSettled(invoice.status) && (
                    <span className="iw-locked" title="Settled invoices cannot be edited">
                      <i className="bx bx-lock-alt" />
                      {invoice.status === 'cancelled' ? 'Voided' : 'Locked'}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => invoice && emailAndSend(invoice)}
                  >
                    <i className="bx bx-send" /> Send
                  </button>
                  {invoice && !isSettled(invoice.status) && invoice.sends?.length ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === 'Remind'}
                      onClick={() => invoice && nudge(invoice)}
                    >
                      {busy === 'Remind' ? (
                        <span className="iw-spin" aria-hidden="true" />
                      ) : (
                        <i className="bx bx-bell" />
                      )}
                      Remind
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => invoice && copyInvoiceLink(invoice.id)}
                  >
                    <i className="bx bx-link" /> Copy link
                  </button>
                  {invoice?.receiptNumber && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setReceiptOpen(true)}
                    >
                      <i className="bx bx-receipt" /> Receipt
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setClientViewOpen(true)}
                  >
                    <i className="bx bx-show" /> Client&rsquo;s view
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => printInvoice()}>
                    <i className="bx bx-printer" /> Print / PDF
                  </button>
                  {invoice && (!isPaid(invoice.status) || !invoice.dateReceived) && (
                    <button type="button" className="btn btn-ghost" onClick={openPaidDialog}>
                      <i className="bx bx-check-circle" />{' '}
                      {isPaid(invoice.status) ? 'Record payment details' : 'Mark paid'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      invoice &&
                      duplicate.mutate(invoice.id, {
                        onSuccess: (copy) => {
                          toast.success('Duplicated as a draft');
                          openView(copy.id);
                        },
                      })
                    }
                  >
                    <i className="bx bx-copy" /> Duplicate
                  </button>
                  {invoice && !isSettled(invoice.status) && invoice.status !== 'draft' && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setVoidOpen(true)}
                    >
                      <i className="bx bx-block" /> Void
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (!invoice) return;
                      const previous = invoice;
                      remove.mutate(invoice.id, {
                        onSuccess: () => {
                          close();
                          offerUndo(`${previous.invoiceNumber} deleted`, previous);
                        },
                      });
                    }}
                  >
                    <i className="bx bx-trash" /> Delete
                  </button>
                </div>
                <div className="ipanel-body">
                  {invoice && (invoice.sends?.length ||
                    invoice.viewedAt ||
                    invoice.claimedAt ||
                    invoice.declinedAt ||
                    invoice.dateReceived) ? (
                    <ol className="iw-trail" aria-label="Invoice history">
                      {invoice.sends?.map((s, i) => (
                        <li key={`send-${i}`} className="is-sent">
                          <i className="bx bx-send" aria-hidden="true" />
                          <div>
                            <b>
                              Sent{s.channel === 'mailto' ? ' from your mail app' : ''}
                              {s.channel === 'link' ? ' as a link' : ''}
                            </b>
                            <small>
                              {s.to ? `${s.to} · ` : ''}
                              {formatWhen(s.at)}
                            </small>
                          </div>
                        </li>
                      ))}
                      {invoice.viewedAt && (
                        <li className="is-viewed">
                          <i className="bx bx-show" aria-hidden="true" />
                          <div>
                            <b>Opened by {invoice.client?.name ?? 'the client'}</b>
                            <small>{formatWhen(invoice.viewedAt)}</small>
                          </div>
                        </li>
                      )}
                      {invoice.claimedAt && (
                        <li className="is-claimed">
                          <i className="bx bx-time-five" aria-hidden="true" />
                          <div>
                            <b>{invoice.client?.name ?? 'The client'} reported a transfer</b>
                            <small>
                              {formatWhen(invoice.claimedAt)}
                              {invoice.claimReference ? ` · ref ${invoice.claimReference}` : ''}
                            </small>
                          </div>
                        </li>
                      )}
                      {invoice.declinedAt && (
                        <li className="is-declined">
                          <i className="bx bx-x-circle" aria-hidden="true" />
                          <div>
                            <b>You reported the money had not arrived</b>
                            <small>
                              {formatWhen(invoice.declinedAt)}
                              {invoice.declineReason ? ` · "${invoice.declineReason}"` : ''}
                            </small>
                          </div>
                        </li>
                      )}
                      {invoice.dateReceived && (
                        <li className="is-paid">
                          <i className="bx bx-check-circle" aria-hidden="true" />
                          <div>
                            <b>
                              Paid{' '}
                              {formatCurrency(
                                invoice.amountReceived ?? invoice.total,
                                invoice.currency
                              )}
                              {invoice.paymentMethod ? ` by ${invoice.paymentMethod}` : ''}
                            </b>
                            <small>received {invoice.dateReceived.slice(0, 10)}</small>
                          </div>
                        </li>
                      )}
                      {invoice.receiptNumber && (
                        <li className="is-receipted">
                          <i className="bx bx-receipt" aria-hidden="true" />
                          <div>
                            <b>Receipt {invoice.receiptNumber} issued</b>
                            <small>
                              {invoice.payerEmail
                                ? `sent to ${invoice.payerEmail}`
                                : 'sent to both parties'}
                            </small>
                          </div>
                        </li>
                      )}
                    </ol>
                  ) : null}
                  {invoice?.status === 'cancelled' && (
                    <div className="iw-voided">
                      <i className="bx bx-block" aria-hidden="true" />
                      <div>
                        <b>This invoice was voided</b>
                        <small>
                          {invoice.voidReason
                            ? invoice.voidReason
                            : 'It stays in your books but is no longer owed.'}
                        </small>
                      </div>
                    </div>
                  )}

                  {invoice?.status === 'awaiting' && (
                    <div className="iw-claim">
                      <div className="iw-claim-head">
                        <span className="iw-claim-icon">
                          <i className="bx bx-time-five" />
                        </span>
                        <div>
                          <b>{invoice.client?.name ?? 'Your client'} says they sent this</b>
                          <small>
                            Reported{' '}
                            {invoice.claimedAt ? formatWhen(invoice.claimedAt) : 'recently'}
                            {invoice.claimReference ? ` · ref ${invoice.claimReference}` : ''}
                          </small>
                        </div>
                      </div>
                      <p className="iw-claim-copy">
                        Nothing is recorded until you have seen the money. Check the
                        account, then confirm what actually landed.
                      </p>
                      <div className="iw-claim-actions">
                        <button type="button" className="iw-btn" onClick={openPaidDialog}>
                          <i className="bx bx-check-circle" /> It landed, record it
                        </button>
                        <button
                          type="button"
                          className="iw-btn iw-btn--ghost"
                          onClick={() => setDeclineOpen(true)}
                        >
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}

                  {invoice &&
                    !invoice.client?.id &&
                    isPaid(invoice.status) && (
                      <div className="iw-savelead">
                        <div>
                          <b>{invoice.client?.name} paid you.</b>
                          <small>
                            Add them to your clients and they will be one tap away
                            next time.
                          </small>
                        </div>
                        <button
                          type="button"
                          className="iw-btn"
                          disabled={createClient.isPending}
                          onClick={() =>
                            createClient.mutate(
                              {
                                name: invoice.client.name,
                                email: invoice.client.email,
                              },
                              {
                                onSuccess: (saved) => {
                                  // link the invoice to the client it created
                                  updateInvoice.mutate({
                                    id: invoice.id,
                                    data: { clientId: saved.id },
                                  });
                                  toast.success(`${saved.name} added to your clients`);
                                },
                              }
                            )
                          }
                        >
                          {createClient.isPending ? (
                            <span className="iw-spin" aria-hidden="true" />
                          ) : (
                            <i className="bx bx-user-plus" aria-hidden="true" />
                          )}
                          Add to clients
                        </button>
                      </div>
                    )}

                  {invoice && isPaid(invoice.status) && invoice.dateReceived && (
                    <div className="iw-march" style={{ marginBottom: 16 }}>
                      <i className="bx bx-badge-check" aria-hidden="true" />
                      <span>
                        <b>Tax-grade record.</b> Received{' '}
                        {formatCurrency(invoice.amountReceived ?? invoice.total, invoice.currency)}{' '}
                        on {invoice.dateReceived.slice(0, 10)}
                        {invoice.whtWithheld
                          ? `, ${formatCurrency(invoice.whtWithheld, invoice.currency)} withheld (WHT credit)`
                          : ''}
                        .
                      </span>
                    </div>
                  )}
                  {invoice ? (
                    <InvoiceDocument data={invoice} />
                  ) : (
                    <p className="view-empty">Loading invoice…</p>
                  )}
                </div>
              </>
            )}

            {/* --------------------------------------------------- CREATE / EDIT */}
            {editing && (
              <>
                <div className="ipanel-body">
                  {flowHint ? (
                    <div className="iw-flowhint" role="status">
                      <span className="step">{flowHint.step}</span>
                      {flowHint.text}
                    </div>
                  ) : (
                    <div className="iw-flowhint iw-flowhint--ready" role="status">
                      <i className="bx bx-check-circle" aria-hidden="true" />
                      Ready to save, send or share
                    </div>
                  )}
                  <div className="cinv-fields">
                    <label className="cinv-field">
                      <span>Bill to</span>
                      <select
                        value={clientId}
                        className={errors.client ? 'is-invalid' : ''}
                        onChange={(e) => {
                          setClientId(e.target.value);
                          setErrors((er) => ({ ...er, client: undefined }));
                        }}
                      >
                        <option value="">Someone new…</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.client && <small className="field-error">{errors.client}</small>}
                    </label>
                    <label className="cinv-field">
                      <span>Currency</span>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        <option value="NGN">NGN, paid via Paystack</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </label>
                    <label className="cinv-field">
                      <span>Due date</span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </label>
                  </div>

                  {!clientId && (
                    <div className="iw-adhoc">
                      <label className="cinv-field">
                        <span>Their name</span>
                        <input
                          type="text"
                          value={recipientName}
                          placeholder="Otto Holdings"
                          onChange={(e) => {
                            setRecipientName(e.target.value);
                            setErrors((er) => ({ ...er, client: undefined }));
                          }}
                        />
                      </label>
                      <label className="cinv-field">
                        <span>Their email</span>
                        <input
                          type="email"
                          value={recipientEmail}
                          placeholder="accounts@otto.com"
                          onChange={(e) => setRecipientEmail(e.target.value)}
                        />
                      </label>
                      <p className="iw-adhoc-note">
                        <i className="bx bx-info-circle" aria-hidden="true" />
                        No need to add them as a client first. You can save them
                        to your list once they pay.
                      </p>
                    </div>
                  )}

                  <label className="cinv-field cinv-field--mt">
                    <span>How they pay</span>
                    <select
                      value={paymentRoute}
                      onChange={(e) => setPaymentRoute(e.target.value as PaymentRoute | '')}
                    >
                      <option value="">
                        My default for {currency}
                        {profile.routeByCurrency?.[currency]
                          ? ` (${profile.routeByCurrency[currency]})`
                          : ''}
                      </option>
                      <option value="instant">Instant only</option>
                      <option value="transfer">Transfer to my account</option>
                      <option value="both">Let them choose</option>
                    </select>
                    {(paymentRoute === 'transfer' || paymentRoute === 'both') &&
                      !(profile.receivingAccounts ?? []).some((a) => a.currency === currency) && (
                        <small className="field-error">
                          No {currency} account saved yet, so instant will be offered
                          instead. Add one under Settings, Getting paid.
                        </small>
                      )}
                  </label>

                  {(() => {
                    const forCurrency = (profile.receivingAccounts ?? []).filter(
                      (a) => a.currency === currency
                    );
                    const showsTransfer =
                      paymentRoute === 'transfer' ||
                      paymentRoute === 'both' ||
                      (!paymentRoute &&
                        (profile.routeByCurrency?.[currency] ?? 'transfer') !== 'instant');
                    // only worth asking when more than one account could serve
                    return showsTransfer && forCurrency.length > 1 ? (
                      <label className="cinv-field">
                        <span>Which account</span>
                        <select
                          value={receivingAccountId}
                          onChange={(e) => setReceivingAccountId(e.target.value)}
                        >
                          <option value="">My default {currency} account</option>
                          {forCurrency.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null;
                  })()}

                  <div className="iw-toggles">
                    <label className="iw-toggle">
                      <input
                        type="checkbox"
                        checked={vatEnabled}
                        onChange={(e) => setVatEnabled(e.target.checked)}
                      />
                      <span className="knob" aria-hidden="true" />
                      VAT 7.5%
                      <small>invoice level</small>
                    </label>
                    <label className="iw-toggle">
                      <input
                        type="checkbox"
                        checked={whtExpected}
                        onChange={(e) => setWhtExpected(e.target.checked)}
                      />
                      <span className="knob" aria-hidden="true" />
                      Client withholds WHT
                      <small>credit recorded on payment</small>
                    </label>
                  </div>

                  <div className="cinv-items-head">
                    <h3 className="cinv-section-title">Items</h3>
                    {services.length > 0 && (
                      <select
                        className="cinv-service-pick"
                        value=""
                        onChange={(e) => e.target.value && addServiceLine(e.target.value)}
                      >
                        <option value="">+ From services</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {formatCurrency(s.price, currency)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="cinv-items">
                    <div className="cinv-item cinv-item--head">
                      <span>Description</span>
                      <span>Qty</span>
                      <span>Price</span>
                      <span>Amount</span>
                      <span />
                    </div>
                    {lines.map((line, i) => (
                      <div className="cinv-item" key={i}>
                        <input
                          type="text"
                          placeholder="Item description"
                          value={line.description}
                          onChange={(e) => updateItem(i, { description: e.target.value })}
                        />
                        <input
                          type="number"
                          min={0}
                          step="1"
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(e) =>
                            updateItem(i, { quantity: Math.max(0, Number(e.target.value) || 0) })
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={line.unitPrice}
                          onChange={(e) =>
                            updateItem(i, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                          }
                        />
                        <span className="cinv-line-total">
                          {formatCurrency(line.total, currency)}
                        </span>
                        <button
                          type="button"
                          className="cinv-remove"
                          onClick={() => removeItem(i)}
                          aria-label="Remove item"
                        >
                          <i className="bx bx-x" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {errors.items && <small className="field-error">{errors.items}</small>}

                  <button type="button" className="cinv-add" onClick={addItem}>
                    <i className="bx bx-plus" /> Add item
                  </button>

                  <div className="cinv-totals">
                    <div>
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {vatEnabled && (
                      <div>
                        <span>VAT (7.5%)</span>
                        <span>{formatCurrency(tax, currency)}</span>
                      </div>
                    )}
                    <div className="cinv-grand">
                      <span>Total</span>
                      <span>{formatCurrency(total, currency)}</span>
                    </div>
                  </div>

                  <label className="cinv-field cinv-field--mt">
                    <span>Notes</span>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Thanks for your business!"
                    />
                  </label>
                  <label className="cinv-field">
                    <span>Terms</span>
                    <input type="text" value={terms} onChange={(e) => setTerms(e.target.value)} />
                  </label>
                </div>

              </>
            )}
          </>
        )}
      </aside>

      {/* the contextual right rail rides along while preparing an invoice */}
      {open && editing && (
        <aside className="ws-rail ws-rail-right ipanel-rail" key="invoice-actions">
          <ul>
            {editActions.map((action) => (
              <li key={action.label}>
                <button
                  type="button"
                  className={`ws-action${action.primary ? ' ws-action--primary' : ''}`}
                  data-label={
                    action.needsReady && !formReady
                      ? `${action.label} · finish the invoice first`
                      : action.needsEmail && !canSend
                        ? `${action.label} · add an email address first`
                        : action.label
                  }
                  aria-label={action.label}
                  onClick={action.onClick}
                  disabled={
                    !!busy ||
                    (action.needsReady && !formReady) ||
                    (action.needsEmail && !canSend)
                  }
                >
                  {busy === action.label ? (
                    <span className="iw-spin" aria-hidden="true" />
                  ) : (
                    <i className={`bx ${action.bx}`} aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Invoice preview"
        size="lg"
      >
        <InvoiceDocument data={draftDoc} />
      </Modal>

      {/* the real payment page, rendered in place, with nothing recorded */}
      <Modal
        open={clientViewOpen}
        onClose={() => setClientViewOpen(false)}
        title="What your client sees"
        size="lg"
      >
        {/* rendered at real desktop width, then scaled, so the layout is honest */}
        <div className="pay-preview-scale">
          {invoice && <Payment invoiceId={invoice.id} preview />}
        </div>
      </Modal>

      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title={`Receipt ${invoice?.receiptNumber ?? ''}`}
        size="lg"
      >
        {invoice && <ReceiptDocument invoice={invoice} />}
        <div className="iw-paid-actions">
          <button type="button" className="iw-btn iw-btn--ghost" onClick={() => printInvoice()}>
            <i className="bx bx-printer" /> Print or save as PDF
          </button>
        </div>
      </Modal>

      {/* telling the payer why, instead of silently rewinding their screen */}
      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Money not received"
      >
        <div className="iw-paid-form">
          <p className="hint">
            <b>Your client will see this.</b> They think the money is on its
            way, so a sentence about what to check saves an email thread.
          </p>
          <label className="cinv-field">
            <span>What should they know?</span>
            <textarea
              rows={3}
              autoFocus
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Nothing has landed yet. Could you check the reference and send the receipt from your bank?"
            />
          </label>
          <div className="iw-paid-actions">
            <button
              type="button"
              className="iw-btn iw-btn--ghost"
              onClick={() => setDeclineOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="iw-btn" onClick={confirmDecline} disabled={acting}>
              {acting ? <span className="iw-spin" aria-hidden="true" /> : null}
              Tell them
            </button>
          </div>
        </div>
      </Modal>

      {/* voiding keeps the number and the paper trail */}
      <Modal open={voidOpen} onClose={() => setVoidOpen(false)} title="Void this invoice">
        <div className="iw-paid-form">
          <p className="hint">
            <b>The record stays.</b> {invoice?.invoiceNumber} keeps its number and
            its history, but it stops counting as money owed and the payment link
            closes. Use this instead of deleting when something has already been
            sent.
          </p>
          <label className="cinv-field">
            <span>Reason (optional)</span>
            <input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Replaced by IV1042, wrong amount"
            />
          </label>
          <div className="iw-paid-actions">
            <button
              type="button"
              className="iw-btn iw-btn--ghost"
              onClick={() => setVoidOpen(false)}
            >
              Keep it
            </button>
            <button type="button" className="iw-btn iw-btn--danger" onClick={confirmVoid} disabled={acting}>
              {acting ? <span className="iw-spin" aria-hidden="true" /> : null}
              Void invoice
            </button>
          </div>
        </div>
      </Modal>

      {/* the three answers that make a payment tax-grade */}
      <Modal open={paidOpen} onClose={() => setPaidOpen(false)} title="Record payment">
        <div className="iw-paid-form">
          <p className="hint">
            <b>Date received drives your tax record.</b> Income exists when the
            money lands, not when you invoiced. For foreign payments it also
            sets the conversion rate that filing season will use.
          </p>
          <div className="iw-paid-grid">
            <label className="cinv-field">
              <span>Date received</span>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </label>
            <label className="cinv-field">
              <span>Amount received ({invoice?.currency})</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="After fees and FX spreads"
              />
            </label>
          </div>
          {invoice?.whtExpected && (
            <label className="cinv-field">
              <span>Amount withheld, WHT ({invoice?.currency})</span>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={payWht}
                onChange={(e) => setPayWht(e.target.value)}
                placeholder="Spawns a WHT credit record"
              />
            </label>
          )}
          <div className="iw-paid-actions">
            <button
              type="button"
              className="iw-btn iw-btn--ghost"
              onClick={() => setPaidOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="iw-btn"
              onClick={confirmPaid}
              disabled={markPaid.isPending}
            >
              {markPaid.isPending ? (
                <span className="iw-spin" aria-hidden="true" />
              ) : (
                <i className="bx bx-check-circle" aria-hidden="true" />
              )}
              Record payment
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
