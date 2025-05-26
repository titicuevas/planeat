import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extiende Vitest's expect con los matchers de jest-dom
expect.extend(matchers)

// Limpia después de cada test
afterEach(() => {
  cleanup()
}) 