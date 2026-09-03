export default function decorate(block) {
  /* Each authored row = one stat card: [image cell, number cell, caption cell].
     Convert to <ul>/<li> and tag the cells so CSS can target them. */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    let textIdx = 0;
    [...li.children].forEach((div) => {
      if (div.querySelector('picture') || div.querySelector('img')) {
        div.className = 'cards-stats-card-image';
      } else {
        div.className = textIdx === 0 ? 'cards-stats-card-number' : 'cards-stats-card-caption';
        textIdx += 1;
      }
    });
    ul.append(li);
  });
  block.textContent = '';
  block.append(ul);
}
