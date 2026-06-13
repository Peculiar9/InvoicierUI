import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import type { WsAction } from '@/components/static/LegacyWorkspace';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useClients, useCreateClient } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { formatDate } from '@/utils/format';
import { isEmail, isFilled, isPhone } from '@/lib/validate';
import { toast } from '@/lib/toast';

export const Clients = () => {
  const { data, isLoading } = useClients();
  const createClient = useCreateClient();
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const clients = data?.data ?? [];

  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });
  const selectedClient = clients.find((c) => c.id === selected) ?? null;

  const toggleSelect = (id: string) => setSelected((cur) => (cur === id ? null : id));

  const submit = () => {
    const next: { name?: string; email?: string; phone?: string } = {};
    if (!isFilled(form.name)) next.name = 'Name is required';
    if (!isEmail(form.email)) next.email = 'Enter a valid email';
    if (!isPhone(form.phone)) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    createClient.mutate(form, {
      onSuccess: () => {
        toast.success('Client added');
        setOpen(false);
        setForm({ name: '', email: '', phone: '' });
        setErrors({});
      },
    });
  };

  const actions: WsAction[] = [
    {
      label: selectedClient ? `Invoice ${selectedClient.name}` : 'New invoice',
      bx: 'bx-plus',
      className: selectedClient ? 'is-highlight' : '',
      onClick: () => openCreate(selected ?? undefined),
    },
    { label: 'New client', bx: 'bx-user-plus', onClick: () => setOpen(true) },
  ];

  return (
    <LegacyWorkspace active="clients" title="Clients" actions={actions}>
      <div className="view">
        <div className="view-toolbar">
          <label className="view-search">
            <i className="bx bx-search" />
            <input
              type="search"
              placeholder="Search clients"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="view-switch" role="group" aria-label="View mode">
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <i className="bx bx-grid-alt" />
            </button>
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <i className="bx bx-list-ul" />
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <i className="bx bx-plus" /> Add client
          </button>
        </div>

        {selectedClient && (
          <div className="view-hint">
            <i className="bx bx-info-circle" />
            <span>
              <strong>{selectedClient.name}</strong> selected — tap the glowing{' '}
              <i className="bx bx-plus" /> to invoice them.
            </span>
            <button type="button" onClick={() => setSelected(null)}>
              Clear
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="client-grid">
            {[0, 1, 2, 3].map((i) => (
              <div className="client-card client-card--skel" key={i}>
                <Skeleton width={46} height={46} radius={14} />
                <div className="client-info" style={{ display: 'grid', gap: 8 }}>
                  <Skeleton width="70%" height={12} />
                  <Skeleton width="50%" height={10} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          clients.length === 0 ? (
            <EmptyState
              icon="bx-user-plus"
              title="No clients yet"
              message="Add your first client and you'll be able to invoice them in a couple of taps."
              action={{ label: 'Add client', icon: 'bx-plus', onClick: () => setOpen(true) }}
            />
          ) : (
            <EmptyState
              icon="bx-search-alt"
              title="No matching clients"
              message="No clients match your search. Try a different name or email."
            />
          )
        ) : view === 'grid' ? (
          <div className="client-grid">
            {filtered.map((c) => (
              <button
                type="button"
                className={`client-card${selected === c.id ? ' selected' : ''}`}
                key={c.id}
                onClick={() => toggleSelect(c.id)}
              >
                <span className="client-avatar">{c.name.charAt(0).toUpperCase()}</span>
                <div className="client-info">
                  <h3>{c.name}</h3>
                  <p>{c.email}</p>
                  {c.phone && <p className="dash-muted">{c.phone}</p>}
                </div>
                {selected === c.id && <i className="bx bx-check client-check" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="dash-card">
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className={`dash-row-click${selected === c.id ? ' selected' : ''}`}
                      onClick={() => toggleSelect(c.id)}
                    >
                      <td className="client-cell">
                        <span className="client-avatar client-avatar--sm">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        {c.name}
                      </td>
                      <td className="dash-muted">{c.email}</td>
                      <td className="dash-muted">{c.phone ?? '—'}</td>
                      <td className="dash-muted">
                        {formatDate(c.createdAt, { month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add client"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Add client
            </button>
          </>
        }
      >
        <div className="cinv-fields cinv-fields--stack">
          <label className="cinv-field">
            <span>Name</span>
            <input
              value={form.name}
              className={errors.name ? 'is-invalid' : ''}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setErrors((er) => ({ ...er, name: undefined }));
              }}
              placeholder="Acme Inc"
            />
            {errors.name && <small className="field-error">{errors.name}</small>}
          </label>
          <label className="cinv-field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              className={errors.email ? 'is-invalid' : ''}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setErrors((er) => ({ ...er, email: undefined }));
              }}
              placeholder="billing@acme.com"
            />
            {errors.email && <small className="field-error">{errors.email}</small>}
          </label>
          <label className="cinv-field">
            <span>Phone</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.phone}
              className={errors.phone ? 'is-invalid' : ''}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                setErrors((er) => ({ ...er, phone: undefined }));
              }}
              placeholder="Optional"
            />
            {errors.phone && <small className="field-error">{errors.phone}</small>}
          </label>
        </div>
      </Modal>
    </LegacyWorkspace>
  );
};
