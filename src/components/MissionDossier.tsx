import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Camera,
  ExternalLink,
  Eye,
  HardDrive,
  Minus,
  Moon,
  Orbit,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { formatCoordinates } from '../astronomy/ephemeris';
import { AbandonedMission } from '../data/abandonedMissionsData';
import { getLeftBehindNote } from '../data/leftBehindNotes';
import {
  OfflineNasaPhoto,
  getOfflineNasaPhotos,
} from '../data/offlineNasaArchive';
import { DeepSpaceTarget } from '../data/solarSystemData';
import type { SurfaceCameraMode } from '../three/surfaceDiorama';
import type { SearchTab } from './MissionSearch';
import { PANEL_ICON_BUTTON, PanelControls } from './PanelControls';
import { useViewInset } from '../ui/viewInsets';

interface MissionDossierProps {
  mission?: AbandonedMission | null;
  deepSpaceTarget?: DeepSpaceTarget | null;
  searchContext?: { headline: string; answer: string } | null;
  isSunlit: boolean | null;
  isSurfaceActive: boolean;
  surfaceViewMode: SurfaceCameraMode;
  onChangeSurfaceView: (mode: SurfaceCameraMode) => void;
  onViewMilkyWay: () => void;
  onExitToOrbit: () => void;
  onOpenSearch?: (tab?: SearchTab) => void;
  onClose: () => void;
  /** Phones with the guide card open: the guide already narrates, so start as a slim bar */
  startMinimized?: boolean;
}

export const MissionDossier: React.FC<MissionDossierProps> = ({
  mission,
  deepSpaceTarget,
  searchContext,
  isSunlit,
  isSurfaceActive,
  surfaceViewMode,
  onChangeSurfaceView,
  onViewMilkyWay,
  onExitToOrbit,
  onOpenSearch,
  onClose,
  startMinimized = false,
}) => {
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  /** Gallery kept alive (open photo included) but hidden; restored from the dossier */
  const [isGalleryMinimized, setIsGalleryMinimized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<OfflineNasaPhoto | null>(
    null,
  );
  const asideRef = useRef<HTMLElement | null>(null);
  const startMinimizedRef = useRef(startMinimized);
  startMinimizedRef.current = startMinimized;
  // The guide card opening (phones) makes room by folding the dossier into its header bar.
  useEffect(() => {
    if (startMinimized) setIsMinimized(true);
  }, [startMinimized]);
  const hasTarget = Boolean(mission || deepSpaceTarget);
  // Phones: the dossier is a bottom sheet, so the 3D view keeps the target above it.
  useViewInset('mission-dossier', asideRef, 'bottom', hasTarget);

  const activeKey = mission?.id ?? deepSpaceTarget?.id ?? '';
  const activeName = mission?.name ?? deepSpaceTarget?.name ?? '';
  const leftBehindNote = mission ? getLeftBehindNote(mission.id) : undefined;
  // En la galería, una frase que no es transmisión literal se marca como interpretación.
  const activeQuote = mission
    ? leftBehindNote?.farewellNote
      ? `${mission.farewellMessage} (frase atribuida, no transmitida)`
      : mission.farewellMessage
    : deepSpaceTarget?.classification ?? '';

  useEffect(() => {
    setShowGalleryModal(false);
    setIsGalleryMinimized(false);
    setIsMinimized(startMinimizedRef.current);
    setLightboxPhoto(null);
  }, [activeKey]);

  const openGallery = () => {
    setShowGalleryModal(true);
    setIsGalleryMinimized(false);
  };

  const closeGallery = () => {
    setShowGalleryModal(false);
    setIsGalleryMinimized(false);
    setLightboxPhoto(null);
  };

  const galleryParked = showGalleryModal && isGalleryMinimized;

  const photos = useMemo(() => {
    if (!showGalleryModal || !activeKey) return [];
    return getOfflineNasaPhotos(activeKey, activeName);
  }, [showGalleryModal, activeKey, activeName]);

  if (!mission && !deepSpaceTarget) return null;

  const preferredSearchTab: SearchTab = mission
    ? mission.missionRole === 'orbital'
      ? 'orbitals'
      : 'surface'
    : 'galaxy';

  return (
    <>
      {/* Compact Left-Side Historical / Astrophysical Text Card */}
      <aside
        ref={asideRef}
        aria-label={`Información de ${activeName}`}
        className="travix-mobile-sheet fixed top-14 left-4 z-20 w-[min(320px,86vw)] max-h-[calc(100dvh-145px)] rounded-xl travix-glass-panel flex flex-col overflow-hidden"
      >
        <div
          className={`px-3.5 py-2 flex items-center justify-between gap-2 ${
            isMinimized ? '' : 'border-b border-white/12'
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-100">
              <span className="break-words min-w-0">
                {mission ? mission.destinationLabel : deepSpaceTarget?.distanceLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-amber-300 shrink-0">
                {mission
                  ? `Lanzado en ${mission.launchYear}`
                  : deepSpaceTarget?.discoveryYear}
              </span>
            </div>
            <h2 className="mt-0.5 font-display text-sm font-semibold text-white tracking-tight break-words">
              {activeName}
            </h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {galleryParked && (
              <button
                type="button"
                onClick={openGallery}
                aria-label="Volver a las fotos NASA"
                title="Volver a las fotos NASA"
                className={`${PANEL_ICON_BUTTON} travix-glass-control text-amber-300`}
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            {onOpenSearch && (
              <button
                type="button"
                onClick={() => onOpenSearch(preferredSearchTab)}
                aria-label="Buscar misiones, planetas o galaxia"
                title="Buscar otro destino o misión"
                className={`${PANEL_ICON_BUTTON} travix-glass-control text-amber-300 hover:text-amber-200`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            )}
            <PanelControls
              label={`ficha de ${activeName}`}
              minimized={isMinimized}
              onToggleMinimize={() => setIsMinimized((prev) => !prev)}
              onClose={onClose}
              closeTitle="Cerrar ficha (seguir viendo en 3D)"
              expandDirection="responsive"
            />
          </div>
        </div>

        {!isMinimized && (
        <div className="p-3.5 overflow-y-auto min-h-0 space-y-2.5 text-xs">
          {searchContext && (
            <div className="p-2.5 rounded-lg travix-glass-subcard border-amber-400/35">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                Respuesta · {searchContext.headline}
              </div>
              <p className="mt-0.5 text-xs text-slate-100 leading-relaxed">
                {searchContext.answer}
              </p>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-amber-300/95">
              {mission ? 'Qué misiones hizo' : 'Qué es y estructura'}
            </div>
            <p className="mt-0.5 text-slate-100 leading-relaxed">
              {mission ? mission.whatItDid : deepSpaceTarget?.whatItIs}
            </p>
          </div>

          <div>
            <div className="text-xs font-medium text-amber-300/95">
              Por qué es tan importante
            </div>
            <p className="mt-0.5 text-slate-100 leading-relaxed">
              {mission ? mission.whyImportant : deepSpaceTarget?.whyImportant}
            </p>
          </div>

          {mission && (
            <div>
              <div className="text-xs font-medium text-amber-300/95">
                Estado hoy
              </div>
              <p className="mt-0.5 text-slate-100 leading-relaxed">
                {mission.status}
              </p>
            </div>
          )}

          {leftBehindNote && (
            <div>
              <div className="text-xs font-medium text-amber-300/95">
                {mission?.id === 'perseverance'
                  ? 'Qué pasó con Ingenuity'
                  : 'Por qué se quedó allí'}
              </div>
              <p className="mt-0.5 text-slate-100 leading-relaxed">
                {leftBehindNote.leftBehind}
              </p>
            </div>
          )}

          {mission?.farewellMessage && (
            <div className="p-2.5 rounded-lg travix-glass-subcard">
              <div className="text-xs font-medium text-amber-300/95">
                {leftBehindNote?.farewellNote ? 'Frase que se le atribuye' : 'Su historia en una frase'}
              </div>
              <p className="mt-0.5 text-slate-100 leading-relaxed italic">
                {mission.farewellMessage}
              </p>
              {leftBehindNote?.farewellNote && (
                <p className="mt-1 text-[11px] text-amber-100/90 leading-relaxed">
                  ⚠ {leftBehindNote.farewellNote}
                </p>
              )}
            </div>
          )}

          {leftBehindNote && leftBehindNote.sources.length > 0 && (
            <div>
              <div className="text-xs font-medium text-amber-300/95">
                Fuentes NASA <span className="text-slate-200 font-normal">(requieren internet)</span>
              </div>
              <ul className="mt-0.5 space-y-0.5">
                {leftBehindNote.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span>{source.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {deepSpaceTarget && (
            <div className="pt-2 border-t border-white/12 space-y-1 text-xs">
              <div className="font-mono-tabular text-slate-200">
                {deepSpaceTarget.physicalScaleLabel}
              </div>
              <div className="text-slate-200">
                Observatorios: {deepSpaceTarget.nasaObservatories}
              </div>
            </div>
          )}

          {mission && (
            <>
              <div className="pt-2 border-t border-white/12 flex items-center justify-between gap-2 text-xs text-slate-200">
                <span className="font-mono-tabular break-words min-w-0">
                  {mission.launchDate} — {mission.lastContactDate}
                </span>
                {isSunlit !== null && mission.missionRole === 'surface' && (
                  <span className="inline-flex items-center gap-1 text-slate-200 shrink-0">
                    {isSunlit ? (
                      <>
                        <Sun className="w-3 h-3 text-amber-400" />
                        <span>Día</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3 h-3 text-slate-300" />
                        <span>Noche</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="font-mono-tabular text-[11px] text-slate-200">
                {mission.missionRole === 'surface'
                  ? `${mission.region} · ${formatCoordinates(mission.latDeg, mission.lonDeg)}`
                  : mission.region}
              </div>
            </>
          )}

          {/* Action Controls */}
          <div className="pt-2 border-t border-white/12 flex flex-col gap-1.5">
            {mission && isSurfaceActive && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeSurfaceView('rover')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    surfaceViewMode === 'rover'
                      ? 'bg-amber-500/24 border-amber-400/55 text-amber-100'
                      : 'travix-glass-control text-slate-200 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Modelo 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSurfaceView('pov')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    surfaceViewMode === 'pov'
                      ? 'bg-amber-500/24 border-amber-400/55 text-amber-100'
                      : 'travix-glass-control text-slate-200 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lo que ve</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={openGallery}
                className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 sm:py-1.5 rounded-lg travix-glass-control text-xs cursor-pointer ${
                  galleryParked ? 'border-amber-400/55 text-amber-100' : 'text-slate-100'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>{galleryParked ? 'Volver a fotos' : 'Fotos NASA'}</span>
              </button>
              <button
                type="button"
                onClick={onExitToOrbit}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg travix-glass-control text-xs text-slate-100 cursor-pointer"
              >
                <Orbit className="w-3.5 h-3.5 text-cyan-400" />
                <span>{mission ? 'Ver planeta' : 'Sistema'}</span>
              </button>
            </div>

            {deepSpaceTarget && deepSpaceTarget.id !== 'milkyway' && (
              <button
                type="button"
                onClick={onViewMilkyWay}
                className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg travix-glass-control text-xs text-slate-100 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Mapa Vía Láctea</span>
              </button>
            )}
          </div>
        </div>
        )}
      </aside>

      {/* 100% Offline NASA Archival Photo Gallery Modal */}
      {showGalleryModal && !isGalleryMinimized && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Archivo fotográfico NASA de ${activeName}`}
          onClick={closeGallery}
          className="fixed inset-0 z-40 bg-black/72 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[min(700px,96vw)] max-h-[92dvh] sm:max-h-[88dvh] rounded-xl travix-glass-panel overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-white/12 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="font-display text-sm font-semibold text-white break-words min-w-0">
                    Archivo Fotográfico NASA · {activeName}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/18 border border-emerald-400/35 text-[11px] font-medium text-emerald-200 shrink-0">
                    <HardDrive className="w-2.5 h-2.5" />
                    <span>Sin internet</span>
                  </span>
                </div>
                <div className="text-xs text-slate-200 break-words">
                  {activeQuote}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsGalleryMinimized(true);
                    setIsMinimized(false);
                  }}
                  aria-label="Minimizar galería (se guarda en la ficha)"
                  title="Minimizar (vuelve desde la ficha)"
                  className={PANEL_ICON_BUTTON}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={closeGallery}
                  aria-label="Cerrar galería"
                  title="Cerrar"
                  className={PANEL_ICON_BUTTON}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto">
              {lightboxPhoto ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setLightboxPhoto(null)}
                      className="px-2.5 py-1 rounded bg-white/8 hover:bg-white/14 text-xs text-slate-200 cursor-pointer"
                    >
                      Volver a galería
                    </button>
                    <div className="text-xs font-mono-tabular text-amber-300/90">
                      {lightboxPhoto.nasaId} · {lightboxPhoto.instrument} ·{' '}
                      {lightboxPhoto.dateCreated}
                    </div>
                  </div>
                  <div className="bg-black rounded-lg border border-white/10 flex items-center justify-center max-h-[50dvh] sm:max-h-[54vh] overflow-hidden">
                    <img
                      src={lightboxPhoto.url}
                      alt={lightboxPhoto.title}
                      className="max-w-full max-h-[50dvh] sm:max-h-[54vh] object-contain"
                    />
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {lightboxPhoto.title}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lightboxPhoto.description}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <button
                      key={photo.nasaId}
                      type="button"
                      onClick={() => setLightboxPhoto(photo)}
                      className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-white/12 bg-black hover:border-amber-400/55 transition-colors cursor-pointer text-left"
                    >
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/92 via-black/60 to-transparent">
                        <div className="text-[11px] font-mono-tabular text-amber-300">
                          {photo.nasaId} · {photo.instrument}
                        </div>
                        <div className="text-xs text-slate-100 line-clamp-2 font-medium" title={photo.title}>
                          {photo.title}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
