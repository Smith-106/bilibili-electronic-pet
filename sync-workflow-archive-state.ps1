param(
  [ValidateSet('verify', 'apply')]
  [string]$Mode = 'verify',
  [string]$StateFile = 'config/workflow-archive-state.json'
)

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
chcp 65001 > $null
$ErrorActionPreference = 'Stop'

function Resolve-RepoPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RelativePath
  )

  return Join-Path $PSScriptRoot $RelativePath
}

function Test-IsJunctionToTarget {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedTarget
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $false
  }

  $item = Get-Item -LiteralPath $Path -Force
  if (-not ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
    return $false
  }
  if ($item.LinkType -ne 'Junction') {
    return $false
  }

  $actualTarget = $item.Target
  if ($actualTarget -is [array]) {
    $actualTarget = $actualTarget[0]
  }
  if (-not $actualTarget) {
    return $false
  }

  $resolvedExpected = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $ExpectedTarget).ProviderPath)
  $resolvedActual = [System.IO.Path]::GetFullPath($actualTarget)
  return $resolvedExpected -eq $resolvedActual
}

function Write-ArchiveMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [pscustomobject]$Session,
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath,
    [Parameter(Mandatory = $true)]
    [string]$ArchivedAt
  )

  $metadata = [ordered]@{
    session_id = $Session.session_id
    archived_at = $ArchivedAt
    source_active_path = $Session.active_path
    archived_path = $Session.archive_path
    compatibility_mode = $Session.compatibility_mode
    migration_scope = 'physical_session_directory_move'
    paired_truth_sources = @($Session.paired_truth_sources)
    notes = @($Session.notes)
  }

  $metadataPath = Join-Path $ArchivePath 'ARCHIVE_METADATA.json'
  $metadata | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $metadataPath -Encoding utf8
}

$statePath = Resolve-RepoPath $StateFile
if (-not (Test-Path -LiteralPath $statePath)) {
  throw "missing state file: $statePath"
}

$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
$archivedAt = $state.updated_at
$results = New-Object System.Collections.Generic.List[object]

foreach ($session in $state.archived_sessions) {
  $activePath = Resolve-RepoPath $session.active_path
  $archivePath = Resolve-RepoPath $session.archive_path
  $archiveExists = Test-Path -LiteralPath $archivePath
  $activeExists = Test-Path -LiteralPath $activePath
  $junctionOk = $false

  if ($archiveExists -and $activeExists) {
    $junctionOk = Test-IsJunctionToTarget -Path $activePath -ExpectedTarget $archivePath
  }

  if ($archiveExists -and $junctionOk) {
    if ($Mode -eq 'apply') {
      Write-ArchiveMetadata -Session $session -ArchivePath $archivePath -ArchivedAt $archivedAt
    }
    $results.Add([pscustomobject]@{
        Session = $session.session_id
        Status = 'in_sync'
        Detail = 'archive exists and active path resolves through expected junction'
      })
    continue
  }

  if ($Mode -eq 'verify') {
    $detail = if (-not $archiveExists -and -not $activeExists) {
      'archive and active paths are both missing'
    } elseif (-not $archiveExists) {
      'archive path is missing'
    } elseif (-not $activeExists) {
      'active compatibility path is missing'
    } else {
      'active path exists but is not the expected junction'
    }

    $results.Add([pscustomobject]@{
        Session = $session.session_id
        Status = 'drift'
        Detail = $detail
      })
    continue
  }

  $archiveParent = Split-Path -Parent $archivePath
  if (-not (Test-Path -LiteralPath $archiveParent)) {
    New-Item -ItemType Directory -Path $archiveParent | Out-Null
  }

  if (-not $archiveExists) {
    if (-not $activeExists) {
      throw "cannot apply archive state for $($session.session_id): both active and archive paths are missing"
    }
    Move-Item -LiteralPath $activePath -Destination $archivePath
  } elseif ($activeExists) {
    $activeItem = Get-Item -LiteralPath $activePath -Force
    if (-not ($activeItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
      throw "cannot replace non-link active path for $($session.session_id) because a canonical archive already exists"
    }
  }

  if (Test-Path -LiteralPath $activePath) {
    $activeItem = Get-Item -LiteralPath $activePath -Force
    if ($activeItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
      Remove-Item -LiteralPath $activePath -Force
    } else {
      throw "cannot convert active path for $($session.session_id) to a junction because it is still a normal directory"
    }
  }

  New-Item -ItemType Junction -Path $activePath -Target $archivePath | Out-Null
  Write-ArchiveMetadata -Session $session -ArchivePath $archivePath -ArchivedAt $archivedAt

  if (-not (Test-IsJunctionToTarget -Path $activePath -ExpectedTarget $archivePath)) {
    throw "failed to create expected junction for $($session.session_id)"
  }

  $results.Add([pscustomobject]@{
      Session = $session.session_id
      Status = 'applied'
      Detail = 'archive state applied and active path now resolves through expected junction'
    })
}

$results | Format-Table -AutoSize

if ($Mode -eq 'verify' -and ($results | Where-Object { $_.Status -ne 'in_sync' }).Count -gt 0) {
  throw 'workflow archive state drift detected'
}
