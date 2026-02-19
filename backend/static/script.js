/*
 * Legacy runtime shim.
 *
 * Frontend runtime is consolidated in /static/js/*.js and loaded from backend/templates/base.html.
 * Keep this file as a no-op to avoid duplicate globals if a stale reference appears.
 */

console.warn('[CareerGo] /static/script.js is deprecated. Use /static/js/*.js runtime modules.');
