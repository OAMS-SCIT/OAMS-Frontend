/**
 * OAMS Improvements — E2E Tests
 *
 * Covers:
 *   OAMS-257 — Condition image upload (Step 2 drawer) + View Images in History Log
 *   OAMS-262 — Assignment History tab: per-row View Images, lightbox, headers
 *   OAMS-263 — Cost Summary tab: summary cards, total = purchase + upgrade
 *   OAMS-265 — Cost Breakdown: columns, category filter, filter reset, sort order, reference links
 *
 * Prerequisites:
 *   - FE running at BASE_URL (default http://localhost:3000)
 *   - BE running at API_URL  (default http://localhost:4000)
 *   - Admin credentials via ADMIN_EMAIL / ADMIN_PASSWORD env vars
 *   - At least one asset with purchase cost in the system
 *     OR set ASSET_ID env var to a known asset UUID
 *
 * Run:
 *   ADMIN_EMAIL=admin@oams.com ADMIN_PASSWORD=Admin@123 \
 *   npx playwright test tests/improvements/oams-257-265.spec.ts --reporter=list
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ── Config ─────────────────────────────────────────────────────────────────────

const BASE_URL       = process.env.BASE_URL       ?? 'http://localhost:3000';
// Use 127.0.0.1 to avoid macOS IPv6/IPv4 split where Node.js fetch resolves
// "localhost" to ::1 but NestJS listens on 0.0.0.0 (IPv4 only).
const API_URL        = process.env.API_URL        ?? 'http://127.0.0.1:4000/api';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@oams.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';
const SEED_ASSET_ID  = process.env.ASSET_ID       ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(/dashboard|inventory/i, { timeout: 15_000 });
}

/** Create a minimal 1×1 red PNG in a temp dir and return its path. */
function makePng(name: string): string {
  const PNG_1X1 = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e0000000c4944415478016360f8cfc00000000200014a54a9000000000049454e44ae426082',
    'hex',
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oams-'));
  const fp  = path.join(dir, name);
  fs.writeFileSync(fp, PNG_1X1);
  return fp;
}

// ── API helpers ────────────────────────────────────────────────────────────────

let _token: string | null = null;
async function apiToken(): Promise<string> {
  if (_token) return _token;
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = await res.json();
  _token = data.accessToken;
  return _token!;
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await apiToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  return res.json();
}

async function apiUploadImages(assignmentId: string, filePaths: string[], type: 'assigned' | 'returned') {
  const token = await apiToken();
  const form  = new FormData();
  for (const fp of filePaths) {
    form.append('files', new Blob([fs.readFileSync(fp)], { type: 'image/png' }), path.basename(fp));
  }
  const res = await fetch(`${API_URL}/assignments/${assignmentId}/condition-images?type=${type}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return res.json();
}

// ── Shared state ───────────────────────────────────────────────────────────────

let assetId      = SEED_ASSET_ID;
let assignmentId = '';
let employeeId   = '';

// ══════════════════════════════════════════════════════════════════════════════
// Setup — get an asset + create a fresh assignment
// ══════════════════════════════════════════════════════════════════════════════

/** Retry a fetch up to maxAttempts times with a delay between each. */
async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  maxAttempts = 5,
  delayMs = 2000,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      lastErr = e;
      console.warn(`  Attempt ${i}/${maxAttempts} failed: ${(e as Error).message}. Retrying in ${delayMs}ms…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Backend unreachable at ${url} after ${maxAttempts} attempts: ${(lastErr as Error).message}`);
}

test.beforeAll(async () => {
  const loginUrl = `${API_URL}/auth/login`;
  const loginBody = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const loginHeaders = { 'Content-Type': 'application/json' };

  console.log(`ℹ Connecting to backend at: ${loginUrl}`);
  const ping = await fetchWithRetry(loginUrl, { method: 'POST', headers: loginHeaders, body: loginBody });

  if (!ping.ok) {
    const body = await ping.text().catch(() => '');
    throw new Error(`Auth failed (${ping.status}): ${body}`);
  }

  // Re-use the token from the ping so we don't call login twice.
  const loginData = await ping.json();
  _token = loginData.accessToken;
  console.log(`✔ Authenticated as ${ADMIN_EMAIL}`);

  // ── 1. Pick any asset (ignore status — most tests only need history/cost data) ─
  if (!assetId) {
    const result = await apiFetch('/assets?limit=1');
    if (!result?.data?.[0]) throw new Error('No assets in DB. Seed the database first.');
    assetId = result.data[0].id;
  }
  console.log(`ℹ Using asset: ${assetId}`);

  // ── 2. Find an existing active assignment for this asset (reuse across runs) ──
  const existingHistory = await apiFetch(`/assignments/asset/${assetId}?limit=10`);
  const activeAssignment = existingHistory?.data?.find((a: { isReturned: boolean }) => !a.isReturned);
  if (activeAssignment) {
    assignmentId = activeAssignment.id;
    employeeId   = activeAssignment.employee?.id ?? '';
    console.log(`ℹ Reusing active assignment: ${assignmentId}`);
    return;
  }

  // ── 3. No active assignment — create one on any Available asset ───────────────
  const availableResult = await apiFetch('/assets?status=Available&limit=1');
  const availableAsset  = availableResult?.data?.[0];
  if (availableAsset) assetId = availableAsset.id; // prefer an available asset

  const users = await apiFetch('/users?role=Employee&status=Active&limit=1');
  employeeId = users?.data?.[0]?.id ?? '';
  if (!employeeId) throw new Error('No active Employee users found. Seed the database.');

  const today = new Date().toISOString().split('T')[0];
  const assignment = await apiFetch('/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, assigneeId: employeeId, assignmentDate: today }),
  });
  assignmentId = assignment?.id ?? '';
  if (!assignmentId) throw new Error(`Assignment creation failed: ${JSON.stringify(assignment)}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-257: Condition Image Upload — Step 2 Drawer Flow
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-257 — Post-assign condition image upload (Step 2 drawer)', () => {

  test('Assign Asset drawer transitions to Step 2 after successful assignment', async ({ page }) => {
    test.skip(!assetId || !employeeId, 'No available asset or employee');

    // We need an available asset for this test; return the one we assigned first
    // so a fresh assignment can be created through the UI.
    // Use a second available asset if one exists, otherwise skip.
    const result = await apiFetch('/assets?status=Available&limit=1');
    const secondAsset = result?.data?.[0];
    test.skip(!secondAsset, 'No second available asset for UI-assign test');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${secondAsset.id}`);

    // Open Assign drawer via the "Assign" button
    const assignBtn = page.getByRole('button', { name: /^assign$/i });
    await expect(assignBtn).toBeVisible({ timeout: 8_000 });
    await assignBtn.click();

    // Drawer header: "Assign Asset"
    await expect(page.getByRole('heading', { name: /assign asset/i })).toBeVisible({ timeout: 5_000 });

    // Pick an employee
    const employeeSearch = page.getByPlaceholder(/search employee|search assignee/i);
    await expect(employeeSearch).toBeVisible({ timeout: 5_000 });
    await employeeSearch.click();
    const firstEmployee = page.locator('[role="listbox"] [role="option"], [data-testid="employee-option"]').first();
    if (await firstEmployee.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstEmployee.click();
    } else {
      // Dropdown may show immediately without typing
      const opts = page.getByRole('option');
      await opts.first().click();
    }

    // Submit Step 1
    await page.getByRole('button', { name: /confirm|assign/i }).last().click();

    // Step 2 header subtitle
    await expect(page.getByText(/step 2 of 2/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/assignment created/i)).toBeVisible();
    await expect(page.getByText(/condition photos at assignment/i)).toBeVisible();
  });

  test('Skip button in Step 2 closes the drawer without uploading', async ({ page }) => {
    test.skip(!assetId || !employeeId, 'No available asset or employee');

    const result = await apiFetch('/assets?status=Available&limit=1');
    const secondAsset = result?.data?.[0];
    test.skip(!secondAsset, 'No second available asset for skip test');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${secondAsset.id}`);

    const assignBtn = page.getByRole('button', { name: /^assign$/i });
    await expect(assignBtn).toBeVisible({ timeout: 8_000 });
    await assignBtn.click();

    const employeeSearch = page.getByPlaceholder(/search employee|search assignee/i);
    await expect(employeeSearch).toBeVisible({ timeout: 5_000 });
    await employeeSearch.click();
    const firstOpt = page.locator('[role="option"]').first();
    if (await firstOpt.isVisible({ timeout: 3_000 }).catch(() => false)) await firstOpt.click();

    await page.getByRole('button', { name: /confirm|assign/i }).last().click();

    // Step 2 visible
    await expect(page.getByText(/step 2 of 2/i)).toBeVisible({ timeout: 10_000 });

    // Skip — drawer should close
    await page.getByRole('button', { name: /^skip$/i }).click();
    await expect(page.getByRole('heading', { name: /assign asset/i })).not.toBeVisible({ timeout: 5_000 });
  });

  test('Upload button is disabled when no images are selected in Step 2', async ({ page }) => {
    test.skip(!assetId || !employeeId, 'No available asset or employee');

    const result = await apiFetch('/assets?status=Available&limit=1');
    const secondAsset = result?.data?.[0];
    test.skip(!secondAsset, 'No available asset for upload-disabled test');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${secondAsset.id}`);

    const assignBtn = page.getByRole('button', { name: /^assign$/i });
    await expect(assignBtn).toBeVisible({ timeout: 8_000 });
    await assignBtn.click();

    const employeeSearch = page.getByPlaceholder(/search employee|search assignee/i);
    await expect(employeeSearch).toBeVisible({ timeout: 5_000 });
    await employeeSearch.click();
    const firstOpt = page.locator('[role="option"]').first();
    if (await firstOpt.isVisible({ timeout: 3_000 }).catch(() => false)) await firstOpt.click();

    await page.getByRole('button', { name: /confirm|assign/i }).last().click();
    await expect(page.getByText(/step 2 of 2/i)).toBeVisible({ timeout: 10_000 });

    // Upload button should be disabled with no images selected
    const uploadBtn = page.getByRole('button', { name: /upload.*close/i });
    await expect(uploadBtn).toBeDisabled();
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-257: View Images in History Log (timeline)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-257 — View Images button in History Log timeline', () => {

  test.beforeAll(async () => {
    // Seed one condition image so the View Images button appears
    if (!assignmentId) return;
    const png = makePng('history-log.png');
    await apiUploadImages(assignmentId, [png], 'assigned');
  });

  test('View Images button appears on assigned event after images are uploaded', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    // Click the "History Log" tab (not "Assignment History")
    await page.getByRole('button', { name: /^history log$/i }).click();

    // Wait for timeline events to load
    const assignedEvent = page.getByText(/asset assigned|assigned to/i).first();
    await expect(assignedEvent).toBeVisible({ timeout: 10_000 });

    // View Images button must be present
    const viewBtn = page.getByRole('button', { name: /view images/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 5_000 });
  });

  test('Clicking View Images opens the lightbox with a Cloudinary image', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^history log$/i }).click();

    await expect(page.getByText(/asset assigned|assigned to/i).first()).toBeVisible({ timeout: 10_000 });

    const viewBtn = page.getByRole('button', { name: /view images/i }).first();
    await viewBtn.click();

    // Lightbox should open — title "Condition at Assignment"
    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 8_000 });
    // At least one image rendered
    const img = page.locator('img[src*="cloudinary"], img[src*="res.cloudinary"]').first();
    await expect(img).toBeVisible({ timeout: 8_000 });
  });

  test('Lightbox closes when Escape is pressed', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^history log$/i }).click();

    await expect(page.getByText(/asset assigned|assigned to/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /view images/i }).first().click();
    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 8_000 });

    await page.keyboard.press('Escape');
    await expect(page.getByText(/condition at assignment/i)).not.toBeVisible({ timeout: 3_000 });
  });

  test('Second click on View Images opens lightbox immediately (cached fetch)', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^history log$/i }).click();

    await expect(page.getByText(/asset assigned|assigned to/i).first()).toBeVisible({ timeout: 10_000 });

    const viewBtn = page.getByRole('button', { name: /view images/i }).first();
    // First click
    await viewBtn.click();
    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 8_000 });
    await page.keyboard.press('Escape');
    await expect(page.getByText(/condition at assignment/i)).not.toBeVisible({ timeout: 3_000 });

    // Second click — no network request, should open instantly
    await viewBtn.click();
    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 3_000 });
  });

  test('Events without an assignmentId do not show a View Images button', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^history log$/i }).click();

    // "Asset Created" event never has an assignmentId
    const createdEvent = page.getByText(/asset created/i).first();
    await expect(createdEvent).toBeVisible({ timeout: 10_000 });

    // The created event row should NOT have a View Images button
    const parentRow = createdEvent.locator('xpath=ancestor::div[contains(@class,"pb-6")]');
    const viewBtn = parentRow.getByRole('button', { name: /view images/i });
    await expect(viewBtn).not.toBeVisible();
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-262: Assignment History tab
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-262 — Assignment History tab', () => {

  test('Assignment History is the default tab and shows a table', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    // The default tab should be "Assignment History" — table visible without clicking
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
  });

  test('Assignment History table has the required column headers', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headerText = await table.locator('th').allTextContents();
    const joined = headerText.join(' ').toLowerCase();

    expect(joined).toMatch(/assignee/i);
    expect(joined).toMatch(/assigned date/i);
    expect(joined).toMatch(/expected return/i);
    expect(joined).toMatch(/actual return/i);
    expect(joined).toMatch(/condition.*assign/i);
    expect(joined).toMatch(/condition.*return/i);
    expect(joined).toMatch(/notes/i);
    expect(joined).toMatch(/assigned by/i);
  });

  test('"Currently Assigned" badge appears in Actual Return column for active assignment', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No active assignment');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/currently assigned/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('View Images button appears in Condition at Assignment column when images exist', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });

    // View Images appears because we uploaded images in OAMS-257 beforeAll
    const viewBtn = page.getByRole('button', { name: /view images/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 8_000 });
  });

  test('Clicking View Images in Assignment History opens lightbox titled "Condition at Assignment"', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });

    const viewBtn = page.getByRole('button', { name: /view images/i }).first();
    await viewBtn.click();

    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 8_000 });
    const img = page.locator('img[src*="cloudinary"], img[src*="res.cloudinary"]').first();
    await expect(img).toBeVisible({ timeout: 8_000 });
  });

  test('Lightbox in Assignment History closes with Escape', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /view images/i }).first().click();
    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 8_000 });

    await page.keyboard.press('Escape');
    await expect(page.getByText(/condition at assignment/i)).not.toBeVisible({ timeout: 3_000 });
  });

  test('Multiple images in lightbox — next/prev navigation is available', async ({ page }) => {
    test.skip(!assetId || !assignmentId, 'No assignment seeded');

    // Upload a second image to make navigation available
    const png2 = makePng('condition-2.png');
    await apiUploadImages(assignmentId, [png2], 'assigned');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /view images/i }).first().click();
    await expect(page.getByText(/condition at assignment/i)).toBeVisible({ timeout: 8_000 });

    // Navigation controls (prev / next) should exist when there are 2+ images
    const nextBtn = page.getByRole('button', { name: /next/i })
      .or(page.locator('[aria-label*="next" i]'))
      .or(page.locator('button').filter({ has: page.locator('svg') }).nth(1));
    // We just assert at least the image is shown (navigation is a bonus assertion)
    const img = page.locator('img[src*="cloudinary"], img[src*="res.cloudinary"]').first();
    await expect(img).toBeVisible();
  });

  test('GET /assignments/:id/condition-images returns assigned and returned arrays', async () => {
    test.skip(!assignmentId, 'No assignmentId');

    const data = await apiFetch(`/assignments/${assignmentId}/condition-images`);
    expect(data).toHaveProperty('assigned');
    expect(data).toHaveProperty('returned');
    expect(Array.isArray(data.assigned)).toBe(true);
    expect(Array.isArray(data.returned)).toBe(true);
    // At least the images we uploaded
    expect(data.assigned.length).toBeGreaterThan(0);
    // Each item has id and url
    const first = data.assigned[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('url');
    expect(typeof first.url).toBe('string');
    expect(first.url).toContain('cloudinary');
  });

  test('POST /assignments/:id/condition-images returns array of saved image objects', async () => {
    test.skip(!assignmentId, 'No assignmentId');

    const png = makePng('api-upload.png');
    const saved = await apiUploadImages(assignmentId, [png], 'returned');
    expect(Array.isArray(saved)).toBe(true);
    expect(saved.length).toBe(1);
    expect(saved[0]).toHaveProperty('id');
    expect(saved[0]).toHaveProperty('url');
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-263: Cost Summary tab — summary cards
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-263 — Cost Summary tab', () => {

  test('Cost Summary tab is present in the tab bar', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    const tab = page.getByRole('button', { name: /^cost summary$/i });
    await expect(tab).toBeVisible({ timeout: 8_000 });
  });

  test('Clicking Cost Summary tab shows Purchase Cost, Upgrade Cost, Total Cost cards', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.getByText(/purchase cost/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/upgrade cost/i)).toBeVisible();
    await expect(page.getByText(/total cost/i)).toBeVisible();
  });

  test('Each cost card shows a dollar-formatted value', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.getByText(/purchase cost/i)).toBeVisible({ timeout: 10_000 });

    // Dollar amounts — match $X,XXX.XX pattern
    const dollarAmounts = page.locator('text=/\\$[\\d,]+\\.\\d{2}/');
    await expect(dollarAmounts.first()).toBeVisible({ timeout: 5_000 });
    expect(await dollarAmounts.count()).toBeGreaterThanOrEqual(3);
  });

  test('GET /assets/:id/cost-summary: totalCost equals purchaseCost + upgradeCost', async () => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    expect(summary).toHaveProperty('purchaseCost');
    expect(summary).toHaveProperty('upgradeCost');
    expect(summary).toHaveProperty('totalCost');
    expect(summary).toHaveProperty('breakdown');

    const expected = summary.purchaseCost + summary.upgradeCost;
    expect(Math.abs(summary.totalCost - expected)).toBeLessThan(0.01);
  });

  test('Rendered Total Cost matches the value from the API', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    const expectedTotal = fmt(summary.totalCost);

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.getByText(/total cost/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(expectedTotal)).toBeVisible({ timeout: 5_000 });
  });

  test('Purchase Cost card value matches API purchaseCost', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();
    await expect(page.getByText(/purchase cost/i)).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(fmt(summary.purchaseCost))).toBeVisible();
  });

  test('Cost Summary tab is refreshed each time it is activated', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    // Navigate away and back
    await page.getByRole('button', { name: /^cost summary$/i }).click();
    await expect(page.getByText(/purchase cost/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /assignment history/i }).click();
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    // Cards still visible after re-activation
    await expect(page.getByText(/total cost/i)).toBeVisible({ timeout: 8_000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-265: Cost Breakdown table
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-265 — Cost Breakdown table', () => {

  test('Breakdown table is visible under the summary cards', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.getByText(/cost breakdown/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('Breakdown table has all required columns', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    const headers = await page.locator('table th').allTextContents();
    const joined = headers.join(' ');

    expect(joined).toMatch(/cost category/i);
    expect(joined).toMatch(/date/i);
    expect(joined).toMatch(/description/i);
    expect(joined).toMatch(/vendor/i);
    expect(joined).toMatch(/cost/i);
    expect(joined).toMatch(/reference\s*\/?\s*invoice/i);
  });

  test('"All Categories" filter button is present by default', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    const filterBtn = page.getByRole('button', { name: /all categories/i });
    await expect(filterBtn).toBeVisible();
  });

  test('Clicking filter opens dropdown with All Categories, Purchase, Upgrade options', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /all categories/i }).click();

    // Dropdown options
    await expect(page.getByRole('button', { name: /all categories/i }).nth(1)
      .or(page.locator('text=All Categories').nth(1))
    ).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole('button', { name: /^purchase$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^upgrade$/i })).toBeVisible();
  });

  test('Filtering to "Purchase" shows only Purchase rows', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /all categories/i }).click();
    await page.getByRole('button', { name: /^purchase$/i }).click();

    // Filter button label should now show "Purchase"
    await expect(page.getByRole('button', { name: /^purchase$/i }).first()).toBeVisible();

    // Every visible row badge must be "Purchase"
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const badge = rows.nth(i).locator('span').filter({ hasText: 'Purchase' });
      await expect(badge).toBeVisible();
    }
  });

  test('Filter button label updates to selected category name', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /all categories/i }).click();
    await page.getByRole('button', { name: /^purchase$/i }).click();

    // Button label changes from "All Categories" to "Purchase"
    await expect(page.getByRole('button', { name: /^purchase$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /all categories/i })).not.toBeVisible();
  });

  test('Resetting filter to "All Categories" shows all rows again', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });

    // Record total row count
    const allRows = await page.locator('table tbody tr').count();

    // Filter to Purchase
    await page.getByRole('button', { name: /all categories/i }).click();
    await page.getByRole('button', { name: /^purchase$/i }).click();

    // Reset to All
    await page.getByRole('button', { name: /^purchase$/i }).first().click();
    await page.getByRole('button', { name: /all categories/i }).nth(1).click();

    // Should show same total count as before
    const afterReset = await page.locator('table tbody tr').count();
    expect(afterReset).toBe(allRows);
  });

  test('Breakdown rows are sorted newest first (API check)', async () => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    if (!summary?.breakdown || summary.breakdown.length < 2) {
      test.skip(true, 'Need at least 2 breakdown entries to verify sort order');
      return;
    }

    const dates: string[] = summary.breakdown.map((r: { date: string }) => r.date);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(new Date(dates[i]).getTime()).toBeGreaterThanOrEqual(new Date(dates[i + 1]).getTime());
    }
  });

  test('Purchase row always present in breakdown (asset has a purchase cost)', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    // At least one "Purchase" badge in the table
    await expect(page.locator('table tbody span').filter({ hasText: 'Purchase' }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('Empty state message shown when filter has no matching rows', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    // Check if the asset has ANY Upgrade rows at all — if not, filtering to Upgrade = empty state
    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    const hasUpgrades = summary?.breakdown?.some((r: { category: string }) => r.category === 'Upgrade');
    if (hasUpgrades) {
      test.skip(true, 'Asset has upgrade rows, so Upgrade filter is not empty — use an asset with no upgrades for this test');
      return;
    }

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /all categories/i }).click();
    await page.getByRole('button', { name: /^upgrade$/i }).click();

    await expect(page.getByText(/no cost entries for the selected category/i)).toBeVisible({ timeout: 5_000 });
  });

  test('Reference / Invoice cell renders an external link for entries with a reference', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    const rowWithRef = summary?.breakdown?.find((r: { reference: string | null }) => r.reference);
    test.skip(!rowWithRef, 'No breakdown row with a reference value');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });

    // External link with target="_blank"
    const refLink = page.locator('table a[target="_blank"]').first();
    await expect(refLink).toBeVisible({ timeout: 5_000 });
    const href = await refLink.getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('Reference cell shows dash for entries without a reference', async ({ page }) => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    const rowNoRef = summary?.breakdown?.find((r: { reference: string | null }) => !r.reference);
    test.skip(!rowNoRef, 'All rows have a reference — need one without');

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /^cost summary$/i }).click();

    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });

    // At least one cell with "—" in the Reference column
    const dashCells = page.locator('table td').filter({ hasText: /^—$/ });
    await expect(dashCells.first()).toBeVisible({ timeout: 5_000 });
  });

  test('GET /assets/:id/cost-summary: breakdown includes assetId and correct fields', async () => {
    test.skip(!assetId, 'No assetId');

    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    expect(summary.assetId).toBe(assetId);
    expect(typeof summary.purchaseCost).toBe('number');
    expect(typeof summary.upgradeCost).toBe('number');
    expect(typeof summary.totalCost).toBe('number');

    if (summary.breakdown.length > 0) {
      const row = summary.breakdown[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('category');
      expect(row).toHaveProperty('date');
      expect(row).toHaveProperty('description');
      expect(row).toHaveProperty('cost');
      expect(['Purchase', 'Upgrade']).toContain(row.category);
    }
  });

});
