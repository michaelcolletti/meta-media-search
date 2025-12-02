import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@store/index';
import type { OnboardingStep } from '@types/index';
import './OnboardingPage.css';

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Visual Discovery',
    description:
      'Discover movies and TV shows in an entirely new way - through an interactive visual map that reveals connections and patterns.',
    action: 'Next',
  },
  {
    id: 'map',
    title: 'Explore the Map',
    description:
      'Each node represents a movie or show. The closer they are, the more similar they are. Zoom, pan, and click to navigate.',
    action: 'Next',
  },
  {
    id: 'connections',
    title: 'See Connections',
    description:
      'Lines between nodes show relationships - shared genres, similar themes, or related content. Colors represent different categories.',
    action: 'Next',
  },
  {
    id: 'search',
    title: 'Search Naturally',
    description:
      'Just describe what you want to watch. "Feel-good comedies on Netflix" or "Sci-fi like The Expanse" - the map adapts to your query.',
    action: 'Next',
  },
  {
    id: 'controls',
    title: 'Customize Your View',
    description:
      'Change layouts, color schemes, and visualization options to find content the way that works best for you.',
    action: 'Start Exploring',
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const completeTutorial = useAppStore(state => state.completeTutorial);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
      navigate('/search');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
    navigate('/search');
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-content">
        <div className="onboarding-progress">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`onboarding-progress-dot ${index === currentStep ? 'active' : ''} ${
                index < currentStep ? 'completed' : ''
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            className="onboarding-step"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="onboarding-visual">
              {step.id === 'welcome' && (
                <svg viewBox="0 0 300 200" className="onboarding-illustration">
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="150" cy="100" r="60" fill="url(#grad1)" opacity="0.2" />
                  <circle cx="150" cy="100" r="40" fill="url(#grad1)" opacity="0.4" />
                  <circle cx="150" cy="100" r="20" fill="url(#grad1)" />
                </svg>
              )}
              {step.id === 'map' && (
                <svg viewBox="0 0 300 200" className="onboarding-illustration">
                  <circle cx="150" cy="100" r="15" fill="#6366f1" />
                  <circle cx="100" cy="80" r="12" fill="#8b5cf6" />
                  <circle cx="200" cy="80" r="12" fill="#ec4899" />
                  <circle cx="120" cy="140" r="12" fill="#10b981" />
                  <circle cx="180" cy="140" r="12" fill="#f59e0b" />
                  <line x1="150" y1="100" x2="100" y2="80" stroke="#6366f1" strokeWidth="2" />
                  <line x1="150" y1="100" x2="200" y2="80" stroke="#8b5cf6" strokeWidth="2" />
                  <line x1="150" y1="100" x2="120" y2="140" stroke="#ec4899" strokeWidth="2" />
                  <line x1="150" y1="100" x2="180" y2="140" stroke="#10b981" strokeWidth="2" />
                </svg>
              )}
              {step.id === 'connections' && (
                <svg viewBox="0 0 300 200" className="onboarding-illustration">
                  <line
                    x1="50"
                    y1="100"
                    x2="250"
                    y2="100"
                    stroke="#6366f1"
                    strokeWidth="3"
                    opacity="0.5"
                  />
                  <line
                    x1="100"
                    y1="50"
                    x2="200"
                    y2="150"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    opacity="0.5"
                  />
                  <line
                    x1="100"
                    y1="150"
                    x2="200"
                    y2="50"
                    stroke="#ec4899"
                    strokeWidth="3"
                    opacity="0.5"
                  />
                  <circle cx="50" cy="100" r="15" fill="#6366f1" />
                  <circle cx="250" cy="100" r="15" fill="#8b5cf6" />
                  <circle cx="100" cy="50" r="15" fill="#ec4899" />
                  <circle cx="200" cy="150" r="15" fill="#10b981" />
                </svg>
              )}
              {step.id === 'search' && (
                <svg viewBox="0 0 300 200" className="onboarding-illustration">
                  <rect
                    x="50"
                    y="80"
                    width="200"
                    height="40"
                    rx="20"
                    fill="#6366f1"
                    opacity="0.2"
                  />
                  <circle cx="220" cy="100" r="15" fill="#6366f1" />
                  <line
                    x1="230"
                    y1="110"
                    x2="245"
                    y2="125"
                    stroke="#6366f1"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {step.id === 'controls' && (
                <svg viewBox="0 0 300 200" className="onboarding-illustration">
                  <rect x="60" y="60" width="60" height="30" rx="8" fill="#6366f1" />
                  <rect x="130" y="60" width="60" height="30" rx="8" fill="#8b5cf6" opacity="0.5" />
                  <rect x="200" y="60" width="60" height="30" rx="8" fill="#ec4899" opacity="0.5" />
                  <rect x="60" y="110" width="60" height="30" rx="8" fill="#10b981" opacity="0.5" />
                  <rect x="130" y="110" width="60" height="30" rx="8" fill="#f59e0b" />
                </svg>
              )}
            </div>

            <h1 className="onboarding-title">{step.title}</h1>
            <p className="onboarding-description">{step.description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="onboarding-actions">
          <button className="onboarding-button onboarding-button--secondary" onClick={handleSkip}>
            Skip Tutorial
          </button>

          <div className="onboarding-nav">
            {currentStep > 0 && (
              <button
                className="onboarding-button onboarding-button--ghost"
                onClick={handlePrevious}
              >
                Previous
              </button>
            )}
            <button className="onboarding-button onboarding-button--primary" onClick={handleNext}>
              {step.action}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10h12m-6-6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
