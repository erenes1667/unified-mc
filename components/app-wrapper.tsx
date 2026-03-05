'use client';

import { useState, useEffect } from 'react';
import SetupWizard from './setup-wizard';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [showSetup, setShowSetup] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem('umc_setup_complete');
    if (!done) {
      setShowSetup(true);
    }
    setChecked(true);
  }, []);

  if (!checked) return null;

  return (
    <>
      {showSetup && <SetupWizard onComplete={() => setShowSetup(false)} />}
      {children}
    </>
  );
}
