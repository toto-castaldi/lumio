---
status: diagnosed
phase: 03-core-screens
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md
started: 2026-02-07T12:00:00Z
updated: 2026-02-07T12:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Stat Cards
expected: Dashboard screen shows three stat cards: Repositories (count), Cards (count), and Last Studied (date or "Never"). Cards have icons and load data from the backend.
result: pass

### 2. Dashboard Study Button
expected: A prominent "Study" button appears on the dashboard. It is disabled (greyed out / non-interactive) when card count is 0. Shows a loading spinner while data is loading.
result: pass

### 3. Dashboard Empty State
expected: When user has no repositories, the dashboard shows an empty state with an icon, a message like "No repositories yet", and a "Go to Repositories" action button that navigates to the Repos tab.
result: issue
reported: "il tasto 'go to repositories' in dashboard non funziona"
severity: major

### 4. Dashboard Pull-to-Refresh
expected: Pulling down on the dashboard triggers a refresh animation and reloads the stat data from the backend.
result: pass

### 5. Repository List
expected: Repos tab shows a list of the user's repositories. Each repo shows its name and URL. Private repos show a lock icon.
result: pass

### 6. Add Public Repository
expected: A form allows entering a GitHub repository URL. After submitting a valid public repo URL, it appears in the list and a success toast notification shows.
result: pass

### 7. Add Private Repository with PAT
expected: When adding a private repository (or a repo that fails without auth), a Personal Access Token input field appears. Entering a PAT and submitting adds the repo successfully.
result: issue
reported: "non funziona bene. Non si riesce ad inserire PAT - campo quasi invisibile, nessun pulsante submit per il PAT, e l'input PAT rimane aperto dopo"
severity: major

### 8. Delete Repository
expected: Swiping left on a repository reveals a red delete button. Tapping it shows a confirmation dialog. Confirming deletes the repo and shows a success toast.
result: pass

### 9. Repos Empty State
expected: When no repositories exist, the Repos tab shows a centered empty state with an icon and message encouraging the user to add a repository.
result: pass

### 10. Settings Dark Mode Toggle
expected: Settings screen has an "Appearance" section with three options: System, Light, Dark. Tapping an option changes the theme immediately. A checkmark indicates the current selection.
result: pass

### 11. Dark Mode Persists
expected: After selecting a theme preference (e.g., Dark), closing and reopening the app retains the chosen theme.
result: pass

### 12. Dark Mode on All Screens
expected: In dark mode, all screens (Login, Dashboard, Repos, Settings) use dark backgrounds and light text. No hardcoded white backgrounds or dark text that become invisible.
result: pass

### 13. Tab Navigation with Theme Colors
expected: Bottom tab bar (Dashboard, Repos, Settings) uses theme-appropriate colors — dark background in dark mode, light in light mode. Active tab icon is highlighted.
result: pass

## Summary

total: 13
passed: 11
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Go to Repositories button in Dashboard empty state navigates to Repos tab"
  status: failed
  reason: "User reported: il tasto 'go to repositories' in dashboard non funziona"
  severity: major
  test: 3
  root_cause: "onAction handler in DashboardScreen.tsx is a placeholder console.log() instead of navigation call"
  artifacts:
    - path: "apps/android/screens/DashboardScreen.tsx"
      issue: "onAction callback at line ~108 is console.log('Navigate to Repos') placeholder"
  missing:
    - "Import useNavigation from @react-navigation/native"
    - "Replace console.log placeholder with navigation.navigate('Repos')"

- truth: "PAT input field is visible, usable, and has a submit button for adding private repositories"
  status: failed
  reason: "User reported: non funziona bene. Non si riesce ad inserire PAT - campo quasi invisibile, nessun pulsante submit per il PAT, e l'input PAT rimane aperto dopo"
  severity: major
  test: 7
  root_cause: "Three issues: (1) PAT secureTextEntry with dark theme creates poor visibility, (2) No dedicated submit button for PAT flow - only the + button exists, (3) showPatPrompt only reset on success, no cancel/dismiss mechanism"
  artifacts:
    - path: "apps/android/components/AddRepoForm.tsx"
      issue: "No submit button in PAT section, secureTextEntry with poor contrast, no cancel button"
    - path: "apps/android/screens/ReposScreen.tsx"
      issue: "showPatPrompt only set to false on success, no cancel/reset handler"
  missing:
    - "Add explicit 'Submit with Token' button in PAT section"
    - "Add 'Cancel' button to dismiss PAT prompt"
    - "Reset showPatPrompt when user changes URL"
    - "Improve PAT field visibility with placeholder text and better styling"
