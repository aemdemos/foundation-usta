/**
 * Custom Widget Reactions
 * Emoji reactions widget — a self-contained recreation of the source site's Vue
 * reactions component (www.ustafoundation.com news pages, `.v-reactions`).
 *
 * Source behaviour reproduced (measured on the live site):
 *   - Each reaction is a fixed SVG icon with an accessible label (Smile / Thumbs
 *     Up / Love / Clap / Thumbs Down / Lightbulb) and a `data-reaction-type`.
 *   - HOVER (or keyboard focus) reveals a small black rounded LABEL PILL above the
 *     icon (`.v-reaction__label`: absolute, #000 @ 0.8 opacity, white 12px/24px,
 *     border-radius 15px, padding 0 20px) — the "Love" badge in the design.
 *   - CLICK adds the reaction: the per-icon COUNT value appears and the message
 *     switches from the empty prompt to the running total. The source persists
 *     counts via a backend POST; there is no public API, so counts are held in
 *     client-side state only (reset on reload) — the visible behaviour matches.
 *
 * Authoring model (EDS table):
 *   Row 1: the widget title (e.g. "Reactions")
 *   Row 2 (optional): the empty-state prompt (e.g. "Be the first to add a reaction")
 *
 * The reaction set (icon + label) is structural to the widget — it mirrors the
 * source component's fixed set — so it lives here rather than in authored content.
 */

// The source renders each reaction as a fixed SVG icon (from its Vue clientlib),
// NOT an OS text emoji — so parity requires shipping those exact SVGs. They are
// self-hosted under this block's icons/ folder. Each has the source's intrinsic
// size baked into its viewBox (Smile 36×36, Thumbs_Up/Down 33×36, Love 40×36,
// Clap 36×36, Light_Bulb 22×35); the CSS caps HEIGHT at 36px so widths keep the
// source aspect ratio at every breakpoint.
const REACTIONS = [
  { type: 'smile', icon: 'Smile', label: 'Smile' },
  { type: 'thumbsUp', icon: 'Thumbs_Up', label: 'Thumbs Up' },
  { type: 'love', icon: 'Love', label: 'Love' },
  { type: 'clap', icon: 'Clap', label: 'Clap' },
  { type: 'thumbsDown', icon: 'Thumbs_Down', label: 'Thumbs Down' },
  { type: 'lightBulb', icon: 'Light_Bulb', label: 'Lightbulb' },
];

// Resolve icon URLs relative to this module so they load regardless of the page path.
const ICON_BASE = new URL('./icons/', import.meta.url).href;

export default function decorate(block) {
  const rows = [...block.children];
  const titleText = rows[0]?.textContent.trim() || 'Reactions';
  const promptText = rows[1]?.textContent.trim() || 'Be the first to add a reaction';

  block.textContent = '';

  const title = document.createElement('h3');
  title.className = 'custom-widget-reactions-title';
  title.textContent = titleText;

  const controls = document.createElement('div');
  controls.className = 'custom-widget-reactions-controls';

  const message = document.createElement('p');
  message.className = 'custom-widget-reactions-message';

  const counts = {};

  const renderMessage = () => {
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (!total) {
      message.textContent = promptText;
      message.classList.add('is-empty');
      return;
    }
    message.classList.remove('is-empty');
    message.textContent = total === 1 ? '1 Reaction' : `${total} Reactions`;
  };

  REACTIONS.forEach((r) => {
    // Keyboard-operable button wrapper (source uses tabindex=0 on the <img>; a
    // real <button> is more robust and passes axe). Its accessible name comes
    // from the <img alt> below.
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-widget-reactions-item is-pristine';
    btn.dataset.reactionType = r.type;
    btn.setAttribute('aria-pressed', 'false');

    // The per-reaction count value (source `.v-reaction__value`) — hidden until
    // the reaction is added, then shows above the icon.
    const value = document.createElement('span');
    value.className = 'custom-widget-reactions-value';
    value.setAttribute('aria-hidden', 'true');

    // The icon. `alt` carries the reaction label — this is the button's
    // accessible name (matches the source's `<img alt="Love">`).
    const emoji = document.createElement('img');
    emoji.className = 'custom-widget-reactions-emoji';
    emoji.setAttribute('loading', 'lazy');
    emoji.alt = r.label;
    emoji.src = `${ICON_BASE}${r.icon}.svg`;

    // The hover/focus LABEL PILL (source `.v-reaction__label`). aria-hidden so it
    // doesn't double up on the img alt for assistive tech.
    const label = document.createElement('span');
    label.className = 'custom-widget-reactions-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = r.label;

    btn.append(value, emoji, label);
    controls.append(btn);

    btn.addEventListener('click', () => {
      counts[r.type] = (counts[r.type] || 0) + 1;
      value.textContent = counts[r.type];
      btn.classList.remove('is-pristine');
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      renderMessage();
    });
  });

  renderMessage();
  block.append(title, controls, message);
}
