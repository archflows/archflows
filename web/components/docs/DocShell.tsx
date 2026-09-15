import Link from "next/link";

export type DocTocItem = { href: string; label: string };

export function DocShell({
  kicker,
  title,
  lead,
  meta,
  variant = "docs",
  toc,
  children,
}: {
  kicker: string;
  title: string;
  lead: string;
  meta?: string;
  variant?: "docs" | "paper";
  toc?: DocTocItem[];
  children: React.ReactNode;
}) {
  return (
    <main className={variant === "paper" ? "doc-page doc-page-paper" : "doc-page"}>
      <header className="doc-hero">
        <div className="shell">
          <p className="doc-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="doc-lead">{lead}</p>
          {meta ? <p className="doc-meta">{meta}</p> : null}
        </div>
      </header>

      <div className="shell doc-layout">
        <aside className="doc-toc">
          <p className="doc-toc-label">Contents</p>
          <nav>
            {(toc ?? []).map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
        <article className="doc-prose">{children}</article>
      </div>
    </main>
  );
}

export function DocCallout({
  label = "Note",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="doc-callout">
      <p className="doc-callout-label">{label}</p>
      {children}
    </aside>
  );
}

export function DocTable({
  caption,
  headers,
  rows,
}: {
  caption?: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocPager({
  prev,
  next,
}: {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return (
    <nav className="doc-pager">
      {prev ? (
        <Link href={prev.href} className="doc-pager-link">
          <span>Previous</span>
          {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="doc-pager-link doc-pager-link-next">
          <span>Next</span>
          {next.label}
        </Link>
      ) : null}
    </nav>
  );
}
