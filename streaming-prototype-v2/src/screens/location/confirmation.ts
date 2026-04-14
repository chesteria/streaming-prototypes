import { City } from '../../types/location';
import * as FocusController from '../../core/focus-controller';

export const renderConfirmation = (
  container: HTMLElement,
  city: City,
  onConfirm: () => void,
  onReject: () => void
) => {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full bg-v2-bg animate-in zoom-in duration-300">
      <div class="bg-v2-card-bg p-12 rounded-tile border border-v2-surface max-w-2xl text-center space-y-8 shadow-v2-card">
        <div class="space-y-4">
          <h2 class="text-v2-text-secondary uppercase tracking-widest text-sm font-bold">Location Detection</h2>
          <h1 class="text-5xl font-bold">Is this you?</h1>
          <p class="text-3xl text-v2-accent">${city.displayName}, ${city.state}</p>
        </div>

        <div class="flex space-x-4 justify-center" data-focus-zone="confirmation-buttons">
          <button 
            class="v2-button" 
            data-focusable="true" 
            data-focus-id="confirm-yes"
          >
            Yes, that's right
          </button>
          <button 
            class="v2-button" 
            data-focusable="true" 
            data-focus-id="confirm-no"
          >
            Pick a different location
          </button>
        </div>
      </div>
    </div>
  `;

  FocusController.registerZone('confirmation-buttons', {
    onSelect: (_, el) => {
      const id = el.getAttribute('data-focus-id');
      if (id === 'confirm-yes') onConfirm();
      if (id === 'confirm-no') onReject();
    }
  });

  FocusController.focusZone('confirmation-buttons');
};
