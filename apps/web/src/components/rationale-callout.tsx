import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Restitue le `rationale` renvoyé par le moteur (plan, format, feedback) — jamais un détail
 * technique caché : l'explicabilité des décisions est un principe transverse de l'architecture
 * (§6.3, §6.5, §13.5 ARCHITECTURE.md : "les rationale rendent les décisions explicables").
 */
export function RationaleCallout({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/90',
        className,
      )}
    >
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-medium">Pourquoi&nbsp;: </span>
        {children}
      </p>
    </div>
  );
}
