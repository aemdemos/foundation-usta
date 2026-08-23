import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Spacer block — an authorable vertical gap / colored band.
 *
 * Authors set a height per breakpoint and, optionally, a background color.
 * Multiple spacers can be stacked to build banded separators (e.g. a colored
 * strip followed by a white gap). Config keys (from the block's key/value rows):
 *   - desktop : height at >= 1200px  (e.g. "17px")
 *   - tablet  : height at >= 992px   (falls back to mobile when omitted)
 *   - mobile  : height below 992px
 *   - color   : background color. Accepts a raw CSS color ("#e2f7ff",
 *               "rgb(...)"), a full custom-property ref ("var(--x)"), or a
 *               design-token NAME with or without the leading dashes
 *               ("cards-band-bg" or "--cards-band-bg").
 *
 * @param {Element} block the spacer block element
 */

/**
 * Resolve an authored color value to a valid CSS color.
 * A bare token name (e.g. "cards-band-bg") is treated as a design token and
 * wrapped in var(--…); raw colors and existing var(...) refs pass through.
 * @param {string} value authored color
 * @returns {string} a CSS-valid color value
 */
function resolveColor(value) {
  const color = value.trim();
  if (!color) return '';
  if (color.startsWith('var(') || color.startsWith('#')
    || /^(rgb|hsl)a?\(/i.test(color)) return color;
  if (color.startsWith('--')) return `var(${color})`;
  // A single bare word/kebab token that isn't a CSS named color we rely on:
  // treat "*-bg" / "*-color" / any hyphenated token as a design-token name.
  if (/^[a-z][a-z0-9-]*$/i.test(color) && color.includes('-')) return `var(--${color})`;
  return color; // named CSS colors ("black", "white", etc.) pass through
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  const setHeight = () => {
    if (window.innerWidth >= 1200) {
      block.style.height = cfg.desktop || cfg.tablet || cfg.mobile || '';
    } else if (window.innerWidth >= 992) {
      block.style.height = cfg.tablet || cfg.mobile || cfg.desktop || '';
    } else {
      block.style.height = cfg.mobile || cfg.tablet || cfg.desktop || '';
    }
  };

  if (cfg.color) {
    block.style.backgroundColor = resolveColor(cfg.color);
  }

  setHeight();
  window.addEventListener('resize', setHeight);
}
