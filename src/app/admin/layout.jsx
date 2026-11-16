'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  FolderOpen,
  Languages,
  Layers,
  History,
  Settings,
  LogOut,
  Radio,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal.jsx';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Upload Media', href: '/admin/upload', icon: UploadCloud },
  { name: 'All Media Files', href: '/admin/media', icon: FolderOpen },
  { name: 'Languages', href: '/admin/languages', icon: Languages },
  { name: 'Upload History', href: '/admin/history', icon: History },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.authenticated) {
          setAdminUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setShowLogoutModal(false);
    router.push('/login');
    router.refresh();
  };

  const getPageTitle = () => {
    const item = NAV_ITEMS.find((n) => n.href === pathname);
    return item ? item.name : 'Admin Studio';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs text-slate-400">Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Radio className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">Admin Studio</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 transition active:scale-95"
            title="Log out of administrator session"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-300 transition-transform duration-200 ease-in-out md:static md:translate-x-0 flex flex-col justify-between ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white">Media Host</span>
                  <span className="rounded bg-emerald-950 px-1 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-800">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">Audio & Video Test Library</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Management
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Public Portal
            </div>

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-slate-400" />
                <span>Public Library</span>
              </div>
              <ExternalLink className="h-3 w-3 text-slate-500" />
            </Link>

            <Link
              href="/test-import"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-3">
                <Radio className="h-4 w-4 text-emerald-400" />
                <span>Import Tester</span>
              </div>
              <ExternalLink className="h-3 w-3 text-emerald-500" />
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer / User Profile & Prominent Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-white truncate">
                {adminUser ? adminUser.username : 'Administrator'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Session</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-800/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/60 hover:text-white hover:border-rose-700 px-3.5 py-2 text-xs font-semibold transition active:scale-95 shadow-xs"
            title="Sign out of administrative account"
          >
            <LogOut className="h-4 w-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Global Admin Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-bold text-slate-900 dark:text-white">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online • {adminUser ? adminUser.username : 'admin'}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold transition active:scale-95 shadow-xs"
              title="Sign out of administrative session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {children}
      </div>

      {/* Logout Confirmation Prompt Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Sign Out Confirmation"
        message="Are you sure you want to log out of the admin panel? You will need your credentials to sign back in."
        confirmLabel="Yes, Log Out"
        cancelLabel="Stay Logged In"
        isDestructive={true}
        icon={LogOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
