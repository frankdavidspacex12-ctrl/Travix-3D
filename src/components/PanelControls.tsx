import React from 'react';
import { ChevronDown, ChevronUp, Minus, X } from 'lucide-react';
import { tr } from '../i18n';

/** Shared icon-button look for panel headers (bigger touch target on phones). */
export const PANEL_ICON_BUTTON =
  'inline-flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md text-slate-300 hover:text-white hover:bg-white/12 transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400';

interface PanelControlsProps {
  /** Panel name used in the accessible labels, e.g. "guía NASA" */
  label: string;
  minimized: boolean;
  onToggleMinimize: () => void;
  /** Omit to show only the minimize button */
  onClose?: () => void;
  closeTitle?: string;
  /**
   * Where the panel grows when restored: 'down' for top panels, 'up' for bottom ones,
   * 'responsive' for panels that are a bottom sheet on phones and a top card from `sm` up.
   */
  expandDirection?: 'down' | 'up' | 'responsive';
}

/**
 * Minimize / restore + close buttons used by every popup and small menu, so they all behave the
 * same: minimize keeps the panel (and its state) as a slim header bar; close removes it.
 */
export const PanelControls: React.FC<PanelControlsProps> = ({
  label,
  minimized,
  onToggleMinimize,
  onClose,
  closeTitle,
  expandDirection = 'down',
}) => {
  let expandIcon: React.ReactNode;
  if (expandDirection === 'up') {
    expandIcon = <ChevronUp className="w-4 h-4" />;
  } else if (expandDirection === 'responsive') {
    expandIcon = (
      <>
        <ChevronUp className="w-4 h-4 sm:hidden" />
        <ChevronDown className="w-4 h-4 hidden sm:block" />
      </>
    );
  } else {
    expandIcon = <ChevronDown className="w-4 h-4" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggleMinimize}
        aria-expanded={!minimized}
        aria-label={minimized ? `${tr('Expandir', 'Expand')} ${label}` : `${tr('Minimizar', 'Minimize')} ${label}`}
        title={minimized ? tr('Expandir', 'Expand') : tr('Minimizar', 'Minimize')}
        className={PANEL_ICON_BUTTON}
      >
        {minimized ? expandIcon : <Minus className="w-4 h-4" />}
      </button>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeTitle ?? `${tr('Cerrar', 'Close')} ${label}`}
          title={closeTitle ?? tr('Cerrar', 'Close')}
          className={PANEL_ICON_BUTTON}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </>
  );
};
