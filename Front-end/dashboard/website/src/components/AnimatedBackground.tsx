'use client';

import ClientOnly from './ClientOnly';

export default function AnimatedBackground() {
  return (
    <ClientOnly>
      <div className="animated-bg"></div>
      <div className="floating-element"></div>
      <div className="floating-element"></div>
      <div className="floating-element"></div>
    </ClientOnly>
  );
}
