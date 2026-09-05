document.documentElement.classList.add('js-enabled');
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const cloneData = (value) => {
  try { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
  catch (_) { return JSON.parse(JSON.stringify(value || {})); }
};
let CONTENT = cloneData(window.DEFAULT_CONTENT || {});

/* ── Content Loading ── */
async function loadContent() {
  try {
    if (window.location.protocol !== 'file:') {
      const r = await fetch('/api/content', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j.data) CONTENT = mergeDeep(cloneData(window.DEFAULT_CONTENT || {}), j.data);
      }
    }
  } catch (_) {}

  hydrateGlobal();
  window.dispatchEvent(new CustomEvent('content-ready', { detail: CONTENT }));
  return CONTENT;
}

function mergeDeep(target, source) {
  if (!source || typeof source !== 'object') return target;
  for (const [k, v] of Object.entries(source)) {
    if (Array.isArray(v))                  target[k] = v;
    else if (v && typeof v === 'object')   target[k] = mergeDeep(target[k] || {}, v);
    else                                   target[k] = v;
  }
  return target;
}

function normalizeExternalUrl(url) {
  const value = String(url || '').trim();
  if (!value || value === '#') return '#';
  if (/^(https?:)?\/\//i.test(value)) return value.startsWith('//') ? `https:${value}` : value;
  return `https://${value}`;
}

/* ── Global Hydration ── */
function hydrateGlobal() {
  document.title = document.title.replace('Stake Türkiye', CONTENT.site?.name || 'Stake Türkiye');

  $$('[data-site-name]').forEach(el => el.textContent = CONTENT.site?.name || 'Stake Türkiye');
  $$('[data-brand-subtitle]').forEach(el => el.textContent = CONTENT.site?.brandSubtitle || 'Affiliate Portal');
  $$('[data-contact-title]').forEach(el => el.textContent = CONTENT.site?.contactTitle || 'Bizimle İletişime Geç');
  $$('[data-contact-text]').forEach(el => el.textContent = CONTENT.site?.contactText || '');
  $$('[data-whatsapp-title]').forEach(el => el.textContent = CONTENT.site?.whatsappTitle || 'WhatsApp Destek');
  $$('[data-whatsapp-text]').forEach(el => el.textContent = CONTENT.site?.whatsappText || '');
  $$('[data-telegram-title]').forEach(el => el.textContent = CONTENT.site?.telegramTitle || 'Telegram Kanalı');
  $$('[data-telegram-text]').forEach(el => el.textContent = CONTENT.site?.telegramText || '');
  $$('[data-bot-text]').forEach(el => el.textContent = CONTENT.site?.botText || '');
  $$('[data-email]').forEach(el => { el.textContent = CONTENT.site?.email || ''; if (el.tagName === 'A') el.href = 'mailto:' + (CONTENT.site?.email || ''); });
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && CONTENT.site?.metaDescription) metaDescription.setAttribute('content', CONTENT.site.metaDescription);
  $$('[data-affiliate-note]').forEach(el => el.textContent = CONTENT.site?.affiliateNote || '');
  $$('[data-referral]').forEach(el => {
    el.href   = normalizeExternalUrl(CONTENT.site?.referralUrl);
    el.target = '_blank';
    el.rel    = 'noopener noreferrer sponsored';
  });
  $$('[data-login]').forEach(el => {
    el.href   = normalizeExternalUrl(CONTENT.site?.loginUrl || CONTENT.site?.referralUrl);
    el.target = '_blank';
    el.rel    = 'noopener noreferrer sponsored';
  });

  const ann = $('[data-announcement]');
  if (ann) { ann.textContent = CONTENT.site?.announcement || ''; ann.style.display = CONTENT.site?.showAnnouncement === false ? 'none' : ''; }

  // Portal hesabı düğmesini actions içine yerleştir
  $$('.actions').forEach(actions => {
    if (!actions.querySelector('[data-member-account]')) {
      const member = document.createElement('a');
      member.className = 'btn btn-member';
      member.href = 'hesap.html';
      member.dataset.memberAccount = '';
      member.textContent = 'Portal Hesabı';
      actions.appendChild(member);
      member.style.display = CONTENT.site?.showMemberButton === false ? 'none' : ''; 
    }
  });

  $$('[data-member-account]').forEach(el => el.style.display = CONTENT.site?.showMemberButton === false ? 'none' : '');

  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Social links
  $$('[data-whatsapp]').forEach(el => {
    el.style.display = CONTENT.site?.showWhatsapp === false ? 'none' : '';
    el.href   = normalizeExternalUrl(CONTENT.site?.whatsappUrl);
    el.target = '_blank';
    el.rel    = 'noopener noreferrer';
  });
  $$('[data-telegram]').forEach(el => {
    el.style.display = CONTENT.site?.showTelegram === false ? 'none' : '';
    el.href   = normalizeExternalUrl(CONTENT.site?.telegramUrl);
    el.target = '_blank';
    el.rel    = 'noopener noreferrer';
  });
  $$('[data-telegram-bot]').forEach(el => {
    el.style.display = CONTENT.site?.showTelegramBot === false ? 'none' : '';
    el.href   = normalizeExternalUrl(CONTENT.site?.telegramBotUrl);
    el.target = '_blank';
    el.rel    = 'noopener noreferrer';
  });
  $$('[data-telegram-bot-name]').forEach(el => {
    el.textContent = CONTENT.site?.telegramBotName || 'Telegram Bot';
  });

  // Update offer code if present in sidebar or page
  const offerCode = CONTENT.welcomeOffer?.code || 'KIBRIS';
  $$('[data-offer-code]').forEach(el => el.textContent = offerCode);

  // Initialize Sidebar and Floating buttons (skip admin page)
  if (!document.body.classList.contains('admin-body')) {
    initSidebar();
    initSocialFloat();
  }
}

/* ── Sliding Left Sidebar Navigation ── */
function initSidebar() {
  // 1. Topbar içine sol tarafa hamburger butonunu yerleştir
  const topbarInner = document.querySelector('.topbar-inner');
  if (topbarInner && !topbarInner.querySelector('.hamburger-btn')) {
    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.id = 'sidebarToggleBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Menüyü Aç');
    btn.innerHTML = '<span></span><span></span><span></span>';
    topbarInner.insertBefore(btn, topbarInner.firstChild);
  }

  // Desktop'ta tüm iç sayfalarda ana sayfa ile aynı premium navigasyonu göster
  if (topbarInner && !topbarInner.querySelector('.inner-premium-nav')) {
    const rawPathForNav = window.location.pathname.toLowerCase().split('/').pop() || 'index.html';
    const active = (name) => rawPathForNav === name ? 'active' : '';
    const nav = document.createElement('nav');
    nav.className = 'v2-nav inner-premium-nav';
    nav.setAttribute('aria-label', 'Ana menü');
    nav.innerHTML = `
      <a class="${active('index.html')}" href="index.html"><span>⌂</span>Ana Sayfa</a>
      <a class="${active('bonus-codes.html')}" href="bonus-codes.html"><span>✦</span>Bonus Kodları</a>
      <a class="${active('liderlik-tablosu.html')}" href="liderlik-tablosu.html"><span>🏆</span>Canlı Sıralama</a>
      <a class="${active('kampanyalar.html')}" href="kampanyalar.html"><span>◆</span>Kampanyalar</a>
      <a class="${active('cekilisler.html')}" href="cekilisler.html"><span>🎁</span>Çekilişler</a>
      <div class="v2-more"><button type="button">Daha Fazla ▾</button><div class="v2-more-menu"><a href="stake.html">Stake Hakkında</a><a href="sikca-sorulan-sorular.html">Sık Sorulanlar</a><a href="iletisim.html">İletişim & Destek</a><a href="hesap.html">Portal Hesabı</a></div></div>
    `;
    topbarInner.insertBefore(nav, topbarInner.querySelector('.actions'));
  }

  // 2. Sidebar ve Overlay oluştur (eğer daha önce eklenmemişse)
  if (!document.getElementById('appSidebar')) {
    const rawPath = window.location.pathname.toLowerCase().split('/').pop() || 'index.html';
    const isPage = (name) => rawPath === name.toLowerCase() || (name === 'index.html' && (rawPath === '' || rawPath === 'index.html'));

    const overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';

    const sidebar = document.createElement('aside');
    sidebar.id = 'appSidebar';
    sidebar.className = 'app-sidebar';
    sidebar.setAttribute('aria-label', 'Ana Gezinme Menüsü');

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <a class="v2-logo" href="index.html" style="margin-right:0">
          <strong>STAKE</strong><small>TÜRKİYE 🇹🇷</small>
        </a>
        <button class="sidebar-close-btn" id="sidebarCloseBtn" type="button" aria-label="Menüyü Kapat">✕</button>
      </div>

      <div class="sidebar-body">
        <div class="sidebar-nav-group">
          <span class="sidebar-group-title">MENÜ</span>
          
          <a class="sidebar-nav-item ${isPage('index.html') ? 'active' : ''}" href="index.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </span>
            <span>Home</span>
          </a>

          <a class="sidebar-nav-item ${isPage('bonus-codes.html') ? 'active' : ''}" href="bonus-codes.html">
            <span class="sidebar-item-icon">✦</span><span>Bonus Kodları</span><span class="sidebar-item-badge">YENİ</span>
          </a>

          <a class="sidebar-nav-item ${isPage('cekilisler.html') ? 'active' : ''}" href="cekilisler.html">
            <span class="sidebar-item-icon">🎁</span><span>Çekilişler</span>
          </a>

          <a class="sidebar-nav-item ${isPage('liderlik-tablosu.html') ? 'active' : ''}" href="liderlik-tablosu.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.8-.46 3.19-1.92 3.61-3.96C19.08 11.63 21 9.55 21 7V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
            </span>
            <span>Liderlik Tablosu</span>
            <span class="sidebar-item-badge">CANLI</span>
          </a>

          <a class="sidebar-nav-item ${isPage('kampanyalar.html') ? 'active' : ''}" href="kampanyalar.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.1-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76V8h2v.76L15.38 12 17 10.83 14.92 8H20v6z"/></svg>
            </span>
            <span>Kampanyalar</span>
          </a>

          <a class="sidebar-nav-item ${isPage('sikca-sorulan-sorular.html') ? 'active' : ''}" href="sikca-sorulan-sorular.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
            </span>
            <span>Sıkça Sorulan Sorular</span>
          </a>

          <a class="sidebar-nav-item ${isPage('stake.html') ? 'active' : ''}" href="stake.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2L1 9l11 13 11-13-11-7zm0 3.84L18.48 9 12 17.52 5.52 9 12 5.84z"/></svg>
            </span>
            <span>Stake</span>
          </a>

          <a class="sidebar-nav-item ${isPage('hesap.html') ? 'active' : ''}" href="hesap.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </span>
            <span>Hesap</span>
            <span class="sidebar-item-badge" style="background:rgba(255,255,255,0.06);color:#c6ced3;border-color:rgba(255,255,255,0.1)">PORTAL</span>
          </a>
        </div>

        <div class="sidebar-nav-group">
          <span class="sidebar-group-title">DESTEK &amp; BOT</span>

          <a class="sidebar-nav-item ${isPage('iletisim.html') ? 'active' : ''}" href="iletisim.html">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
            </span>
            <span>İletişim &amp; Destek</span>
          </a>

          <a class="sidebar-nav-item" data-telegram-bot href="#" target="_blank" rel="noopener noreferrer">
            <span class="sidebar-item-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z"/></svg>
            </span>
            <span>Telegram Botumuz</span>
            <span class="sidebar-item-badge">7/24</span>
          </a>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-quick-code" id="sidebarCopyCode" role="button" tabindex="0" title="Kodu kopyalamak için tıkla">
          <div>
            <small>REFERANS KODU</small>
            <strong data-offer-code>${esc(CONTENT.welcomeOffer?.code || 'KIBRIS')}</strong>
          </div>
          <span class="sidebar-quick-copy-badge" id="sidebarCopyBadge">Kopyala ⧉</span>
        </div>
        <a class="btn btn-primary btn-full" data-referral href="#" target="_blank" rel="noopener noreferrer sponsored">
          Stake'e Kayıt Ol ↗
        </a>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    // Sidebar code copy event
    const copyWrap = sidebar.querySelector('#sidebarCopyCode');
    if (copyWrap) {
      copyWrap.addEventListener('click', async () => {
        const code = window.getContent()?.welcomeOffer?.code || 'KIBRIS';
        const ok = await copyText(code);
        const badge = sidebar.querySelector('#sidebarCopyBadge');
        if (badge) {
          badge.textContent = ok ? 'Kopyalandı ✓' : 'Kopyalanamadı';
          setTimeout(() => { badge.textContent = 'Kopyala ⧉'; }, 1800);
        }
      });
    }
  }

  // 3. Open / Close Event Listeners
  function openSidebar() {
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  // Bind all hamburger buttons & menu buttons
  if (!window._sidebarEventsBound) {
    window._sidebarEventsBound = true;

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('#sidebarToggleBtn, .hamburger-btn, #menuBtn, .menu');
      if (trigger) {
        e.preventDefault();
        openSidebar();
        return;
      }

      const closeBtn = e.target.closest('#sidebarCloseBtn, #sidebarOverlay');
      if (closeBtn) {
        e.preventDefault();
        closeSidebar();
        return;
      }

      // Close on navigation link click inside sidebar
      const navLink = e.target.closest('.sidebar-nav-item');
      if (navLink && !navLink.target) {
        closeSidebar();
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
        closeSidebar();
      }
    });
  }
}

/* ── Floating Social Buttons ── */
function initSocialFloat() {
  if (document.getElementById('socialFloat')) return; // already injected

  const wa  = normalizeExternalUrl(CONTENT.site?.whatsappUrl);
  const tg  = normalizeExternalUrl(CONTENT.site?.telegramUrl);

  const el = document.createElement('div');
  el.id = 'socialFloat';
  el.className = 'social-float';
  el.innerHTML = `
    <a class="social-btn telegram" href="${tg}" target="_blank" rel="noopener noreferrer" aria-label="Telegram ile iletişime geç">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
      <span>Telegram</span>
    </a>
    <a class="social-btn whatsapp" href="${wa}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ile iletişime geç">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
      </svg>
      <span>WhatsApp</span>
    </a>
  `;
  document.body.appendChild(el);
}

/* ── Utilities ── */
function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[c]));
}
window.esc = esc;
window.getContent = () => CONTENT;
window.normalizeExternalUrl = normalizeExternalUrl;

/* ── Clipboard Helper ── */
async function copyText(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
window.copyText = copyText;

/* ── Scroll Reveal ── */
function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('show'));

  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('show');
        io.unobserve(e.target);
      }
    }),
    { threshold: 0.08, rootMargin: '0px 0px -60px 0px' }
  );

  els.forEach(e => io.observe(e));
}

/* ── Countdown Timer ── */
function startCountdown(target, mount = document) {
  const d = mount.querySelector('[data-days]');
  const h = mount.querySelector('[data-hours]');
  const m = mount.querySelector('[data-mins]');
  const s = mount.querySelector('[data-secs]');
  if (!d) return;

  const tick = () => {
    let ms = Math.max(0, new Date(target).getTime() - Date.now());
    const days = Math.floor(ms / 86400000); ms %= 86400000;
    const hrs  = Math.floor(ms / 3600000);  ms %= 3600000;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    d.textContent = String(days).padStart(2, '0');
    h.textContent = String(hrs).padStart(2, '0');
    m.textContent = String(mins).padStart(2, '0');
    s.textContent = String(secs).padStart(2, '0');
  };

  tick();
  setInterval(tick, 1000);
}
window.startCountdown = startCountdown;

/* ── Init ── */
initReveal();
loadContent();


/* ===== V5: site-wide premium navigation + footer ===== */
window.addEventListener('content-ready', (event) => {
  const c = event.detail || window.getContent?.() || {};
  const site = c.site || {};
  document.querySelectorAll('a.brand').forEach(el => {
    el.className = 'v2-logo';
    el.href = 'index.html';
    el.innerHTML = '<strong>STAKE</strong><small>TÜRKİYE 🇹🇷</small>';
  });
  document.querySelectorAll('header.topbar .topbar-inner').forEach(inner => {
    if (inner.querySelector('.inner-premium-nav')) return;
    const actions = inner.querySelector('.actions'); if (!actions) return;
    const nav = document.createElement('nav'); nav.className='inner-premium-nav'; nav.setAttribute('aria-label','Ana menü');
    const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const links=[['index.html','Ana Sayfa'],['bonus-codes.html','Bonus Kodları'],['liderlik-tablosu.html','Canlı Sıralama'],['kampanyalar.html','Kampanyalar'],['cekilisler.html','Çekilişler'],['iletisim.html','Destek']];
    nav.innerHTML=links.map(([href,label])=>`<a class="${path===href?'active':''}" href="${href}">${label}</a>`).join('')+`<a data-telegram-bot href="${esc(normalizeExternalUrl(site.telegramBotUrl||'#'))}" target="_blank" rel="noopener noreferrer">Telegram Bot ↗</a>`;
    inner.insertBefore(nav,actions);
  });
  document.querySelectorAll('footer.footer').forEach(footer=>{
    if(footer.dataset.v5Footer==='1')return; footer.dataset.v5Footer='1'; footer.classList.add('site-footer-v5');
    const tg=esc(normalizeExternalUrl(site.telegramUrl||'#')),bot=esc(normalizeExternalUrl(site.telegramBotUrl||'#')),wa=esc(normalizeExternalUrl(site.whatsappUrl||'#'));
    footer.innerHTML=`
      <div class="footer-v5-brand-bar">
        <a class="v2-logo" href="index.html"><strong>STAKE</strong><small>TÜRKİYE 🇹🇷</small></a>
        <p>${esc(site.affiliateNote||'Bağımsız tanıtım ve affiliate sayfasıdır. Stake resmi web sitesi değildir.')}</p>
      </div>
      <div class="footer-v5-grid">
        <div class="footer-v5-col"><h3>Casino</h3><a href="kampanyalar.html">Casino Fırsatları</a><a href="kampanyalar.html">Slot Kampanyaları</a><a href="kampanyalar.html">Canlı Casino</a><a href="bonus-codes.html">Bonus Kodları</a><a href="cekilisler.html">Promosyonlar &amp; Çekilişler</a></div>
        <div class="footer-v5-col"><h3>Spor</h3><a href="kampanyalar.html">Spor Bahisleri</a><a href="kampanyalar.html">Canlı Spor</a><a href="kampanyalar.html">Futbol</a><a href="kampanyalar.html">Basketbol</a><a href="liderlik-tablosu.html">Canlı Sıralama</a></div>
        <div class="footer-v5-col"><h3>Destek &amp; Bot</h3><a href="${bot}" target="_blank" rel="noopener noreferrer">Telegram Botu 🤖</a><a href="${tg}" target="_blank" rel="noopener noreferrer">Telegram Kanalı ↗</a><a href="${wa}" target="_blank" rel="noopener noreferrer">WhatsApp Destek ↗</a><a href="sikca-sorulan-sorular.html">Sık Sorulan Sorular</a><a href="iletisim.html">İletişim Kanalları</a></div>
        <div class="footer-v5-col"><h3>Hakkımızda</h3><a href="stake.html">Stake Hakkında</a><a href="hesap.html">Portal Hesabı</a><a href="cekilisler.html">Aktif Çekilişler</a><a href="kampanyalar.html">Kampanyalar</a><a href="iletisim.html">İletişim</a></div>
        <div class="footer-v5-col"><h3>Bilgiler</h3><a href="bonus-codes.html">Güncel Kodlar</a><a href="liderlik-tablosu.html">Wager &amp; Ödüller</a><a href="sikca-sorulan-sorular.html">Kılavuzlar</a><a href="sikca-sorulan-sorular.html">Kampanya Koşulları</a><a href="sikca-sorulan-sorular.html">Sorumlu Oyun</a></div>
      </div>
      <div class="footer-v5-social">
        <a href="${bot}" target="_blank" rel="noopener noreferrer">🤖 Telegram Bot</a>
        <a href="${tg}" target="_blank" rel="noopener noreferrer">✈ Telegram Kanalı</a>
        <a href="${wa}" target="_blank" rel="noopener noreferrer">◉ WhatsApp Destek</a>
        <a href="iletisim.html">🎧 İletişim &amp; Destek</a>
      </div>
      <div class="footer-v5-bottom">
        <div><b>18+</b> Yasal yaş sınırının üzerindeki kullanıcılar içindir. Sorumlu oyun ilkelerini gözetin.</div>
        <div>© ${new Date().getFullYear()} ${esc(site.name||'Stake Türkiye')} · Tüm Hakları Saklıdır.</div>
      </div>`;
  });
});
