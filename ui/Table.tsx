'use client'

import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
} from 'react'
import { cn } from './cn'
import { themeDefaults } from './theme-defaults'

const t = themeDefaults.table

interface TableContextValue {
  striped?: boolean
  hoverable?: boolean
}
const TableContext = createContext<TableContextValue | undefined>(undefined)
function useTableContext() {
  const context = useContext(TableContext)
  if (!context)
    throw new Error(
      'useTableContext should be used within the TableContext provider!'
    )
  return context
}

export interface TableProps extends ComponentPropsWithoutRef<'table'> {
  striped?: boolean
  hoverable?: boolean
}

const TableRoot = forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, striped, hoverable, ...rest },
  ref
) {
  return (
    <div data-testid="table-element" className={cn(t.root.wrapper)}>
      <TableContext.Provider value={{ striped, hoverable }}>
        <div className={cn(t.root.shadow, className)} />
        <table ref={ref} className={cn(t.root.base, className)} {...rest} />
      </TableContext.Provider>
    </div>
  )
})

export type TableHeadProps = ComponentPropsWithoutRef<'thead'>
export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  function TableHead({ className, ...rest }, ref) {
    return <thead ref={ref} className={cn(t.head.base, className)} {...rest} />
  }
)

export type TableHeadCellProps = ComponentPropsWithoutRef<'th'>
export const TableHeadCell = forwardRef<
  HTMLTableCellElement,
  TableHeadCellProps
>(function TableHeadCell({ className, ...rest }, ref) {
  return <th ref={ref} className={cn(t.head.cell.base, className)} {...rest} />
})

export type TableBodyProps = ComponentPropsWithoutRef<'tbody'>
export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody({ className, ...rest }, ref) {
    return <tbody ref={ref} className={cn(t.body.base, className)} {...rest} />
  }
)

export type TableRowProps = ComponentPropsWithoutRef<'tr'>
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ className, ...rest }, ref) {
    const { hoverable, striped } = useTableContext()
    return (
      <tr
        ref={ref}
        data-testid="table-row-element"
        className={cn(
          t.row.base,
          striped && t.row.striped,
          hoverable && t.row.hovered,
          className
        )}
        {...rest}
      />
    )
  }
)

export type TableCellProps = ComponentPropsWithoutRef<'td'>
export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ className, ...rest }, ref) {
    return (
      <td ref={ref} className={cn(t.body.cell.base, className)} {...rest} />
    )
  }
)

/** Table with the compound aliases (`Table.Head`, …) a few call sites still use. */
export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  HeadCell: TableHeadCell,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
})
