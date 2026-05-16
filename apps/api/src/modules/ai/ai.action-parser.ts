import { AIAction, AIActionType, AI_ACTIONS } from '@saas/shared';

export function extractFirstJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function parseAIAction(response: string): AIAction | null {
  try {
    const jsonStr = extractFirstJson(response);
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr);
    if (!parsed.accion) return null;

    if (!AI_ACTIONS.includes(parsed.accion as AIActionType)) return null;

    return parsed as AIAction;
  } catch {
    return null;
  }
}
