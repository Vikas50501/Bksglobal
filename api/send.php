<?php
/**
 * Lead form handler - Bharat Kataria & Co.
 * Receives the chatbot form and emails it out through PHPMailer (SMTP).
 *
 * Works unchanged on Vercel (vercel-php runtime) and on any normal
 * PHP host (cPanel / Hostinger / shared hosting).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply($code, $payload)
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    reply(405, ['ok' => false, 'error' => 'Use POST.']);
}

require __DIR__ . '/../lib/PHPMailer/Exception.php';
require __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require __DIR__ . '/../lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/* ---------- read input (accepts JSON or normal form posts) ---------- */

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

function field($data, $key, $max = 2000)
{
    $v = isset($data[$key]) ? trim((string) $data[$key]) : '';
    return mb_substr($v, 0, $max);
}

$name    = field($data, 'name', 100);
$phone   = field($data, 'phone', 30);
$email   = field($data, 'email', 150);
$message = field($data, 'message', 2000);
$trap    = field($data, 'company', 100); // honeypot - humans never see this field

/* ---------- validate ---------- */

if ($trap !== '') {
    // Silently accept so bots don't learn anything.
    reply(200, ['ok' => true, 'message' => 'Thank you! We will contact you shortly.']);
}

$errors = [];
if (mb_strlen($name) < 2) {
    $errors['name'] = 'Please enter your name.';
}
if (preg_match_all('/\d/', $phone) < 8) {
    $errors['phone'] = 'Please enter a valid phone number.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}
if ($errors) {
    reply(422, ['ok' => false, 'error' => 'Please check the form.', 'fields' => $errors]);
}

/* ---------- config from environment ---------- */

/**
 * Settings come from config.php on a normal PHP host. Vercel deploys straight
 * from git, so config.php is not there - it uses Environment Variables instead.
 */
function conf($key, $envKey, $default = '')
{
    static $file = null;
    if ($file === null) {
        $path = __DIR__ . '/../config.php';
        $file = is_readable($path) ? (array) require $path : [];
    }

    $v = getenv($envKey);
    if ($v === false || $v === '') {
        $v = $_ENV[$envKey] ?? $_SERVER[$envKey] ?? '';
    }
    if ($v === '') {
        $v = $file[$key] ?? '';
    }
    return $v !== '' ? $v : $default;
}

$host   = conf('host', 'SMTP_HOST');
$user   = conf('user', 'SMTP_USER');
$pass   = conf('pass', 'SMTP_PASS');
$port   = (int) conf('port', 'SMTP_PORT', '587');
$secure = strtolower(conf('secure', 'SMTP_SECURE', 'tls'));   // tls | ssl
$to     = conf('to', 'MAIL_TO', $user);
$from   = conf('from', 'MAIL_FROM', $user);

if ($host === '' || $user === '' || $pass === '' || $to === '') {
    reply(500, ['ok' => false, 'error' => 'Mail is not configured on the server yet.']);
}

/* ---------- send ---------- */

$safe = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$when = date('d M Y, h:i A');

$body = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#071829">'
      . '<h2 style="color:#123d6e;margin:0 0 16px">New enquiry from the website</h2>'
      . '<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px">'
      . '<tr><td style="background:#ebf3fc;font-weight:bold;width:110px">Name</td><td>' . $safe($name) . '</td></tr>'
      . '<tr><td style="background:#ebf3fc;font-weight:bold">Phone</td><td>' . $safe($phone) . '</td></tr>'
      . '<tr><td style="background:#ebf3fc;font-weight:bold">Email</td><td>' . $safe($email) . '</td></tr>'
      . '<tr><td style="background:#ebf3fc;font-weight:bold">Message</td><td>' . nl2br($safe($message ?: '-')) . '</td></tr>'
      . '<tr><td style="background:#ebf3fc;font-weight:bold">Received</td><td>' . $safe($when) . '</td></tr>'
      . '</table></div>';

$alt = "New enquiry from the website\n\n"
     . "Name: $name\nPhone: $phone\nEmail: $email\n\nMessage:\n" . ($message ?: '-') . "\n\nReceived: $when";

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host       = $host;
    $mail->SMTPAuth   = true;
    $mail->Username   = $user;
    $mail->Password   = $pass;
    $mail->Port       = $port;
    $mail->CharSet    = 'UTF-8';
    $mail->SMTPSecure = $secure === 'ssl'
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;

    $mail->setFrom($from, conf('from_name', 'MAIL_FROM_NAME', 'Website Chatbot'));
    foreach (array_filter(array_map('trim', explode(',', $to))) as $recipient) {
        $mail->addAddress($recipient);
    }
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = 'New enquiry: ' . $name;
    $mail->Body    = $body;
    $mail->AltBody = $alt;

    $mail->send();

    reply(200, ['ok' => true, 'message' => 'Thank you! We will contact you shortly.']);
} catch (Exception $e) {
    error_log('Lead mail failed: ' . $mail->ErrorInfo);
    reply(502, ['ok' => false, 'error' => 'Sorry, we could not send that. Please try again or call us.']);
}
