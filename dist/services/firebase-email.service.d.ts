interface EmailResult {
    success: boolean;
    error?: any;
    link?: string;
}
export declare class FirebaseEmailService {
    /**
     * Send password reset email using Firebase Auth (built-in)
     * ✅ Zero configuration required
     * ✅ Reliable delivery
     * ✅ Professional templates
     */
    static sendPasswordResetEmail(email: string, redirectUrl?: string): Promise<EmailResult>;
    /**
     * Send email verification using Firebase Auth (built-in)
     */
    static sendEmailVerification(email: string, redirectUrl?: string): Promise<EmailResult>;
    /**
     * Send custom email using Firebase Extensions
     * Requires: firebase ext:install firebase/firestore-send-email
     */
    static sendCustomEmail(to: string, templateName: string, templateData: Record<string, any>): Promise<EmailResult>;
    /**
     * Send welcome email for new district admin
     */
    static sendDistrictAdminWelcome(email: string, name: string, districtName: string): Promise<EmailResult>;
    /**
     * Send welcome email for new school admin
     */
    static sendSchoolAdminWelcome(email: string, name: string, schoolName: string): Promise<EmailResult>;
}
export {};
