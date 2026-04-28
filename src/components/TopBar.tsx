import { Menu, Search, Settings } from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onMenuToggle: () => void;
  searchPlaceholder?: string;
  searchDisabled?: boolean;
}

export default function TopBar({
  searchQuery,
  onSearchChange,
  onMenuToggle,
  searchPlaceholder = '搜索 skill、标签或使用场景',
  searchDisabled = false,
}: TopBarProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-[56px] items-center gap-3 border-b border-outline-subtle bg-surface-container/80 px-4 backdrop-blur-[12px] sm:px-6 lg:left-[220px]">
      <button
        onClick={onMenuToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <span className="select-none whitespace-nowrap font-display text-xl text-on-surface">
        Skill <span className="text-primary">OS</span>
      </span>

      <div className="relative max-w-[420px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-muted" />
        <input
          type="text"
          value={searchQuery}
          disabled={searchDisabled}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className={`h-9 w-full rounded-lg border pl-8 pr-10 text-[13px] outline-none transition-all duration-150 ${
            searchDisabled
              ? 'cursor-not-allowed border-outline-subtle bg-surface-bright/60 text-on-surface-muted placeholder:text-on-surface-muted'
              : 'border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-muted focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(56,201,184,0.15)]'
          }`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 select-none rounded border border-outline-subtle bg-surface-bright px-1 py-0.5 font-mono text-[11px] text-on-surface-muted">
          /
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] text-primary xl:inline-flex">
          场景化能力路由
        </span>
        <button className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
