import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  /** Enable lazy loading (default: true) */
  lazy?: boolean;
  /** Placeholder shown while image loads */
  placeholder?: 'blur' | 'empty';
  /** Low-quality placeholder src for blur effect */
  blurSrc?: string;
}

/**
 * OptimizedImage — lazy-loading image component with WebP source and
 * automatic fallback to the original format.
 *
 * Usage:
 *   <OptimizedImage src="/img/screenshot.png" alt="API overview" />
 *
 * The browser will prefer screenshot.webp (if it exists in the same dir)
 * and fall back to screenshot.png if WebP is unsupported.
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  lazy = true,
  placeholder = 'empty',
  blurSrc,
  style,
  ...rest
}: OptimizedImageProps): React.JSX.Element {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  // Derive WebP source path from original
  const webpSrc = src.replace(/\.(png|jpe?g|gif)$/i, '.webp');
  const showBlur = placeholder === 'blur' && !loaded && blurSrc;

  const imgStyle: React.CSSProperties = {
    transition: 'opacity 0.3s ease-in-out',
    opacity: loaded ? 1 : showBlur ? 0.5 : 1,
    ...style,
  };

  return (
    <picture ref={imgRef}>
      {/* WebP source — browsers that support it will prefer this */}
      {inView && (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      {/* Fallback to original format */}
      {inView ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          style={imgStyle}
          onLoad={() => setLoaded(true)}
          {...rest}
        />
      ) : (
        // Placeholder while not in view
        <div
          style={{
            width: width || '100%',
            height: height || 200,
            backgroundColor: 'var(--ifm-background-surface-color)',
            borderRadius: 4,
            ...style,
          }}
          aria-label={alt}
          role="img"
        />
      )}
    </picture>
  );
}
