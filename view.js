/* switch between the 3D corridor and the classic scrolling résumé (remembered per visitor) */
(() => {
  const b = document.getElementById('viewToggle'), body = document.body;
  // no test context here (creating one costs time and GPU memory); corridor.js falls back to classic if WebGL fails
  const gl = !!(window.WebGL2RenderingContext || window.WebGLRenderingContext);
  let pref = null; try { pref = localStorage.getItem('av-view'); } catch (e) { }
  const set = corr => {
    body.classList.toggle('corridor', corr);
    b.textContent = corr ? 'Classic view' : '3D corridor'; b.setAttribute('aria-pressed', String(!corr));
    try { localStorage.setItem('av-view', corr ? '3d' : 'classic'); } catch (e) { }
    window.scrollTo(0, 0); dispatchEvent(new Event('resize'));
  };
  if (!gl) { body.classList.remove('corridor'); b.hidden = true; return; }
  set(pref !== 'classic');
  b.addEventListener('click', () => set(!body.classList.contains('corridor')));
})();
