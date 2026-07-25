import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useLogout, useRecentActivities } from '@/hooks';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/lib/toast';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { InvoicePanel } from '@/components/InvoicePanel';
import { formatDate } from '@/utils/format';
import type { Activity } from '@/types';

const activityIcon: Record<Activity['type'], string> = {
  invoice_created: 'bx-plus-circle',
  invoice_sent: 'bx-send',
  invoice_paid: 'bx-check-circle',
  client_added: 'bx-user-plus',
};

/** Rail behavior: hover-expand by default, or pinned open / pinned shut. */
type RailMode = 'auto' | 'open' | 'closed';
const RAIL_KEY = 'invoicier-rail-mode';

const railModeLabel: Record<RailMode, string> = {
  auto: 'Expands on hover. Click to pin open.',
  open: 'Pinned open. Click to pin shut.',
  closed: 'Pinned shut. Click to let it breathe.',
};

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

// v1 scope: Services and Payouts are hidden, not wired. The route still
// exists; it just isn't part of the presented surface.
const navItems: { id: ActiveItem; label: string; to: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', to: '/dashboard', icon: 'bx-grid-alt' },
  { id: 'invoices', label: 'Invoices', to: '/invoices', icon: 'bx-receipt' },
  { id: 'clients', label: 'Clients', to: '/clients', icon: 'bx-user' },
  { id: 'settings', label: 'Settings', to: '/settings', icon: 'bx-cog' },
];

const ActionInner = ({ action }: { action: WsAction }) => (
  <i className={`bx ${action.bx ?? 'bx-circle'}`} aria-hidden="true" />
);

export const LegacyWorkspace = ({
  active = 'dashboard',
  children,
  title = 'Dashboard',
  actions,
}: LegacyWorkspaceProps) => {
  const { mutate: logout } = useLogout();
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const panelOpen = useInvoicePanelStore((s) => s.open);

  const [railMode, setRailMode] = useState<RailMode>(() => {
    const stored = localStorage.getItem(RAIL_KEY);
    return stored === 'open' || stored === 'closed' ? stored : 'auto';
  });
  const [railHover, setRailHover] = useState(false);
  const railOpen = railMode === 'open' || (railMode === 'auto' && railHover);

  const [notifOpen, setNotifOpen] = useState(false);
  const { data: activities = [] } = useRecentActivities(6);

  const user = useAuthStore((s) => s.user);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const unverified = Boolean(user) && user?.emailVerified === false;
  const resendVerification = async () => {
    await authApi.resendVerification();
    toast.success(`Verification link resent to ${user?.email}`);
    setVerifyOpen(false);
  };

  const cycleRail = () => {
    // auto -> pin open -> pin shut -> back to auto
    const next: RailMode =
      railMode === 'auto' ? 'open' : railMode === 'open' ? 'closed' : 'auto';
    setRailMode(next);
    if (next === 'auto') localStorage.removeItem(RAIL_KEY);
    else localStorage.setItem(RAIL_KEY, next);
  };

  return (
    <div className="legacy-page legacy-workspace ws-shell iw">
      {/* the floating cubicle: icons only when shut, icon + word when open */}
      <aside
        className={`ws-rail ws-rail-left${railOpen ? ' is-open' : ''}`}
        onMouseEnter={() => setRailHover(true)}
        onMouseLeave={() => setRailHover(false)}
      >
        <button
          type="button"
          className={`ws-rail-pin${railMode !== 'auto' ? ' is-pinned' : ''}`}
          title={railModeLabel[railMode]}
          aria-label={railModeLabel[railMode]}
          onClick={cycleRail}
        >
          <i
            className={`bx ${
              railMode === 'auto'
                ? 'bx-pin'
                : railMode === 'open'
                  ? 'bxs-pin'
                  : 'bx-chevron-right'
            }`}
          />
        </button>
        <Link to="/dashboard" className="ws-rail-logo" aria-label="Invoicier home">
          <span className="glyph">
            i<b>.</b>
          </span>
          <span className="full">
            invoicier<b>.</b>
          </span>
        </Link>
        <nav className="ws-rail-nav">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              title={item.label}
              className={`ws-rail-item${active === item.id ? ' active' : ''}`}
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
          <i className="bx bx-door-open" aria-hidden="true" />
          <span className="bye-a">Log out</span>
          <span className="bye-b" aria-hidden="true">
            Close the books
          </span>
        </button>
      </aside>

      <div className="ws-body">
        <header className="ws-topbar">
          <h1 className="ws-title">{title}</h1>
          <div className="ws-topbar-actions">
            {unverified && (
              <div className="iw-verify-wrap">
                <button
                  type="button"
                  className="iw-verify-badge"
                  aria-expanded={verifyOpen}
                  onClick={() => setVerifyOpen((v) => !v)}
                >
                  <i className="bx bx-envelope" />
                  Verify your email
                </button>
                {verifyOpen && (
                  <>
                    <button
                      type="button"
                      className="iw-bell-scrim"
                      aria-label="Close"
                      onClick={() => setVerifyOpen(false)}
                    />
                    <div className="iw-bell-panel iw-verify-panel">
                      <div className="iw-bell-head">
                        <b>One click to go</b>
                      </div>
                      <p className="iw-verify-copy">
                        We sent a link to <b>{user?.email}</b>. Until you click
                        it, invoices cannot go out under your name. Everything
                        else works.
                      </p>
                      <div className="iw-verify-actions">
                        <button type="button" className="iw-btn iw-btn--ghost" onClick={resendVerification}>
                          Resend the link
                        </button>
                        {/* TEMPORARY: stands in for the emailed link. Delete before launch. */}
                        <Link to="/verify-email" className="iw-btn" onClick={() => setVerifyOpen(false)}>
                          Open the link (demo)
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="iw-bell-wrap">
              <button
                type="button"
                className={`iw-bell${notifOpen ? ' is-open' : ''}`}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <i className="bx bx-bell" />
                {activities.length > 0 && <span className="iw-bell-dot" />}
              </button>
              {notifOpen && (
                <>
                  <button
                    type="button"
                    className="iw-bell-scrim"
                    aria-label="Close notifications"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="iw-bell-panel" role="menu">
                    <div className="iw-bell-head">
                      <b>Activity</b>
                      <span>{activities.length} recent</span>
                    </div>
                    {activities.length === 0 ? (
                      <p className="iw-bell-empty">All quiet. Go send an invoice.</p>
                    ) : (
                      <ul>
                        {activities.map((act) => (
                          <li key={act.id}>
                            <span className={`dash-feed-icon is-${act.type}`}>
                              <i className={`bx ${activityIcon[act.type]}`} />
                            </span>
                            <div>
                              <p>{act.description}</p>
                              <time>
                                {formatDate(act.timestamp, { month: 'short', day: 'numeric' })}
                              </time>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
            <button type="button" className="ws-create-btn" onClick={() => openCreate()}>
              <i className="bx bx-plus" /> New invoice
            </button>
          </div>
        </header>

        <main className="ws-content">{children}</main>
      </div>

      {/* contextual quick actions: each page brings its own, panel takes over */}
      {!panelOpen && actions && actions.length > 0 && (
        <aside className="ws-rail ws-rail-right" key={active}>
          <ul>
            {actions.map((action) =>
              action.to ? (
                <li key={action.label}>
                  <Link
                    to={action.to}
                    className={`ws-action ${action.className ?? ''}`}
                    data-label={action.label}
                    aria-label={action.label}
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
                    aria-label={action.label}
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
