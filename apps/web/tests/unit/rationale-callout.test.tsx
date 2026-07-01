import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RationaleCallout } from '@/components/rationale-callout';

describe('RationaleCallout', () => {
  it("affiche le rationale fourni, jamais caché derrière une interaction", () => {
    render(<RationaleCallout>révision urgente (rétrievabilité 0.42 &lt; 0.6)</RationaleCallout>);
    expect(screen.getByText(/Pourquoi/)).toBeInTheDocument();
    expect(screen.getByText(/révision urgente/)).toBeInTheDocument();
  });

  it('ne rend rien si aucun rationale n’est fourni', () => {
    const { container } = render(<RationaleCallout>{null}</RationaleCallout>);
    expect(container).toBeEmptyDOMElement();
  });
});
