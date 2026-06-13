import { useEffect, useState } from 'react';
import { InvoiceDocument } from '@/components/InvoiceDocument';
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
} from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { useServicesStore } from '@/stores/servicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { copyInvoiceLink, printInvoice } from '@/lib/invoiceActions';
import { sendInvoiceEmail } from '@/lib/email';
import { toast } from '@/lib/toast';
import { formatCurrency } from '@/utils/format';
import type { Invoice } from '@/types';

interface DraftItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem: DraftItem = { description: '', quantity: 1, unitPrice: 0 };

export const InvoicePanel = () => {
  const { open, mode, invoiceId, prefillClientId, close, openView, openEdit } =
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

  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState(profile.currency || 'USD');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(0.075);
  const [terms, setTerms] = useState('Payment due within 14 days');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...emptyItem }]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ client?: string; items?: string }>({});

  const editing = mode === 'create' || mode === 'edit';

  // Reset / prefill the form whenever the panel opens in a form mode.
  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      setClientId(prefillClientId ?? '');
      setCurrency(profile.currency || 'USD');
      setDueDate('');
      setTaxRate(0.075);
      setTerms('Payment due within 14 days');
      setNotes('');
      setItems([{ ...emptyItem }]);
      setSavedId(null);
    } else if (mode === 'edit' && invoice) {
      setClientId(invoice.client.id);
      setCurrency(invoice.currency);
      setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : '');
      setTaxRate(invoice.taxRate);
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
  const lines = items.map((it) => ({ ...it, total: it.quantity * it.unitPrice }));
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const draftDoc: InvoiceDocData = {
    invoiceNumber: invoice?.invoiceNumber ?? 'DRAFT',
    status: 'draft',
    client,
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
    clientId,
    currency,
    dueDate: dueDate || new Date().toISOString().slice(0, 10),
    taxRate,
    notes,
    terms,
    items: items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
  });

  const validate = (): boolean => {
    const next: { client?: string; items?: string } = {};
    if (!clientId) next.client = 'Select a client';
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
    const method = await sendInvoiceEmail(inv, profile);
    sendInvoice.mutate(inv.id, {
      onSuccess: () =>
        toast.success(
          method === 'emailjs'
            ? `Invoice emailed to ${inv.client.name}`
            : method === 'mailto'
              ? `Email draft opened for ${inv.client.name}`
              : 'Marked as sent (client has no email)'
        ),
    });
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
    { label: 'Save', img: 'save.png', className: 'legacy-save', onClick: handleSave },
    { label: 'Send', img: 'send.png', className: 'legacy-send', onClick: handleSend },
    { label: 'Copy Link', img: 'copy.png', className: 'legacy-copy', onClick: handleCopy },
    { label: 'Download', img: 'download.png', className: 'legacy-download', onClick: handleDownload },
    {
      label: 'Preview',
      img: 'preview.png',
      className: 'legacy-preview',
      onClick: () => setPreviewOpen(true),
    },
  ];

  return (
    <>
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
              <button type="button" className="ipanel-close" onClick={close} aria-label="Close">
                <i className="bx bx-x" />
              </button>
            </header>

            {/* ------------------------------------------------------- VIEW */}
            {mode === 'view' && (
              <>
                <div className="ipanel-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => invoice && openEdit(invoice.id)}
                  >
                    <i className="bx bx-edit-alt" /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => invoice && emailAndSend(invoice)}
                  >
                    <i className="bx bx-send" /> Send
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => invoice && copyInvoiceLink(invoice.id)}
                  >
                    <i className="bx bx-link" /> Copy link
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => printInvoice()}>
                    <i className="bx bx-printer" /> Print / PDF
                  </button>
                  {invoice && invoice.status !== 'paid' && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        sendInvoice &&
                        markPaid.mutate(invoice.id, {
                          onSuccess: () => toast.success('Marked as paid'),
                        })
                      }
                    >
                      <i className="bx bx-check-circle" /> Mark paid
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
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (invoice && window.confirm('Delete this invoice?')) {
                        remove.mutate(invoice.id, {
                          onSuccess: () => {
                            toast.success('Invoice deleted');
                            close();
                          },
                        });
                      }
                    }}
                  >
                    <i className="bx bx-trash" /> Delete
                  </button>
                </div>
                <div className="ipanel-body">
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
                  <div className="cinv-fields">
                    <label className="cinv-field">
                      <span>Client</span>
                      <select
                        value={clientId}
                        className={errors.client ? 'is-invalid' : ''}
                        onChange={(e) => {
                          setClientId(e.target.value);
                          setErrors((er) => ({ ...er, client: undefined }));
                        }}
                      >
                        <option value="">Select a client…</option>
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
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="NGN">NGN</option>
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
                    <label className="cinv-field">
                      <span>Tax rate</span>
                      <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))}>
                        <option value={0}>0%</option>
                        <option value={0.05}>5%</option>
                        <option value={0.075}>7.5%</option>
                        <option value={0.1}>10%</option>
                        <option value={0.2}>20%</option>
                      </select>
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
                    <div>
                      <span>Tax ({Math.round(taxRate * 100)}%)</span>
                      <span>{formatCurrency(tax, currency)}</span>
                    </div>
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

      {/* floating cute action rail while preparing an invoice */}
      {open && editing && (
        <aside className="ws-rail ws-rail-right ipanel-rail" key="invoice-actions">
          <ul>
            {editActions.map((action) => (
              <li key={action.label}>
                <button
                  type="button"
                  className={`ws-action ${action.className}`}
                  data-label={action.label}
                  title={action.label}
                  onClick={action.onClick}
                  disabled={!!busy}
                >
                  {busy === action.label ? (
                    <span className="ws-spin" aria-hidden="true" />
                  ) : (
                    <img src={`/images/${action.img}`} alt="" />
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
    </>
  );
};
