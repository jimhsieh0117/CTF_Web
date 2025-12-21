(function () {
  const HOST_ID = 'ctf-dialog';
  const TITLE_ID = 'ctf-dialog-title';
  const BODY_ID = 'ctf-dialog-body';

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;

    host = document.createElement('div');
    host.id = HOST_ID;
    host.className = 'modal-host';
    host.style.display = 'none';
    host.innerHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="cardx-title" id="${TITLE_ID}">提示</h3>
            <button class="modal-close-btn" type="button" aria-label="關閉" data-ctf-dialog-close>&times;</button>
          </div>
          <div class="modal-content">
            <pre class="story-content" id="${BODY_ID}"></pre>
          </div>
        </div>
      </div>
    `.trim();

    document.body.appendChild(host);

    // 點遮罩關閉
    host.addEventListener('click', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) close();
    });

    // 點 X 關閉
    host.querySelector('[data-ctf-dialog-close]')?.addEventListener('click', close);

    // Esc 關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    return host;
  }

  function open(title, bodyText) {
    const host = ensureHost();
    const titleEl = document.getElementById(TITLE_ID);
    const bodyEl = document.getElementById(BODY_ID);

    if (titleEl) titleEl.textContent = title || '提示';
    if (bodyEl) bodyEl.textContent = bodyText || '';

    host.style.display = 'block';
    document.body.classList.add('modal-open');
  }

  function close() {
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    host.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  window.CtfDialog = {
    open,
    close,
    ensureHost,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureHost);
  } else {
    ensureHost();
  }
})();
