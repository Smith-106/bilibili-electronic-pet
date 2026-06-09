import { describe, expect, it } from 'vitest';

import { ProviderRegistry } from '../src/services/provider-registry.js';

describe('ProviderRegistry', () => {
  it('normalizes provider names, ignores empty registrations, and exposes keys', () => {
    const registry = new ProviderRegistry<number>({ defaultProvider: ' Default ' });

    registry.register(' DEFAULT ', 1);
    registry.register('Alt', 2);
    registry.register('', 3);

    expect(registry.size).toBe(2);
    expect(registry.keys()).toEqual(['default', 'alt']);
    expect(registry.get('default')).toBe(1);
    expect(registry.get(' ALT ')).toBe(2);
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.get(undefined as unknown as string)).toBeUndefined();
  });

  it('resolves the default provider when a named provider is absent', () => {
    const registry = new ProviderRegistry<string>({ defaultProvider: 'primary' });
    registry.register('primary', 'fallback-provider');

    expect(registry.resolve('unknown')).toBe('fallback-provider');
  });

  it('resolves an explicitly registered provider before using the default', () => {
    const registry = new ProviderRegistry<string>({ defaultProvider: 'primary' });
    registry.register('primary', 'fallback-provider');
    registry.register('named', 'named-provider');

    expect(registry.resolve(' named ')).toBe('named-provider');
  });

  it('throws when no provider and no default fallback are available', () => {
    const registry = new ProviderRegistry<string>();

    expect(() => registry.resolve('unknown')).toThrow('Provider not found: "unknown"');
  });

  it('throws when the configured default provider was not registered', () => {
    const registry = new ProviderRegistry<string>({ defaultProvider: 'primary' });
    registry.register('secondary', 'value');

    expect(() => registry.resolve('missing')).toThrow('Provider not found: "missing"');
  });
});
