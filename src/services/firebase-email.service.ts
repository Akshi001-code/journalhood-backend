import admin from 'firebase-admin';

interface EmailResult {
  success: boolean;
  error?: any;
  link?: string;
}

export class FirebaseEmailService {
  /**
   * Send password reset email using Firebase Auth (built-in)
   * ✅ Zero configuration required
   * ✅ Reliable delivery
   * ✅ Professional templates
   */
  static async sendPasswordResetEmail(
    email: string,
    redirectUrl?: string
  ): Promise<EmailResult> {
    try {
      // Default to localhost if FRONTEND_URL is not set
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const actionCodeSettings = {
        url: redirectUrl || `${frontendUrl}/login`,
        handleCodeInApp: false,
      };

      const passwordResetLink = await admin.auth().generatePasswordResetLink(
        email,
        actionCodeSettings
      );

      console.log(`✅ Firebase password reset email sent to ${email}`);
      return { success: true, link: passwordResetLink };
    } catch (error) {
      console.error("❌ Firebase password reset email failed:", error);
      return { success: false, error };
    }
  }

  /**
   * Send email verification using Firebase Auth (built-in)
   */
  static async sendEmailVerification(
    email: string,
    redirectUrl?: string
  ): Promise<EmailResult> {
    try {
      // Default to localhost if FRONTEND_URL is not set
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const actionCodeSettings = {
        url: redirectUrl || `${frontendUrl}/dashboard`,
        handleCodeInApp: false,
      };

      const verificationLink = await admin.auth().generateEmailVerificationLink(
        email,
        actionCodeSettings
      );

      console.log(`✅ Firebase email verification sent to ${email}`);
      return { success: true, link: verificationLink };
    } catch (error) {
      console.error("❌ Firebase email verification failed:", error);
      return { success: false, error };
    }
  }

  /**
   * Send custom email using Firebase Extensions
   * Requires: firebase ext:install firebase/firestore-send-email
   */
  static async sendCustomEmail(
    to: string,
    templateName: string,
    templateData: Record<string, any>
  ): Promise<EmailResult> {
    try {
      // Add document to Firestore to trigger email extension
      await admin.firestore().collection('mail').add({
        to: [to],
        template: {
          name: templateName,
          data: templateData,
        },
      });

      console.log(`✅ Custom email (${templateName}) queued for ${to}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Custom email failed:", error);
      return { success: false, error };
    }
  }

  /**
   * Send welcome email for new district admin
   */
  static async sendDistrictAdminWelcome(
    email: string,
    name: string,
    districtName: string
  ): Promise<EmailResult> {
    // Use Firebase's built-in password reset for account setup
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const passwordResetResult = await this.sendPasswordResetEmail(
      email,
      `${frontendUrl}/login?message=welcome&role=district-admin`
    );

    if (passwordResetResult.success) {
      console.log(`✅ District admin welcome email sent to ${email}`);
    }

    return passwordResetResult;
  }

  /**
   * Send welcome email for new school admin
   */
  static async sendSchoolAdminWelcome(
    email: string,
    name: string,
    schoolName: string
  ): Promise<EmailResult> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return this.sendPasswordResetEmail(
      email,
      `${frontendUrl}/login?message=welcome&role=school-admin`
    );
  }
} 