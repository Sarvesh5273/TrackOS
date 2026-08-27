import React from "react";

export function FigmaLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
    </svg>
  );
}

export function LoomLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#625DF5"/>
      <path d="M12 5V19M5 12H19M7 7L17 17M7 17L17 7" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

export function GoogleSlidesLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#F4B400"/>
      <rect x="5" y="6" width="14" height="12" rx="1.5" fill="white"/>
      <rect x="7" y="8" width="10" height="8" rx="1" fill="#F4B400"/>
    </svg>
  );
}

export function GoogleDocsLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#4285F4"/>
      <path d="M7 8H17M7 12H17M7 16H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function MiroLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FFD02F"/>
      <path d="M7 17V7L11 14L15 7V17" stroke="#050038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function NotionLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#000000"/>
      <path d="M7 6H17L12 18H7V6Z" fill="white"/>
    </svg>
  );
}

export function PlatformIcon({ platform, className = "w-5 h-5" }: { platform: string; className?: string }) {
  switch (platform) {
    case "figma":
      return <FigmaLogo className={className} />;
    case "loom":
      return <LoomLogo className={className} />;
    case "google_slides":
      return <GoogleSlidesLogo className={className} />;
    case "google_docs":
      return <GoogleDocsLogo className={className} />;
    case "miro":
      return <MiroLogo className={className} />;
    case "notion":
      return <NotionLogo className={className} />;
    default:
      return null;
  }
}
