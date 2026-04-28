import { ActivitySquare, FolderSearch, Home, Library, Network, RefreshCw, Store, X } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { AppPage } from '../types';

interface NavItem {
  id: AppPage;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'skills', label: '技能库', icon: Library },
  { id: 'import', label: '导入与来源', icon: FolderSearch },
];

const TOOL_NAV: NavItem[] = [
  { id: 'map', label: '能力地图', icon: Network },
  { id: 'marketplace', label: '技能市场', icon: Store },
  { id: 'health', label: '健康检查', icon: ActivitySquare },
];

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  skillCount: number;
  onScan: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentPage, onNavigate, skillCount, onScan, isOpen, onClose }: SidebarProps) {
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    await onScan();
    setScanning(false);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = currentPage === item.id;
    const Icon = item.icon;

    return (
      <button
        onClick={() => onNavigate(item.id)}
        className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? 'border-primary bg-primary/8 text-on-surface'
            : 'border-transparent text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
        }`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {item.id === 'skills' && <span className="shrink-0 font-mono text-[11px] text-on-surface-muted">{skillCount}</span>}
      </button>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(4,7,13,0.62)] backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-outline-subtle bg-surface-container py-4 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="mb-2 flex h-[56px] shrink-0 items-center justify-between border-b border-outline-subtle px-4 pb-3">
          <div className="flex flex-col justify-center">
            <span className="select-none text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-muted">Workspace</span>
            <span className="mt-1 text-[13px] text-on-surface">Skill Dashboard</span>
          </div>
          <button onClick={onClose} className="text-on-surface-muted transition-colors hover:text-on-surface lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {MAIN_NAV.map(item => (
            <NavButton key={item.id} item={item} />
          ))}

          <p className="select-none px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-muted">工具视图</p>
          {TOOL_NAV.map(item => (
            <NavButton key={item.id} item={item} />
          ))}
        </nav>

        <div className="mt-2 shrink-0 border-t border-outline-subtle px-3 pt-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? '重新扫描中...' : '重新扫描技能'}
          </button>
        </div>
      </aside>
    </>
  );
}
