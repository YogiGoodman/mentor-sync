"use client";

import { createContext, useContext } from "react";
import type { UnreadCounts } from "@/lib/queries/notifications";

interface NotificationsContextValue {
  counts: UnreadCounts;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({
  value,
  children,
}: {
  value: NotificationsContextValue;
  children: React.ReactNode;
}) {
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue | null {
  return useContext(NotificationsContext);
}
