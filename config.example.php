<?php
/**
 * Mail settings.
 *
 * Copy this file to  config.php  and fill in your details.
 * config.php is git-ignored, so your password never goes into the repo.
 *
 * Gmail: turn on 2-Step Verification, then create an App Password
 * (16 characters). Your normal Gmail password will not work.
 */

return [
    'host'      => 'smtp.gmail.com',
    'port'      => 587,
    'secure'    => 'tls',                        // tls (port 587) or ssl (port 465)
    'user'      => 'your-email@gmail.com',
    'pass'      => 'your-16-char-app-password',

    'to'        => 'info@yourdomain.com',        // where enquiries arrive (comma-separate for more)
    'from'      => 'your-email@gmail.com',       // usually the same as 'user'
    'from_name' => 'Website Chatbot',
];
