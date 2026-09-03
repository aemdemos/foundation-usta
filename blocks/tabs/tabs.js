/**
 * Tabs — a tab switcher toggling content panels (source: USTA Foundation
 * Leadership & Staff "STAFF / BOARD OF DIRECTORS").
 *
 * Authored table — one row per tab, two cells:
 *   [tab label] [panel content]
 *
 * Decorated into an accessible tablist:
 *   <div class="tabs-tablist" role="tablist"> <button role="tab">…</button> </div>
 *   <div class="tabs-panels"> <div role="tabpanel">…</div> </div>
 *
 * Keyboard: ArrowLeft/ArrowRight (wrapping) + Home/End move and activate tabs;
 * focus-visible ring on each tab.
 *
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];

  const tablist = document.createElement('div');
  tablist.className = 'tabs-tablist';
  tablist.setAttribute('role', 'tablist');

  const panels = document.createElement('div');
  panels.className = 'tabs-panels';

  const tabs = [];
  const uid = Math.random().toString(36).slice(2, 8);

  rows.forEach((row, i) => {
    const [labelCell, contentCell] = row.children;
    const label = labelCell ? labelCell.textContent.trim() : `Tab ${i + 1}`;
    const tabId = `tab-${uid}-${i}`;
    const panelId = `tabpanel-${uid}-${i}`;
    const selected = i === 0;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-tab';
    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.setAttribute('tabindex', selected ? '0' : '-1');
    tab.textContent = label;
    tablist.append(tab);
    tabs.push(tab);

    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.setAttribute('tabindex', '0');
    if (!selected) panel.hidden = true;
    if (contentCell) {
      while (contentCell.firstChild) panel.append(contentCell.firstChild);
    }
    panels.append(panel);
  });

  const activate = (index, focus = true) => {
    tabs.forEach((tab, i) => {
      const isActive = i === index;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
      panels.children[i].hidden = !isActive;
    });
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i, false));
    tab.addEventListener('keydown', (e) => {
      let next;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        e.preventDefault();
        activate(next);
      }
    });
  });

  block.textContent = '';
  block.append(tablist, panels);
}
