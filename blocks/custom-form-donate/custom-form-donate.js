/*
 * custom-form-donate — real FundraiseUp inline "Element" with a native fallback.
 *
 * PRIMARY (Approach 1): mount the SAME FundraiseUp inline Element the source
 * page uses — `<a href="#<elementId>">`. The official FundraiseUp loader is
 * already running site-wide (scripts/donate.js, account AURLRFGR — the source's
 * account) and the Trusted-Types/CSP blocker is already solved there, so the
 * widget can render in-page WITHOUT weakening protection. When it mounts, the
 * donation form AND its secure checkout are ONE continuous widget instance, so
 * the "Dedicate this donation" honoree name carries over natively (no URL
 * round-trip needed) — exactly like the source.
 *
 * FALLBACK: the FundraiseUp account is domain-restricted in their dashboard, so
 * the Element only renders on allow-listed origins (production). On any origin
 * where it does NOT mount (localhost, branch previews, loader blocked) we show a
 * self-contained NATIVE reproduction of the widget (accessible controls;
 * frequency toggle, amount tiers, dedicate reveal) that hands off to
 * FundraiseUp's hosted donation page on submit. Only the params FundraiseUp
 * reads from the URL are appended — verified empirically against the live hosted
 * page (typed a value, watched fetch/XHR/beacon + storage + rendered field):
 *   - amount=<dollars>       → prefills the amount field  (CONFIRMED)
 *   - recurring=once|monthly → sets the frequency toggle  (CONFIRMED)
 * In the fallback the honoree NAME cannot be forwarded: FundraiseUp does NOT
 * read it from the URL (it lives only in the widget's in-memory state). The
 * native fallback therefore omits the honoree field so it doesn't imply the
 * value carries over — the donor adds the dedication on the hosted checkout.
 *
 * Authoring contract — one cell per row (order matters):
 *   row 1: title text                (e.g. "Celebrating a Champion!")
 *   row 2: amount tiers, pipe/comma separated (e.g. "50 | 50 | 50 | 50 | 50 | 50")
 *   row 3: designation option text   (e.g. "Designate to the … Fund")
 *   row 4: CTA label                 (e.g. "Donate and Support")
 *   row 5: donation URL              (the FundraiseUp hosted page; a cell with a
 *          link OR plain text. Falls back to the CHRIS50 campaign page.)
 *   row 6: FundraiseUp Element id    (e.g. "XJYDXZPC" — the source's inline
 *          "Donation Form" element. Falls back to that id.)
 * Missing rows fall back to sensible defaults.
 */

// FundraiseUp hosted donation page the source embed opens, incl. the source's
// element identifiers. Used when the author doesn't provide a row-5 URL.
const DEFAULT_DONATE_URL = 'https://ustaf.donorsupport.co/page/CHRIS50?elementTitle=Donation%20Form&elementName=Chris%2050%20Donation%20Embed';

// The source page's inline FundraiseUp "Donation Form" Element id (the anchor
// `<a href="#XJYDXZPC">` FundraiseUp mounts the widget into). Used when the
// author doesn't provide a row-6 id.
const DEFAULT_ELEMENT_ID = 'XJYDXZPC';

// How long to wait for the FundraiseUp Element to mount before deciding the
// origin isn't allow-listed and showing the native fallback instead.
const FRU_MOUNT_TIMEOUT_MS = 6000;

const HEART = '<svg class="cfd-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21s-7.5-4.9-10.05-9.2C.2 8.6 1.4 4.9 4.8 4.2 7 3.7 9.1 4.7 10.2 6.4c.4.6.7 1.2.9 1.7.2-.5.5-1.1.9-1.7C14 4.7 16.1 3.7 18.3 4.2c3.4.7 4.6 4.4 2.85 7.6C19.5 16.1 12 21 12 21z"/></svg>';

const text = (row) => (row?.textContent || '').trim();

/**
 * Build the self-contained NATIVE fallback form (used when the real FundraiseUp
 * Element can't mount on this origin). Returns the <form> element; the caller
 * appends it. The honoree field is intentionally omitted here — see the header.
 */
function buildNativeForm({
  title, amounts, designation, ctaLabel, donateUrl,
}) {
  const defaultIndex = amounts.length - 1; // last tier selected (mirrors screenshot)

  const amountBtns = amounts
    .map((amt, i) => `<button type="button" class="cfd-amount" aria-pressed="${i === defaultIndex}">$${amt}</button>`)
    .join('');

  const form = document.createElement('form');
  form.className = 'cfd-form';
  form.setAttribute('novalidate', '');
  form.innerHTML = `
    <fieldset class="cfd-frequency">
      <legend class="cfd-sr-only">Donation frequency</legend>
      <button type="button" class="cfd-freq" aria-pressed="true">One-time</button>
      <button type="button" class="cfd-freq">${HEART}<span>Monthly</span></button>
    </fieldset>

    <p class="cfd-title">${title}</p>

    <fieldset class="cfd-amounts">
      <legend class="cfd-sr-only">Donation amount</legend>
      ${amountBtns}
    </fieldset>

    <div class="cfd-custom">
      <label class="cfd-sr-only" for="cfd-amount">Custom amount</label>
      <span class="cfd-currency">$</span>
      <input class="cfd-amount-input" id="cfd-amount" name="amount" type="text" inputmode="numeric" value="${amounts[defaultIndex] || '50'}" autocomplete="off">
      <span class="cfd-unit">USD</span>
    </div>

    <p class="cfd-tooltip">You&rsquo;ll be able to add a dedication and a personal message on the secure donation page.</p>

    <div class="cfd-designation">
      <label class="cfd-sr-only" for="cfd-designation">Designation</label>
      <select id="cfd-designation" name="designation">
        <option>${designation}</option>
      </select>
    </div>

    <p class="cfd-comment"><a href="#add-comment">Add comment</a></p>

    <button type="submit" class="cfd-submit">${ctaLabel}</button>
  `;

  // Frequency toggle — single active button.
  const freqBtns = [...form.querySelectorAll('.cfd-freq')];
  form.querySelector('.cfd-frequency').addEventListener('click', (e) => {
    const btn = e.target.closest('.cfd-freq');
    if (!btn) return;
    freqBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  });

  // Amount tiers — single active tier; syncs the custom-amount input.
  const amtInput = form.querySelector('.cfd-amount-input');
  const amtBtns = [...form.querySelectorAll('.cfd-amount')];
  form.querySelector('.cfd-amounts').addEventListener('click', (e) => {
    const btn = e.target.closest('.cfd-amount');
    if (!btn) return;
    amtBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    amtInput.value = btn.textContent.replace(/[^0-9.]/g, '');
  });

  // Submit → hand the payload off to the FundraiseUp hosted donation page (same
  // page the source embed opens). Build the URL from the authored base + the
  // chosen amount / frequency so the hosted checkout prefills, preserving any
  // query params already on the base (elementTitle/elementName).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let url;
    try {
      url = new URL(donateUrl, window.location.href);
    } catch {
      window.open(donateUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const amount = (amtInput.value || '').replace(/[^0-9.]/g, '');
    const freqBtn = form.querySelector('.cfd-freq[aria-pressed="true"]');
    const frequency = freqBtn && /month/i.test(freqBtn.textContent) ? 'monthly' : 'once';
    const params = url.searchParams;
    if (amount) params.set('amount', amount); // CONFIRMED key
    params.set('recurring', frequency); // CONFIRMED key (once|monthly)
    // NOTE: the honoree NAME is intentionally NOT appended — FundraiseUp does not
    // read it from the URL (verified). The donor adds the dedication on the
    // hosted checkout. See the header comment.
    // Outward-facing: open the secure hosted donation page in a new tab.
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  });

  return form;
}

/**
 * Mount the real FundraiseUp inline Element — the SAME mechanism the source uses
 * (`<a href="#<elementId>">`). The FundraiseUp loader (scripts/donate.js) finds
 * the anchor and renders the widget into it. Resolves true once the widget has
 * injected its DOM, false if it hasn't mounted within the timeout (origin not
 * allow-listed / loader blocked), so the caller can fall back to the native form.
 */
function mountFundraiseUpElement(container, elementId) {
  const anchor = document.createElement('a');
  anchor.href = `#${elementId}`;
  anchor.className = 'cfd-fru-element';
  container.append(anchor);

  return new Promise((resolve) => {
    let settled = false;
    let observer;
    let timer;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (observer) observer.disconnect();
      clearTimeout(timer);
      resolve(ok);
    };

    // The widget mounts by injecting nodes (an iframe / its own markup) into or
    // right after the anchor. Treat any added element as a successful mount.
    const mounted = () => anchor.querySelector('iframe, [id^="fundraiseup"], *')
      || (anchor.nextElementSibling && /fundrais/i.test(anchor.nextElementSibling.id || ''));
    observer = new MutationObserver(() => {
      if (mounted()) finish(true);
    });
    observer.observe(container, { childList: true, subtree: true });

    // Nudge the loader to (re)scan for elements if its API is ready.
    try {
      if (window.FundraiseUp && typeof window.FundraiseUp.on === 'function') {
        window.FundraiseUp.on('elementLoaded', () => finish(true));
      }
    } catch (e) { /* loader not ready / restricted — the observer still covers it */ }

    if (mounted()) finish(true);
    timer = setTimeout(() => finish(false), FRU_MOUNT_TIMEOUT_MS);
  });
}

export default async function decorate(block) {
  const rows = [...block.children];
  const config = {
    title: text(rows[0]) || 'Celebrating a Champion!',
    amounts: (text(rows[1]) || '50 | 50 | 50 | 50 | 50 | 50')
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean),
    designation: text(rows[2]) || 'Designate to the Jimmy Evert Merit Scholarship Fund',
    ctaLabel: text(rows[3]) || 'Donate and Support',
    // Row 5: donation hand-off URL — accept an authored link href or plain text.
    donateUrl: rows[4]?.querySelector('a')?.href || text(rows[4]) || DEFAULT_DONATE_URL,
    // Row 6: FundraiseUp Element id — accept an authored `#id` link or plain text.
    // Sanitised to [A-Za-z0-9] (it flows into the anchor href) — never trust raw
    // author text; a valid FundraiseUp element code is alphanumeric.
    elementId: (rows[5]?.querySelector('a')?.getAttribute('href') || text(rows[5]) || DEFAULT_ELEMENT_ID)
      .replace(/[^A-Za-z0-9]/g, '') || DEFAULT_ELEMENT_ID,
  };

  block.textContent = '';

  // PRIMARY: try to mount the real FundraiseUp Element (form + checkout are one
  // widget, so the honoree name carries over natively). FALLBACK: on any origin
  // where it can't render, show the native form.
  const host = document.createElement('div');
  host.className = 'cfd-fru-host';
  block.append(host);

  const ok = await mountFundraiseUpElement(host, config.elementId);
  if (ok) {
    block.classList.add('cfd-live'); // real widget rendered
    return;
  }

  // Fallback — remove the (empty) FundraiseUp host and render the native form.
  host.remove();
  block.classList.add('cfd-fallback');
  block.append(buildNativeForm(config));
}
