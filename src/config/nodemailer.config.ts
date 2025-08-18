import nodemailer from "nodemailer";
import { configDotenv } from "dotenv";

// Load env vars before computing transporter so IMPORT ORDER doesn't break config
configDotenv();

// SMTP configurations for different email providers, with optional env overrides
const getEmailConfig = (email: string, password: string) => {
  const domain = email.split('@')[1]?.toLowerCase();
  const explicitHost =
    process.env.TITAN_SMTP_HOST || process.env.EMAIL_SMTP_HOST || (process.env as any).titan_smtp_host || null;
  const explicitPortRaw =
    process.env.TITAN_SMTP_PORT || process.env.EMAIL_SMTP_PORT || (process.env as any).titan_smtp_port || null;
  const explicitSecureRaw =
    process.env.TITAN_SMTP_SECURE || process.env.EMAIL_SMTP_SECURE || (process.env as any).titan_smtp_secure || null;
  const explicitPort = explicitPortRaw ? Number(explicitPortRaw) : undefined;
  const explicitSecure = typeof explicitSecureRaw === 'string'
    ? /^(1|true|yes|on)$/i.test(explicitSecureRaw)
    : undefined;
  const explicitAuthMethod =
    process.env.TITAN_SMTP_AUTH_METHOD ||
    process.env.EMAIL_SMTP_AUTH_METHOD ||
    (process.env as any).titan_smtp_auth_method ||
    undefined;
  
  switch (domain) {
    case 'gmail.com': {
      const cfg = {
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: email,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      } as any;
      if (explicitHost) cfg.host = explicitHost;
      if (explicitPort !== undefined) cfg.port = explicitPort;
      if (explicitSecure !== undefined) cfg.secure = explicitSecure;
      if (explicitAuthMethod) (cfg as any).authMethod = explicitAuthMethod;
      return cfg;
    }
    
    case 'outlook.com':
    case 'hotmail.com':
    case 'live.com': {
      const cfg = {
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      } as any;
      if (explicitHost) cfg.host = explicitHost;
      if (explicitPort !== undefined) cfg.port = explicitPort;
      if (explicitSecure !== undefined) cfg.secure = explicitSecure;
      if (explicitAuthMethod) (cfg as any).authMethod = explicitAuthMethod;
      return cfg;
    }
    
    case 'yahoo.com': {
      const cfg = {
        host: "smtp.mail.yahoo.com",
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      } as any;
      if (explicitHost) cfg.host = explicitHost;
      if (explicitPort !== undefined) cfg.port = explicitPort;
      if (explicitSecure !== undefined) cfg.secure = explicitSecure;
      if (explicitAuthMethod) (cfg as any).authMethod = explicitAuthMethod;
      return cfg;
    }
    
    // Titan Email and other custom domains
    default: {
      const cfg = {
        host: "smtp.titan.email",
        port: 465,
        secure: true,
        auth: {
          user: email,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false
        }
      } as any;
      if (explicitHost) cfg.host = explicitHost;
      if (explicitPort !== undefined) cfg.port = explicitPort;
      if (explicitSecure !== undefined) cfg.secure = explicitSecure;
      if (explicitAuthMethod) (cfg as any).authMethod = explicitAuthMethod;
      return cfg;
    }
  }
};

// Email configuration with automatic provider detection
const createEmailTransporter = () => {
  // Prefer Titan-specific env vars if provided, then fall back to generic ones
  const emailUser =
    process.env.TITAN_EMAIL ||
    process.env.titanemail ||
    process.env.EMAIL;
  const emailPassword =
    process.env.TITAN_EMAIL_PASSWORD ||
    process.env.titanemailpassword ||
    process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.warn("⚠️  Email configuration missing. Set TITAN_EMAIL/TITAN_EMAIL_PASSWORD (preferred) or EMAIL/EMAIL_PASSWORD env vars to enable email functionality.");
    console.warn("   Titan example: TITAN_EMAIL=you@yourdomain.com, TITAN_EMAIL_PASSWORD=your_generated_password");
    console.warn("   For Gmail: Use an App Password (not your regular password) – https://myaccount.google.com/apppasswords");
    return null;
  }

  const config = getEmailConfig(emailUser, emailPassword);
  const domain = emailUser.split('@')[1];
  
  console.log(`📧 Email configured: ${emailUser} via ${config.host}:${(config as any).port} secure=${(config as any).secure} (${domain})`);
  
  if (domain === 'gmail.com') {
    console.log("💡 Gmail detected! Make sure you're using an App Password, not your regular password.");
    console.log("   1. Enable 2-Factor Authentication");
    console.log("   2. Generate App Password: https://myaccount.google.com/apppasswords");
    console.log("   3. Use the 16-character app password in EMAIL_PASSWORD");
  }

  try {
    return nodemailer.createTransport({
      ...config,
      debug: false, // Set to true for debugging
      logger: false // Set to true for detailed logs
    });
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error);
    return null;
  }
};

export const transporter = createEmailTransporter();
