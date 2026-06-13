import { useState } from 'react';
import { Link } from '@tanstack/react-router';

interface LegacyMarketingNavProps {
  variant?: 'landing' | 'auth';
  active?: 'home' | 'docs' | 'pricing';
}

export const LegacyMarketingNav = ({
  variant = 'auth',
  active = 'home',
}: LegacyMarketingNavProps) => {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav>
        <Link to="/" className="logo">
          Invoicier
        </Link>
        <div
          className={`toggle-btn${open ? ' active' : ''}`}
          onClick={() => setOpen((value) => !value)}
        />
        <ul className={`navigation${open ? ' active' : ''}`}>
          {variant === 'landing' && (
            <li>
              <a href="#" className={active === 'home' ? 'active' : undefined}>
                Home
              </a>
            </li>
          )}
          <li>
            <a href="/#pricing" className={active === 'pricing' ? 'active' : undefined}>
              Pricing
            </a>
          </li>
          <li>
            <a href="#" className={active === 'docs' ? 'active' : undefined}>
              Docs
            </a>
          </li>
          <li>
            <Link to="/login" className="nav-login">
              Login
            </Link>
          </li>
          <li>
            <Link to="/signup" className="signup">
              Sign Up
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};
