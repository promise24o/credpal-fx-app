import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FxService } from '../fx.service';
import { FxRate } from '../../entities/fx-rate.entity';
import { Repository } from 'typeorm';
import { Currency } from '../../../wallet/entities/wallet.entity';
import axios from 'axios';

jest.mock('axios');

describe('FxService', () => {
  let service: FxService;
  let repository: Repository<FxRate>;
  let configService: ConfigService;

  const mockFxRate = {
    id: 'fx-rate-id',
    fromCurrency: Currency.USD,
    toCurrency: Currency.NGN,
    rate: 1650,
    inverseRate: 0.000606,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        {
          provide: getRepositoryToken(FxRate),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            manager: {
              transaction: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FX_API_KEY') return 'test-api-key';
              if (key === 'FX_API_URL') return 'https://test-api.com';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FxService>(FxService);
    repository = module.get<Repository<FxRate>>(getRepositoryToken(FxRate));
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRate', () => {
    it('should return 1 for same currency', async () => {
      const rate = await service.getRate(Currency.USD, Currency.USD);
      expect(rate).toBe(1);
    });

    it('should fetch rate from API and cache it', async () => {
      const mockApiResponse = {
        data: {
          result: 'success',
          conversion_rate: 1650,
        },
      };
      (axios.get as jest.Mock).mockResolvedValue(mockApiResponse);
      
      jest.spyOn(repository, 'manager' as any).mockReturnValue({
        transaction: jest.fn((callback: any) => {
          const mockManager = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn(),
          };
          return callback(mockManager);
        }),
      });

      const rate = await service.getRate(Currency.USD, Currency.NGN);
      expect(rate).toBe(1650);
      expect(axios.get).toHaveBeenCalledWith(
        'https://test-api.com/test-api-key/pair/USD/NGN'
      );
    });

    it('should return cached rate if available', async () => {
      const rate = await service.getRate(Currency.USD, Currency.NGN);
      
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFxRate as any);
      
      const cachedRate = await service.getRate(Currency.USD, Currency.NGN);
      expect(cachedRate).toBe(1650);
    });

    it('should fallback to database if API fails', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFxRate as any);

      const rate = await service.getRate(Currency.USD, Currency.NGN);
      expect(rate).toBe(1650);
    });

    it('should return null if both API and database fail', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const rate = await service.getRate(Currency.USD, Currency.NGN);
      expect(rate).toBeNull();
    });
  });

  describe('getAllRates', () => {
    it('should fetch all rates for base currency', async () => {
      const mockApiResponse = {
        data: {
          result: 'success',
          conversion_rates: {
            NGN: 1650,
            EUR: 0.85,
            GBP: 0.73,
          },
        },
      };
      (axios.get as jest.Mock).mockResolvedValue(mockApiResponse);

      const rates = await service.getAllRates(Currency.USD);
      expect(rates.get('USD_NGN')).toBe(1650);
      expect(rates.get('USD_EUR')).toBe(0.85);
      expect(rates.get('USD_GBP')).toBe(0.73);
    });

    it('should handle API errors gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('API Error'));

      const rates = await service.getAllRates(Currency.USD);
      expect(rates.size).toBe(0);
    });
  });
});
