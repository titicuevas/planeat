import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Navbar from '../../components/Navbar'

// Mock del contexto AppContext
vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    isDarkMode: false,
    toggleDarkMode: vi.fn(),
    isLoading: false,
    setIsLoading: vi.fn()
  })
}))

describe('Navbar', () => {
  it('debería mostrar el enlace a Inicio solo si la ruta no es /, /login o /register', () => {
    window.history.pushState({}, '', '/dashboard')
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    )
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('no debería mostrar el enlace a Inicio en la ruta /', () => {
    window.history.pushState({}, '', '/')
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    )
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument()
  })
}) 