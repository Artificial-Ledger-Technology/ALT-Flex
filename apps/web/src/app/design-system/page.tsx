'use client';

import React, { useState } from 'react';
import { Palette, Type, Maximize, MousePointer2 } from 'lucide-react';

export default function DesignSystemPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div
      className="container"
      style={{ padding: 'var(--space-8) 0', maxWidth: 'var(--breakpoint-lg)' }}
    >
      <header className="flex-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-2)' }}>
            AEGIS Design System
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Global CSS Tokens and Components</p>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          Toggle Theme ({theme})
        </button>
      </header>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2
          className="flex-center"
          style={{
            justifyContent: 'flex-start',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Palette size={24} color="var(--accent-cyan)" /> Color Palette
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {['--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-hover'].map((token) => (
            <div
              key={token}
              style={{
                padding: 'var(--space-4)',
                background: `var(${token})`,
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{token}</div>
            </div>
          ))}
          {[
            '--accent-cyan',
            '--accent-emerald',
            '--accent-amber',
            '--accent-red',
            '--accent-purple',
          ].map((token) => (
            <div
              key={token}
              style={{
                padding: 'var(--space-4)',
                background: `var(${token})`,
                color: '#fff',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 'var(--space-1)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {token}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2
          className="flex-center"
          style={{
            justifyContent: 'flex-start',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Type size={24} color="var(--accent-purple)" /> Typography
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--font-size-4xl)' }}>Heading 1 (4XL)</h1>
          <h2 style={{ fontSize: 'var(--font-size-3xl)' }}>Heading 2 (3XL)</h2>
          <h3 style={{ fontSize: 'var(--font-size-2xl)' }}>Heading 3 (2XL)</h3>
          <h4 style={{ fontSize: 'var(--font-size-xl)' }}>Heading 4 (XL)</h4>
          <p style={{ fontSize: 'var(--font-size-lg)' }}>
            Body Large (LG) - The quick brown fox jumps over the lazy dog.
          </p>
          <p style={{ fontSize: 'var(--font-size-base)' }}>
            Body Base - The quick brown fox jumps over the lazy dog.
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Body Small (SM) - The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2
          className="flex-center"
          style={{
            justifyContent: 'flex-start',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Maximize size={24} color="var(--accent-emerald)" /> Shadows & Radii
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Shadow SM
          </div>
          <div
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            Shadow MD
          </div>
          <div
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            Shadow LG
          </div>
          <div
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-glow)',
              border: '1px solid var(--accent-cyan)',
            }}
          >
            Shadow Glow
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2
          className="flex-center"
          style={{
            justifyContent: 'flex-start',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <MousePointer2 size={24} color="var(--accent-amber)" /> Animations
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Fade In
          </div>
          <div
            className="animate-slide-up"
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Slide Up
          </div>
          <div
            className="animate-scale-in"
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Scale In
          </div>
          <div
            className="animate-shimmer"
            style={{
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-md)',
              minHeight: '60px',
            }}
          ></div>
        </div>
      </section>
    </div>
  );
}
