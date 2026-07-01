import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingCardProps {
  message?: string;
}

/** État de chargement cohérent sur les pages async (P2). */
export function LoadingCard({ message = 'Chargement…' }: LoadingCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {message}
      </CardContent>
    </Card>
  );
}

interface ErrorCardProps {
  message: string;
  retryHref?: string;
  retryLabel?: string;
}

/** État d'erreur cohérent (P2). */
export function ErrorCard({ message, retryHref, retryLabel = 'Réessayer' }: ErrorCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6 text-sm">
        <p className="text-destructive" role="alert">
          {message}
        </p>
        {retryHref && (
          <a href={retryHref} className="text-primary underline underline-offset-4">
            {retryLabel}
          </a>
        )}
      </CardContent>
    </Card>
  );
}
