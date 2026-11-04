import React from 'react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found.',
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-4 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={`skeleton-col-${cIdx}`} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  {columns.map((col, idx) => (
                    <td
                      key={idx}
                      className={`px-6 py-4 text-gray-700 whitespace-nowrap ${
                        col.className || ''
                      }`}
                    >
                      {col.render
                        ? col.render(item)
                        : col.accessorKey
                        ? String(item[col.accessorKey] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
