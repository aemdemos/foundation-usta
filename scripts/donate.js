/**
 * Fundraise Up donation widget integration.
 *
 * The source site (www.ustafoundation.com) embeds Fundraise Up (account code
 * AURLRFGR). The widget:
 *   - injects a persistent floating "Donate" tab on the right edge of the page,
 *   - opens the secure donation overlay when the URL carries `?form=DONATE`.
 *
 * We load the official Fundraise Up loader in the delayed phase (it is a
 * third-party, non-LCP concern) and normalise every donate trigger to the
 * relative `?form=DONATE` link so a click keeps the visitor on our site and
 * lets the widget open the overlay.
 *
 * Note: the Fundraise Up account is domain-restricted in their dashboard, so
 * the overlay only renders on allow-listed origins (production). The loader is
 * still safe to run everywhere.
 */

const FRU_ACCOUNT = 'AURLRFGR';

/**
 * Trusted Types + the Fundraise Up widget.
 *
 * The site's content pages are served with a strict Content-Security-Policy
 * that enforces `require-trusted-types-for 'script'`. (The 404 page uses a
 * laxer CSP without that directive — which is why the widget appears there but
 * not on content pages.) Fundraise Up renders its floating "Donate" tab by
 * creating same-origin `about:blank` iframes — nested several levels deep — and
 * calling `document.write` inside them. Trusted Types policies and prototype
 * patches are PER-REALM: each iframe has its own `window`, `Document.prototype`
 * and `Node.prototype`, and a policy installed in the top document does not
 * cover them. So the widget's writes are blocked and the tab never renders.
 *
 * Fix: install a pass-through `default` policy in the widget's frame realm at
 * the exact moment the widget reaches into that frame to write — see
 * hardenFrameAccessors below. Cross-origin frames (e.g. a video embed) are
 * inaccessible and skipped.
 */

/** Install the pass-through `default` policy in a realm (idempotent). */
function ensureDefaultPolicy(win) {
  try {
    const tt = win && win.trustedTypes;
    if (!tt || !tt.createPolicy || tt.defaultPolicy) return;
    tt.createPolicy('default', {
      createHTML: (s) => s,
      createScript: (s) => s,
      createScriptURL: (s) => s,
    });
  } catch (e) {
    // Cross-origin realm, or policy already exists — nothing to do.
  }
}

/**
 * Guarantee the policy exists at the exact moment the widget reaches into a
 * frame to write.
 *
 * The widget writes with `iframe.contentWindow.document.write(...)` (or via
 * `contentDocument`). Timing-based approaches (install on insert, on the
 * frame's `load`, patch the shared write sink) all proved unreliable: the
 * child `about:blank` realm is recreated after our hook runs and no `load`
 * fires before the synchronous write, so the realm has no `default` policy
 * when the write happens. But a child realm that DOES have the policy writes
 * fine. The one instant we KNOW precedes every write is the frame-content
 * access itself — so we wrap the `contentWindow` / `contentDocument` getters on
 * `HTMLIFrameElement.prototype` to (re)install the policy in that frame's realm
 * before returning it. Race-free: the policy is created in the same synchronous
 * step as the access that leads to the write.
 */
const wrappedGetters = new WeakSet();

function hardenFrameAccessors() {
  const proto = HTMLIFrameElement.prototype;
  ['contentWindow', 'contentDocument'].forEach((prop) => {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc || !desc.get || wrappedGetters.has(desc.get)) return;
    const originalGet = desc.get;
    const wrappedGet = function hardened() {
      const value = originalGet.call(this);
      try {
        // `contentWindow` returns the realm window; `contentDocument` returns its
        // document, whose realm window is `.defaultView`. Reading `.defaultView`
        // on a CROSS-ORIGIN document throws SecurityError — guard it so the
        // getter never throws (that would break the widget's own frame access).
        const win = value && (value.defaultView || value);
        ensureDefaultPolicy(win);
      } catch (e) {
        // Cross-origin frame (e.g. the Stripe checkout iframe) — inaccessible
        // and doesn't need our same-origin Trusted Types policy. Ignore.
      }
      return value;
    };
    wrappedGetters.add(wrappedGet);
    Object.defineProperty(proto, prop, { ...desc, get: wrappedGet });
  });
}

/** Loads the official Fundraise Up loader script (once). */
function loadFundraiseUp() {
  if (window.FundraiseUp) return;
  /* eslint-disable */
  (function (w, d, s, n, a) {
    if (!w[n]) {
      var l = 'call,catch,on,once,set,then,track,openCheckout'.split(','), i, o = function (n) {
        return 'function' == typeof n ? o.l.push([arguments]) && o
          : function () { return o.l.push([n, arguments]) && o; };
      }, t = d.getElementsByTagName(s)[0], j = d.createElement(s);
      j.async = !0;
      j.src = 'https://cdn.fundraiseup.com/widget/' + a + '';
      t.parentNode.insertBefore(j, t);
      o.s = Date.now();
      o.v = 5;
      o.h = w.location.href;
      o.l = [];
      for (i = 0; i < 8; i++) o[l[i]] = o(l[i]);
      w[n] = o;
    }
  })(window, document, 'script', 'FundraiseUp', FRU_ACCOUNT);
  /* eslint-enable */
}

/**
 * Normalise donate triggers so a click opens the widget on our own origin.
 * Any link whose href carries `form=DONATE` (e.g. the nav DONATE button, whose
 * href comes from the authored nav document and may point at the source domain)
 * is rewritten to the relative `?form=DONATE` on the current path.
 */
function wireDonateTriggers() {
  document.querySelectorAll('a[href*="form=DONATE"]').forEach((a) => {
    a.setAttribute('href', `${window.location.pathname}?form=DONATE`);
  });
}

wireDonateTriggers();
if (window.trustedTypes) hardenFrameAccessors();
loadFundraiseUp();
