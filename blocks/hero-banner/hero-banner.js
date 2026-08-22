export default function decorate(block) {
  // Standalone CTA link (last <p><a>) renders as a button.
  block.querySelectorAll('p > a').forEach((a) => {
    const p = a.parentElement;
    if (p.childElementCount === 1 && p.textContent.trim() === a.textContent.trim()) {
      a.classList.add('button');
      p.classList.add('button-container');
    }
  });
}
