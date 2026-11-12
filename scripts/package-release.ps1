param(
  [Parameter(Mandatory)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
function Get-Sha256Hex([string]$Path) {
  $stream = [IO.File]::OpenRead($Path)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
    $stream.Dispose()
  }
}

$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content -LiteralPath (Join-Path $root 'app.config.json') -Raw | ConvertFrom-Json
if ($config.version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
  throw 'Expected a stable MAJOR.MINOR.PATCH version in app.config.json.'
}

$tag = "v$($config.version)"
$prefix = "$($config.repository.name)-$tag"
$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
$packageDirectory = Join-Path $OutputDirectory 'package'
$null = New-Item -ItemType Directory -Path $packageDirectory -Force
$dist = Join-Path $root 'dist'

foreach ($name in @('index.html', 'index.self-extract.html', 'dependency-manifest.json', 'self-extract-manifest.json')) {
  Copy-Item -LiteralPath (Join-Path $dist $name) -Destination $packageDirectory
}
foreach ($name in @('README.md', 'README.ja.md', 'README-FIRST.txt', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'CHANGELOG.md', 'dependencies.json')) {
  Copy-Item -LiteralPath (Join-Path $root $name) -Destination $packageDirectory
}

$readable = Join-Path $OutputDirectory "$prefix.html"
$selfExtract = Join-Path $OutputDirectory "$prefix.self-extract.html"
$archive = Join-Path $OutputDirectory "$prefix.zip"
Copy-Item -LiteralPath (Join-Path $dist 'index.html') -Destination $readable
Copy-Item -LiteralPath (Join-Path $dist 'index.self-extract.html') -Destination $selfExtract

$metadata = [ordered]@{
  repository = "$($config.repository.owner)/$($config.repository.name)"
  tag = $tag
  version = $config.version
  commit = git -C $root rev-parse HEAD
  htmlSha256 = (Get-Sha256Hex $readable)
}
if ($env:GITHUB_RUN_ID) {
  $metadata.ci = "$env:GITHUB_SERVER_URL/$env:GITHUB_REPOSITORY/actions/runs/$env:GITHUB_RUN_ID"
}
$metadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $packageDirectory 'RELEASE.json') -Encoding utf8
$packageFiles = (Get-ChildItem -LiteralPath $packageDirectory -File).FullName
Compress-Archive -LiteralPath $packageFiles -DestinationPath $archive -Force
$checksums = foreach ($file in @($readable, $selfExtract, $archive)) {
  $hash = Get-Sha256Hex $file
  "$hash  $([IO.Path]::GetFileName($file))"
}
$checksums | Set-Content -LiteralPath (Join-Path $OutputDirectory 'SHA256SUMS.txt') -Encoding ascii
