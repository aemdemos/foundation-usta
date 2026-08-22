/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: USTA Foundation site-wide cleanup.
 *
 * Removes non-authorable site chrome (header/footer experience fragments,
 * navigation, breadcrumb, search) and tracking iframes so the import contains
 * only page-level authorable content.
 *
 * All selectors verified against migration-work/cleaned.html:
 *   - div.experiencefragment > .cmp-experiencefragment--header  (line 5-6)
 *   - div.experiencefragment > .cmp-experiencefragment--footer  (line 804-805)
 *   - div.header, div.top-navigation, nav.navigation-menu       (line 16, 17, 32)
 *   - div.breadcrumb, #searchAndLocationPanelSwitch             (line 100, 107)
 *   - iframe#destination_publishing_iframe_usta_0 (demdex)      (line 1075)
 *   - iframe#XVRCGAHD (persistent donate button, about:blank)   (line 1077)
 *
 * NOTE: The YouTube embed iframe inside #mainContent (line 355) is authorable
 * content and is intentionally NOT removed — no blanket `iframe` selector is used.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    // Remove header and footer experience-fragment wrappers (site chrome).
    // Both are the only two div.experiencefragment elements on the page; remove
    // the wrapper via the header/footer cmp marker so no empty shell is left.
    element.querySelectorAll('.cmp-experiencefragment--header, .cmp-experiencefragment--footer')
      .forEach((cmp) => {
        const wrapper = cmp.closest('.experiencefragment');
        (wrapper || cmp).remove();
      });

    // Defensive removal of any remaining site chrome (nav, breadcrumb, search).
    WebImporter.DOMUtils.remove(element, [
      '.header',
      '.top-navigation',
      'nav.navigation-menu',
      '.breadcrumb',
      '#searchAndLocationPanelSwitch',
    ]);

    // Remove tracking / injected iframes by id (NOT the authorable YouTube embed).
    WebImporter.DOMUtils.remove(element, [
      '#destination_publishing_iframe_usta_0',
      '#XVRCGAHD',
    ]);

    // Remove non-authorable leftover elements.
    WebImporter.DOMUtils.remove(element, [
      'noscript',
      'link',
      'meta',
      'style',
    ]);

    // Remove injected tracking anchors (e.g. Hotjar's "_hjSafeContext" link).
    // These are injected live at load time, so match defensively by both href
    // (about:blank / empty / hash — the attribute may not read literally
    // "about:blank" at transform time) and by the known tracking link text.
    element.querySelectorAll('a').forEach((a) => {
      const href = (a.getAttribute('href') || '').trim();
      const text = (a.textContent || '').trim();
      if (
        href === 'about:blank'
        || href.startsWith('about:')
        || href === ''
        || href === '#'
        || text === '_hjSafeContext'
      ) {
        const wrapper = a.closest('p');
        // Only drop the wrapping <p> if the anchor is its sole content.
        if (wrapper && (wrapper.textContent || '').trim() === text) {
          wrapper.remove();
        } else {
          a.remove();
        }
      }
    });
  }
}
