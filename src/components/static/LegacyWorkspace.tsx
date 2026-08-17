import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useLogout, useRecentActivities } from '@/hooks';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useServerSettings } from '@/hooks/useServerSettings';
import { useUIStore } from '@/stores/uiStore';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { useVerification } from '@/hooks/useVerification';
import { toast } from '@/lib/toast';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { InvoicePanel } from '@/components/InvoicePanel';
import { ShareSheet } from '@/components/ShareSheet';
import { formatDate } from '@/utils/format';
import type { Activity } from '@/types';

const activityIcon: Record<Activity['type'], string> = {
  invoice_created: 'bx-plus-circle',
  invoice_sent: 'bx-send',
  invoice_viewed: 'bx-show',
  invoice_claimed: 'bx-hourglass',
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
  useServerSettings();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const panelOpen = useInvoicePanelStore((s) => s.open);
  const closePanel = useInvoicePanelStore((s) => s.close);

  useHotkeys({
    n: () => openCreate(),
    // the list search is wherever the page put it
    '/': () => {
      const field = document.querySelector<HTMLInputElement>(
        '.view-search input, input[type="search"]'
      );
      field?.focus();
      field?.select();
    },
    Escape: () => {
      // a field gives up focus first; the panel closes on the second press
      const active = document.activeElement as HTMLElement | null;
      if (active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) {
        active.blur();
        return;
      }
      if (panelOpen) closePanel();
    },
  });

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
  const { verified } = useVerification();
  const unverified = Boolean(user) && !verified;
  const resendVerification = async () => {
    try {
      // the session is the proof of who is asking: no stored handle needed,
      // so this works on a device that has never seen the signup
      const handle = await authApi.resendMyVerification();
      try {
        sessionStorage.setItem(
          'invoicier-pending-verification',
          JSON.stringify({ email: handle.email, reference: handle.reference })
        );
      } catch {
        // private mode: the emailed deep link still carries the handle
      }
      toast.success(`A fresh code is on its way to ${handle.email}`);
    } catch {
      toast.error('Could not resend just now. Give it a moment.');
    }
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
        {/* the theme toggle now lives only in the topbar, by the bell */}
        <button
          type="button"
          className="ws-rail-item ws-rail-logout"
          title="Log out"
          onClick={() => setConfirmingLogout(true)}
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
            <button
              type="button"
              className="ws-topbar-theme"
              title={theme === 'dark' ? 'Lights on' : 'Lights off'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => toggleTheme()}
            >
              <i className={`bx ${theme === 'dark' ? 'bx-sun' : 'bx-moon'}`} aria-hidden="true" />
            </button>
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
                        A four-digit code went to <b>{user?.email}</b>. Until
                        you confirm it, invoices cannot go out under your name.
                        Everything else works.
                      </p>
                      <div className="iw-verify-actions">
                        <button type="button" className="iw-btn iw-btn--ghost" onClick={resendVerification}>
                          Resend the code
                        </button>
                        <Link to="/verify-email" className="iw-btn" onClick={() => setVerifyOpen(false)}>
                          Enter the code
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
            <button
              type="button"
              className="ws-create-btn"
              title="New invoice (N)"
              onClick={() => openCreate()}
            >
              <i className="bx bx-plus" /> New invoice
              <kbd className="ws-kbd" aria-hidden="true">
                N
              </kbd>
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

      {/* mobile's one true "new": the page's actions, folded into a disc */}
      {!panelOpen && actions && actions.length > 0 && (
        <div className="ws-fab-wrap">
          {fabOpen && <div className="ws-fab-scrim" onClick={() => setFabOpen(false)} />}
          {fabOpen && (
            <div className="ws-fab-menu">
              {actions.filter((a) => !a.to).map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="ws-fab-item"
                  disabled={action.disabled}
                  onClick={() => {
                    setFabOpen(false);
                    action.onClick?.();
                  }}
                >
                  <i className={`bx ${action.bx ?? 'bx-circle'}`} aria-hidden="true" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={`ws-fab${fabOpen ? ' is-open' : ''}`}
            aria-label={actions.length === 1 ? actions[0].label : 'Actions'}
            aria-expanded={actions.length === 1 ? undefined : fabOpen}
            onClick={() => {
              const doers = actions.filter((a) => !a.to);
              if (doers.length === 1) {
                doers[0].onClick?.();
              } else {
                setFabOpen((o) => !o);
              }
            }}
          >
            <i className="bx bx-plus" aria-hidden="true" />
          </button>
        </div>
      )}

      <Modal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        title="Log out?"
      >
        <div className="iw-paid-form">
          <p className="hint">
            Your session ends on this device. Drafts you have saved stay saved;
            the books close exactly as they stand.
          </p>
          <div className="iw-paid-actions">
            <button
              type="button"
              className="iw-btn iw-btn--ghost"
              onClick={() => setConfirmingLogout(false)}
            >
              Stay signed in
            </button>
            <button
              type="button"
              className="iw-btn"
              onClick={() => {
                setConfirmingLogout(false);
                logout();
              }}
            >
              <i className="bx bx-door-open" aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      </Modal>

      <InvoicePanel />
      <ShareSheet />
    </div>
  );
};
