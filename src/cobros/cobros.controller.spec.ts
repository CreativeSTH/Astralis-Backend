import { Test, TestingModule } from '@nestjs/testing';
import { CobrosController } from './cobros.controller';

describe('CobrosController', () => {
  let controller: CobrosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CobrosController],
    }).compile();

    controller = module.get<CobrosController>(CobrosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
