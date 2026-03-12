'use client';

import { useEffect, useRef } from 'react';
import { RealProcessingService } from '@/lib/services/processing-service';
import { setProcessingService } from '@/store/contract-store';

/**
 * Initializes the processing service on mount.
 * Renders nothing — pure side effect component.
 */
export function ServiceInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setProcessingService(new RealProcessingService());
      initialized.current = true;
    }
  }, []);

  return null;
}
