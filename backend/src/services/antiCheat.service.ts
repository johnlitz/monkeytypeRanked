export function validateRankedResult(wpm: number, accuracy: number, rawWPM: number, duration: number): boolean {
  // Flag inhuman WPM spikes (e.g., > 300 WPM)
  const INHUMAN_WPM_THRESHOLD = 300;
  if (wpm > INHUMAN_WPM_THRESHOLD) {
    console.warn(`Anti-cheat: Flagged inhuman WPM spike: ${wpm}`);
    return false;
  }

  // Flag perfect accuracy at high speeds (e.g., 100% accuracy above 150 WPM)
  const PERFECT_ACCURACY_WPM_THRESHOLD = 150;
  if (accuracy === 100 && wpm > PERFECT_ACCURACY_WPM_THRESHOLD) {
    console.warn(`Anti-cheat: Flagged perfect accuracy at high WPM: ${wpm} WPM, ${accuracy}% accuracy`);
    return false;
  }

  // Additional checks could include:
  // - Consistency of typing (e.g., sudden drops or spikes in WPM during the test)
  // - Character per second analysis (e.g., impossible speeds for single characters)
  // - Comparison with historical player data (e.g., significant deviation from average performance)
  // - Time taken for first key press, time between key presses

  return true; // Result is considered valid for now
}

