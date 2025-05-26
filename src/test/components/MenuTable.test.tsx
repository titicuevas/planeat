import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MenuTable } from '../../components/MenuTable'
import { BrowserRouter } from 'react-router-dom'

// Mock de los datos de ejemplo
const mockMenu = {
  '2024-06-10': {
    Desayuno: 'Tostadas con aguacate',
    Comida: 'Ensalada César',
    Cena: 'Pollo al horno',
    'Snack mañana': 'Yogur con frutas',
    'Snack tarde': 'Frutos secos'
  },
  '2024-06-11': {
    Desayuno: 'Smoothie de frutas',
    Comida: 'Pasta con verduras',
    Cena: 'Salmón a la plancha',
    'Snack mañana': 'Manzana',
    'Snack tarde': 'Zumo de naranja'
  }
}

describe('MenuTable', () => {
  it('debería renderizar la tabla con las comidas correctamente', () => {
    render(
      <BrowserRouter>
        <MenuTable 
          menu={mockMenu} 
          onSuggestAlternative={vi.fn()} 
          verSemanaCompleta={true}
          fechaInicio={new Date('2024-06-10')}
        />
      </BrowserRouter>
    )
    // Verificar que los días están presentes (buscamos el formato completo)
    expect(screen.getByText(/Lunes.*2024/)).toBeInTheDocument()
    expect(screen.getByText(/Martes.*2024/)).toBeInTheDocument()
    // Verificar que las comidas están presentes
    expect(screen.getByText('Tostadas con aguacate')).toBeInTheDocument()
    expect(screen.getByText('Ensalada César')).toBeInTheDocument()
    expect(screen.getByText('Pollo al horno')).toBeInTheDocument()
  })

  it('debería llamar a onSuggestAlternative cuando se hace clic en el botón de sugerir alternativa', async () => {
    const onSuggestAlternative = vi.fn()
    render(
      <BrowserRouter>
        <MenuTable 
          menu={mockMenu} 
          onSuggestAlternative={onSuggestAlternative} 
          verSemanaCompleta={true}
          fechaInicio={new Date('2024-06-10')}
        />
      </BrowserRouter>
    )
    const alternativeButtons = screen.getAllByText('¿Otra?')
    fireEvent.click(alternativeButtons[0])
    expect(onSuggestAlternative).toHaveBeenCalled()
  })
}) 