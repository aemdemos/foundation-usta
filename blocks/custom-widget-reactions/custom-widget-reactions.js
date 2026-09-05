/**
 * Custom Widget Reactions
 * Emoji reactions widget — a self-contained, local (no-backend) recreation of the
 * source site's Vue reactions component. Counts are held in client-side state only
 * and reset on reload; there is no persistence or API call.
 *
 * Authoring model (EDS table):
 *   Row 1: the widget title (e.g. "Reactions")
 *   Row 2 (optional): the empty-state prompt (e.g. "Be the first to add a reaction")
 *
 * The reaction set (emoji + accessible label) is structural to the widget — it mirrors
 * the source component's fixed set — so it lives here rather than in authored content.
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
    const active = Object.entries(counts).filter(([, n]) => n > 0);
    if (!active.length) {
      message.textContent = promptText;
      message.classList.add('is-empty');
      return;
    }
    const total = active.reduce((sum, [, n]) => sum + n, 0);
    message.classList.remove('is-empty');
    message.textContent = total === 1 ? '1 reaction' : `${total} reactions`;
  };

  REACTIONS.forEach((r) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-widget-reactions-item';
    btn.dataset.reactionType = r.type;
    btn.setAttribute('aria-label', r.label);
    btn.setAttribute('aria-pressed', 'false');

    const emoji = document.createElement('img');
    emoji.className = 'custom-widget-reactions-emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.setAttribute('loading', 'lazy');
    emoji.alt = '';
    emoji.src = `${ICON_BASE}${r.icon}.svg`;

    const count = document.createElement('span');
    count.className = 'custom-widget-reactions-count';
    count.setAttribute('aria-hidden', 'true');

    btn.append(emoji, count);
    controls.append(btn);

    btn.addEventListener('click', () => {
      counts[r.type] = (counts[r.type] || 0) + 1;
      count.textContent = counts[r.type];
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      renderMessage();
    });
  });

  renderMessage();
  block.append(title, controls, message);
}
