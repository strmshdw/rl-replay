<#
.SYNOPSIS
    Orchestrates the Loop Engineering environment.
.DESCRIPTION
    Provides utilities to inspect the loop state, perform local triage, and clean up active worktrees.
.PARAMETER Action
    The loop action to run: 'status', 'triage', 'clean'.
.EXAMPLE
    .\scripts\run-loop.ps1 status
#>

param (
    [ValidateSet("status", "triage", "clean")]
    [string]$Action = "status"
)

$WorkspaceRoot = Resolve-Path "$PSScriptRoot\.."
$ProgressFile = "$WorkspaceRoot\progress.md"

function Get-State {
    if (-not (Test-Path $ProgressFile)) {
        Write-Error "State file progress.md not found at $ProgressFile!"
        return $null
    }
    return Get-Content $ProgressFile
}

function Show-Status {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "        LOOP ENGINEERING STATUS           " -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $content = Get-State
    if ($null -eq $content) { return }

    # Extract Status and Health
    $healthLine = $content | Where-Object { $_ -like "*System Health*" }
    $lastRunLine = $content | Where-Object { $_ -like "*Last Run*" }

    Write-Host "System Info:" -ForegroundColor Yellow
    Write-Host "  $($healthLine -replace '- ', '')" -ForegroundColor Green
    Write-Host "  $($lastRunLine -replace '- ', '')" -ForegroundColor White
    
    # Count active worktrees
    $worktrees = git worktree list
    Write-Host "`nGit Worktrees:" -ForegroundColor Yellow
    if ($null -eq $worktrees -or $worktrees.Count -eq 0 -or ($worktrees.Count -eq 1 -and $worktrees[0] -match "\[main\]")) {
        Write-Host "  No active isolation worktrees." -ForegroundColor Gray
    } else {
        foreach ($wt in $worktrees) {
            Write-Host "  $wt" -ForegroundColor Magenta
        }
    }
    
    # Read pending tasks
    Write-Host "`nPending Tasks from Backlog:" -ForegroundColor Yellow
    $pendingTasks = $content | Where-Object { $_ -match "\[ \] Pending" }
    if ($null -eq $pendingTasks) {
        Write-Host "  No pending tasks in triage queue." -ForegroundColor Gray
    } else {
        foreach ($task in $pendingTasks) {
            Write-Host "  $task" -ForegroundColor White
        }
    }
    Write-Host "==========================================" -ForegroundColor Cyan
}

function Run-Triage {
    Write-Host "Running local triage scan..." -ForegroundColor Yellow
    
    $modifiedFiles = git status --porcelain
    $uncommittedCount = 0
    if ($modifiedFiles) {
        Write-Host "`nUncommitted Changes Detected:" -ForegroundColor Red
        foreach ($file in $modifiedFiles) {
            Write-Host "  $file" -ForegroundColor Red
            $uncommittedCount++
        }
    } else {
        Write-Host "  No uncommitted changes in main checkout." -ForegroundColor Green
    }

    $lastCommits = git log -n 3 --oneline
    Write-Host "`nRecent Commit History:" -ForegroundColor Yellow
    foreach ($commit in $lastCommits) {
        Write-Host "  $commit" -ForegroundColor Gray
    }

    Write-Host "`nRecommendation:" -ForegroundColor Cyan
    if ($uncommittedCount -gt 0) {
        Write-Host "  Use the worktree-isolation skill (`$worktree-isolation`) to isolate these edits before implementing." -ForegroundColor White
    } else {
        Write-Host "  Prompt your agent to run the triage skill (`$triage`) to scan for new issues or code TODOs." -ForegroundColor White
    }
}

function Run-Clean {
    Write-Host "Cleaning up completed worktrees..." -ForegroundColor Yellow
    git worktree prune
    Write-Host "Worktrees pruned successfully." -ForegroundColor Green
}

# Execution Entry Point
switch ($Action) {
    "status" { Show-Status }
    "triage" { Run-Triage }
    "clean"  { Run-Clean }
}
