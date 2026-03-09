from typing import Generic, TypeVar

T = TypeVar("T")


class ProviderRegistry(Generic[T]):
    def __init__(self, *, default_provider: str | None = None):
        self._default_provider = self._normalize(default_provider) if default_provider else None
        self._providers: dict[str, T] = {}

    @staticmethod
    def _normalize(name: str | None) -> str:
        return str(name or "").strip().lower()

    def register(self, name: str, provider: T) -> None:
        key = self._normalize(name)
        if not key:
            return
        self._providers[key] = provider

    def get(self, name: str) -> T | None:
        key = self._normalize(name)
        return self._providers.get(key)

    def resolve(self, name: str) -> T:
        provider = self.get(name)
        if provider is not None:
            return provider

        if self._default_provider:
            default = self._providers.get(self._default_provider)
            if default is not None:
                return default

        raise KeyError(name)
