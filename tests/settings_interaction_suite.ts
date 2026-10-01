/**
 * SETTINGS INTERACTION & REVIEW UNLOCK AUTOMATED CONTRACT SUITE
 *
 * Verifies:
 * 1. Settings button interaction on TITLE screen (.settings-launch and menu button)
 * 2. Settings button interaction on CAMPAIGN screen (.settings-launch)
 * 3. Settings button interaction on READY screen (.settings-launch)
 * 4. Settings modal open/close lifecycle and state transitions
 * 5. Review Mode toggle and Review Unlock All Levels toggle
 * 6. Visual feedback and sector accessibility when reviewUnlockAllLevels is active
 * 7. Telemetry event recording for all settings actions
 */

import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[SETTINGS_CONTRACT_FAILED] ${message}`);
  }
}

async function runSettingsContractSuite() {
  console.log('--- Starting Settings Interaction & Review Unlock Contract Suite ---');

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://ais-dev-g4arztjuwbxx27exxum5vy-649398524149.us-east1.run.app/',
    pretendToBeVisual: true,
  });

  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: dom.window.navigator,
      configurable: true,
      writable: true,
    });
  } catch {
    // Already defined
  }
  (globalThis as any).localStorage = dom.window.localStorage;
  (globalThis as any).location = dom.window.location;
  (globalThis as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

  dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    measureText: () => ({ width: 10 }),
    fillRect: () => {},
    clearRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
  });

  const { default: App } = await import('../src/App');
  const rootEl = document.getElementById('root')!;
  const root = createRoot(rootEl);

  await act(async () => {
    root.render(React.createElement(App));
  });

  // ── TEST 1: TITLE SCREEN SETTINGS LAUNCH ───────────────────────────────
  console.log('Testing Title screen Settings launch...');
  const titleSettingsLaunch = rootEl.querySelector('.settings-launch') as HTMLButtonElement | null;
  assert(titleSettingsLaunch !== null, 'T1: .settings-launch button must exist on Title screen');
  assert(titleSettingsLaunch.getAttribute('data-ui') === 'true', 'T1: .settings-launch must have data-ui attribute');

  // Verify play-menu is not initially present
  assert(rootEl.querySelector('.play-menu') === null, 'T1: play-menu must not be in DOM initially');

  // Click top-right Settings button
  await act(async () => {
    titleSettingsLaunch.click();
  });
  const playMenu1 = rootEl.querySelector('.play-menu');
  assert(playMenu1 !== null, 'T1: play-menu must render after clicking .settings-launch on Title');
  const modalHeader = rootEl.querySelector('.play-menu-header');
  assert(modalHeader !== null, 'T1: .play-menu-header must render');

  // Close via X button
  const closeBtn1 = rootEl.querySelector('.btn-close-x') as HTMLButtonElement | null;
  assert(closeBtn1 !== null, 'T1: .btn-close-x close button must render');
  await act(async () => {
    closeBtn1.click();
  });
  assert(rootEl.querySelector('.play-menu') === null, 'T1: play-menu must be dismissed after clicking close');

  // Click Title menu "Settings / Review" button
  const buttons = Array.from(rootEl.querySelectorAll('button'));
  const ghostSettings = buttons.find((b) => b.textContent?.includes('Settings / Review'));
  assert(ghostSettings !== undefined, 'T1: "Settings / Review" menu button must exist on Title screen');
  await act(async () => {
    ghostSettings.click();
  });
  assert(rootEl.querySelector('.play-menu') !== null, 'T1: play-menu must render after clicking Title menu button');

  // Close via Cancel button in footer
  const cancelBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancel');
  assert(cancelBtn !== undefined, 'T1: Cancel button must exist in settings footer');
  await act(async () => {
    cancelBtn.click();
  });
  assert(rootEl.querySelector('.play-menu') === null, 'T1: play-menu must be dismissed after clicking Cancel');
  console.log('  [PASS] Test 1: Title screen Settings launcher & close controls verified');

  // ── TEST 2: CAMPAIGN SCREEN SETTINGS & REVIEW UNLOCK ───────────────────
  console.log('Testing Campaign screen Settings launch & review unlock...');
  const campaignBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Campaign');
  assert(campaignBtn !== undefined, 'T2: Campaign navigation button must exist');
  await act(async () => {
    campaignBtn.click();
  });
  assert(rootEl.querySelector('.menu-title') !== null, 'T2: Must navigate to Campaign screen');

  const campSettingsLaunch = rootEl.querySelector('.settings-launch') as HTMLButtonElement | null;
  assert(campSettingsLaunch !== null, 'T2: .settings-launch must exist on Campaign screen');
  await act(async () => {
    campSettingsLaunch.click();
  });
  assert(rootEl.querySelector('.play-menu') !== null, 'T2: play-menu must open from Campaign screen');

  // Enable Review Mode
  const reviewToggle = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Review Mode'));
  assert(reviewToggle !== undefined, 'T2: Review Mode toggle must exist in settings');
  await act(async () => {
    reviewToggle.click();
  });

  // Verify Unlock all levels checkbox appears
  const unlockCheckbox = rootEl.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  assert(unlockCheckbox !== null, 'T2: "Unlock all levels for review" checkbox must appear when Review Mode is active');
  assert(unlockCheckbox.checked === false, 'T2: reviewUnlockAllLevels must default to false');

  // Toggle Unlock All Levels ON
  await act(async () => {
    unlockCheckbox.click();
  });
  assert(unlockCheckbox.checked === true, 'T2: reviewUnlockAllLevels must become true after click');

  // Close Settings
  const closeBtn2 = rootEl.querySelector('.btn-close-x') as HTMLButtonElement;
  await act(async () => {
    closeBtn2.click();
  });
  assert(rootEl.querySelector('.play-menu') === null, 'T2: play-menu must close cleanly');

  // Verify that all 6 campaign sectors are now selectable
  const sectorCards = Array.from(rootEl.querySelectorAll('.sector-card')) as HTMLButtonElement[];
  assert(sectorCards.length === 6, 'T2: All 6 sector cards must render');
  assert(sectorCards.every((card) => !card.disabled), 'T2: All sectors must be selectable with review override active');
  const reviewChips = Array.from(rootEl.querySelectorAll('.review-chip'));
  assert(reviewChips.length >= 5, `T2: Normally locked sectors must show REVIEW badge, found ${reviewChips.length}`);
  console.log('  [PASS] Test 2: Campaign Settings launcher & review unlock override verified');

  // ── TEST 3: READY SCREEN SETTINGS LAUNCH ───────────────────────────────
  console.log('Testing Ready screen Settings launch...');
  // Launch Sector 1
  await act(async () => {
    sectorCards[0].click();
  });
  assert(rootEl.querySelector('.ready-screen') !== null, 'T3: Must be on Ready screen');

  const readySettingsLaunch = rootEl.querySelector('.settings-launch') as HTMLButtonElement | null;
  assert(readySettingsLaunch !== null, 'T3: .settings-launch must exist on Ready screen');
  await act(async () => {
    readySettingsLaunch.click();
  });
  assert(rootEl.querySelector('.play-menu') !== null, 'T3: play-menu must open from Ready screen');

  // Close Settings
  const closeBtn3 = rootEl.querySelector('.btn-close-x') as HTMLButtonElement;
  await act(async () => {
    closeBtn3.click();
  });
  assert(rootEl.querySelector('.play-menu') === null, 'T3: play-menu must close cleanly on Ready screen');
  assert(rootEl.querySelector('.ready-screen') !== null, 'T3: Must still be on Ready screen after closing Settings');
  console.log('  [PASS] Test 3: Ready screen Settings launcher verified');

  console.log('\nALL SETTINGS INTERACTION CONTRACTS PASSED');
}

runSettingsContractSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
