import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = {
  roleCard: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

const { getActiveRoleCard, getRoleCardByKey } = await import('../src/services/db-queries.js');

function resetMockPrisma(): void {
  mockPrisma.roleCard.findUnique.mockReset();
  mockPrisma.roleCard.findFirst.mockReset();
}

beforeEach(() => {
  resetMockPrisma();
});

describe('role card db queries', () => {
  it('returns null when the requested role card does not exist', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue(null);

    await expect(getRoleCardByKey('missing-card')).resolves.toBeNull();
    expect(mockPrisma.roleCard.findUnique).toHaveBeenCalledWith({
      where: { key: 'missing-card' },
    });
  });

  it('preserves plain string tone values and parses object constraints', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue({
      id: 11,
      key: 'default',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay warm',
      tone: 'friendly',
      constraints: JSON.stringify({ max_length: 120 }),
      created_at: new Date('2026-04-04T16:00:00.000Z'),
      updated_at: new Date('2026-04-04T16:10:00.000Z'),
    });

    await expect(getRoleCardByKey('default')).resolves.toEqual({
      id: 11,
      key: 'default',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay warm',
      tone: 'friendly',
      constraints: { max_length: 120 },
      created_at: new Date('2026-04-04T16:00:00.000Z'),
      updated_at: new Date('2026-04-04T16:10:00.000Z'),
    });
  });

  it('preserves plain string constraints for the active role card', async () => {
    mockPrisma.roleCard.findFirst.mockResolvedValue({
      id: 12,
      key: 'active-card',
      enabled: true,
      is_active: true,
      system_prompt: 'Be concise',
      tone: JSON.stringify({ style: 'formal' }),
      constraints: 'avoid spoilers',
      created_at: new Date('2026-04-04T16:20:00.000Z'),
      updated_at: new Date('2026-04-04T16:30:00.000Z'),
    });

    await expect(getActiveRoleCard()).resolves.toEqual({
      id: 12,
      key: 'active-card',
      enabled: true,
      is_active: true,
      system_prompt: 'Be concise',
      tone: { style: 'formal' },
      constraints: 'avoid spoilers',
      created_at: new Date('2026-04-04T16:20:00.000Z'),
      updated_at: new Date('2026-04-04T16:30:00.000Z'),
    });
    expect(mockPrisma.roleCard.findFirst).toHaveBeenCalledWith({
      where: {
        enabled: true,
        is_active: true,
      },
      orderBy: [
        { updated_at: 'desc' },
        { id: 'desc' },
      ],
    });
  });
});
