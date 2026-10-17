$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Server environment file not found: $envPath"
}

$securePassword = Read-Host 'Enter the MongoDB Atlas database-user password (it will not be displayed)' -AsSecureString
if ($securePassword.Length -eq 0) {
  throw 'The password cannot be empty.'
}

$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $encodedPassword = [Uri]::EscapeDataString($password)
  $connectionString = "mongodb+srv://samadxet_db_user:$encodedPassword@lost-found-app.ou48agl.mongodb.net/monrq?retryWrites=true&w=majority&appName=lost-found-app"
  $contents = [IO.File]::ReadAllText($envPath)
  if ($contents -match '(?m)^MONGODB_URI=') {
    $replacement = [System.Text.RegularExpressions.MatchEvaluator]{ param($match) "MONGODB_URI=$connectionString" }
    $contents = [Regex]::Replace($contents, '(?m)^MONGODB_URI=.*$', $replacement)
  } else {
    $contents = $contents.TrimEnd() + "`r`nMONGODB_URI=$connectionString`r`n"
  }
  [IO.File]::WriteAllText($envPath, $contents, [Text.UTF8Encoding]::new($false))
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  $password = $null
  $encodedPassword = $null
}

Write-Output 'MongoDB connection saved to server/.env. The password was not printed.'
