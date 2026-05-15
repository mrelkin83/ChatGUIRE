import { AIAction, AIActionType, AI_ACTIONS } from '@saas/shared';

export function parseAIAction(response: string): AIAction | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*?"accion"[\s\S]*?\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.accion) return null;
    
    // Validate that the action is known
    if (!AI_ACTIONS.includes(parsed.accion as AIActionType)) {
      return null;
    }
    
    return parsed as AIAction;
  } catch {
    return null;
  }
}
