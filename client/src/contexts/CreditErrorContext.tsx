import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { TopUpCreditsModal } from '@/components/TopUpCreditsModal';
import { InsufficientCreditsError, setGlobalCreditErrorHandler } from '@/lib/queryClient';

interface CreditErrorContextType {
  handleCreditError: (error: unknown) => void;
}

const CreditErrorContext = createContext<CreditErrorContextType | null>(null);

export function CreditErrorProvider({ children }: { children: ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{ required: number; current: number } | null>(null);

  const handleCreditError = useCallback((error: unknown) => {
    if (error instanceof InsufficientCreditsError) {
      setErrorDetails({
        required: error.required,
        current: error.current
      });
      setShowModal(true);
    }
  }, []);

  // Register global error handler when provider mounts
  useEffect(() => {
    setGlobalCreditErrorHandler(handleCreditError);
  }, [handleCreditError]);

  return (
    <CreditErrorContext.Provider value={{ handleCreditError }}>
      {children}
      <TopUpCreditsModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setErrorDetails(null);
        }}
        required={errorDetails?.required}
        current={errorDetails?.current}
      />
    </CreditErrorContext.Provider>
  );
}

export function useCreditErrorHandler() {
  const context = useContext(CreditErrorContext);
  if (!context) {
    throw new Error('useCreditErrorHandler must be used within CreditErrorProvider');
  }
  return context;
}
