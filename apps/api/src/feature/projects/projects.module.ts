import { Module } from '@nestjs/common'
import { AccessModule } from '../access/access.module.js'
import { InvitesModule } from '../invites/invites.module.js'
import { DeliverablesResolver } from './deliverables.resolver.js'
import { DeliverablesService } from './deliverables.service.js'
import { PhasesResolver } from './phases.resolver.js'
import { PhasesService } from './phases.service.js'
import { ProjectAccessService } from './project-access.service.js'
import { ProjectsResolver } from './projects.resolver.js'
import { ProjectsService } from './projects.service.js'
import { TasksResolver } from './tasks.resolver.js'
import { TasksService } from './tasks.service.js'
import { TemplateResolver } from './template.resolver.js'
import { TemplateService } from './template.service.js'

/** HIS implementation projects (feature 007): template, projects, phases, tasks, deliverables, stakeholders. */
@Module({
  imports: [AccessModule, InvitesModule],
  providers: [
    ProjectAccessService,
    TemplateService,
    TemplateResolver,
    ProjectsService,
    ProjectsResolver,
    PhasesService,
    PhasesResolver,
    TasksService,
    TasksResolver,
    DeliverablesService,
    DeliverablesResolver,
  ],
  exports: [ProjectAccessService],
})
export class ProjectsModule {}
