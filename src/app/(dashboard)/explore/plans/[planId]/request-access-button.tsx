"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { RequestAccessDialog } from "@/components/request-access-dialog";

interface RequestAccessButtonProps {
  planId: string;
  planTitle: string;
  alreadyPending: boolean;
}

export function RequestAccessButton({
  planId,
  planTitle,
  alreadyPending,
}: RequestAccessButtonProps) {
  const [open, setOpen] = useState(false);

  if (alreadyPending) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
        Request pending — awaiting mentor decision
      </div>
    );
  }
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        <Send className="h-4 w-4" />
        Request access
      </button>
      <RequestAccessDialog
        open={open}
        onClose={() => setOpen(false)}
        planId={planId}
        planTitle={planTitle}
      />
    </>
  );
}
