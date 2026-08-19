# Bharat Kataria & Co. — Website

Plain HTML, CSS, JavaScript and PHP. No npm, no npx, no build step,
no framework. Upload the files and it runs.

## How the chatbot works

1. Visitor clicks the chat bubble and types **anything**.
2. The bot replies and shows a short form: **Name, Phone, Email, Message**.
3. Submitting posts to `api/send.php`, which emails the enquiry via **PHPMailer**.

A hidden honeypot field silently drops bot spam. Both the browser and the
server validate the input.

## Files

| File | Purpose |
|------|---------|
| `index.html`, `gallery.html` | Site pages |
| `style.css`, `script.js`, `gallery.*` | Site styling and behaviour |
| `chatbot.css`, `chatbot.js` | The chat widget |
| `api/send.php` | Form handler — sends mail via PHPMailer |
| `config.example.php` | Copy to `config.php` and put your mail settings in it |
| `vendor/` | PHPMailer itself, already included — nothing to install |

## Setup

Copy the example config and fill in your details:

```bash
cp config.example.php config.php
```

`config.php` is git-ignored, so your password stays out of this
(public) repository.

For Gmail you must enable 2-Step Verification and then create an
**App Password** (16 characters) — your normal Gmail password will not work.

## Deploy on normal PHP hosting (cPanel / Hostinger)

Upload every file, including `vendor/` and your `config.php`. That's it.

## Deploy on Vercel (demo link)

Vercel deploys straight from git, so your git-ignored `config.php` is not
there. Set the same values as Environment Variables instead
(**Settings → Environment Variables**), then redeploy:

| Variable | Example |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `tls` |
| `SMTP_USER` | `you@gmail.com` |
| `SMTP_PASS` | your 16-char app password |
| `MAIL_TO` | `info@yourdomain.com` |
| `MAIL_FROM` | `you@gmail.com` |
| `MAIL_FROM_NAME` | `Website Chatbot` |

> Vercel has no built-in PHP support, so `vercel.json` uses the community
> `vercel-php` runtime. If that ever fails, the site still works — only the
> form endpoint is affected.

## Run locally

```bash
php -S 127.0.0.1:8000
```

Then open <http://127.0.0.1:8000>.
