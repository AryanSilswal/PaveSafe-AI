const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/commuter/page.tsx', 'utf8');

// Add useRef
c = c.replace(
  "import { useState, useEffect } from 'react';",
  "import { useState, useEffect, useRef } from 'react';"
);

// Add the refs and useEffect
const hookLogic = `
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);

  const startAutoClose = () => {
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      setShowNotifications(false);
    }, 3000);
  };

  const cancelAutoClose = () => {
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
  };

  useEffect(() => {
    if (showNotifications) {
      startAutoClose();
      
      const handleClickOutside = (event: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
          setShowNotifications(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      };
    }
  }, [showNotifications]);
`;

c = c.replace(
  'const [showNotifications, setShowNotifications] = useState(false);',
  hookLogic
);

// Add ref and mouse events to the dropdown
c = c.replace(
  '{/* Notifications Dropdown */}\n              {showNotifications && (\n                <div className="absolute right-0 top-12 w-64 bg-white shadow-lg border rounded-lg overflow-hidden z-50">',
  `{/* Notifications Dropdown */}\n              {showNotifications && (\n                <div ref={notifRef} onMouseEnter={cancelAutoClose} onMouseLeave={startAutoClose} className="absolute right-0 top-12 w-64 bg-white shadow-lg border rounded-lg overflow-hidden z-50">`
);

fs.writeFileSync('frontend/src/app/commuter/page.tsx', c);
console.log("Commuter patched!");
