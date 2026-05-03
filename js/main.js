// static/js/main.js

document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initBackToTop();
  initReadingProgress();
});

// ── Mobile hamburger menu ──
function initMobileMenu() {
  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
  });

  // close when clicking a nav link
  nav.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
    });
  });
}

// ── Back to top ──
function initBackToTop() {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 400);
  });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Reading progress bar ──
function initReadingProgress() {
  var bar = document.getElementById('reading-progress');
  if (!bar) return;

  window.addEventListener('scroll', function () {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = docH > 0 ? (window.scrollY / docH * 100) + '%' : '0%';
  });
}
