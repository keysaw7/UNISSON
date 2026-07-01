import type { DiagnosticSessionId } from '@unisson/shared-kernel';
import type { DiagnosticSession } from '../domain/diagnostic';

/** Persistance d'une session de diagnostic (out-port). Mémoire par défaut, PG en option. */
export interface DiagnosticSessionRepositoryPort {
  save(session: DiagnosticSession): Promise<void>;
  get(id: DiagnosticSessionId): Promise<DiagnosticSession | null>;
}

export const DIAGNOSTIC_SESSION_REPOSITORY_PORT = Symbol('DiagnosticSessionRepositoryPort');
