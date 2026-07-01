import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_LINKS = [
  { href: '/goal', label: 'Objectif' },
  { href: '/plan', label: 'Plan' },
  { href: '/session', label: 'Session' },
  { href: '/mastery', label: 'Maîtrise' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          UNISSON
        </Link>
        <nav aria-label="Navigation principale" className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-3"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
