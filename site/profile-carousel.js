// A single scrollable row keeps the picker compact even with large catalogs.
export function initProfileCarousel(track) {
  const controls = document.querySelector(`[data-carousel-controls="${track.id}"]`);
  const previous = controls.querySelector('[data-previous]');
  const next = controls.querySelector('[data-next]');
  const range = controls.querySelector('[data-range]');
  const items = () => [...track.children];
  let frame = 0;
  const behavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  function refresh() {
    if (!track.clientWidth) return;
    const choices = items(), bounds = track.getBoundingClientRect();
    const visible = choices.map((choice, index) => ({ index, box: choice.getBoundingClientRect() }))
      .filter(({ box }) => box.right > bounds.left + 2 && box.left < bounds.right - 2);
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    range.textContent = visible.length ? `${visible[0].index + 1}–${visible.at(-1).index + 1} de ${choices.length}` : '';
  }
  function scheduleRefresh() {
    cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh);
  }
  function reveal(choice, animate = false) {
    if (!choice || !track.clientWidth) return;
    const viewport = track.getBoundingClientRect(), box = choice.getBoundingClientRect();
    let left = track.scrollLeft;
    if (box.left < viewport.left) left += box.left - viewport.left;
    else if (box.right > viewport.right) left += box.right - viewport.right;
    track.scrollTo({ left, behavior: animate ? behavior() : 'instant' });
    scheduleRefresh();
  }
  function move(direction) {
    const choices = items(); if (!choices.length) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const stride = choices[0].getBoundingClientRect().width + gap;
    // Moving a full group always leaves three options visible, including at the end.
    track.scrollTo({ left: Math.round(track.scrollLeft / stride) * stride + direction * 3 * stride, behavior: behavior() });
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', scheduleRefresh, { passive: true });
  function alignRow() {
    if (!track.clientWidth || !track.firstElementChild) return;
    const stride = track.firstElementChild.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
    const left = Math.min(track.scrollWidth - track.clientWidth, Math.round(track.scrollLeft / stride) * stride);
    if (Math.abs(track.scrollLeft - left) > 2) track.scrollTo({ left, behavior: 'instant' });
    scheduleRefresh();
  }
  // Keep a complete group after native focus scrolling or a viewport resize.
  track.addEventListener('scrollend', alignRow);
  track.addEventListener('keydown', event => {
    const choices = items(), current = choices.indexOf(event.target);
    if (current < 0) return;
    const destination = { ArrowRight: Math.min(current + 1, choices.length - 1), ArrowLeft: Math.max(current - 1, 0), Home: 0, End: choices.length - 1 }[event.key];
    if (destination === undefined) return;
    event.preventDefault(); choices[destination].focus({ preventScroll: true }); reveal(choices[destination]);
  });
  let previousWidth = 0;
  const resize = new ResizeObserver(() => {
    const width = track.clientWidth;
    if (width && width !== previousWidth) {
      previousWidth = width;
      alignRow();
    }
    scheduleRefresh();
  });
  resize.observe(track);
  scheduleRefresh();
  return {
    refresh,
    revealSelection() { reveal(track.querySelector('[aria-pressed="true"]')); }
  };
}
