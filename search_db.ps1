$searchString = "??????"
$paths = @("$env:LOCALAPPDATA\Google\Chrome\User Data", "$env:LOCALAPPDATA\Microsoft\Edge\User Data", "$env:APPDATA")
foreach ($path in $paths) {
    if (Test-Path $path) {
        Get-ChildItem -Path $path -Recurse -Include *.ldb,*.log,*.sqlite -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                $content = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction Stop
                if ($content -match $searchString) {
                    Write-Output "FOUND IN: $($_.FullName)"
                }
            } catch {
                # Ignore locked files
            }
        }
    }
}
Write-Output "DONE"
