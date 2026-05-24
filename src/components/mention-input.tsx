"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TaskWithCommentCount } from "@/lib/types/database";
import { buildMentionToken, parseMentions } from "@/lib/mentions";
import { Send, AtSign } from "lucide-react";

interface MentionInputProps {
  tasks: TaskWithCommentCount[];
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
}

export function MentionInput({
  tasks,
  onSend,
  placeholder = "Message... use @ to tag a task",
}: MentionInputProps) {
  const [rawValue, setRawValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState("");
  const [menuIndex, setMenuIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredTasks = tasks
    .filter((t) =>
      t.title.toLowerCase().includes(menuFilter.toLowerCase())
    )
    .slice(0, 8);

  const getAtPosition = useCallback(() => {
    const before = rawValue.slice(0, cursorPos);
    const atIndex = before.lastIndexOf("@");
    if (atIndex === -1) return null;
    if (atIndex > 0 && before[atIndex - 1] !== " " && before[atIndex - 1] !== "\n") return null;
    const between = before.slice(atIndex + 1);
    if (/\[\[/.test(between)) return null;
    return { atIndex, query: between };
  }, [rawValue, cursorPos]);

  useEffect(() => {
    const at = getAtPosition();
    if (at) {
      setShowMenu(true);
      setMenuFilter(at.query);
      setMenuIndex(0);
    } else {
      setShowMenu(false);
      setMenuFilter("");
    }
  }, [getAtPosition]);

  function insertMention(task: TaskWithCommentCount) {
    const at = getAtPosition();
    if (!at) return;

    const token = buildMentionToken(task.id, task.title);
    const before = rawValue.slice(0, at.atIndex);
    const after = rawValue.slice(cursorPos);
    const newValue = before + token + " " + after;
    setRawValue(newValue);
    setShowMenu(false);

    setTimeout(() => {
      const newPos = before.length + token.length + 1;
      inputRef.current?.setSelectionRange(newPos, newPos);
      inputRef.current?.focus();
    }, 0);
  }

  // Build visual display value: replace [[task:id|title]] with @title for display
  const displayValue = rawValue.replace(
    /\[\[task:[0-9a-f-]+\|(.+?)\]\]/g,
    "@$1"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawValue.trim() || sending) return;

    setSending(true);
    await onSend(rawValue.trim());
    setRawValue("");
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showMenu && filteredTasks.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex((i) => (i + 1) % filteredTasks.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex(
          (i) => (i - 1 + filteredTasks.length) % filteredTasks.length
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredTasks[menuIndex]);
      } else if (e.key === "Escape") {
        setShowMenu(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // We use a layered approach: hidden textarea with raw tokens, visible overlay with styled display
  const hasMentions = /\[\[task:/.test(rawValue);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative border-t border-slate-200 px-4 py-3"
    >
      {/* @mention autocomplete menu */}
      {showMenu && filteredTasks.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-10">
          <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
            Tasks
          </div>
          {filteredTasks.map((task, i) => (
            <button
              key={task.id}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                i === menuIndex
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(task);
              }}
            >
              <AtSign className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="font-medium truncate">{task.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                W{task.week_number}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          {/* Visible display layer for mentions */}
          {hasMentions && (
            <div
              className="pointer-events-none absolute inset-0 px-3 py-2 text-sm whitespace-pre-wrap break-words"
              aria-hidden="true"
            >
              {parseMentions(rawValue).map((token, i) =>
                token.type === "task" ? (
                  <span
                    key={i}
                    className="inline-flex items-center rounded bg-emerald-100 px-1 py-0.5 text-xs font-medium text-emerald-700"
                  >
                    @{token.taskTitle}
                  </span>
                ) : (
                  <span key={i} className="invisible">
                    {token.value}
                  </span>
                )
              )}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={hasMentions ? displayValue : rawValue}
            onChange={(e) => {
              if (!hasMentions) {
                setRawValue(e.target.value);
              } else {
                setRawValue(e.target.value);
              }
              setCursorPos(e.target.selectionStart ?? 0);
            }}
            onSelect={(e) =>
              setCursorPos(
                (e.target as HTMLTextAreaElement).selectionStart ?? 0
              )
            }
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
            style={{ maxHeight: 96, minHeight: 38 }}
          />
        </div>
        <button
          type="submit"
          disabled={!rawValue.trim() || sending}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
