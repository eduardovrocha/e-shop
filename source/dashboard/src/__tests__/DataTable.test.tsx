import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DataTable, type Column } from '@/components/DataTable'

type Row = { id: number; name: string; value: string }

const columns: Column<Row>[] = [
  { key: 'name', header: 'Nome' },
  { key: 'value', header: 'Valor', render: (r) => <strong>{r.value}</strong> },
]

const rows: Row[] = [
  { id: 1, name: 'Alpha', value: 'A' },
  { id: 2, name: 'Beta', value: 'B' },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} />)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Valor')).toBeInTheDocument()
  })

  it('renders row data', () => {
    render(<DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('uses custom render function', () => {
    render(<DataTable columns={columns} data={rows} keyExtractor={(r) => r.id} />)
    expect(screen.getByText('A').tagName).toBe('STRONG')
  })

  it('shows empty message when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(r) => r.id}
        emptyMessage="Sem dados"
      />
    )
    expect(screen.getByText('Sem dados')).toBeInTheDocument()
  })

  it('shows loading skeleton rows', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={(r) => r.id} loading />)
    // Loading renders skeleton rows (5) with pulse divs — headers still present
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.queryByText('Sem dados')).not.toBeInTheDocument()
  })

  it('renders pagination when totalPages > 1', async () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(r) => r.id}
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />
    )
    const buttons = screen.getAllByRole('button')
    const nextBtn = buttons[buttons.length - 1]
    await userEvent.click(nextBtn)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables previous button on first page', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        keyExtractor={(r) => r.id}
        currentPage={1}
        totalPages={3}
        onPageChange={vi.fn()}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
  })
})
