import { useEffect, useState, useCallback, useRef } from 'react';
import { TOUR_STEPS } from '@/hooks/useOnboardingTour';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnboardingTourProps {
  isActive: boolean;
  currentStep: number;
  onStart: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  totalSteps: number;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour({
  isActive,
  currentStep,
  onStart,
  onNext,
  onPrev,
  onSkip,
  totalSteps,
}: OnboardingTourProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const updatePosition = useCallback(() => {
    if (currentStep < 0 || currentStep >= TOUR_STEPS.length) {
      setTargetRect(null);
      return;
    }
    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!isActive || currentStep < 0) return;
    // Small delay to allow scroll
    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isActive, currentStep, updatePosition]);

  if (!isActive) return null;

  // Welcome dialog (step -1)
  if (currentStep === -1) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onSkip} />
        <div className="relative bg-card border border-border rounded-2xl shadow-xl max-w-sm w-full p-6 sm:p-8 animate-in fade-in-0 zoom-in-95">
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Welcome to Life Admin OS!
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We'd love to show you around. It only takes a moment and we'll highlight the features that help us keep track of everything for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onSkip}
                className="flex-1 min-h-[44px]"
              >
                Skip for now
              </Button>
              <Button
                onClick={onStart}
                className="flex-1 min-h-[44px]"
              >
                Show me around
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Calculate tooltip position (viewport-relative, since parent is fixed)
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0, position: 'fixed' };
    const placement = isMobile ? 'bottom' : step.placement;
    const tooltipWidth = isMobile ? window.innerWidth - 32 : 320;

    switch (placement) {
      case 'bottom':
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height + 12,
          left: isMobile ? 16 : Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 16)),
          width: tooltipWidth,
        };
      case 'top':
        return {
          position: 'fixed',
          bottom: window.innerHeight - targetRect.top + 12,
          left: isMobile ? 16 : Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 16)),
          width: tooltipWidth,
        };
      case 'left':
        return {
          position: 'fixed',
          top: targetRect.top,
          right: window.innerWidth - targetRect.left + 12,
          width: tooltipWidth,
        };
      case 'right':
        return {
          position: 'fixed',
          top: targetRect.top,
          left: targetRect.left + targetRect.width + 12,
          width: tooltipWidth,
        };
      default:
        return {
          position: 'fixed',
          top: targetRect.top + targetRect.height + 12,
          left: 16,
          width: tooltipWidth,
        };
    }
  };

  // Spotlight clip-path
  const getClipPath = () => {
    if (!targetRect) return 'none';
    const { top, left, width, height } = targetRect;
    const r = 8;
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${left}px ${top + r}px,
      ${left + r}px ${top}px,
      ${left + width - r}px ${top}px,
      ${left + width}px ${top + r}px,
      ${left + width}px ${top + height - r}px,
      ${left + width - r}px ${top + height}px,
      ${left + r}px ${top + height}px,
      ${left}px ${top + height - r}px,
      ${left}px ${top + r}px
    )`;
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-black/50 transition-all duration-300"
        style={{ clipPath: getClipPath() }}
        onClick={onSkip}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={getTooltipStyle()}
        className={cn(
          'z-[101] bg-card border border-border rounded-xl shadow-xl p-5 animate-in fade-in-0 slide-in-from-bottom-2',
          !targetRect && 'opacity-0'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
          <button
            onClick={onSkip}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Progress dots + navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                className="min-h-[36px] gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={onNext}
              className="min-h-[36px] gap-1 text-xs"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
