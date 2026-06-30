/**
 * Ambient type declarations for CSS Modules.
 *
 * This allows TypeScript to understand `import styles from './Foo.module.css'`
 * without generating "Cannot find module" errors. Each `.module.css` file is
 * treated as an object mapping class names to hashed string values.
 */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
