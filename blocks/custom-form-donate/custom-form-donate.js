/*
 * custom-form-donate — self-contained NATIVE reproduction of the inline
 * FundraiseUp donation widget on the source page (accessible controls; frequency
 * toggle, amount tiers, dedicate reveal). We don't re-embed the third-party
 * FundraiseUp widget (its loader crashes under the site's Trusted Types CSP, and
 * running it in-page would mean weakening that XSS protection site-wide).
 *
 * SUBMIT / HAND-OFF: on "Donate and Support" the collected payload is handed off
 * to FundraiseUp's hosted donation page. Only the params FundraiseUp actually
 * reads from the URL are appended — verified empirically against the live hosted
 * page (typed a value, watched fetch/XHR/beacon + storage + rendered field):
 *   - amount=<dollars>       → prefills the amount field  (CONFIRMED)
 *   - recurring=once|monthly → sets the frequency toggle  (CONFIRMED)
 * The "Dedicate this donation" NAME cannot be passed: FundraiseUp does NOT read
 * it from the URL — in the source it lives only in the widget's in-memory state
 * and survives into checkout because the SAME widget renders both screens (no
 * navigation). A URL hand-off therefore can't round-trip it; only the real
 * FundraiseUp embed could, which we don't use (see above).
 *
 * Authoring contract — one cell per row (order matters):
 *   row 1: title text                (e.g. "Celebrating a Champion!")
 *   row 2: amount tiers, pipe/comma separated (e.g. "50 | 50 | 50 | 50 | 50 | 50")
 *   row 3: designation option text   (e.g. "Designate to the … Fund")
 *   row 4: CTA label                 (e.g. "Donate and Support")
 *   row 5: donation URL              (the FundraiseUp hosted page; a cell with a
 *          link OR plain text. Falls back to the CHRIS50 campaign page.)
 * Missing rows fall back to sensible defaults.
 */

// FundraiseUp hosted donation page the source embed opens, incl. the source's
// element identifiers. Used when the author doesn't provide a row-5 URL.
const DEFAULT_DONATE_URL = 'https://ustaf.donorsupport.co/page/CHRIS50?elementTitle=Donation%20Form&elementName=Chris%2050%20Donation%20Embed';

const HEART = '<svg class="cfd-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21s-7.5-4.9-10.05-9.2C.2 8.6 1.4 4.9 4.8 4.2 7 3.7 9.1 4.7 10.2 6.4c.4.6.7 1.2.9 1.7.2-.5.5-1.1.9-1.7C14 4.7 16.1 3.7 18.3 4.2c3.4.7 4.6 4.4 2.85 7.6C19.5 16.1 12 21 12 21z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6L9 17l-5-5"/></svg>';

const text = (row) => (row?.textContent || '').trim();

export default function decorate(block) {
  const rows = [...block.children];
  const title = text(rows[0]) || 'Celebrating a Champion!';
  const amounts = (text(rows[1]) || '50 | 50 | 50 | 50 | 50 | 50')
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const designation = text(rows[2]) || 'Designate to the Jimmy Evert Merit Scholarship Fund';
  const ctaLabel = text(rows[3]) || 'Donate and Support';
  // Row 5: donation hand-off URL — accept an authored link href or plain text.
  const donateUrl = rows[4]?.querySelector('a')?.href || text(rows[4]) || DEFAULT_DONATE_URL;

  const defaultIndex = amounts.length - 1; // last tier selected (mirrors screenshot)

  const amountBtns = amounts
    .map((amt, i) => `<button type="button" class="cfd-amount" aria-pressed="${i === defaultIndex}">$${amt}</button>`)
    .join('');

  block.textContent = '';

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

    <div class="cfd-dedicate">
      <span class="cfd-checkbox">
        <input type="checkbox" id="cfd-dedicate" checked>
        ${CHECK}
      </span>
      <label for="cfd-dedicate">Dedicate this donation</label>
    </div>

    <div class="cfd-field">
      <label for="cfd-honoree">Honoree full name</label>
      <input class="cfd-honoree" id="cfd-honoree" name="honoree" type="text" placeholder="First and last name" autocomplete="off">
    </div>

    <p class="cfd-tooltip">Once you&rsquo;ve donated, you&rsquo;ll be able to add a personal message and send a card.</p>

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

  // Dedicate checkbox reveals honoree field + tooltip.
  const dedicate = form.querySelector('#cfd-dedicate');
  const field = form.querySelector('.cfd-field');
  const tooltip = form.querySelector('.cfd-tooltip');
  const syncDedicate = () => {
    const on = dedicate.checked;
    field.hidden = !on;
    tooltip.hidden = !on;
  };
  dedicate.addEventListener('change', syncDedicate);
  syncDedicate();

  // Submit → hand the payload off to the FundraiseUp hosted donation page (same
  // page the source embed opens). Build the URL from the authored base + the
  // chosen amount / frequency / dedication so the hosted checkout prefills,
  // preserving any query params already on the base (elementTitle/elementName).
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
    // NOTE: the dedicate/honoree NAME is intentionally NOT appended — FundraiseUp
    // does not read it from the URL (verified: it lives only in the widget's
    // in-memory state). See the header comment.
    // Outward-facing: open the secure hosted donation page in a new tab.
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  });

  block.append(form);
}
