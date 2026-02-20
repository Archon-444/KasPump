'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '../../utils';

export interface StepperStep {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
  variant?: 'horizontal' | 'compact';
  onStepClick?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  className,
  variant = 'horizontal',
  onStepClick,
}) => {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;

          return (
            <React.Fragment key={index}>
              <button
                onClick={() => onStepClick?.(stepNumber)}
                disabled={!onStepClick || stepNumber > currentStep}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  isCompleted && 'bg-green-500/10 text-green-400 border border-green-500/20',
                  isCurrent && 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20',
                  !isCompleted && !isCurrent && 'bg-gray-800 text-gray-500 border border-gray-700',
                  onStepClick && stepNumber <= currentStep && 'cursor-pointer hover:opacity-80',
                )}
              >
                {isCompleted ? (
                  <CheckCircle size={12} />
                ) : (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-current">
                    {stepNumber}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-4 h-px',
                    isCompleted ? 'bg-green-500' : 'bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;
          const isClickable = onStepClick && stepNumber <= currentStep;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 border-2',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    isCurrent && 'bg-yellow-500 border-yellow-500 text-white scale-110 shadow-lg shadow-yellow-500/30',
                    !isCompleted && !isCurrent && 'bg-gray-800 border-gray-700 text-gray-400',
                    isClickable && 'cursor-pointer hover:opacity-80',
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle size={20} />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    stepNumber
                  )}
                </button>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    isCompleted && 'text-green-400',
                    isCurrent && 'text-white',
                    !isCompleted && !isCurrent && 'text-gray-500',
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[10px] text-gray-500 mt-0.5 hidden md:block text-center">
                    {step.description}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors duration-300 -mt-6',
                    isCompleted ? 'bg-green-500' : 'bg-gray-700'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
