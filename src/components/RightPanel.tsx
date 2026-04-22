import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, ChevronDown, Copy, Edit2, Languages, Plus, Save, Trash2, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { api } from '../api';
import { Category, Skill, SkillUpdatePayload } from '../types';
import { formatRelativeTime } from '../utils';

interface RightPanelProps {
  skill: Skill | null;
  onClose: () => void;
  onSkillUpdate: (skill: Skill) => void;
  autoEdit?: boolean;
  onAutoEditConsumed?: () => void;
}

const CATEGORIES: Category[] = ['编程开发', '内容创作', '数据分析', '产品设计', '效率流程', '商业营销', '其他'];

const STATUS_STYLE = {
  active: 'bg-tertiary/10 text-tertiary border border-tertiary/25',
  unrecognized: 'bg-warning/10 text-warning border border-warning/25',
  updating: 'bg-primary/10 text-primary border border-primary/25',
};

const STATUS_LABEL = {
  active: '已识别',
  unrecognized: '待整理',
  updating: '更新中',
};

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const value = input.trim();
    if (value && !tags.includes(value) && tags.length < 10) {
      onChange([...tags, value]);
      setInput('');
    }
  };

  const remove = (tag: string) => onChange(tags.filter(item => item !== tag));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }

    if (event.key === 'Backspace' && input === '' && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-surface-container-low rounded-lg border border-outline-variant focus-within:border-primary/40 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-bright border border-outline-subtle text-[11px] text-on-surface-variant">
          {tag}
          <button onClick={() => remove(tag)} className="hover:text-error transition-colors">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={event => setInput(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={tags.length === 0 ? '输入后按 Enter 添加标签' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-[12px] text-on-surface placeholder:text-on-surface-muted outline-none"
      />
    </div>
  );
}

function WhenToUseEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const update = (index: number, value: string) => onChange(items.map((item, i) => (i === index ? value : item)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, '']);

  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-primary text-[10px] shrink-0">•</span>
          <input
            value={item}
            onChange={event => update(index, event.target.value)}
            placeholder="描述一个适用场景"
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-1.5 text-[13px] text-on-surface placeholder:text-on-surface-muted outline-none focus:border-primary/40"
          />
          <button onClick={() => remove(index)} className="text-on-surface-muted hover:text-error transition-colors shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {items.length < 8 && (
        <button onClick={add} className="flex items-center gap-1 text-[12px] text-on-surface-muted hover:text-primary transition-colors pl-3.5">
          <Plus className="w-3 h-3" />
          添加场景
        </button>
      )}
    </div>
  );
}

export default function RightPanel({ skill, onClose, onSkillUpdate, autoEdit, onAutoEditConsumed }: RightPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocalizing, setIsLocalizing] = useState(false);
  const [draft, setDraft] = useState<SkillUpdatePayload>({});
  const [rawExpanded, setRawExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setIsEditing(false);
    setDraft({});
    setToast(null);
    setRawExpanded(false);
  }, [skill?.id]);

  useEffect(() => {
    if (autoEdit && skill && !isEditing) {
      startEdit();
      onAutoEditConsumed?.();
    }
  }, [autoEdit, isEditing, onAutoEditConsumed, skill]);

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft({});
    setToast(null);
  };

  const dismissPanel = () => {
    if (isEditing) {
      cancelEdit();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!skill) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') dismissPanel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skill, isEditing]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    if (type === 'success') setTimeout(() => setToast(null), 2000);
  };

  const startEdit = () => {
    if (!skill) return;
    setDraft({
      title: skill.title,
      description: skill.description,
      category: skill.category,
      tags: [...skill.tags],
      details: {
        whenToUse: [...skill.details.whenToUse],
        rawContent: skill.details.rawContent,
      },
    });
    setIsEditing(true);
    setToast(null);
  };

  const save = async () => {
    if (!skill) return;
    setIsSaving(true);
    const result = await api.updateSkillMetadata(skill.id, {
      displayTitle: draft.title,
      displayDescription: draft.description,
      description: draft.description,
      category: draft.category,
      tags: draft.tags,
      whenToUse: draft.details?.whenToUse,
      locale: 'zh-CN',
      translationSource: 'manual',
      translatedAt: new Date().toISOString(),
    });
    setIsSaving(false);

    if (result.success) {
      onSkillUpdate(result.data);
      setIsEditing(false);
      setDraft({});
      showToast('展示信息已保存，不会修改原始 SKILL.md', 'success');
    } else {
      showToast(result.error ?? '保存失败，请重试', 'error');
    }
  };

  const localize = async () => {
    if (!skill || isLocalizing) return;
    setIsLocalizing(true);
    const result = await api.localizeSkill(skill.id);
    setIsLocalizing(false);

    if (result.success) {
      onSkillUpdate(result.data);
      showToast('已生成中文展示信息，并保存到 metadata.json', 'success');
    } else {
      showToast(result.error ?? '生成失败，请重试', 'error');
    }
  };

  const copyPath = () => {
    if (!skill) return;
    navigator.clipboard.writeText(skill.sourcePath).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <AnimatePresence>
      {skill && (
        <>
          <motion.button
            key="detail-panel-overlay"
            type="button"
            aria-label="关闭技能详情"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissPanel}
            className="fixed inset-0 z-20 bg-[rgba(4,7,13,0.42)] backdrop-blur-[1px]"
          />

          <motion.aside
            key="detail-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-30 h-screen w-full border-l border-outline-default bg-surface-container shadow-[-4px_0_24px_rgba(0,0,0,0.5)] sm:w-[420px]"
          >
            <div className="flex h-full flex-col">
              <div className="sticky top-0 z-10 shrink-0 border-b border-outline-subtle bg-surface-container px-5">
                <div className="relative flex min-h-[64px] items-center justify-between gap-3">
                  <AnimatePresence>
                    {toast && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`absolute left-1/2 top-3 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] font-medium flex items-center gap-1.5 ${
                          toast.type === 'success'
                            ? 'border border-tertiary/25 bg-tertiary/15 text-tertiary'
                            : 'border border-error/25 bg-error/15 text-error'
                        }`}
                      >
                        {toast.type === 'success' && <CheckCircle2 className="h-3 w-3" />}
                        {toast.msg}
                        {toast.type === 'error' && (
                          <button onClick={() => setToast(null)} className="ml-1">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-on-surface-muted">技能详情</p>
                    <p className="mt-1 text-[13px] text-on-surface-variant">{isEditing ? '正在编辑中文展示信息' : '查看适用场景与原始内容'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={localize}
                        disabled={isLocalizing}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/8 px-3 text-[12px] font-medium text-primary transition-colors hover:bg-primary/14 disabled:opacity-50"
                        title="生成中文展示信息"
                      >
                        {isLocalizing ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /> : <Languages className="h-3.5 w-3.5" />}
                        中文化
                      </button>
                    )}

                    {!isEditing && (
                      <button
                        onClick={copyPath}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-bright text-on-surface-muted transition-colors hover:text-on-surface"
                        title="复制路径"
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4 text-tertiary" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}

                    <button
                      onClick={isEditing ? save : startEdit}
                      disabled={isSaving}
                      className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-medium transition-all ${
                        isEditing
                          ? 'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50'
                          : 'border border-outline-variant text-on-surface-variant hover:bg-surface-bright hover:text-on-surface'
                      }`}
                    >
                      {isEditing ? (
                        isSaving ? (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                            保存中
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            保存
                          </>
                        )
                      ) : (
                        <>
                          <Edit2 className="h-3.5 w-3.5" />
                          编辑
                        </>
                      )}
                    </button>

                    <button
                      onClick={dismissPanel}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-bright px-3 text-[12px] font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-card"
                    >
                      <X className="h-4 w-4" />
                      {isEditing ? '取消' : '关闭'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-5 border-b border-outline-subtle">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-bright flex items-center justify-center shrink-0 text-xl">
                      {(() => {
                        const Icon = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[skill.icon] ?? Icons.Cpu;
                        return <Icon className="w-6 h-6 text-primary" />;
                      })()}
                    </div>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          value={draft.title ?? ''}
                          onChange={event => setDraft(value => ({ ...value, title: event.target.value }))}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1.5 text-[17px] font-semibold text-on-surface outline-none focus:border-primary/40 mb-2"
                        />
                      ) : (
                        <>
                          <h2 className="text-[20px] font-semibold text-on-surface leading-tight mb-1">{skill.title}</h2>
                          {skill.originalTitle && skill.originalTitle.toLowerCase() !== skill.title.toLowerCase() && (
                            <p className="text-[12px] text-on-surface-muted font-mono mb-1">{skill.originalTitle}</p>
                          )}
                        </>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <select
                            value={draft.category ?? skill.category}
                            onChange={event => setDraft(value => ({ ...value, category: event.target.value as Category }))}
                            className="bg-surface-container-low border border-outline-variant rounded-md px-2 py-1 text-[12px] text-on-surface outline-none focus:border-primary/40"
                          >
                            {CATEGORIES.map(category => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[12px] bg-surface-bright border border-outline-variant text-on-surface-variant px-2 py-0.5 rounded">
                            {skill.category}
                          </span>
                        )}

                        <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${STATUS_STYLE[skill.status]}`}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 align-middle" />
                          {STATUS_LABEL[skill.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-on-surface-muted font-mono truncate">
                    {skill.fileName} · {formatRelativeTime(skill.updatedAt)} 更新
                  </p>
                </div>

                <Section title="能做什么">
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={draft.description ?? ''}
                      onChange={event => setDraft(value => ({ ...value, description: event.target.value }))}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface resize-none outline-none focus:border-primary/40"
                    />
                  ) : (
                    <p className="text-[13px] text-on-surface leading-relaxed">{skill.details.whatItDoes}</p>
                  )}
                </Section>

                <Section title="适用场景">
                  {isEditing ? (
                    <WhenToUseEditor
                      items={draft.details?.whenToUse ?? []}
                      onChange={items => setDraft(value => ({ ...value, details: { ...value.details, whenToUse: items } }))}
                    />
                  ) : skill.details.whenToUse.length > 0 ? (
                    <ul className="space-y-1.5">
                      {skill.details.whenToUse.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-[13px] text-on-surface">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-on-surface-muted">暂时没有场景说明</p>
                  )}
                </Section>

                <Section title="标签">
                  {isEditing ? (
                    <TagEditor tags={draft.tags ?? []} onChange={tags => setDraft(value => ({ ...value, tags }))} />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {skill.tags.length > 0 ? (
                        skill.tags.map(tag => (
                          <span key={tag} className="text-[11px] text-on-surface-muted bg-surface-bright px-2 py-1 rounded border border-outline-subtle">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-on-surface-muted">暂无标签</span>
                      )}
                    </div>
                  )}
                </Section>

                {!isEditing && (
                  <Section title="来源路径">
                    {(skill.sourcePaths?.length ?? 0) > 1 ? (
                      <div className="space-y-1.5">
                        {skill.sourcePaths?.map(pathItem => (
                          <div key={pathItem} className="flex items-center justify-between gap-2 bg-surface-code rounded-md px-3 py-2 border border-outline-subtle">
                            <code className="font-mono text-[11px] text-primary/80 truncate">{pathItem}</code>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 bg-surface-code rounded-md px-3 py-2 border border-outline-subtle">
                        <code className="font-mono text-[11px] text-primary/80 truncate">{skill.sourcePath}</code>
                        <button onClick={copyPath} className="shrink-0 text-on-surface-muted hover:text-on-surface transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </Section>
                )}

                <Section title="原始内容">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setRawExpanded(expanded => !expanded)}
                        className="flex items-center gap-1.5 text-[12px] text-on-surface-muted hover:text-on-surface transition-colors mb-2"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rawExpanded ? 'rotate-180' : ''}`} />
                        {rawExpanded ? '收起原始内容' : '展开查看原始内容'}
                      </button>

                      {!rawExpanded && (
                        <div className="text-[11px] text-on-surface-muted bg-warning/8 border border-warning/20 rounded px-3 py-2">
                          原始内容来自 SKILL.md。当前编辑只会保存到 metadata.json，不会修改原文件。
                        </div>
                      )}

                      {rawExpanded && (
                        <pre className="bg-surface-code border border-outline-subtle rounded-lg p-4 font-mono text-[12px] text-on-surface/70 leading-relaxed overflow-auto max-h-[280px] whitespace-pre-wrap break-words">
                          {skill.details.rawContent}
                        </pre>
                      )}
                    </>
                  ) : (
                    <pre className="bg-surface-code border border-outline-subtle rounded-lg p-4 font-mono text-[12px] text-on-surface/70 leading-relaxed overflow-auto max-h-[280px] whitespace-pre-wrap break-words">
                      {skill.details.rawContent}
                    </pre>
                  )}
                </Section>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-outline-subtle">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-muted mb-3">{title}</p>
      {children}
    </div>
  );
}
