# TypeRush: Free Online Typing Speed Test

A static typing test built with plain HTML, CSS and JavaScript. No backend, no dependencies, no network requests.

## Run it
Open `index.html` in any modern browser (double-click it). No server needed.

## Files
- `index.html`: page structure, SEO content, FAQ
- `style.css`: light/dark themes and responsive layout
- `script.js`: typing engine, scoring, storage, share, sound

## Features
Timed test (15/30/60/120 s), Easy/Medium/Hard passages, practice mode (no countdown), daily challenge (same passage all day), personal best, last 10 results, share (Web Share API, clipboard fallback), optional sounds (off by default), saved dark mode, clear history. Paste and drop are blocked.

## Scoring
- A word is 5 characters, spaces included.
- Net WPM = (characters typed / 5 - uncorrected errors) / minutes, never below 0.
- Accuracy = correct characters / characters typed.
- Personal best counts timed and daily tests only. Practice results appear in recent results.

## Shortcut
`Esc` restarts the current test (same passage). **New passage** loads a different one.

## Saved data
Stored in `localStorage` under `typerush.theme`, `typerush.sound`, `typerush.best`, `typerush.history`. "Clear history" removes the results and personal best.

## Manual test checklist
1. Timer stays at full time until the first keystroke, then counts down.
2. Try 15, 30, 60 and 120 s; each ends at 0:00 and locks input.
3. Type a wrong letter: it turns red, Errors rises, accuracy drops. Backspace and fix it: both recover.
4. Press `Esc` mid-test: all stats, timer and text reset.
5. Finish a test, refresh: personal best and recent results remain. Clear history empties them.
6. Toggle dark mode, refresh: theme persists.
7. Try pasting into the test: nothing happens.
8. Finish the whole passage early: the test ends with a valid result.
9. Resize to phone width: layout stays usable; tap the text to type.
