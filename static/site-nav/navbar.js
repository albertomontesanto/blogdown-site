/* Shared keyboard- and touch-accessible navigation for standalone Hugo pages. */
(function () {
  'use strict';
  function init(header) {
    if (header.dataset.amInitialized === '1') return;
    header.dataset.amInitialized = '1';
    const mobileButton = header.querySelector('.am-mobile-toggle');
    const menu = header.querySelector('.am-menu');
    const softwareButton = header.querySelector('.am-software-trigger');
    const softwareHolder = header.querySelector('.am-software-holder');
    if (!mobileButton || !menu || !softwareButton || !softwareHolder) return;
    const closeSoftware = function () {
      softwareHolder.classList.remove('am-submenu-open');
      softwareButton.setAttribute('aria-expanded', 'false');
    };
    const closeMobile = function () {
      header.classList.remove('am-mobile-open');
      mobileButton.setAttribute('aria-expanded', 'false');
      closeSoftware();
    };
    mobileButton.addEventListener('click', function () {
      const open = !header.classList.contains('am-mobile-open');
      header.classList.toggle('am-mobile-open', open);
      mobileButton.setAttribute('aria-expanded', String(open));
      if (!open) closeSoftware();
    });
    softwareButton.addEventListener('click', function () {
      const open = !softwareHolder.classList.contains('am-submenu-open');
      softwareHolder.classList.toggle('am-submenu-open', open);
      softwareButton.setAttribute('aria-expanded', String(open));
    });
    softwareHolder.addEventListener('mouseenter', function () {
      if (window.matchMedia('(min-width: 1101px)').matches) {
        softwareButton.setAttribute('aria-expanded', 'true');
      }
    });
    softwareHolder.addEventListener('mouseleave', function () {
      if (!softwareHolder.classList.contains('am-submenu-open')) {
        softwareButton.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', function (event) {
      if (!softwareHolder.contains(event.target)) closeSoftware();
      if (!header.contains(event.target)) closeMobile();
    });
    header.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        const active = header.classList.contains('am-mobile-open') || softwareHolder.classList.contains('am-submenu-open');
        closeMobile();
        if (active) {
          event.preventDefault();
          softwareButton.focus();
        }
      }
    });
    window.addEventListener('resize', function () {
      if (window.matchMedia('(min-width: 1101px)').matches) {
        header.classList.remove('am-mobile-open');
        mobileButton.setAttribute('aria-expanded', 'false');
        closeSoftware();
      }
    });
  }
  function start() {
    document.querySelectorAll('header.am-global-header').forEach(init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
