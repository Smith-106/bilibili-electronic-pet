# Versioning

bilibili-electronic-pet is a **monorepo** with independently-versioned packages.
Two version schemes are in play, documented here so a version bump is never an
unexplained inconsistency.

## Release-train packages — shared version

The three packages that ship together as the deployable product share **one
version**, bumped in lockstep on every release:

| Package | `package.json` | Version |
|---------|----------------|---------|
| repo root | `package.json` | `1.4.1` |
| `backend-ts` | `backend-ts/package.json` | `1.4.1` |
| `frontend` | `frontend/package.json` | `1.4.1` |

These follow [Semantic Versioning](https://semver.org/): **MAJOR** breaking
change, **MINOR** backward-compatible feature, **PATCH** backward-compatible
fix. The version that appears on the GitHub Release, in `CHANGELOG.md`, and in
`docs-site` is **this** shared number. Bump all three together plus the
`CHANGELOG` `[x.y.z]` heading, the README version references, and `docs-site`'s
version label in the same commit.

## Satellite packages — independent versions

Sidecars and auxiliary surfaces carry their **own** SemVer line, because they
release on a different cadence and are not part of the core release train:

| Package | Version | Reasoning |
|---------|---------|-----------|
| `douyin-sidecar` | `1.2.0` | Independent sidecar; bumped on its own feature/fix line. |
| `qq-sidecar` | `1.2.0` | Independent sidecar; bumped on its own feature/fix line. |
| `docs-site` | `1.0.0` | Documentation site; version tracks its own content releases. |
| `pet-companion-web` | `0.1.0` | Pre-1.0 experimental surface; `0.x` signals unstable API. |

A satellite bump does **not** require a release-train bump, and vice versa —
the trains are intentionally decoupled.

## Where the canonical version lives

- Product/release version → `CHANGELOG.md` `[x.y.z]` heading + the three
  release-train `package.json` `version` fields (kept equal).
- Full change history → `CHANGELOG.md`.
- Breaking changes & upgrade/migration guides → `RELEASE-NOTES.md` (scope:
  breaking changes only — see that file's header).
