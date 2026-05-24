"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import type { Profile } from "@/lib/types/database";
import { useUnreadNotifications } from "@/lib/hooks/use-unread-notifications";
import { NotificationsProvider } from "@/lib/hooks/notifications-context";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  BookOpen,
  PlusCircle,
  Bell,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { counts, refresh } = useUnreadNotifications(profile.id, profile.role);
  const notifRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Close notification dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(profile.role === "mentor"
      ? [{ name: "Create Plan", href: "/plan/create", icon: PlusCircle }]
      : []),
  ];

  const unreadDisplay =
    counts.total > 9 ? "9+" : counts.total > 0 ? String(counts.total) : null;

  const chatEntries = Object.entries(counts.byPlan).filter(
    ([, v]) => v.messages > 0
  );
  const taskEntries = Object.entries(counts.byTaskMeta).map(([taskId, meta]) => ({
    taskId,
    ...meta,
    count: counts.byTask[taskId] ?? 0,
  }));
  const hasAnyNotif = chatEntries.length > 0 || taskEntries.length > 0;

  function NotifBadge({ className = "" }: { className?: string }) {
    return (
      <div className={`relative ${className}`}>
        <Bell className="h-5 w-5" />
        {unreadDisplay && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadDisplay}
          </span>
        )}
      </div>
    );
  }

  function NotifDropdown() {
    if (!notifOpen) return null;
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden z-50 dark:border-slate-600 dark:bg-slate-900">
        <div className="px-3 py-2 border-b border-slate-700 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-300 dark:text-slate-200">Notifications</p>
        </div>
        {!hasAnyNotif ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">All caught up</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {chatEntries.map(([planId, data]) => (
              <Link
                key={`chat-${planId}`}
                href={`/plan/${planId}?chat=1`}
                onClick={() => setNotifOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-700/60 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {data.planTitle}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {data.messages} new chat message{data.messages !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                  {data.messages}
                </span>
              </Link>
            ))}
            {taskEntries.map((t) => (
              <Link
                key={`task-${t.taskId}`}
                href={`/plan/${t.planId}?task=${t.taskId}&comments=1`}
                onClick={() => setNotifOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-700/60 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20">
                  <MessageCircle className="h-4 w-4 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {t.taskTitle}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {t.planTitle} · {t.count} new comment{t.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">
                  {t.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform duration-200 lg:static lg:translate-x-0 dark:bg-slate-900 dark:border-r dark:border-slate-800 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 px-6">
          <BookOpen className="h-6 w-6 text-emerald-400" />
          <span className="text-lg font-bold text-white tracking-tight">
            MentorSync
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Notifications + user footer */}
        <div className="border-t border-slate-700 p-3 space-y-2 dark:border-slate-800" ref={notifRef}>
          <div className="relative">
            <NotifDropdown />
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <NotifBadge />
              <span>Notifications</span>
              {unreadDisplay && (
                <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  {unreadDisplay}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-semibold text-white">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.name}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">
                {profile.role}
              </p>
            </div>
            <ThemeToggle className="!h-8 !w-8 !text-slate-400 hover:!bg-slate-800 hover:!text-white dark:!text-slate-400 dark:hover:!bg-slate-800 dark:hover:!text-white" />
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-900 dark:text-white">MentorSync</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Bell className="h-5 w-5" />
              {unreadDisplay && (
                <span className="absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadDisplay}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Mobile notification dropdown */}
        {notifOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-900">
            {!hasAnyNotif ? (
              <p className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                All caught up
              </p>
            ) : (
              <div className="space-y-1">
                {chatEntries.map(([planId, data]) => (
                  <Link
                    key={`chat-${planId}`}
                    href={`/plan/${planId}?chat=1`}
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors dark:hover:bg-slate-800"
                  >
                    <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate dark:text-slate-200">
                        {data.planTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {data.messages} new chat
                      </p>
                    </div>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                      {data.messages}
                    </span>
                  </Link>
                ))}
                {taskEntries.map((t) => (
                  <Link
                    key={`task-${t.taskId}`}
                    href={`/plan/${t.planId}?task=${t.taskId}&comments=1`}
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors dark:hover:bg-slate-800"
                  >
                    <MessageCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate dark:text-slate-200">
                        {t.taskTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate dark:text-slate-400">
                        {t.planTitle} · {t.count} comment{t.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">
                      {t.count}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 dark:bg-slate-950">
          <NotificationsProvider value={{ counts, refresh }}>
            {children}
          </NotificationsProvider>
        </main>
      </div>
    </div>
  );
}
