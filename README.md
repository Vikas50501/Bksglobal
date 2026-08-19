# Bharat Kataria & Co. — Website

Static website (HTML/CSS/JS) with a simple lead-capture chatbot.
No npm, no build step, no framework.

## How the chatbot works

1. Visitor clicks the chat bubble and types **anything**.
2. The bot replies and shows a short form: **Name, Phone, Email, Message**.
3. Submitting posts to `api/send.php`, which emails the enquiry via **PHPMailer** (SMTP).

A hidden honeypot field silently drops bot spam. Both the browser and the
server validate the input.

## Files

| File | Purpose |
|------|---------|
| `index.html`, `gallery.html` | Site pages |
| `style.css`, `script.js`, `gallery.*` | Site styling and behaviour |
| `chatbot.css`, `chatbot.js` | The chat widget |
| `api/send.php` | Form handler — sends mail via PHPMailer |
| `vendor/` | PHPMailer (committed, so no install step is needed) |
| `.env.example` | Template for the mail settings |

## Configure the mail

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

For Gmail you must enable 2-Step Verification and then create an
**App Password** (16 characters) — your normal Gmail password will not work.

## Deploy on Vercel (demo)

The repo is Vercel-ready. `vercel.json` maps `api/send.php` to the PHP runtime.

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. In **Settings → Environment Variables**, add each key from `.env.example`
   (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
   `MAIL_TO`, `MAIL_FROM`, `MAIL_FROM_NAME`).
3. Redeploy.

> Vercel has no built-in PHP support — `vercel.json` uses the community
> `vercel-php` runtime. If a deploy ever fails on that runtime, the site still
> works; only the form endpoint is affected.

## Deploy on normal PHP hosting (cPanel / Hostinger)

Upload every file, including the `vendor/` folder and your `.env`.
Nothing else to install — `api/send.php` reads `.env` automatically.

## Run locally

```bash
php -S 127.0.0.1:8000
```

Then open <http://127.0.0.1:8000>.
