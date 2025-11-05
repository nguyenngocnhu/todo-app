<#
PowerShell seed script for the Todo API.

Usage:
  1) Start the API (from repository root):
       cd .\test.todo_api
       dotnet run

  2) In another PowerShell session, run this script:
       .\scripts\seed.ps1

Parameters:
  -ApiUrl : base URL of the running API (default: http://localhost:5080)
  -Force  : if set, will re-create sample items even if items exist
#>

param(
    [string]$ApiUrl = 'http://localhost:5080',
    [switch]$Force
)

$healthEndpoint = "$ApiUrl/swagger/index.html" # quick check (not authoritative)
Write-Host "Seeding sample todos to $ApiUrl ..."

# Check API reachable (GET /swagger/v1/swagger.json or /api/todo)
try {
    $resp = Invoke-WebRequest -Uri "$ApiUrl/swagger/v1/swagger.json" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "API appears reachable (swagger detected)."
} catch {
    Write-Host "Warning: couldn't reach swagger at $ApiUrl/swagger/v1/swagger.json. I will try the /api/todo endpoint." -ForegroundColor Yellow
}

# Check existing items
try {
    $existing = Invoke-RestMethod -Uri "$ApiUrl/api/todo" -Method Get -ErrorAction Stop
} catch {
    Write-Host "Error: could not GET $ApiUrl/api/todo. Ensure the API is running and accessible at the provided ApiUrl." -ForegroundColor Red
    exit 1
}

if ($existing -and $existing.Count -gt 0 -and -not $Force) {
    Write-Host "API already has $($existing.Count) todo items. Use -Force to add sample items anyway." -ForegroundColor Cyan
    exit 0
}

# Sample payloads
$samples = @(
    @{ name = 'Call with client'; isComplete = $false },
    @{ name = 'Go to bed hihi'; isComplete = $false },
    @{ name = 'I work on improving the React components that interact with the API. I connect them through Axios services, handle loading states, and ensure proper error handling when the API fails. I also enhance the user interface by fixing layout issues and improving responsiveness using TailwindCSS. Once the changes are done, I test all the API endpoints using Postman, confirm that the frontend updates instantly when adding, editing, or deleting tasks, and check that the data sync between frontend and backend works without issues. Finally, I update the README file with new setup instructions and run a full git add, commit, and push to sync my work with GitHub.'; isComplete = $true },
    @{ name = 'Go to bed hihi'; isComplete = $false }
)

foreach ($item in $samples) {
    try {
        $json = $item | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$ApiUrl/api/todo" -Method Post -Body $json -ContentType 'application/json'
        Write-Host "Created: $($res.name) (id: $($res.id))"
    } catch {
        Write-Host "Failed to create item $($item.name): $_" -ForegroundColor Red
    }
}

Write-Host "Seeding completed." -ForegroundColor Green
