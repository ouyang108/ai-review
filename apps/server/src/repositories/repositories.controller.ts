import { Controller, Get, Body } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
// import { CreateRepositoryDto } from './dto/create-repository.dto';
// import { UpdateRepositoryDto } from './dto/update-repository.dto';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  findAll() {
    return this.repositoriesService.findAll();
  }
}
