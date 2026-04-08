import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JsonLd } from '@/components/common/JsonLd';

describe('JsonLd', () => {
  it('renders a script tag with application/ld+json type', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Acme',
    };
    const { container } = render(<JsonLd schema={schema} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
  });

  it('serialises the schema as JSON in the script tag', () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Acme',
      url: 'https://acme.com',
    };
    const { container } = render(<JsonLd schema={schema} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const parsed = JSON.parse(script?.innerHTML ?? '{}');
    expect(parsed['@type']).toBe('WebSite');
    expect(parsed.url).toBe('https://acme.com');
  });

  it('serialises an array of schemas as multiple script tags', () => {
    const schemas = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Acme',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Acme',
        url: 'https://acme.com',
      },
    ];
    const { container } = render(<JsonLd schema={schemas} />);

    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts).toHaveLength(2);
  });
});
