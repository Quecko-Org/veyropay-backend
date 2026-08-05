import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserEntity } from './entities/user.entity';
import { ProviderReferenceEntity } from './entities/provider-reference.entity';
import { UserRepository } from './repositories/user.repository';
import { ProviderReferenceRepository } from './repositories/provider-reference.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ProviderReferenceEntity])],
  controllers: [ProfileController],
  providers: [ProfileService, UserRepository, ProviderReferenceRepository],
  exports: [ProfileService],
})
export class ProfileModule {}
