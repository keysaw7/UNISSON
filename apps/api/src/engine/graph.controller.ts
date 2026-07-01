import { Controller, Get, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import { asId, type SkillId } from '@unisson/shared-kernel';
import {
  KNOWLEDGE_GRAPH_REPOSITORY_PORT,
  type KnowledgeGraphRepositoryPort,
} from '@unisson/knowledge-graph';

@Controller('graph')
export class GraphController {
  constructor(
    @Inject(KNOWLEDGE_GRAPH_REPOSITORY_PORT) private readonly graph: KnowledgeGraphRepositoryPort,
  ) {}

  @Get('skills')
  async listSkills(@Query('domain') domain?: string) {
    return this.graph.listSkills(domain);
  }

  /** Prérequis directs ET transitifs (fermeture transitive = recursive CTE côté PG, §7). */
  @Get('skills/:skillId/prerequisites')
  async prerequisites(@Param('skillId') skillIdRaw: string) {
    const skillId = asId<'SkillId'>(skillIdRaw) as SkillId;
    const skill = await this.graph.getSkill(skillId);
    if (!skill) throw new NotFoundException(`Compétence inconnue: ${skillIdRaw}`);

    return {
      skill,
      direct: await this.graph.getPrerequisites(skillId),
      transitive: await this.graph.getTransitivePrerequisiteIds(skillId),
    };
  }

  @Get('skills/:skillId/concepts')
  async concepts(@Param('skillId') skillIdRaw: string) {
    const skillId = asId<'SkillId'>(skillIdRaw) as SkillId;
    return this.graph.getConceptsForSkill(skillId);
  }
}
