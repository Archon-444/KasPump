// Augment Vitest's Assertion interface with @testing-library/jest-dom matchers.
// This file is picked up automatically because it lives under src/ which is
// covered by the tsconfig include glob.  The import brings in the module
// augmentation declared in @testing-library/jest-dom/types/vitest.d.ts, which
// extends vitest's Assertion<T> and AsymmetricMatchersContaining interfaces.
import '@testing-library/jest-dom/vitest';
