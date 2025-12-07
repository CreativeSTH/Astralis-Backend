import { Test, TestingModule } from '@nestjs/testing';
import { CobrosService } from './cobros.service';

describe('CobrosService', () => {
  let service: CobrosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CobrosService],
    }).compile();

    service = module.get<CobrosService>(CobrosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
