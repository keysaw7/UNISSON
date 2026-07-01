'use client';

import { useEffect, useState } from 'react';
import type { LearnerFormatContext } from '@unisson/learning-engine';

const MOBILE_BREAKPOINT_PX = 768;

/**
 * Remonte le contexte device RÉEL attendu par le Format Selector (§6.5) : `device`
 * (mobile/desktop) et `capabilities` (mic/caméra), pour que les décisions de format restent
 * fondées sur l'environnement effectif de l'apprenant plutôt que sur une valeur figée.
 */
export function useDeviceFormatContext(): Pick<LearnerFormatContext, 'device' | 'capabilities'> {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [capabilities, setCapabilities] = useState({ mic: false, camera: false });

  useEffect(() => {
    const update = () => setDevice(window.innerWidth < MOBILE_BREAKPOINT_PX ? 'mobile' : 'desktop');
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setCapabilities({
          mic: devices.some((d) => d.kind === 'audioinput'),
          camera: devices.some((d) => d.kind === 'videoinput'),
        });
      })
      .catch(() => setCapabilities({ mic: false, camera: false }));
  }, []);

  return { device, capabilities };
}
