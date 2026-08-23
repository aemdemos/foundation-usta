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
loadFundraiseUp();
