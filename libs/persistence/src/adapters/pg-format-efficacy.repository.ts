import { and, eq } from 'drizzle-orm';
import type { Format } from '@unisson/content';
import { updateRunningMean, type FormatEfficacyRepositoryPort, type FormatEfficacyStat } from '@unisson/learning-engine';
import type { Db } from '../client';
import { formatEfficacy } from '../schema';

const toStat = (r: typeof formatEfficacy.$inferSelect): FormatEfficacyStat => ({
  formatType: r.formatType as Format,
  conceptType: r.conceptType,
  stabilityGainPerMinute: r.stabilityGainPerMinute,
  observations: r.observations,
  retentionAtDays: r.retentionAtDays,
});

/** Stats d'efficacité par (format, type de concept) — alimente le bandit contraint (§6.5). */
export class PgFormatEfficacyRepository implements FormatEfficacyRepositoryPort {
  constructor(private readonly db: Db) {}

  async get(formatType: Format, conceptType: string): Promise<FormatEfficacyStat | null> {
    const rows = await this.db
      .select()
      .from(formatEfficacy)
      .where(and(eq(formatEfficacy.formatType, formatType), eq(formatEfficacy.conceptType, conceptType)))
      .limit(1);
    return rows[0] ? toStat(rows[0]) : null;
  }

  async listForConceptType(conceptType: string): Promise<FormatEfficacyStat[]> {
    const rows = await this.db.select().from(formatEfficacy).where(eq(formatEfficacy.conceptType, conceptType));
    return rows.map(toStat);
  }

  async recordObservation(formatType: Format, conceptType: string, stabilityGainPerMinute: number): Promise<FormatEfficacyStat> {
    const previous = await this.get(formatType, conceptType);
    const updated: FormatEfficacyStat = {
      formatType,
      conceptType,
      stabilityGainPerMinute: updateRunningMean(
        previous?.stabilityGainPerMinute ?? 0,
        previous?.observations ?? 0,
        stabilityGainPerMinute,
      ),
      observations: (previous?.observations ?? 0) + 1,
      retentionAtDays: previous?.retentionAtDays ?? {},
    };

    await this.db
      .insert(formatEfficacy)
      .values(updated)
      .onConflictDoUpdate({
        target: [formatEfficacy.formatType, formatEfficacy.conceptType],
        set: { stabilityGainPerMinute: updated.stabilityGainPerMinute, observations: updated.observations },
      });
    return updated;
  }
}
