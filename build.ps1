$ErrorActionPreference = "Stop"

$OutputFile = "MGTools.user.js"
$TempFile = "$OutputFile.tmp"

$Parts = @(
  "src/00-userscript-meta.js",
  "src/01-room-connection-prelude.js",
  "src/02-module-structure.js",
  "src/03-module-01-initialization.js",
  "src/04-module-02-compatibility.js",
  "src/05-module-03-storage.js",
  "src/06-module-04-configuration.js",
  "src/07-module-05-logging.js",
  "src/08-module-06-compatibility-extended.js",
  "src/09-module-07-network.js",
  "src/10-module-08-ui-assets.js",
  "src/11-module-09-state.js",
  "src/12-module-10-ui-main.js",
  "src/13-module-11-events.js",
  "src/14-module-12-main-bootstrap.js",
  "src/15-module-13-public-api.js",
  "src/16-mgtp-overlay.js",
  "src/17-ability-log-hard-clear-merge-block.js"
)

if (Test-Path -LiteralPath $TempFile) {
  Remove-Item -LiteralPath $TempFile
}

try {
  $OutputStream = [System.IO.File]::Open(
    (Join-Path (Get-Location) $TempFile),
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write
  )

  try {
    foreach ($Part in $Parts) {
      if (-not (Test-Path -LiteralPath $Part -PathType Leaf)) {
        throw "Missing source part: $Part"
      }

      $Bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Part))
      $OutputStream.Write($Bytes, 0, $Bytes.Length)
    }
  } finally {
    $OutputStream.Dispose()
  }

  Move-Item -LiteralPath $TempFile -Destination $OutputFile -Force
  Write-Host "Built $OutputFile from src/*.js"
} catch {
  if (Test-Path -LiteralPath $TempFile) {
    Remove-Item -LiteralPath $TempFile
  }
  throw
}
