import { useState, useCallback } from "react";
import type { Cue, Track } from "../types";

export function useModals() {
  const [isCueModalOpen, setIsCueModalOpen] = useState(false);
  const [editingCue, setEditingCue] = useState<Cue | null>(null);

  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

  const openCueModal = useCallback((cue?: Cue | null) => {
    setEditingCue(cue ?? null);
    setIsCueModalOpen(true);
  }, []);

  const closeCueModal = useCallback(() => {
    setIsCueModalOpen(false);
  }, []);

  const openTrackModal = useCallback((track?: Track | null) => {
    setEditingTrack(track ?? null);
    setIsTrackModalOpen(true);
  }, []);

  const closeTrackModal = useCallback(() => {
    setIsTrackModalOpen(false);
  }, []);

  const openMetadataModal = useCallback(() => {
    setIsMetadataModalOpen(true);
  }, []);

  const closeMetadataModal = useCallback(() => {
    setIsMetadataModalOpen(false);
  }, []);

  return {
    // Cue modal
    isCueModalOpen,
    editingCue,
    openCueModal,
    closeCueModal,

    // Track modal
    isTrackModalOpen,
    editingTrack,
    openTrackModal,
    closeTrackModal,

    // Metadata modal
    isMetadataModalOpen,
    openMetadataModal,
    closeMetadataModal,
  };
}
