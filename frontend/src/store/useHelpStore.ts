import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HelpStore {
  // Tutorial state
  hasCompletedTutorial: boolean;
  showSpotlightTutorial: boolean;
  tutorialStep: number;

  // Help drawer state
  showHelpDrawer: boolean;
  helpDrawerSection: string | null;

  // Actions
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  toggleHelpDrawer: () => void;
  openHelpDrawer: (section?: string) => void;
  closeHelpDrawer: () => void;
  resetTutorial: () => void;
}

export const useHelpStore = create<HelpStore>()(
  persist(
    (set, get) => ({
      // Initial state
      hasCompletedTutorial: false,
      showSpotlightTutorial: false,
      tutorialStep: 0,
      showHelpDrawer: false,
      helpDrawerSection: null,

      // Tutorial actions
      startTutorial: () => set({ showSpotlightTutorial: true, tutorialStep: 0 }),

      nextStep: () => {
        const { tutorialStep } = get();
        set({ tutorialStep: tutorialStep + 1 });
      },

      prevStep: () => {
        const { tutorialStep } = get();
        if (tutorialStep > 0) {
          set({ tutorialStep: tutorialStep - 1 });
        }
      },

      completeTutorial: () =>
        set({
          showSpotlightTutorial: false,
          hasCompletedTutorial: true,
          tutorialStep: 0,
        }),

      skipTutorial: () =>
        set({
          showSpotlightTutorial: false,
          hasCompletedTutorial: true,
          tutorialStep: 0,
        }),

      resetTutorial: () =>
        set({
          hasCompletedTutorial: false,
          showSpotlightTutorial: false,
          tutorialStep: 0,
        }),

      // Help drawer actions
      toggleHelpDrawer: () =>
        set((state) => ({ showHelpDrawer: !state.showHelpDrawer })),

      openHelpDrawer: (section?: string) =>
        set({ showHelpDrawer: true, helpDrawerSection: section || null }),

      closeHelpDrawer: () =>
        set({ showHelpDrawer: false, helpDrawerSection: null }),
    }),
    {
      name: 'streamline-help-store',
      partialize: (state) => ({
        hasCompletedTutorial: state.hasCompletedTutorial,
      }),
    }
  )
);
