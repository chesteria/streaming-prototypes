/**
 * Tokens Preview - Dev-only screen for visual verification of design tokens.
 */

export const renderTokensPreview = (container: HTMLElement) => {
  container.innerHTML = `
    <div class="p-12 space-y-12 overflow-y-auto h-full pb-24">
      <header>
        <h1 class="text-4xl font-bold mb-2">Design Tokens Preview</h1>
        <p class="text-v2-text-secondary">Verifying Phase 1 port to Tailwind v3</p>
      </header>

      <section class="space-y-4">
        <h2 class="text-2xl font-semibold border-b border-v2-surface pb-2">Colors</h2>
        <div class="grid grid-cols-4 gap-4">
          <div class="space-y-2">
            <div class="h-20 bg-v2-bg border border-v2-surface rounded-tile"></div>
            <p class="text-xs">v2-bg (#0F1923)</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 bg-v2-card-bg border border-v2-surface rounded-tile"></div>
            <p class="text-xs">v2-card-bg (#1A2A3A)</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 bg-v2-surface rounded-tile"></div>
            <p class="text-xs">v2-surface (#2A3A4A)</p>
          </div>
          <div class="space-y-2">
            <div class="h-20 bg-v2-accent rounded-tile"></div>
            <p class="text-xs">v2-accent (CSS Var)</p>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl font-semibold border-b border-v2-surface pb-2">Typography (Roboto)</h2>
        <div class="space-y-6">
          <div>
            <p class="text-xs text-v2-text-tertiary mb-1">Text Primary / Font Bold</p>
            <p class="text-4xl font-bold">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div>
            <p class="text-xs text-v2-text-tertiary mb-1">Text Secondary / Font Normal</p>
            <p class="text-2xl text-v2-text-secondary">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <div>
            <p class="text-xs text-v2-text-tertiary mb-1">Text Tertiary / Small</p>
            <p class="text-sm text-v2-text-tertiary">The quick brown fox jumps over the lazy dog.</p>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl font-semibold border-b border-v2-surface pb-2">Components & Focus</h2>
        <div class="flex space-x-8 items-end">
          <div class="space-y-2">
            <p class="text-xs text-v2-text-tertiary">Default Button</p>
            <button class="v2-button">Button Label</button>
          </div>
          <div class="space-y-2">
            <p class="text-xs text-v2-text-tertiary">Focused Button (Simulated)</p>
            <button class="v2-button" data-focused="true">Focused Label</button>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-2xl font-semibold border-b border-v2-surface pb-2">Tile Sizes & Radius</h2>
        <div class="flex space-x-6">
          <div class="w-[180px] h-[270px] bg-v2-card-bg border border-v2-surface rounded-tile flex items-center justify-center text-xs">
            Portrait (180x270)
          </div>
          <div class="w-[440px] h-[250px] bg-v2-card-bg border border-v2-surface rounded-tile flex items-center justify-center text-xs">
            Landscape (440x250)
          </div>
        </div>
      </section>
    </div>
  `;
};
