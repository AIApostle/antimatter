import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'kicanvas-embed': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        controls?: 'full' | 'basic' | 'none';
        controlslist?: string;
      }, HTMLElement>;
      'kicanvas-source': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        name?: string;
      }, HTMLElement>;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'kicanvas-embed': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        controls?: 'full' | 'basic' | 'none';
        controlslist?: string;
      }, HTMLElement>;
      'kicanvas-source': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        name?: string;
      }, HTMLElement>;
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'kicanvas-embed': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        controls?: 'full' | 'basic' | 'none';
        controlslist?: string;
      }, HTMLElement>;
      'kicanvas-source': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        name?: string;
      }, HTMLElement>;
    }
  }
}
