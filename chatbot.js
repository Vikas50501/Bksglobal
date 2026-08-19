/* BHARAT KATARIA & CO. | chatbot.js
   Simple lead-capture chat widget. No dependencies, no build step.
   Visitor types anything -> bot shows a form -> form posts to api/send.php (PHPMailer). */

(function () {
  'use strict';

  var CFG = {
    endpoint: window.CHATBOT_ENDPOINT || '/api/send.php',
    brand: 'Bharat Kataria & Co.',
    initials: 'BK',
    status: 'Typically replies in a few minutes',
    greeting: 'Hello! Welcome to Bharat Kataria & Co. How can we help you today?',
    ask: 'Thanks for reaching out! Please share your details below and one of our team members will get back to you shortly.',
    thanks: 'Thank you! Your details are with our team — we will contact you shortly.'
  };

  var ICON = {
    chat: '<svg class="cb-ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    close: '<svg class="cb-ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'
  };

  var root, body, input, formShown = false, sending = false;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function scroll() {
    body.scrollTop = body.scrollHeight;
  }

  function say(text, who) {
    var m = el('div', 'cb-msg ' + (who || 'bot'), esc(text));
    body.appendChild(m);
    scroll();
    return m;
  }

  /* bot message with a short typing pause */
  function botSay(text, delay, done) {
    var t = el('div', 'cb-msg bot cb-typing', '<span></span><span></span><span></span>');
    body.appendChild(t);
    scroll();
    setTimeout(function () {
      t.remove();
      say(text, 'bot');
      if (done) done();
    }, delay || 750);
  }

  /* ---------- the form ---------- */

  var FIELDS = [
    { k: 'name', label: 'Name', type: 'input', attrs: 'type="text" autocomplete="name" placeholder="Your full name"' },
    { k: 'phone', label: 'Phone', type: 'input', attrs: 'type="tel" autocomplete="tel" placeholder="10-digit mobile number"' },
    { k: 'email', label: 'Email', type: 'input', attrs: 'type="email" autocomplete="email" placeholder="you@example.com"' },
    { k: 'message', label: 'How can we help? (optional)', type: 'textarea', attrs: 'rows="3" placeholder="Tell us briefly what you need"' }
  ];

  function buildForm() {
    var f = el('form', 'cb-form');
    f.noValidate = true;

    var html = '<h4>Share your details</h4>';
    FIELDS.forEach(function (fd) {
      html += '<div class="cb-field" data-f="' + fd.k + '">'
        + '<label for="cb-' + fd.k + '">' + fd.label + '</label>'
        + (fd.type === 'textarea'
          ? '<textarea id="cb-' + fd.k + '" name="' + fd.k + '" ' + fd.attrs + '></textarea>'
          : '<input id="cb-' + fd.k + '" name="' + fd.k + '" ' + fd.attrs + '>')
        + '<span class="cb-err"></span></div>';
    });
    html += '<div class="cb-hp"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>'
      + '<button type="submit" class="cb-submit">Submit</button>'
      + '<p class="cb-note">We respect your privacy. Your details are only used to contact you.</p>';

    f.innerHTML = html;
    f.addEventListener('submit', onSubmit);
    return f;
  }

  function setError(form, key, msg) {
    var wrap = form.querySelector('[data-f="' + key + '"]');
    if (!wrap) return;
    wrap.classList.toggle('has-error', !!msg);
    wrap.querySelector('.cb-err').textContent = msg || '';
  }

  function validate(form, values) {
    var errs = {};
    if (values.name.length < 2) errs.name = 'Please enter your name.';
    if ((values.phone.match(/\d/g) || []).length < 8) errs.phone = 'Please enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errs.email = 'Please enter a valid email address.';

    FIELDS.forEach(function (fd) { setError(form, fd.k, errs[fd.k]); });
    return errs;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (sending) return;

    var form = e.currentTarget;
    var values = {};
    ['name', 'phone', 'email', 'message', 'company'].forEach(function (k) {
      var node = form.querySelector('[name="' + k + '"]');
      values[k] = node ? node.value.trim() : '';
    });

    var errs = validate(form, values);
    if (Object.keys(errs).length) {
      var first = form.querySelector('.has-error input, .has-error textarea');
      if (first) first.focus();
      return;
    }

    var btn = form.querySelector('.cb-submit');
    sending = true;
    btn.disabled = true;
    btn.textContent = 'Sending...';

    fetch(CFG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })
      .then(function (res) {
        return res.json().catch(function () { return { ok: false, error: 'Unexpected server response.' }; });
      })
      .then(function (data) {
        if (!data.ok) throw data;

        form.remove();
        say(values.name + ' — ' + values.phone, 'user');
        botSay(data.message || CFG.thanks, 600);
        formShown = 'done';
        sending = false;
      })
      .catch(function (data) {
        sending = false;
        btn.disabled = false;
        btn.textContent = 'Submit';

        if (data && data.fields) {
          Object.keys(data.fields).forEach(function (k) { setError(form, k, data.fields[k]); });
        }
        botSay((data && data.error) || 'Sorry, something went wrong. Please try again or call our office.', 500);
      });
  }

  function showForm() {
    if (formShown) return;
    formShown = true;
    botSay(CFG.ask, 800, function () {
      body.appendChild(buildForm());
      scroll();
    });
  }

  /* ---------- composer ---------- */

  function onSend(e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;

    say(text, 'user');
    input.value = '';

    if (formShown === 'done') {
      botSay('Thanks! Our team already has your details and will reach out shortly.', 700);
    } else if (formShown) {
      botSay('Please fill in the form above and we will get right back to you.', 700);
    } else {
      showForm();
    }
  }

  /* ---------- build + mount ---------- */

  function build() {
    root = el('div', 'cb');
    root.innerHTML =
      '<div class="cb-panel" role="dialog" aria-label="Chat with ' + esc(CFG.brand) + '">'
      + '<div class="cb-head">'
      + '<div class="cb-avatar">' + esc(CFG.initials) + '</div>'
      + '<div><div class="cb-title">' + esc(CFG.brand) + '</div>'
      + '<div class="cb-sub">' + esc(CFG.status) + '</div></div>'
      + '</div>'
      + '<div class="cb-body"></div>'
      + '<form class="cb-foot">'
      + '<input class="cb-input" type="text" placeholder="Type your message..." aria-label="Type your message" autocomplete="off">'
      + '<button class="cb-send" type="submit" aria-label="Send">' + ICON.send + '</button>'
      + '</form>'
      + '</div>'
      + '<button class="cb-btn" type="button" aria-label="Open chat">' + ICON.chat + ICON.close + '<span class="cb-dot"></span></button>';

    document.body.appendChild(root);

    body = root.querySelector('.cb-body');
    input = root.querySelector('.cb-input');

    root.querySelector('.cb-foot').addEventListener('submit', onSend);
    root.querySelector('.cb-btn').addEventListener('click', toggle);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) toggle();
    });
  }

  function toggle() {
    var open = root.classList.toggle('is-open');
    root.classList.add('is-seen');
    root.querySelector('.cb-btn').setAttribute('aria-label', open ? 'Close chat' : 'Open chat');

    if (open) {
      if (!body.children.length) botSay(CFG.greeting, 500);
      setTimeout(function () { input.focus(); }, 260);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
