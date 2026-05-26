import { Global, Module } from '@nestjs/common';

import { JobsWorkerService } from './jobs-worker.service';
import { JobsService } from './jobs.service';

/**
 * Global porque várias services disparam jobs (BookingService dispara
 * reminder, AdminAppointmentsController poderia disparar reschedule no
 * futuro). Importar em cada module fica chato.
 *
 * JobsService: bootstrap pg-boss + helpers de envio.
 * JobsWorkerService: registra os workers no OnApplicationBootstrap.
 */
@Global()
@Module({
  providers: [JobsService, JobsWorkerService],
  exports: [JobsService],
})
export class JobsModule {}
