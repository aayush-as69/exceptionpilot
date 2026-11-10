import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: { default: 'ExceptionPilot 2.0 — Overview', template: '%s · ExceptionPilot' }, description: 'A clearer view of every exception. An enterprise investigation and human-approved financial workflow demo.', icons: { icon: '/icon.svg' } };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{document.documentElement.dataset.theme=localStorage.getItem('ep-theme')||'light'}catch(e){}`}}/></head><body>{children}</body></html>; }
