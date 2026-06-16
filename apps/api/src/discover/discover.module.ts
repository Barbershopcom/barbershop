import { Module } from '@nestjs/common';

import { DiscoverController } from './discover.controller';
import { PublicPromotionsController } from './public-promotions.controller';

@Module({
  controllers: [DiscoverController, PublicPromotionsController],
})
export class DiscoverModule {}
