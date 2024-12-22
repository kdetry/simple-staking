// src/app/hooks/useFeedbackModal.ts
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";

interface FeedbackModalState {
  type: "success" | "cancel" | null;
  isOpen: boolean;
}

export const useFeedbackModal = () => {
  // Modal state
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    type: null,
    isOpen: false,
  });

  // Local storage states for showing modals only once
  const [successFeedbackModalOpened, setSuccessFeedbackModalOpened] =
    useLocalStorage<boolean>("bbn-staking-successFeedbackModalOpened", false);
  const [cancelFeedbackModalOpened, setCancelFeedbackModalOpened] =
    useLocalStorage<boolean>("bbn-staking-cancelFeedbackModalOpened", false);

  const handleFeedbackModal = (type: "success" | "cancel") => {
    if (!feedbackModal.isOpen && feedbackModal.type !== type) {
      const isFeedbackModalOpened =
        type === "success"
          ? successFeedbackModalOpened
          : cancelFeedbackModalOpened;

      if (!isFeedbackModalOpened) {
        setFeedbackModal({ type, isOpen: true });
      }
    }
  };

  const handleCloseFeedbackModal = () => {
    if (feedbackModal.type === "success") {
      setSuccessFeedbackModalOpened(true);
    } else if (feedbackModal.type === "cancel") {
      setCancelFeedbackModalOpened(true);
    }
    setFeedbackModal({ type: null, isOpen: false });
  };

  return {
    feedbackModal,
    handleFeedbackModal,
    handleCloseFeedbackModal,
    successFeedbackModalOpened,
    cancelFeedbackModalOpened,
  };
};
