# Quick Email Setup 

## Super Simple 3 Steps:

1. **Go to:** https://myaccount.google.com/apppasswords
2. **Click "Generate"** → Copy the 16-character password
3. **Add to `backend/.env`:**
   ```
   SMTP_USER=phoenixbank@gmail.com
   SMTP_PASSWORD=paste-16-char-password-here
   FROM_EMAIL=phoenixbank@gmail.com
   ```

---

**For now:** Just use the reset token from the console logs.
