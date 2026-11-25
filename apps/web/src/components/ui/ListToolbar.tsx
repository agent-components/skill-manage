import { ReactNode } from "react";

interface ListToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: ReactNode;
}

export function ListToolbar({ searchValue, onSearchChange, actions }: ListToolbarProps) {
  return (
    <div className="list-toolbar">
      {searchValue !== undefined && onSearchChange && (
        <input
          type="text"
          placeholder="搜索..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="toolbar-search"
        />
      )}
      {actions && <div className="toolbar-actions">{actions}</div>}
    </div>
  );
}
