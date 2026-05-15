import { describe, it, expect } from 'vitest';
import { parseAIAction } from './ai.action-parser';

describe('AI Action Parser', () => {
  it('should parse a valid JSON action', () => {
    const response = 'Claro, aquí tienes: {"accion":"CREAR_CITA","servicioId":"123"}';
    const result = parseAIAction(response);
    expect(result).toEqual({ accion: 'CREAR_CITA', servicioId: '123' });
  });

  it('should return null for invalid action', () => {
    const response = 'No hay nada aquí';
    const result = parseAIAction(response);
    expect(result).toBeNull();
  });

  it('should return null for unknown action type', () => {
    const response = '{"accion":"ACCION_FANTASMA"}';
    const result = parseAIAction(response);
    expect(result).toBeNull();
  });
});
