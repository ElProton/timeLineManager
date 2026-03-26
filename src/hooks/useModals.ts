import { useState, useCallback } from "react";
import { Action, Actor } from "../types";

export function useModals() {
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);

  const [isActorModalOpen, setIsActorModalOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<Actor | null>(null);

  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

  const openActionModal = useCallback((action?: Action | null) => {
    setEditingAction(action ?? null);
    setIsActionModalOpen(true);
  }, []);

  const closeActionModal = useCallback(() => {
    setIsActionModalOpen(false);
  }, []);

  const openActorModal = useCallback((actor?: Actor | null) => {
    setEditingActor(actor ?? null);
    setIsActorModalOpen(true);
  }, []);

  const closeActorModal = useCallback(() => {
    setIsActorModalOpen(false);
  }, []);

  const openMetadataModal = useCallback(() => {
    setIsMetadataModalOpen(true);
  }, []);

  const closeMetadataModal = useCallback(() => {
    setIsMetadataModalOpen(false);
  }, []);

  return {
    // Action modal
    isActionModalOpen,
    editingAction,
    openActionModal,
    closeActionModal,

    // Actor modal
    isActorModalOpen,
    editingActor,
    openActorModal,
    closeActorModal,

    // Metadata modal
    isMetadataModalOpen,
    openMetadataModal,
    closeMetadataModal,
  };
}
