import { useEffect } from 'react';
import { InlineError } from '../dashboardUi';
import { Icon, IconWell } from '../ui/Icon';

/**
 * "Anlık bildirimler" prompt for parents. It can always be closed: X button, "Şimdi değil",
 * a tap outside the card or Escape — even while the browser permission request is pending.
 */
export default function PushPromptDialog({ subscribing, error, onEnable, onDismiss }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="notify-prompt-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div className="notify-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="notify-prompt-title">
        <button type="button" className="notify-prompt-close" onClick={onDismiss} aria-label="Kapat">
          <Icon name="x" size={16} />
        </button>
        <IconWell name="bell" variant="lavender" />
        <h2 id="notify-prompt-title" className="notify-prompt-modal__title">
          Anlık bildirimler
        </h2>
        <p className="notify-prompt-text">
          Okuldan gelen güncellemeleri telefonunuza anında almak için bildirimleri açın.
        </p>
        <button type="button" className="notify-prompt-btn" onClick={onEnable} disabled={subscribing}>
          {subscribing ? 'Açılıyor…' : 'Anlık Bildirimleri Aç'}
        </button>
        <button type="button" className="notify-prompt-later" onClick={onDismiss}>
          Şimdi değil
        </button>
        {error ? <InlineError error={error} context="subscribe" /> : null}
      </div>
    </div>
  );
}
