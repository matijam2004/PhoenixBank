"""
Sends password reset emails via SMTP.
Falls back to console logging if SMTP isn't configured.

Environment variables:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, 
    SMTP_FROM_EMAIL, SMTP_FROM_NAME (optional)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

# SMTP Configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Bank App")

# Frontend URL for building reset links
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def is_smtp_configured() -> bool:
    """
    Check if SMTP is properly configured with real credentials.
    
    Returns:
        bool: True if all required SMTP variables are set AND not placeholder values, False otherwise
    """
    # Check if variables exist
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD]):
        return False
    
    # Check for placeholder values (common placeholders)
    placeholder_indicators = [
        "your-email",
        "your-app-password",
        "example.com",
        "placeholder",
        "change-me",
        "your-",
        "@example",
        "test@test",
    ]
    
    smtp_user_lower = (SMTP_USER or "").lower()
    smtp_password_lower = (SMTP_PASSWORD or "").lower()
    smtp_host_lower = (SMTP_HOST or "").lower()
    
    # Check all fields for placeholders
    all_text = f"{smtp_user_lower} {smtp_password_lower} {smtp_host_lower}"
    
    for indicator in placeholder_indicators:
        if indicator in all_text:
            print(f"SMTP placeholder detected: '{indicator}' - Using console logging instead")
            return False
    
    # Additional check: password should be longer than typical placeholders
    if len(SMTP_PASSWORD) < 8:
        print(f"SMTP password too short - Using console logging instead")
        return False
    
    return True


async def send_welcome_email(email: str, first_name: str) -> bool:
    subject = "Welcome to Phoenix Bank"
    html_body = f"""
    <html>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Georgia','Times New Roman',serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:48px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding:48px 48px 0 48px;">
                                    <div style="border-bottom:1px solid #c9a84c;padding-bottom:32px;margin-bottom:0;">
                                        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:6px;color:#c9a84c;text-transform:uppercase;">Est. 2024</p>
                                        <h1 style="margin:0;font-size:36px;font-weight:normal;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">Phoenix Bank</h1>
                                        <p style="margin:8px 0 0 0;font-size:11px;letter-spacing:4px;color:#888;text-transform:uppercase;">Private Banking &amp; Wealth</p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Gold divider line -->
                            <tr>
                                <td align="center" style="padding:0 48px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="height:1px;background:linear-gradient(to right,transparent,#c9a84c,transparent);"></td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:48px 48px 32px 48px;background-color:#111111;">
                                    <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;">A Personal Welcome</p>
                                    <h2 style="margin:0 0 28px 0;font-size:28px;font-weight:normal;color:#ffffff;line-height:1.4;">
                                        Welcome, {first_name}.
                                    </h2>
                                    <p style="margin:0 0 20px 0;font-size:16px;line-height:1.8;color:#bbbbbb;">
                                        You have been granted exclusive membership to Phoenix Bank — a private banking experience reserved for those who expect more from their financial institution.
                                    </p>
                                    <p style="margin:0 0 20px 0;font-size:16px;line-height:1.8;color:#bbbbbb;">
                                        From this moment forward, every transaction, every investment, and every interaction is handled with the precision and discretion that defines Phoenix Bank.
                                    </p>

                                    <!-- Gold rule -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0;">
                                        <tr>
                                            <td width="60" style="border-top:1px solid #c9a84c;"></td>
                                            <td style="padding:0 16px;color:#c9a84c;font-size:18px;">✦</td>
                                            <td style="border-top:1px solid #c9a84c;"></td>
                                        </tr>
                                    </table>

                                    <!-- Benefits -->
                                    <p style="margin:0 0 24px 0;font-size:11px;letter-spacing:4px;color:#c9a84c;text-transform:uppercase;">Your Membership Includes</p>

                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding:12px 0;border-bottom:1px solid #222;">
                                                <span style="color:#c9a84c;font-size:16px;">◆</span>
                                                <span style="margin-left:12px;font-size:15px;color:#cccccc;letter-spacing:0.5px;">Zero-fee checking &amp; savings accounts</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:12px 0;border-bottom:1px solid #222;">
                                                <span style="color:#c9a84c;font-size:16px;">◆</span>
                                                <span style="margin-left:12px;font-size:15px;color:#cccccc;letter-spacing:0.5px;">Instant transfers &amp; scheduled payments</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:12px 0;border-bottom:1px solid #222;">
                                                <span style="color:#c9a84c;font-size:16px;">◆</span>
                                                <span style="margin-left:12px;font-size:15px;color:#cccccc;letter-spacing:0.5px;">Exclusive travel &amp; rewards privileges</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:12px 0;">
                                                <span style="color:#c9a84c;font-size:16px;">◆</span>
                                                <span style="margin-left:12px;font-size:15px;color:#cccccc;letter-spacing:0.5px;">Premium home loan rates &amp; advisory</span>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Gold rule -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:36px 0;">
                                        <tr>
                                            <td width="60" style="border-top:1px solid #c9a84c;"></td>
                                            <td style="padding:0 16px;color:#c9a84c;font-size:18px;">✦</td>
                                            <td style="border-top:1px solid #c9a84c;"></td>
                                        </tr>
                                    </table>

                                    <!-- CTA -->
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center" style="padding:8px 0 32px 0;">
                                                <a href="{FRONTEND_URL}/dashboard"
                                                   style="display:inline-block;background-color:#c9a84c;color:#000000;text-decoration:none;font-size:12px;letter-spacing:4px;text-transform:uppercase;padding:18px 48px;font-family:'Georgia',serif;">
                                                    Enter Your Account
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="margin:0;font-size:15px;line-height:1.8;color:#888888;font-style:italic;text-align:center;">
                                        "Banking as it should be — private, precise, and personal."
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:28px 48px;background-color:#0d0d0d;border-top:1px solid #1a1a1a;">
                                    <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:3px;color:#555;text-transform:uppercase;text-align:center;">Phoenix Bank &nbsp;·&nbsp; Private &amp; Confidential</p>
                                    <p style="margin:0;font-size:11px;color:#444;text-align:center;line-height:1.6;">
                                        This message was sent to {email}. If you did not create this account, please disregard this email.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    text_body = f"Welcome to Phoenix Bank, {first_name}.\n\nYour exclusive membership is now active.\n\nVisit: {FRONTEND_URL}/dashboard"

    smtp_success = False
    if is_smtp_configured():
        try:
            import asyncio
            await asyncio.wait_for(_send_via_smtp(email, subject, html_body, text_body), timeout=10.0)
            smtp_success = True
        except Exception as e:
            print(f"SMTP error sending welcome email: {e}")

    if not smtp_success:
        print(f"\n{'='*60}\nWELCOME EMAIL (SMTP not configured): To: {email}\n{'='*60}\n")

    return True


async def send_verification_email(email: str, verification_token: str) -> bool:
    verify_link = f"{FRONTEND_URL}/api/auth/email/verify/{verification_token}"

    subject = "One Step Away — Verify Your Phoenix Bank Account"
    html_body = f"""
    <html>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Georgia','Times New Roman',serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:48px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding:48px 48px 0 48px;background-color:#111111;border-radius:16px 16px 0 0;">
                                    <div style="padding-bottom:32px;border-bottom:1px solid #c9a84c;">
                                        <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:6px;color:#c9a84c;text-transform:uppercase;">Phoenix Bank</p>
                                        <h1 style="margin:0;font-size:13px;font-weight:normal;letter-spacing:5px;color:#555555;text-transform:uppercase;">Private Banking &amp; Wealth</h1>
                                    </div>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:48px 48px 0 48px;background-color:#111111;">

                                    <!-- Icon area -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                                        <tr>
                                            <td align="center">
                                                <div style="width:72px;height:72px;border:1px solid #c9a84c44;border-radius:50%;display:inline-block;background:#0f0f0f;text-align:center;line-height:72px;">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
                                                        <rect x="2" y="4" width="20" height="16" rx="2" stroke="#c9a84c" stroke-width="1.5" fill="none"/>
                                                        <polyline points="2,4 12,13 22,4" stroke="#c9a84c" stroke-width="1.5" fill="none"/>
                                                    </svg>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>

                                    <h2 style="margin:0 0 16px 0;font-size:28px;font-weight:normal;color:#ffffff;letter-spacing:1px;text-align:center;">
                                        Confirm Your Identity
                                    </h2>
                                    <p style="margin:0 0 32px 0;font-size:16px;line-height:1.8;color:#888888;text-align:center;">
                                        You are one step away from gaining exclusive access to Phoenix Bank.<br/>
                                        Please verify your email address to activate your account.
                                    </p>

                                    <!-- Gold rule -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 36px 0;">
                                        <tr>
                                            <td style="border-top:1px solid #1e1e1e;"></td>
                                            <td width="24" style="padding:0 12px;color:#c9a84c;font-size:14px;white-space:nowrap;">✦</td>
                                            <td style="border-top:1px solid #1e1e1e;"></td>
                                        </tr>
                                    </table>

                                    <!-- CTA Button -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                                        <tr>
                                            <td align="center">
                                                <a href="{verify_link}"
                                                   style="display:inline-block;background-color:#c9a84c;color:#000000;text-decoration:none;font-size:11px;letter-spacing:5px;text-transform:uppercase;padding:20px 56px;font-family:'Georgia',serif;font-weight:bold;border-radius:4px;">
                                                    Verify My Email
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Security note -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:8px;margin-bottom:36px;">
                                        <tr>
                                            <td style="padding:20px 24px;">
                                                <p style="margin:0 0 6px 0;font-size:10px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;">Security Notice</p>
                                                <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">
                                                    This link expires in <span style="color:#888;">24 hours</span>. Phoenix Bank will never ask for your password via email.
                                                    If you did not create this account, you may safely ignore this message.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Fallback link -->
                                    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:2px;color:#444;text-transform:uppercase;text-align:center;">
                                        Button not working?
                                    </p>
                                    <p style="margin:0;font-size:12px;color:#333;word-break:break-all;text-align:center;line-height:1.6;">
                                        {verify_link}
                                    </p>

                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding:28px 48px;background-color:#0d0d0d;border-top:1px solid #1a1a1a;border-radius:0 0 16px 16px;">
                                    <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:3px;color:#333;text-transform:uppercase;text-align:center;">
                                        Phoenix Bank &nbsp;·&nbsp; Private &amp; Confidential
                                    </p>
                                    <p style="margin:0;font-size:11px;color:#2e2e2e;text-align:center;line-height:1.6;">
                                        Sent to {email}
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
    """
    text_body = f"Phoenix Bank — Verify Your Email\n\nClick the link below to activate your account:\n{verify_link}\n\nExpires in 24 hours. If you didn't create this account, ignore this email."

    smtp_success = False
    if is_smtp_configured():
        try:
            import asyncio
            await asyncio.wait_for(_send_via_smtp(email, subject, html_body, text_body), timeout=10.0)
            smtp_success = True
        except Exception as e:
            print(f"SMTP error sending verification email: {e}")

    if not smtp_success:
        print("\n" + "="*80)
        print("VERIFICATION EMAIL (SMTP not configured or failed)")
        print("="*80)
        print(f"To: {email}")
        print(f"\nVERIFICATION LINK:\n   {verify_link}")
        print("="*80 + "\n")

    return True


async def send_password_reset_email(email: str, reset_token: str) -> bool:
    """
    Send a password reset email to the user.
    
    This function:
    1. Builds a reset link using the token
    2. Creates an email with instructions
    3. Sends via SMTP if configured, otherwise logs to console
    
    Args:
        email: The recipient's email address
        reset_token: The unique token for password reset
        
    Returns:
        bool: True if email was sent successfully (or logged), False on error
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Email content
    subject = "Password Reset Request"
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a1a;">Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the link below to create a new password:</p>
                <p style="margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #1a1a1a; color: #d4af37; padding: 12px 24px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_link}</p>
                <p style="margin-top: 30px; font-size: 12px; color: #999;">
                    This link will expire in 1 hour. If you didn't request this, please ignore this email.
                </p>
            </div>
        </body>
    </html>
    """
    
    text_body = f"""
    Password Reset Request
    
    Hello,
    
    We received a request to reset your password. Use the link below to create a new password:
    
    {reset_link}
    
    This link will expire in 1 hour. If you didn't request this, please ignore this email.
    """
    
    # Try to send via SMTP
    smtp_success = False
    if is_smtp_configured():
        try:
            # Run with timeout to prevent hanging
            import asyncio
            await asyncio.wait_for(_send_via_smtp(email, subject, html_body, text_body), timeout=10.0)
            print(f"Password reset email sent successfully via SMTP to {email}")
            smtp_success = True
        except asyncio.TimeoutError:
            print(f"SMTP connection timed out after 10 seconds.")
        except smtplib.SMTPAuthenticationError as e:
            print(f"SMTP authentication failed: {e}")
            print(f"   Check your SMTP_USER and SMTP_PASSWORD in backend/.env")
        except smtplib.SMTPException as e:
            print(f"SMTP error: {e}")
        except Exception as e:
            print(f"Failed to send email via SMTP: {e}")
    
    # Only log to console if SMTP failed
    if not smtp_success:
        print("\n" + "="*80)
        print("PASSWORD RESET EMAIL (SMTP not configured or failed)")
        print("="*80)
        print(f"To: {email}")
        print(f"Subject: {subject}")
        print(f"\nRESET LINK (copy and paste in browser):")
        print(f"   {reset_link}")
        print(f"\nLink expires in 1 hour")
        print(f"\nTo enable email delivery, configure SMTP in backend/.env:")
        print(f"   SMTP_HOST=smtp.gmail.com")
        print(f"   SMTP_PORT=587")
        print(f"   SMTP_USER=your-real-email@gmail.com")
        print(f"   SMTP_PASSWORD=your-app-password")
        print("="*80 + "\n")
    else:
        print(f"Password reset email sent to {email}")
    
    return True


async def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Internal function to send email via SMTP.
    
    This runs in a thread pool to avoid blocking the async event loop.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML content of the email
        text_body: Plain text content of the email
        
    Returns:
        bool: True if sent successfully
        
    Raises:
        Exception: If SMTP sending fails
    """
    import asyncio
    
    def _send_sync():
        """Synchronous SMTP sending function"""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        
        # Add both plain text and HTML versions
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        # Connect to SMTP server with timeout
        # Use SSL for port 465, TLS for port 587
        if SMTP_PORT == 465:
            # SSL connection
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
            try:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            finally:
                server.quit()
        else:
            # TLS connection (default for port 587)
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            try:
                server.starttls()  # Enable encryption
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            finally:
                server.quit()
        
        return True
    
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _send_sync)

