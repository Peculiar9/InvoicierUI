import { useMemo, useState } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { Client } from '@/types';
import { LegacyWorkspace } from '@/components/static';
import type { WsAction } from '@/components/static/LegacyWorkspace';
import { Modal } from '@/components/Modal';
import { Pager } from '@/components/Pager';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { inDateRange, rangeIsSet, EMPTY_RANGE } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';
import { SwipeScroll } from '@/components/SwipeScroll';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useInvoices } from '@/hooks';
import { isPaid } from '@/utils/invoiceStatus';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { useListStateStore } from '@/stores/listStateStore';
import type { ClientSortKey } from '@/stores/listStateStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { isEmail, isFilled, isPhone } from '@/lib/validate';
import { toast } from '@/lib/toast';
import { ClientAvatar } from '@/components/ClientAvatar';
import { ClientInsights } from '@/components/ClientInsights';

export const Clients = () => {
  usePageMeta('Clients');
  const { data, isLoading, isError, error, refetch, isFetching } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const openView = useInvoicePanelStore((s) => s.openView);
  const clients = data?.data ?? [];

  // What each client is actually worth to the business. A list of names and
  // phone numbers says nothing you could act on; this says who owes you.
  const { data: invoiceData } = useInvoices();
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; collected: number; owed: number; currency: string }>();
    for (const inv of invoiceData?.data ?? []) {
      const id = inv.client?.id;
      if (!id) continue;
      const row = map.get(id) ?? { count: 0, collected: 0, owed: 0, currency: inv.currency };
      row.count += 1;
      if (isPaid(inv.status)) row.collected += inv.amount_received ?? inv.total;
      else if (inv.status !== 'cancelled' && inv.status !== 'draft') row.owed += inv.total;
      map.set(id, row);
    }
    return map;
  }, [invoiceData]);

  // how you left this list is how you find it
  const listState = useListStateStore((s) => s.clients);
  const patch = useListStateStore((s) => s.setClients);
  const { query, range, view, sortKey, page, pageSize } = listState;
  const setQuery = (v: string) => patch({ query: v });
  const setRange = (v: DateRangeValue) => patch({ range: v });
  const setView = (v: 'grid' | 'list') => patch({ view: v });
  const setSortKey = (v: ClientSortKey) => patch({ sortKey: v });
  const setPage = (v: number) => patch({ page: v });
  const setPageSize = (v: number) => patch({ pageSize: v });
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [insightsId, setInsightsId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', logo: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', email: '', phone: '', logo: '' });
    setErrors({});
    setOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', logo: c.logo_url ?? '' });
    setErrors({});
    setOpen(true);
  };
  const onLogoPick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  /**
   * Remove acts now and offers the way back, like everything else here.
   * The mock mints a fresh id on the way back; the address book cares about
   * the person's details, not our key for them.
   */
  const removeClient = (c: Client) => {
    deleteClient.mutate(c.id, {
      onSuccess: () => {
        setSelected((cur) => (cur === c.id ? null : cur));
        toast.undo(`${c.name} removed from your clients`, () => {
          createClient.mutate(
            { name: c.name, email: c.email, phone: c.phone, logo_url: c.logo_url } as never,
            { onSuccess: () => toast.success(`${c.name} is back`) }
          );
        });
      },
    });
  };

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    const matchesQuery =
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    return matchesQuery && inDateRange(c.created_at, range);
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'name-asc') return a.name.localeCompare(b.name);
    if (sortKey === 'name-desc') return b.name.localeCompare(a.name);
    if (sortKey === 'oldest') return a.created_at.localeCompare(b.created_at);
    return b.created_at.localeCompare(a.created_at); // newest
  });
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const paged = sorted.slice((current - 1) * pageSize, current * pageSize);
  const selectedClient = clients.find((c) => c.id === selected) ?? null;

  const toggleSelect = (id: string) => setSelected((cur) => (cur === id ? null : id));

  const submit = () => {
    const next: { name?: string; email?: string; phone?: string } = {};
    if (!isFilled(form.name)) next.name = 'Name is required';
    if (!isEmail(form.email)) next.email = 'Enter a valid email';
    if (!isPhone(form.phone)) next.phone = 'Enter a valid phone number';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      logo_url: form.logo || null,
    };
    if (editingId) {
      updateClient.mutate(
        { id: editingId, data: payload as never },
        {
          onSuccess: () => {
            toast.success('Client updated');
            setOpen(false);
          },
        }
      );
      return;
    }
    createClient.mutate(payload as never, {
      onSuccess: () => {
        toast.success('Client added');
        setOpen(false);
        setForm({ name: '', email: '', phone: '', logo: '' });
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
    { label: 'New client', bx: 'bx-user-plus', onClick: openAdd },
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <FilterSelect
            label="Sort"
            placeholder="Name, A to Z"
            icon="bx-sort-alt-2"
            value={sortKey === 'name-asc' ? '' : sortKey}
            options={[
              { value: 'name-desc', label: 'Name, Z to A' },
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
            ]}
            onChange={(v) => {
              setSortKey((v || 'name-asc') as ClientSortKey);
              setPage(1);
            }}
          />
          <DateRangePicker
            label="Added"
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
          />
          {(query.trim() || rangeIsSet(range) || sortKey !== 'name-asc') && (
            <button
              type="button"
              className="iw-filters-clear"
              onClick={() => {
                setQuery('');
                setRange(EMPTY_RANGE);
                setSortKey('name-asc');
                setPage(1);
              }}
            >
              <i className="bx bx-eraser" /> Clear
            </button>
          )}
          <div className="view-toolbar-side">
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
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <i className="bx bx-plus" /> Add client
            </button>
          </div>
        </div>

        {selectedClient && (
          <div className="view-hint">
            <i className="bx bx-info-circle" />
            <span>
              <strong>{selectedClient.name}</strong> selected. Tap the glowing{' '}
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
        ) : isError ? (
          <ErrorState
            doing="Loading your clients"
            error={error}
            retrying={isFetching}
            onRetry={() => refetch()}
          />
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
          <>
            <div className="client-grid">
              {paged.map((c) => (
              <div
                role="button"
                tabIndex={0}
                className={`client-card${selected === c.id ? ' selected' : ''}`}
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') toggleSelect(c.id);
                }}
              >
                <ClientAvatar name={c.name} logo_url={c.logo_url} />
                <div className="client-info">
                  <h3>{c.name}</h3>
                  <p>{c.email}</p>
                  {c.phone && <p className="dash-muted">{c.phone}</p>}
                </div>
                {selected === c.id && <i className="bx bx-check client-check" />}
                {/* the card click selects-to-invoice; these do everything else */}
                <span
                  className="client-actions"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title={`Insights on ${c.name}`}
                    aria-label={`Insights on ${c.name}`}
                    onClick={() => setInsightsId(c.id)}
                  >
                    <i className="bx bx-line-chart" />
                  </button>
                  <button
                    type="button"
                    title={`Edit ${c.name}`}
                    aria-label={`Edit ${c.name}`}
                    onClick={() => openEdit(c)}
                  >
                    <i className="bx bx-pencil" />
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    title={`Remove ${c.name}`}
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeClient(c)}
                  >
                    <i className="bx bx-trash" />
                  </button>
                </span>
              </div>
            ))}
            </div>
            <Pager
              page={current}
              pages={pages}
              total={filtered.length}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              noun="clients"
            />
          </>
        ) : (
          <div className="dash-card">
            <SwipeScroll className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Invoices</th>
                    <th>Collected</th>
                    <th>Owed</th>
                    <th>Since</th>
                    <th className="iw-rowact-cell" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr
                      key={c.id}
                      className={`dash-row-click${selected === c.id ? ' selected' : ''}`}
                      onClick={() => toggleSelect(c.id)}
                    >
                      <td className="client-cell">
                        <ClientAvatar name={c.name} logo_url={c.logo_url} size="sm" />
                        <span className="client-ident">
                          <b>{c.name}</b>
                          <small>{c.email || c.phone || 'No contact details'}</small>
                        </span>
                      </td>
                      <td>
                        <span className="client-chip">{stats.get(c.id)?.count ?? 0}</span>
                      </td>
                      <td className="dash-amount client-money">
                        {stats.get(c.id)?.collected
                          ? formatCurrency(stats.get(c.id)!.collected, stats.get(c.id)!.currency)
                          : '–'}
                      </td>
                      <td className="dash-amount client-money">
                        {stats.get(c.id)?.owed ? (
                          <em className="client-owed">
                            {formatCurrency(stats.get(c.id)!.owed, stats.get(c.id)!.currency)}
                          </em>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="dash-muted">
                        {formatDate(c.created_at, { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="iw-rowact-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="iw-rowact">
                          <button
                            type="button"
                            title={`Insights on ${c.name}`}
                            aria-label={`Insights on ${c.name}`}
                            onClick={() => setInsightsId(c.id)}
                          >
                            <i className="bx bx-line-chart" />
                          </button>
                          <button
                            type="button"
                            title={`Edit ${c.name}`}
                            aria-label={`Edit ${c.name}`}
                            onClick={() => openEdit(c)}
                          >
                            <i className="bx bx-pencil" />
                          </button>
                          <button
                            type="button"
                            title={`Remove ${c.name}`}
                            aria-label={`Remove ${c.name}`}
                            onClick={() => removeClient(c)}
                          >
                            <i className="bx bx-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SwipeScroll>
            <Pager
              page={current}
              pages={pages}
              total={filtered.length}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              noun="clients"
            />
          </div>
        )}
      </div>

      {insightsId && clients.find((c) => c.id === insightsId) && (
        <ClientInsights
          client={clients.find((c) => c.id === insightsId)!}
          invoices={invoiceData?.data ?? []}
          onClose={() => setInsightsId(null)}
          onInvoiceThem={() => {
            setInsightsId(null);
            openCreate(insightsId);
          }}
          onEdit={() => {
            const c = clients.find((x) => x.id === insightsId);
            setInsightsId(null);
            if (c) openEdit(c);
          }}
          onOpenInvoice={(id) => {
            setInsightsId(null);
            openView(id);
          }}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit client' : 'Add client'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              {editingId ? 'Save changes' : 'Add client'}
            </button>
          </>
        }
      >
        <div className="cinv-fields cinv-fields--stack">
          {/* their mark: a logo when they have one, initials meanwhile */}
          <div className="client-logo-row">
            <ClientAvatar name={form.name || 'C'} logo_url={form.logo || null} size="lg" />
            <div className="client-logo-actions">
              <label className="btn btn-ghost client-logo-pick">
                <i className="bx bx-image-add" /> {form.logo ? 'Change logo' : 'Add a logo'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => onLogoPick(e.target.files?.[0])}
                />
              </label>
              {form.logo && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setForm((f) => ({ ...f, logo: '' }))}
                >
                  Use initials
                </button>
              )}
            </div>
          </div>
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
              maxLength={18}
              value={form.phone}
              className={errors.phone ? 'is-invalid' : ''}
              onChange={(e) => {
                // phone characters only (digits, +, space, dashes, parens)
                const phone = e.target.value.replace(/[^\d+\s()-]/g, '').slice(0, 18);
                setForm({ ...form, phone });
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
