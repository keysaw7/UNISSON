import { eq } from 'drizzle-orm';
import type { DiagnosticSessionId } from '@unisson/shared-kernel';
import type { DiagnosticSession, DiagnosticSessionRepositoryPort } from '@unisson/learning-engine';
import type { Db } from '../client';
import { diagnosticSession } from '../schema';

/** Dépôt de sessions de diagnostic (§6.2). État complet stocké en `jsonb` (belief + progression). */
export class PgDiagnosticSessionRepository implements DiagnosticSessionRepositoryPort {
  constructor(private readonly db: Db) {}

  async save(session: DiagnosticSession): Promise<void> {
    await this.db
      .insert(diagnosticSession)
      .values({
        id: session.id,
        learnerId: session.learnerId,
        domain: session.domain,
        status: session.status,
        session,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })
      .onConflictDoUpdate({
        target: diagnosticSession.id,
        set: { session, status: session.status, updatedAt: session.updatedAt },
      });
  }

  async get(id: DiagnosticSessionId): Promise<DiagnosticSession | null> {
    const rows = await this.db.select().from(diagnosticSession).where(eq(diagnosticSession.id, id)).limit(1);
    return rows[0] ? (rows[0].session as DiagnosticSession) : null;
  }
}
