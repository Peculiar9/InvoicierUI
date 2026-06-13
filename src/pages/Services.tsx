import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { useServicesStore } from '@/stores/servicesStore';
import { formatCurrency } from '@/utils/format';
import { toast } from '@/lib/toast';

export const Services = () => {
  const services = useServicesStore((s) => s.services);
  const addService = useServicesStore((s) => s.addService);
  const removeService = useServicesStore((s) => s.removeService);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0 });
  const [nameError, setNameError] = useState('');

  const submit = () => {
    if (!form.name.trim()) {
      setNameError('A name is required');
      return;
    }
    addService({ name: form.name, description: form.description, price: Number(form.price) || 0 });
    toast.success('Service added');
    setOpen(false);
    setForm({ name: '', description: '', price: 0 });
    setNameError('');
  };

  return (
    <LegacyWorkspace
      active="services"
      title="Services"
      actions={[{ label: 'New service', bx: 'bx-plus', onClick: () => setOpen(true) }]}
    >
      <div className="view">
        <div className="view-toolbar">
          <p className="view-lead">
            Saved products &amp; services you can drop into any invoice.
          </p>
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
            <i className="bx bx-plus" /> Add service
          </button>
        </div>

        {services.length === 0 ? (
          <EmptyState
            icon="bx-package"
            title="No services yet"
            message="Save the products and services you bill for, then drop them into any invoice."
            action={{ label: 'Add service', icon: 'bx-plus', onClick: () => setOpen(true) }}
          />
        ) : view === 'grid' ? (
          <div className="service-grid">
            {services.map((s) => (
              <article className="service-card" key={s.id}>
                <div className="service-top">
                  <h3>{s.name}</h3>
                  <button
                    type="button"
                    className="cinv-remove"
                    aria-label="Remove service"
                    onClick={() => {
                      removeService(s.id);
                      toast.info('Service removed');
                    }}
                  >
                    <i className="bx bx-trash" />
                  </button>
                </div>
                {s.description && <p className="dash-muted">{s.description}</p>}
                <span className="service-price">{formatCurrency(s.price)}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="dash-card">
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td className="dash-muted">{s.description || '—'}</td>
                      <td className="dash-amount">{formatCurrency(s.price)}</td>
                      <td>
                        <button
                          type="button"
                          className="cinv-remove"
                          aria-label="Remove service"
                          onClick={() => {
                            removeService(s.id);
                            toast.info('Service removed');
                          }}
                        >
                          <i className="bx bx-trash" />
                        </button>
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
        title="Add service"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Add service
            </button>
          </>
        }
      >
        <div className="cinv-fields cinv-fields--stack">
          <label className="cinv-field">
            <span>Name</span>
            <input
              value={form.name}
              className={nameError ? 'is-invalid' : ''}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setNameError('');
              }}
              placeholder="Website build"
            />
            {nameError && <small className="field-error">{nameError}</small>}
          </label>
          <label className="cinv-field">
            <span>Description</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="cinv-field">
            <span>Default price</span>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </label>
        </div>
      </Modal>
    </LegacyWorkspace>
  );
};
