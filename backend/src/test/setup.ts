import { vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const dataQueue: any[] = [];
  const rpcQueue: any[] = [];
  
  const mqb: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn(function (resolve) {
      const next = dataQueue.shift() || { data: null, error: null, count: 0 };
      resolve(next);
    }),
  };

  const mf = vi.fn(() => mqb);

  function next(data: any, error: any = null, count?: number) {
    dataQueue.push({ data, error, count });
  }

  function clear() {
    dataQueue.length = 0;
    rpcQueue.length = 0;
  }

  function rpcNext(data: any, error: any = null) {
    rpcQueue.push({ data, error });
  }

  const rpcMock = vi.fn(() => {
    const next = rpcQueue.shift() || { data: null, error: null };
    return Promise.resolve(next);
  });

  return { mqb, mf, next, clear, rpcNext, rpcMock };
});

vi.mock('../shared/supabase', () => ({
  supabaseAdmin: { from: hoisted.mf, rpc: hoisted.rpcMock },
}));

vi.mock('../services/evidenceVault.service', () => ({
  preserveEvidence: vi.fn().mockResolvedValue({ id: 'test-evidence-id-12345' }),
}));

export const { 
  mqb: mockQueryBuilder, 
  mf: mockFrom, 
  next: mockSupabaseNext, 
  clear: mockSupabaseClear, 
  rpcNext: mockRpcNext 
} = hoisted;
