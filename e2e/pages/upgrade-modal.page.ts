import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the UpgradeAnonymousPrompt modal component.
 *
 * Handles the 5-step upgrade flow:
 * 1. choose_method - OAuth/Email selection
 * 2. enter_email - Email and display name input
 * 3. verify_otp - 6-digit OTP verification
 * 4. set_password - Password creation
 * 5. completed - Success confirmation
 */
export class UpgradeModalPage {
	readonly page: Page;

	// Modal container - matches the upgrade modal structure
	readonly modal: Locator;
	readonly backdrop: Locator;
	readonly closeButton: Locator;

	// Step 1: Choose Method
	readonly googleOAuthButton: Locator;
	readonly githubOAuthButton: Locator;
	readonly emailSignUpButton: Locator;

	// Step 2: Enter Email
	readonly emailInput: Locator;
	readonly displayNameInput: Locator;
	readonly sendCodeButton: Locator;

	// Step 3: Verify OTP
	readonly otpInput: Locator;
	readonly verifyCodeButton: Locator;
	readonly resendCodeButton: Locator;

	// Step 4: Set Password
	readonly passwordInput: Locator;
	readonly confirmPasswordInput: Locator;
	readonly createAccountButton: Locator;

	// Step 5: Completed
	readonly successMessage: Locator;
	readonly continueButton: Locator;

	// Error display
	readonly errorMessage: Locator;

	// Back buttons (same selector, context determines which step)
	readonly backButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Modal structure - the upgrade modal has specific text in header
		this.modal = page.locator('.fixed.z-50').filter({
			has: page.locator('h2'),
		});
		this.backdrop = page.locator('.fixed.inset-0.bg-black\\/60');
		this.closeButton = page.locator(
			'.fixed.z-50 button:has(svg.lucide-x)'
		);

		// Step 1: Choose Method
		this.googleOAuthButton = page.getByRole('button', {
			name: /continue with google/i,
		});
		this.githubOAuthButton = page.getByRole('button', {
			name: /continue with github/i,
		});
		this.emailSignUpButton = page.getByRole('button', {
			name: /sign up with email/i,
		});

		// Step 2: Enter Email
		this.emailInput = page.locator('input#email');
		this.displayNameInput = page.locator('input#displayName');
		this.sendCodeButton = page.getByRole('button', { name: /send code/i });

		// Step 3: Verify OTP
		this.otpInput = page.locator('input#otp');
		this.verifyCodeButton = page.getByRole('button', {
			name: /verify code/i,
		});
		this.resendCodeButton = page.locator('button:has-text("Resend")');

		// Step 4: Set Password
		this.passwordInput = page.locator('input#password');
		this.confirmPasswordInput = page.locator('input#confirmPassword');
		this.createAccountButton = page.getByRole('button', {
			name: /create account/i,
		});

		// Step 5: Completed
		this.successMessage = page.locator('text=Account Created!');
		this.continueButton = page.getByRole('button', {
			name: /continue to dashboard/i,
		});

		// Error display (rose-colored error boxes)
		this.errorMessage = page.locator('.bg-rose-900\\/30');

		// Back button (appears in multiple steps)
		this.backButton = page.getByRole('button', { name: /back/i });
	}

	// ============================================================================
	// VISIBILITY & STATE CHECKS
	// ============================================================================

	async waitForOpen(timeout = 5000) {
		// Wait for the modal header to be visible
		await this.page
			.locator('.fixed.z-50 h2')
			.waitFor({ state: 'visible', timeout });
	}

	async waitForClosed(timeout = 5000) {
		await this.page
			.locator('.fixed.z-50 h2')
			.waitFor({ state: 'hidden', timeout });
	}

	async isOpen(): Promise<boolean> {
		return await this.page.locator('.fixed.z-50 h2').isVisible();
	}

	async getCurrentStep(): Promise<string> {
		// Check which elements are visible to determine current step
		if (await this.emailSignUpButton.isVisible()) return 'choose_method';
		if (await this.sendCodeButton.isVisible()) return 'enter_email';
		if (await this.verifyCodeButton.isVisible()) return 'verify_otp';
		if (await this.createAccountButton.isVisible()) return 'set_password';
		if (await this.successMessage.isVisible()) return 'completed';

		// Check for error state
		const errorHeading = this.page.locator('text=Something went wrong');
		if (await errorHeading.isVisible()) return 'error';

		return 'unknown';
	}

	// ============================================================================
	// STEP 1: CHOOSE METHOD
	// ============================================================================

	async selectEmailSignUp() {
		await this.emailSignUpButton.click();
		await this.emailInput.waitFor({ state: 'visible', timeout: 3000 });
	}

	async selectGoogleOAuth() {
		await this.googleOAuthButton.click();
		// Note: OAuth redirects externally - not tested in E2E
	}

	async selectGitHubOAuth() {
		await this.githubOAuthButton.click();
		// Note: OAuth redirects externally - not tested in E2E
	}

	// ============================================================================
	// STEP 2: ENTER EMAIL
	// ============================================================================

	async fillEmail(email: string, displayName?: string) {
		await this.emailInput.fill(email);
		if (displayName) {
			await this.displayNameInput.fill(displayName);
		}
	}

	async submitEmail() {
		await this.sendCodeButton.click();
	}

	async fillAndSubmitEmail(email: string, displayName?: string) {
		await this.fillEmail(email, displayName);
		await this.submitEmail();
	}

	async goBackFromEmail() {
		await this.backButton.click();
		await this.emailSignUpButton.waitFor({ state: 'visible', timeout: 3000 });
	}

	// ============================================================================
	// STEP 3: VERIFY OTP
	// ============================================================================

	async fillOtp(otp: string) {
		await this.otpInput.fill(otp);
	}

	async submitOtp() {
		await this.verifyCodeButton.click();
	}

	async fillAndSubmitOtp(otp: string) {
		await this.fillOtp(otp);
		await this.submitOtp();
	}

	async clickResendCode() {
		await this.resendCodeButton.click();
	}

	async goBackFromOtp() {
		await this.backButton.click();
		await this.emailInput.waitFor({ state: 'visible', timeout: 3000 });
	}

	async waitForOtpStep(timeout = 10000) {
		await this.otpInput.waitFor({ state: 'visible', timeout });
	}

	async getResendCooldownText(): Promise<string | null> {
		return await this.resendCodeButton.textContent();
	}

	// ============================================================================
	// STEP 4: SET PASSWORD
	// ============================================================================

	async fillPassword(password: string, confirmPassword?: string) {
		await this.passwordInput.fill(password);
		await this.confirmPasswordInput.fill(confirmPassword ?? password);
	}

	async submitPassword() {
		await this.createAccountButton.click();
	}

	async fillAndSubmitPassword(password: string) {
		await this.fillPassword(password, password);
		await this.submitPassword();
	}

	async goBackFromPassword() {
		await this.backButton.click();
		await this.otpInput.waitFor({ state: 'visible', timeout: 3000 });
	}

	async waitForPasswordStep(timeout = 10000) {
		await this.passwordInput.waitFor({ state: 'visible', timeout });
	}

	async isPasswordRequirementMet(requirement: string): Promise<boolean> {
		// Password requirements are shown as items with emerald color when met
		const requirementItem = this.page.locator(
			`.text-emerald-400:has-text("${requirement}")`
		);
		return await requirementItem.isVisible();
	}

	// ============================================================================
	// STEP 5: COMPLETED
	// ============================================================================

	async waitForSuccess(timeout = 15000) {
		await this.successMessage.waitFor({ state: 'visible', timeout });
	}

	async clickContinueToDashboard() {
		await this.continueButton.click();
	}

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	async getErrorMessage(): Promise<string | null> {
		if (await this.errorMessage.isVisible()) {
			return await this.errorMessage.textContent();
		}
		return null;
	}

	async waitForError(timeout = 5000) {
		await this.errorMessage.waitFor({ state: 'visible', timeout });
	}

	async expectErrorContains(text: string) {
		const error = await this.getErrorMessage();
		expect(error?.toLowerCase()).toContain(text.toLowerCase());
	}

	async hasValidationError(text: string): Promise<boolean> {
		// Validation errors appear as small rose-colored text below inputs
		const validationError = this.page.locator(
			`.text-rose-400:has-text("${text}")`
		);
		return await validationError.isVisible();
	}

	// ============================================================================
	// MODAL ACTIONS
	// ============================================================================

	async dismiss() {
		await this.closeButton.click();
		await this.waitForClosed();
	}

	async dismissViaBackdrop() {
		// Click on backdrop (outside the modal content)
		await this.backdrop.click({ position: { x: 10, y: 10 } });
		await this.waitForClosed();
	}

	// ============================================================================
	// FULL FLOW HELPERS
	// ============================================================================

	/**
	 * Completes the full upgrade flow from choose_method to completed.
	 * Useful for tests that need to start with an upgraded user.
	 */
	async completeFullUpgradeFlow(
		email: string,
		otp: string,
		password: string,
		displayName?: string
	) {
		await this.selectEmailSignUp();
		await this.fillAndSubmitEmail(email, displayName);
		await this.waitForOtpStep();
		await this.fillAndSubmitOtp(otp);
		await this.waitForPasswordStep();
		await this.fillAndSubmitPassword(password);
		await this.waitForSuccess();
	}
}
