import { Menu, Search, Settings } from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onMenuToggle: () => void;
}

export default function TopBar({ searchQuery, onSearchChange, onMenuToggle }: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[220px] z-40 h-[56px] bg-surface-container/80 backdrop-blur-[12px] border-b border-outline-subtle flex items-center gap-3 px-4 sm:px-6">
      <button
        onClick={onMenuToggle}
        className="inline-flex lg:hidden w-8 h-8 items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      <span className="font-display text-xl text-on-surface whitespace-nowrap select-none">
        Skill <span className="text-primary">OS</span>
      </span>

      <div className="relative flex-1 max-w-[420px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-muted pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="搜索技能、标签或使用场景"
          className="w-full h-9 bg-surface-container-low border border-outline-variant rounded-lg pl-8 pr-10 text-[13px] text-on-surface placeholder:text-on-surface-muted outline-none transition-all duration-150 focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(56,201,184,0.15)]"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-on-surface-muted bg-surface-bright px-1 py-0.5 rounded border border-outline-subtle select-none">
          /
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden xl:inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] text-primary">
          Deploy-ready demo
        </span>
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
