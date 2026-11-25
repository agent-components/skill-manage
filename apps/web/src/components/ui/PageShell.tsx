import { ReactNode } from "react";

interface PageShellProps {
  title: string;
  children: ReactNode;
  toolbar?: ReactNode;
}

export function PageShell({ title, children, toolbar }: PageShellProps) {
  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        {toolbar && <div className="page-toolbar">{toolbar}</div>}
      </div>
      <div className="page-content">{children}</div>
    </div>
  );
}
