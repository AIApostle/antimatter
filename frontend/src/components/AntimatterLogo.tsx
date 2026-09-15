import React from 'react';

export interface AntimatterLogoProps {
  /** Dimension (width/height) of the ^ badge in pixels. Defaults to 22 */
  size?: number;
  /** Font size of the 'antimatter' brand text in pixels. Defaults to 15 */
  fontSize?: number;
  /** Whether to show the brand name text alongside the ^ badge */
  showText?: boolean;
  /** Additional custom styles for the wrapper container */
  style?: React.CSSProperties;
  /** Custom CSS class names */
  className?: string;
  /** Custom CSS class names for the brand text */
  textClassName?: string;
}

/**
 * Standard default logo and visual representation for the Antimatter EDA platform.
 * Features the signature electric cyan neon caret (^) with dark gradient badge and glow.
 */
export const AntimatterLogo: React.FC<AntimatterLogoProps> = ({
  size = 22,
  fontSize = 15,
  showText = true,
  style,
  className = '',
  textClassName = '',
}) => {
  const borderRadius = Math.max(4, Math.round(size * 0.27));
  const caretFontSize = Math.round(size * 0.72);
  const glowRadius = Math.round(size * 0.54);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.round(size * 0.41)}px`,
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${borderRadius}px`,
          background: 'linear-gradient(135deg, rgba(0,229,255,0.2) 0%, rgba(59,130,246,0.2) 100%)',
          border: '1px solid rgba(0,229,255,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#00e5ff',
          fontSize: `${caretFontSize}px`,
          fontWeight: 900,
          fontFamily: 'monospace',
          lineHeight: 1,
          boxShadow: `0 0 ${glowRadius}px rgba(0,229,255,0.35)`,
          flexShrink: 0,
          transform: 'translateY(1px)',
          userSelect: 'none',
        }}
        aria-label="antimatter logo"
      >
        ^
      </div>
      {showText && (
        <span
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            letterSpacing: '-0.3px',
            color: '#f8fafc',
            userSelect: 'none',
          }}
          className={textClassName}
        >
          antimatter
        </span>
      )}
    </div>
  );
};
