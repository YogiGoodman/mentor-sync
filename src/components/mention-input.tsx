"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { TaskWithCommentCount } from "@/lib/types/database";
import { buildMentionToken } from "@/lib/mentions";
import { Send, AtSign, X } from "lucide-react";

interface MentionInputProps {
  tasks: TaskWithCommentCount[];
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
}

const LINE_HEIGHT = 21;
const VERTICAL_PADDING = 16;
const MAX_LINES = 6;
const MIN_HEIGHT = 38;
const MAX_HEIGHT = MAX_LINES * LINE_HEIGHT + VERTICAL_PADDING;

interface MentionedTask {
  id: string;
  title: string;
}

export function MentionInput({
  tasks,
  onSend,
  placeholder = "Message... use @ to tag a task",
}: MentionInputProps) {
  const [textValue, setTextValue] = useState("");
  const [mentionedTasks, setMentionedTasks] = useState<MentionedTask[]>([]);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState("");
  const [menuIndex, setMenuIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredTasks = tasks
    .filter((t) => t.title.toLowerCase().includes(menuFilter.toLowerCase()))
    .slice(0, 8);

  const getAtPosition = useCallback(() => {
    const before = textValue.slice(0, cursorPos);
    const atIndex = before.lastIndexOf("@");
    if (atIndex === -1) return null;
    if (atIndex > 0 && before[atIndex - 1] !== " " && before[atIndex - 1] !== "\n")
      return null;
    const between = before.slice(atIndex + 1);
    return { atIndex, query: between };
  }, [textValue, cursorPos]);

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

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = next + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [textValue, autoResize]);

  function insertMention(task: TaskWithCommentCount) {
    const at = getAtPosition();
    if (!at) return;

    // Remove the @query from textValue, replace with nothing (chip shows separately)
    const before = textValue.slice(0, at.atIndex);
    const after = textValue.slice(cursorPos);
    const newText = before + after;
    setTextValue(newText);

    // Add to mentioned tasks (deduplicate)
    setMentionedTasks((prev) =>
      prev.some((t) => t.id === task.id)
        ? prev
        : [...prev, { id: task.id, title: task.title }]
    );
    setShowMenu(false);

    setTimeout(() => {
      inputRef.current?.setSelectionRange(before.length, before.length);
      inputRef.current?.focus();
    }, 0);
  }

  function removeMention(taskId: string) {
    setMentionedTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = textValue.trim();
    if (!trimmed && mentionedTasks.length === 0) return;
    if (sending) return;

    // Build content: text + mention tokens appended so parseMentions works in history
    const tokens = mentionedTasks
      .map((t) => buildMentionToken(t.id, t.title))
      .join(" ");
    const content = [trimmed, tokens].filter(Boolean).join(" ");

    setSending(true);
    await onSend(content);
    setTextValue("");
    setMentionedTasks([]);
    setSending(false);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.style.height = MIN_HEIGHT + "px";
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showMenu && filteredTasks.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex((i) => (i + 1) % filteredTasks.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((i) => (i - 1 + filteredTasks.length) % filteredTasks.length);
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

  const canSend = (textValue.trim().length > 0 || mentionedTasks.length > 0) && !sending;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative border-t border-slate-200 px-4 py-3 dark:border-slate-800"
    >
      {/* @ mention dropdown */}
      {showMenu && filteredTasks.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-10 dark:border-slate-700 dark:bg-slate-800">
          <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 dark:text-slate-500">
            Tasks
          </div>
          {filteredTasks.map((task, i) => (
            <button
              key={task.id}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                i === menuIndex
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(task);
              }}
            >
              <AtSign className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span className="font-medium truncate">{task.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                W{task.week_number}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tagged task pills */}
      {mentionedTasks.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {mentionedTasks.map((task) => (
            <span
              key={task.id}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-0.5 pl-2 pr-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <AtSign className="h-3 w-3 shrink-0 opacity-70" />
              <span className="max-w-[140px] truncate">{task.title}</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  removeMention(task.id);
                }}
                className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-200 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                aria-label={`Remove mention of ${task.title}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={textValue}
          onChange={(e) => {
            setTextValue(e.target.value);
            setCursorPos(e.target.selectionStart ?? 0);
          }}
          onSelect={(e) =>
            setCursorPos((e.target as HTMLTextAreaElement).selectionStart ?? 0)
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all overflow-y-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800 dark:focus:ring-emerald-500/20"
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 shrink-0 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
