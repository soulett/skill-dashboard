import { type ComponentType } from 'react';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Category, Skill } from '../types';
import { formatRelativeTime } from '../utils';

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  animationDelay?: number;
  onClick: () => void;
}

const CATEGORY_COLORS: Record<Category, { icon: string; tag: string }> = {
  编程开发: { icon: 'text-primary bg-primary/10', tag: 'bg-primary/10 text-primary' },
  内容创作: { icon: 'text-secondary bg-secondary/10', tag: 'bg-secondary/10 text-secondary' },
  数据分析: { icon: 'text-info bg-info/10', tag: 'bg-info/10 text-info' },
  产品设计: { icon: 'text-warning bg-warning/10', tag: 'bg-warning/10 text-warning' },
  效率流程: { icon: 'text-tertiary bg-tertiary/10', tag: 'bg-tertiary/10 text-tertiary' },
  商业营销: { icon: 'text-error bg-error/10', tag: 'bg-error/10 text-error' },
  其他: { icon: 'text-on-surface-variant bg-surface-bright', tag: 'bg-surface-bright text-on-surface-variant' },
};

const STATUS_CONFIG = {
  active: { dot: 'bg-tertiary', label: '已识别' },
  unrecognized: { dot: 'bg-warning', label: '待整理' },
  updating: { dot: 'bg-primary animate-pulse', label: '更新中' },
};

export default function SkillCard({ skill, isSelected, animationDelay = 0, onClick }: SkillCardProps) {
  const Icon = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[skill.icon] ?? Icons.Cpu;
  const colors = CATEGORY_COLORS[skill.category];
  const status = STATUS_CONFIG[skill.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, delay: animationDelay / 1000, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-surface-card rounded-xl p-4 cursor-pointer transition-all duration-200 border relative overflow-hidden ${
        isSelected
          ? 'border-primary/40 border-l-[3px] shadow-[0_12px_28px_rgba(0,0,0,0.28)]'
          : 'border-outline-variant hover:border-outline hover:bg-surface-container-highest hover:shadow-[0_12px_28px_rgba(0,0,0,0.24)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className="font-mono text-[10px] text-on-surface-muted">{status.label}</span>
        </div>
      </div>

      <h3 className="text-[17px] font-semibold text-on-surface leading-tight mb-1">{skill.title}</h3>
      <span className={`inline-block text-[11px] font-medium px-1.5 py-0.5 rounded mb-2 ${colors.tag}`}>{skill.category}</span>

      <p className="text-[13px] text-on-surface-variant leading-relaxed line-clamp-3 mb-4">{skill.description}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {skill.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[11px] text-on-surface-muted bg-surface-bright px-1.5 py-0.5 rounded border border-outline-subtle">
              {tag}
            </span>
          ))}
        </div>
        <span className="font-mono text-[11px] text-on-surface-muted shrink-0">{formatRelativeTime(skill.updatedAt)}</span>
      </div>
    </motion.div>
  );
}
