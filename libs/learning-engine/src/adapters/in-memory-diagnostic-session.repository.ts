import type { DiagnosticSessionId } from '@unisson/shared-kernel';
import type { DiagnosticSession } from '../domain/diagnostic';
import type { DiagnosticSessionRepositoryPort } from '../ports/diagnostic-session.repository.port';

export class InMemoryDiagnosticSessionRepository implements DiagnosticSessionRepositoryPort {
  private readonly sessions = new Map<string, DiagnosticSession>();

  async save(session: DiagnosticSession): Promise<void> {
    this.sessions.set(session.id, structuredClone(session));
  }

  async get(id: DiagnosticSessionId): Promise<DiagnosticSession | null> {
    const s = this.sessions.get(id);
    return s ? structuredClone(s) : null;
  }
}
