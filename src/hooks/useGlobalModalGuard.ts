import { useEffect } from 'react';

const MODAL_SELECTOR = [
  '[role="dialog"][aria-modal="true"]',
  '.fixed.inset-0:not([data-modal-scroll-lock="false"])',
].join(',');

const isVisibleModal = (element: Element) => {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  return element.getClientRects().length > 0;
};

export default function useGlobalModalGuard() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let frame = 0;

    const updateModalState = () => {
      frame = 0;
      const hasOpenModal = Array.from(document.querySelectorAll(MODAL_SELECTOR)).some(isVisibleModal);
      root.classList.toggle('system-modal-open', hasOpenModal);
      body.classList.toggle('system-modal-open', hasOpenModal);
    };

    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateModalState);
    };

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    });

    updateModalState();

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      root.classList.remove('system-modal-open');
      body.classList.remove('system-modal-open');
    };
  }, []);
}
