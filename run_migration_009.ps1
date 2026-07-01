$KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c"
$headers = @{
    "apikey" = $KEY
    "Authorization" = "Bearer $KEY"
    "Content-Type" = "application/json"
}

$sql = @"
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_name text,
  ADD COLUMN IF NOT EXISTS verification_nin text;
ALTER TABLE public.buddies
  ADD COLUMN IF NOT EXISTS creator_share_pct integer NOT NULL DEFAULT 70;
"@

$body = @{ query = $sql } | ConvertTo-Json -Depth 5

try {
    $result = Invoke-RestMethod -Uri "https://gmbwrhdoyoinkmtrtbnr.supabase.co/rest/v1/rpc/exec_sql" -Method POST -Headers $headers -Body $body
    Write-Host "Migration succeeded: $result"
} catch {
    Write-Host "exec_sql not available, trying pg direct..."
}

# Alternative: use the management API via psql-compatible approach
# Just output SQL for manual run as fallback
Write-Host "SQL to run manually if needed:"
Write-Host $sql
