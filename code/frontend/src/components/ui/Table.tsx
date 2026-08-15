import React from "react";

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className="w-full overflow-x-auto border border-gray-200 rounded-[2px] bg-white shadow-xs">
    <table
      className={`w-full text-left border-collapse text-sm text-slate-800 ${className || ""}`}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className, ...props }) => (
  <thead
    className={`bg-slate-50/80 border-b border-gray-200 text-xs font-semibold text-slate-600 uppercase tracking-wider ${
      className || ""
    }`}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className, ...props }) => (
  <tbody className={`divide-y divide-gray-200 bg-white ${className || ""}`} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<
  React.HTMLAttributes<HTMLTableRowElement>
> = ({ children, className, ...props }) => (
  <tr className={`hover:bg-slate-50/60 transition-colors ${className || ""}`} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ children, className, ...props }) => (
  <th className={`px-4 py-3 font-semibold ${className || ""}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ children, className, ...props }) => (
  <td className={`px-4 py-3 text-sm ${className || ""}`} {...props}>
    {children}
  </td>
);