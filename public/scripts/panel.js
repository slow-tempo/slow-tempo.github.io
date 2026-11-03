/*
 * ============================================================
 * Shared panel controller — post TOC and main sidebar, one source.
 *
 * Rules (BLOG_POSTING_LOG §6-4, post page is the baseline):
 *   LARGE  (>=1200): open 280 / closed 32, in-flow, sticky (CSS class).
 *   MEDIUM (1100-1199): open width comes from getOpenWidth('medium'),
 *     closed 32. Post passes its medium formula (min 180, max 280);
 *     main passes 280 (its list is fluid, so no shrink is needed).
 *   SMALL  (<1100): fixed 2rem strip at the right edge (top 5rem,
 *     bottom 1rem, height calc(100vh - 6rem), z 60); handle opens a
 *     280 overlay (right 1rem, width min(280, innerWidth - 16)),
 *     ESC or overlay click closes it back to the strip.
 *   Resize re-applies the mode (debounced 50ms); LARGE forces open.
 *   Handle click only toggles within the current mode.
 *
 * The controller owns geometry, overlay, and mode only. Page-specific
 * work (post slot width, heading height, main icon text) stays in the
 * page's onStateChange / afterOpen / afterClose callbacks.
 * ============================================================
 */
(function () {
  function getScreenMode() {
    var width = window.innerWidth;
    if (width >= 1200) return 'large';
    if (width >= 1100) return 'medium';
    return 'small';
  }

  // Post medium formula: available = innerWidth - padding - mainWidth - gap,
  // clamped to [180, 280]. mainWidth is the fixed article width (820).
  function getMediumPanelWidth(mainWidth) {
    var pagePadding = window.innerWidth >= 640 ? 48 : 32;
    var gap = 16;
    var available = window.innerWidth - pagePadding - mainWidth - gap;
    return Math.max(180, Math.min(280, available));
  }

  function createPanelController(opts) {
    var panel = opts.panel;
    var handle = opts.handle;
    var content = opts.content;
    var overlay = opts.overlay;
    var iconEl = opts.iconEl || null;
    var getOpenWidth = opts.getOpenWidth || function () { return 280; };
    var onStateChange = opts.onStateChange || null;
    var afterOpen = opts.afterOpen || null;
    var afterClose = opts.afterClose || null;
    var afterMode = opts.afterMode || null;
    var bind = opts.bind !== false;

    var isOpen = true;
    var isOverlay = false;
    var resizeTimer = null;

    function emitState() {
      if (onStateChange) onStateChange(isOpen, isOverlay, getScreenMode());
      if (iconEl) iconEl.innerText = isOpen ? '‹' : '›';
    }

    function setContent(open) {
      if (!content) return;
      content.style.opacity = open ? '1' : '0';
      content.style.pointerEvents = open ? 'auto' : 'none';
    }

    function showOverlay() {
      if (!overlay) return;
      overlay.classList.remove('opacity-0', 'pointer-events-none');
      overlay.classList.add('opacity-100', 'pointer-events-auto');
      document.body.style.overflow = 'hidden';
    }

    function hideOverlay() {
      if (!overlay) return;
      overlay.classList.remove('opacity-100', 'pointer-events-auto');
      overlay.classList.add('opacity-0', 'pointer-events-none');
      document.body.style.overflow = '';
    }

    function restoreNormal() {
      if (!panel) return;
      panel.style.position = '';
      panel.style.top = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.height = '';
      panel.style.maxHeight = '';
      panel.style.zIndex = '';
    }

    function setWidth(px) {
      if (!panel) return;
      panel.style.width = px + 'px';
      panel.style.maxWidth = px + 'px';
    }

    function openNormal() {
      if (!panel) return;
      isOpen = true; isOverlay = false;
      hideOverlay(); restoreNormal();
      setWidth(280); setContent(true); emitState();
      if (afterOpen) afterOpen('large');
    }

    function closeNormal() {
      if (!panel) return;
      isOpen = false; isOverlay = false;
      hideOverlay(); restoreNormal();
      setWidth(32); setContent(false); emitState();
      if (afterClose) afterClose('large');
    }

    function openMedium() {
      if (!panel) return;
      var w = getOpenWidth('medium');
      isOpen = true; isOverlay = false;
      hideOverlay(); restoreNormal();
      setWidth(w); setContent(true); emitState();
      if (afterOpen) afterOpen('medium');
    }

    function closeMedium() {
      if (!panel) return;
      isOpen = false; isOverlay = false;
      hideOverlay(); restoreNormal();
      setWidth(32); setContent(false); emitState();
      if (afterClose) afterClose('medium');
    }

    function openOverlay() {
      if (!panel) return;
      isOverlay = true; isOpen = true;
      var w = Math.min(280, Math.max(32, window.innerWidth - 16));
      panel.style.position = 'fixed';
      panel.style.top = '5rem';
      panel.style.right = '1rem';
      panel.style.bottom = '1rem';
      panel.style.height = 'calc(100vh - 6rem)';
      panel.style.maxHeight = 'calc(100vh - 6rem)';
      setWidth(w);
      panel.style.zIndex = '60';
      setContent(true); showOverlay(); emitState();
      if (afterOpen) afterOpen('small');
    }

    function closeOverlay() {
      if (!panel) return;
      isOverlay = false; isOpen = false;
      panel.style.position = 'fixed';
      panel.style.top = '5rem';
      panel.style.right = '0';
      panel.style.bottom = '1rem';
      panel.style.height = 'calc(100vh - 6rem)';
      panel.style.maxHeight = 'calc(100vh - 6rem)';
      setWidth(32);
      panel.style.zIndex = '60';
      setContent(false); hideOverlay(); emitState();
      if (afterClose) afterClose('small');
    }

    function updateResponsive() {
      var mode = getScreenMode();
      if (mode === 'large') {
        openNormal();
      } else if (mode === 'medium') {
        if (isOpen) openMedium(); else closeMedium();
      } else {
        closeOverlay();
      }
      if (afterMode) afterMode(mode);
      return mode;
    }

    function handleClick(event) {
      if (event) event.stopPropagation();
      var mode = getScreenMode();
      if (mode === 'small') {
        if (isOverlay) closeOverlay(); else openOverlay();
        return;
      }
      if (mode === 'medium') {
        if (isOpen) closeMedium(); else openMedium();
        return;
      }
      if (isOpen) closeNormal(); else openNormal();
    }

    if (bind) {
      if (handle) handle.addEventListener('click', handleClick);
      if (overlay) overlay.addEventListener('click', function () {
        if (getScreenMode() === 'small') closeOverlay();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && isOverlay) closeOverlay();
      });
      window.addEventListener('resize', function () {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateResponsive, 50);
      });
    }

    return {
      get isOpen() { return isOpen; },
      get isOverlay() { return isOverlay; },
      getScreenMode: getScreenMode,
      openNormal: openNormal,
      closeNormal: closeNormal,
      openMedium: openMedium,
      closeMedium: closeMedium,
      openOverlay: openOverlay,
      closeOverlay: closeOverlay,
      updateResponsive: updateResponsive,
      handleClick: handleClick,
      setContent: setContent,
      showOverlay: showOverlay,
      hideOverlay: hideOverlay,
      restoreNormal: restoreNormal,
      setWidth: setWidth,
      setOpen: function (v) { isOpen = !!v; },
      setOverlay: function (v) { isOverlay = !!v; }
    };
  }

  window.PanelCommon = {
    getScreenMode: getScreenMode,
    getMediumPanelWidth: getMediumPanelWidth,
    createPanelController: createPanelController
  };
})();
