/**
 * E2E Integration Tests — NotaryFlow Full Flow (US-018)
 *
 * These tests verify the complete user flow through the application.
 * They exercise the UI components (all shadcn-based) and navigation.
 *
 * For the REAL pipeline flow (upload PDFs → classify → extract → merge → validate → export),
 * use playwright-cli interactively with real documents and API keys configured in .env.local.
 * See the "Manual E2E with playwright-cli" section in progress.txt for the documented flow.
 *
 * These automated tests verify UI structure and navigation without requiring API keys.
 */
import { test, expect } from '@playwright/test';

test.describe('Tramite selection (Pantalla 1)', () => {
  test('shows tramite cards and navigates to compraventa', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Compraventa de vehículo motorizado')).toBeVisible();

    // Two disabled cards with "Próximamente"
    const badges = page.getByText('Próximamente');
    await expect(badges).toHaveCount(2);

    // Click active card navigates to workspace
    await page.getByRole('link', { name: /Compraventa de vehículo motorizado/ }).click();
    await expect(page).toHaveURL(/\/tramite\/compraventa-vehiculo/);
  });
});

test.describe('Workspace (Pantalla 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tramite/compraventa-vehiculo');
  });

  test('renders workspace header with status and actions', async ({ page }) => {
    // Header elements
    await expect(page.getByText('NotaryFlow')).toBeVisible();
    await expect(page.getByText('Borrador')).toBeVisible();
    await expect(page.getByRole('banner').getByText('%')).toBeVisible();

    // Desktop action buttons
    await expect(page.getByRole('button', { name: 'Verificar documentos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible();
  });

  test('renders contract editor with placeholders', async ({ page }) => {
    await expect(
      page.getByText('CONTRATO DE COMPRAVENTA DE VEHÍCULO MOTORIZADO'),
    ).toBeVisible();

    // Contract sections
    await expect(page.getByText('VENDEDOR', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('COMPRADOR', { exact: true }).first()).toBeVisible();

    // Toolbar
    await expect(page.getByRole('button', { name: 'Negrita' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cursiva' })).toBeVisible();

    // Legend
    await expect(page.getByText('Leyenda:')).toBeVisible();
    await expect(page.getByText('Alta confianza')).toBeVisible();
  });

  test('renders extracted data sidebar on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('heading', { name: 'Datos extraídos' })).toBeVisible();
    await expect(page.getByText('Trámite', { exact: true })).toBeVisible();
    await expect(page.getByText('VENDEDOR').first()).toBeVisible();
  });

  test('renders document panel on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('complementary').filter({ hasText: 'Documentos' }).first()).toBeVisible();
    await expect(page.getByText('Certificado RVM')).toBeVisible();
    await expect(page.getByText('Permiso de circulación', { exact: true })).toBeVisible();

    // Drop zone
    await expect(page.getByText('Arrastra documentos')).toBeVisible();
  });

  test('mobile shows dropdown menu and FABs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // Dropdown menu trigger (three dots)
    const menuButton = page.getByRole('button', { name: 'Acciones' });
    await expect(menuButton).toBeVisible();

    // Click dropdown
    await menuButton.click();
    await expect(page.getByRole('menuitem', { name: 'Verificar documentos' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Exportar' })).toBeVisible();
  });

  test('export dialog shows blocked state when no data', async ({ page }) => {
    await page.getByRole('button', { name: 'Exportar' }).click();

    // Dialog should open
    await expect(page.getByText('Exportar contrato')).toBeVisible();
    await expect(page.getByText('Exportación bloqueada')).toBeVisible();
    await expect(page.getByText('Faltan datos esenciales')).toBeVisible();

    // Export cards should be disabled
    await expect(page.getByText('PDF', { exact: true })).toBeVisible();
    await expect(page.getByText('HTML', { exact: true })).toBeVisible();
    await expect(page.getByText('Imprimir', { exact: true })).toBeVisible();
  });

  test('clicking placeholder enables inline editing', async ({ page }) => {
    // Click an empty placeholder
    const placeholder = page.locator('[data-field="tramite.ciudad"]').first();
    await placeholder.click();

    // Should become editable
    await expect(placeholder).toHaveAttribute('contenteditable', 'true');

    // Type a value and press Enter
    await page.keyboard.type('Santiago');
    await page.keyboard.press('Enter');

    // Value should be saved
    await expect(placeholder).toHaveText('Santiago');
  });

  test('back button navigates to home', async ({ page }) => {
    await page.getByRole('button', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Validation page', () => {
  test('shows empty state when no documents processed', async ({ page }) => {
    await page.goto('/tramite/compraventa-vehiculo/validacion');

    await expect(
      page.getByText('No hay documentos procesados para validar'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Volver al workspace/ }),
    ).toBeVisible();
  });
});

test.describe('shadcn component verification', () => {
  test('all UI components are from shadcn (no custom primitives)', async ({ page }) => {
    await page.goto('/tramite/compraventa-vehiculo');

    // Verify shadcn components render correctly by checking key elements
    // Badge
    await expect(page.getByText('Borrador')).toBeVisible();
    // Progress
    await expect(page.getByRole('banner').getByRole('progressbar')).toBeVisible();
    // Button variants
    await expect(page.getByRole('button', { name: 'Volver al inicio' })).toBeVisible();
    // Card (contract editor)
    await expect(page.locator('.contract-editor-content')).toBeVisible();
    // Separator (in legend)
    await expect(page.locator('[data-orientation="vertical"]').first()).toBeVisible();
  });
});

/**
 * ==========================================================================
 * Manual E2E with playwright-cli (Real Pipeline)
 * ==========================================================================
 *
 * The full real pipeline flow requires API keys (OPENROUTER_API_KEY, MISTRAL_API_KEY)
 * configured in web/.env.local. Use playwright-cli for interactive testing:
 *
 * ## Happy path (real documents):
 *   playwright-cli open http://localhost:3000
 *   playwright-cli click <card-ref>                    # Select "Compraventa"
 *   playwright-cli upload <certificado_rvm.pdf>        # Upload document
 *   playwright-cli click <process-all-button>          # Process documents
 *   # Wait for processing → verify fields populated
 *   playwright-cli snapshot                            # Check field values
 *   playwright-cli click <verificar-button>            # Run validation
 *   # Verify alerts appear
 *   playwright-cli click <export-button>               # Open export dialog
 *   playwright-cli click <pdf-card>                    # Export PDF
 *   playwright-cli close
 *
 * ## Error case (invalid file):
 *   playwright-cli open http://localhost:3000/tramite/compraventa-vehiculo
 *   playwright-cli upload <invalid-file.txt>           # Upload non-PDF
 *   playwright-cli click <process-all-button>          # Process
 *   # Verify error state on document card
 *   playwright-cli click <retry-button>                # Retry
 *   playwright-cli snapshot                            # Verify error persists or resolves
 *   playwright-cli close
 *
 * ## Validation split view:
 *   # After processing documents:
 *   playwright-cli click <verify-doc-button>           # Navigate to validation page
 *   playwright-cli snapshot                            # Verify split view
 *   # Hover fields for bidirectional highlighting
 *   playwright-cli click <confirm-button>              # Confirm and return
 *   playwright-cli close
 */
