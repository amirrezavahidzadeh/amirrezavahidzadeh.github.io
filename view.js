/* switch between the 3D corridor and the classic scrolling résumé (remembered per visitor) */
(() => {
  const b = document.getElementById('viewToggle'), body = document.body;
  const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
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
