const MENTION_RE = /\[\[task:([0-9a-f-]+)\|(.+?)\]\]/g;

export interface MentionToken {
  type: "text" | "task";
  value: string;
  taskId?: string;
  taskTitle?: string;
}

export function parseMentions(content: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_RE)) {
    const start = match.index!;
    if (start > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, start) });
    }
    tokens.push({
      type: "task",
      value: match[0],
      taskId: match[1],
      taskTitle: match[2],
    });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) });
  }

  return tokens;
}

export function buildMentionToken(taskId: string, title: string): string {
  return `[[task:${taskId}|${title}]]`;
}

export function extractMentionTaskIds(content: string): string[] {
  const ids: string[] = [];
  for (const match of content.matchAll(MENTION_RE)) {
    ids.push(match[1]);
  }
  return ids;
}
