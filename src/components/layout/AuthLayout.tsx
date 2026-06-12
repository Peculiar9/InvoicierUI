import { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">I</span>
            </div>
            <span className="text-2xl font-bold">Invoicier</span>
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            Manage your invoices with ease
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-md">
            Create professional invoices, track payments, and manage your clients
            all in one place.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-sm font-medium"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-white/80">
              Join 10,000+ businesses already using Invoicier
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full" />
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Invoicier</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
