import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'onboarding_tour_completed';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'upload',
    title: 'Drop your documents here',
    description: "We'll read your documents and pull out every deadline, obligation, and action item automatically.",
    placement: 'bottom',
  },
  {
    target: 'timeline',
    title: 'Your Life Timeline',
    description: 'We organise everything by urgency so you always know what needs attention first.',
    placement: 'top',
  },
  {
    target: 'calendar',
    title: 'Calendar View',
    description: "We lay out your deadlines on a calendar so you can see what's coming up at a glance.",
    placement: 'bottom',
  },
  {
    target: 'vault',
    title: 'Document Vault',
    description: 'We keep all your uploaded documents safe and searchable in one place.',
    placement: 'bottom',
  },
  {
    target: 'nudges',
    title: 'Smart Nudges',
    description: "We'll gently remind you when something needs your attention — no nagging, just helpful nudges.",
    placement: 'left',
  },
];

export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = welcome dialog
  const [hasCompleted, setHasCompleted] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  // Auto-start for first-time users
  useEffect(() => {
    if (!hasCompleted) {
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStep(-1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hasCompleted]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(-1);
    setHasCompleted(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
    setIsActive(true);
    setCurrentStep(-1);
  }, []);

  return {
    isActive,
    currentStep,
    hasCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
    totalSteps: TOUR_STEPS.length,
  };
}
