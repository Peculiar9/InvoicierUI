import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * Split-screen layout for the auth pages: a branded showcase panel on the
 * left and the form on the right. Scoped under .legacy-marketing-page so it
 * inherits the marketing design tokens and field styles.
 */
export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  return (
    <section className="legacy-page legacy-marketing-page legacy-auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <span className="auth-aside-bg" aria-hidden="true" />
          <Link to="/" className="auth-brand">
            Invoicier
          </Link>
          <div className="auth-aside-copy">
            <h2>Get paid from anywhere.</h2>
            <p>
              The beautiful, simple way to handle invoices. Built to integrate, paid
              from anywhere, and powered by AI.
            </p>
          </div>
          <span className="auth-aside-mark" aria-hidden="true">
            invoicier
          </span>
        </aside>

        <div className="auth-panel">
          <div className="auth-form-wrap">
            <Link to="/" className="auth-back">
              <i className="bx bx-arrow-back" /> Back home
            </Link>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
            {children}
            <p className="auth-switch">{footer}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
