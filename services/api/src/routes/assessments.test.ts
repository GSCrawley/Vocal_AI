import { jest } from '@jest/globals';

const mockFrom = jest.fn();
jest.unstable_mockModule('../lib/supabase.js', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const { app } = await import('../index.js');
const {  } = await import('../lib/supabase.js');

describe('Assessments Routes', () => {
  let token = '';

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({ sub: 'test-user-uuid' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/assessments/baseline', () => {
    it('returns 401 Unauthorized when token is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/assessments/baseline',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toHaveProperty('error', 'Unauthorized');
    });

    it('creates a pending snapshot and returns jobId and status', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          snapshot_id: 'mock-uuid',
          status: 'pending',
        },
        error: null,
      } as never);

      mockFrom.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/assessments/baseline',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        jobId: 'mock-uuid',
        status: 'pending',
      });
      expect(mockFrom).toHaveBeenCalledWith('user_baseline_snapshot');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-uuid',
          status: 'pending',
          tier: 'singing',
        })
      );
    });

    it('handles database errors gracefully', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('DB Error'),
      } as never);

      mockFrom.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as never);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/assessments/baseline',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toHaveProperty('error');
    });
  });

  describe('GET /v1/assessments/baseline/:jobId', () => {
    it('returns 401 Unauthorized when token is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/assessments/baseline/mock-uuid',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toHaveProperty('error', 'Unauthorized');
    });

    it('returns pending status when job is pending', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: {
          snapshot_id: 'mock-uuid',
          status: 'pending',
        },
        error: null,
      } as never);

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockImplementationOnce(() => ({
          eq: mockEq2.mockImplementationOnce(() => ({
            single: mockSingle,
          })),
        })),
      } as never);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/assessments/baseline/mock-uuid',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        jobId: 'mock-uuid',
        status: 'pending',
      });
      expect(mockFrom).toHaveBeenCalledWith('user_baseline_snapshot');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('returns 404 when job is not found', async () => {
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq1 = jest.fn().mockReturnThis();
      const mockEq2 = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      } as never);

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockImplementationOnce(() => ({
          eq: mockEq2.mockImplementationOnce(() => ({
            single: mockSingle,
          })),
        })),
      } as never);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/assessments/baseline/mock-uuid',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toHaveProperty('error');
    });
  });
});
