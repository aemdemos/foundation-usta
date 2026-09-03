/**
 * Hero Error (404) block — centered "page not found" message with a
 * bouncing tennis-ball graphic above a heading and a "back to homepage" CTA.
 * Source: https://www.ustafoundation.com/en/home/404.html
 *
 * Authoring model (rows):
 *   row 1 → cell: <h1> heading + a <p><a> CTA link
 * The CTA link is decorated as a filled button.
 *
 * @param {Element} block the hero-error block element
 */
export default function decorate(block) {
  // Standalone CTA link renders as a filled button (matches the source CTA).
  block.querySelectorAll('p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.childElementCount === 1 && p.textContent.trim() === a.textContent.trim()) {
      a.classList.add('button');
      p.classList.add('button-container');
    }
  });
}
