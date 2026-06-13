import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useLogout } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { InvoicePanel } from '@/components/InvoicePanel';

type ActiveItem = 'dashboard' | 'invoices' | 'clients' | 'services' | 'settings';

export interface WsAction {
  label: string;
  img?: string;
  bx?: string;
  className?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface LegacyWorkspaceProps {
  active?: ActiveItem;
  children: ReactNode;
  title?: string;
  actions?: WsAction[];
}

const navItems: { id: ActiveItem; label: string; to: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', to: '/dashboard', icon: 'bx-grid-alt' },
  { id: 'invoices', label: 'Invoices', to: '/invoices', icon: 'bx-receipt' },
  { id: 'clients', label: 'Clients', to: '/clients', icon: 'bx-user' },
  { id: 'services', label: 'Services', to: '/services', icon: 'bx-package' },
  { id: 'settings', label: 'Settings', to: '/settings', icon: 'bx-cog' },
];

const ActionInner = ({ action }: { action: WsAction }) =>
  action.img ? (
    <img src={`/images/${action.img}`} alt="" />
  ) : (
    <i className={`bx ${action.bx ?? 'bx-circle'}`} aria-hidden="true" />
  );

export const LegacyWorkspace = ({
  active = 'dashboard',
  children,
  title = 'Dashboard',
  actions,
}: LegacyWorkspaceProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mutate: logout } = useLogout();
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const panelOpen = useInvoicePanelStore((s) => s.open);

  return (
    <div
      className={`legacy-page legacy-workspace ws-shell${drawerOpen ? ' ws-drawer-open' : ''}`}
    >
      {/* floating left nav cubicle */}
      <aside className="ws-rail ws-rail-left">
        <Link to="/dashboard" className="ws-rail-logo" aria-label="Invoicier">
          i
        </Link>
        <nav className="ws-rail-nav">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              title={item.label}
              className={`ws-rail-item${active === item.id ? ' active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <i className={`bx ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="ws-rail-item ws-rail-logout"
          title="Log out"
          onClick={() => logout()}
        >
          <i className="bx bx-log-out" aria-hidden="true" />
          <span>Log out</span>
        </button>
      </aside>

      <button
        type="button"
        className="ws-scrim"
        aria-label="Close menu"
        onClick={() => setDrawerOpen(false)}
      />

      <div className="ws-body">
        <header className="ws-topbar">
          <button
            type="button"
            className="ws-burger"
            aria-label="Open menu"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <i className="bx bx-menu" />
          </button>
          <h1 className="ws-title">{title}</h1>
          <div className="ws-topbar-actions">
            <button type="button" className="ws-create-btn" onClick={() => openCreate()}>
              <i className="bx bx-plus" /> New Invoice
            </button>
          </div>
        </header>

        <main className="ws-content">{children}</main>
      </div>

      {/* contextual floating right quick-actions cubicle */}
      {!panelOpen && actions && actions.length > 0 && (
        <aside className="ws-rail ws-rail-right">
          <ul key={active}>
            {actions.map((action) =>
              action.to ? (
                <li key={action.label}>
                  <Link
                    to={action.to}
                    className={`ws-action ${action.className ?? ''}`}
                    data-label={action.label}
                    title={action.label}
                  >
                    <ActionInner action={action} />
                  </Link>
                </li>
              ) : (
                <li key={action.label}>
                  <button
                    type="button"
                    className={`ws-action ${action.className ?? ''}`}
                    data-label={action.label}
                    title={action.label}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    <ActionInner action={action} />
                  </button>
                </li>
              )
            )}
          </ul>
        </aside>
      )}

      <InvoicePanel />
    </div>
  );
};
