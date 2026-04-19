import { ActivitySquare, Library, Network, RefreshCw, Store, X } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { AppPage } from '../types';

interface NavItem {
  id: AppPage;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [{ id: 'skills', label: '技能库', icon: Library }];
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
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 mb-0.5 ${
          isActive
            ? 'border-primary bg-primary/8 text-on-surface'
            : 'border-transparent text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
        <span className="truncate flex-1 text-left">{item.label}</span>
        {item.id === 'skills' && <span className="font-mono text-[11px] text-on-surface-muted shrink-0">{skillCount}</span>}
      </button>
    );
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[rgba(4,7,13,0.62)] backdrop-blur-sm transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[220px] bg-surface-container border-r border-outline-subtle flex flex-col py-4 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-[56px] px-4 pb-3 border-b border-outline-subtle mb-2 shrink-0 flex items-center justify-between">
          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-muted select-none">Workspace</span>
            <span className="text-[13px] text-on-surface mt-1">Skill Dashboard</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-on-surface-muted hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {MAIN_NAV.map(item => (
            <NavButton key={item.id} item={item} />
          ))}

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-muted px-3 pt-4 pb-1 select-none">工具视图</p>
          {TOOL_NAV.map(item => (
            <NavButton key={item.id} item={item} />
          ))}
        </nav>

        <div className="shrink-0 px-3 pt-2 border-t border-outline-subtle mt-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? '刷新中...' : '刷新演示数据'}
          </button>
        </div>
      </aside>
    </>
  );
}
