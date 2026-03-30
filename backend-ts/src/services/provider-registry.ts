/**
 * Generic provider registry
 * Migrated from Python: app/services/provider_registry.py
 *
 * Strategy/registry pattern for pluggable providers (LLM generators,
 * publishers, safety checkers, search providers, etc.).
 */

export class ProviderRegistry<T> {
  private readonly providers = new Map<string, T>();
  private readonly defaultProvider: string | null;

  constructor(options?: { defaultProvider?: string }) {
    const raw = options?.defaultProvider;
    this.defaultProvider = raw ? normalize(raw) : null;
  }

  register(name: string, provider: T): void {
    const key = normalize(name);
    if (!key) return;
    this.providers.set(key, provider);
  }

  get(name: string): T | undefined {
    return this.providers.get(normalize(name));
  }

  resolve(name: string): T {
    const provider = this.get(name);
    if (provider !== undefined) return provider;

    if (this.defaultProvider) {
      const fallback = this.providers.get(this.defaultProvider);
      if (fallback !== undefined) return fallback;
    }

    throw new Error(`Provider not found: "${name}"`);
  }

  get size(): number {
    return this.providers.size;
  }

  keys(): string[] {
    return [...this.providers.keys()];
  }
}

function normalize(name: string | undefined | null): string {
  return (name ?? '').trim().toLowerCase();
}
