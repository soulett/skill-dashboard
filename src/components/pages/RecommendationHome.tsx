import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RecommendationScene, SceneRecommendationResult } from '../../types';

interface RecommendationHomeProps {
  scenes: RecommendationScene[];
  selectedSceneId: string;
  result: SceneRecommendationResult;
  detectedSkillCount: number;
  promptModeOpen: boolean;
  taskPrompt: string;
  promptMatching: boolean;
  promptRecommendations: SceneRecommendationResult['items'];
  promptError: string | null;
  promptFallbackUsed: boolean;
  promptRequestState: 'idle' | 'success' | 'empty' | 'error';
  promptElapsedSec: number;
  onTogglePromptMode: () => void;
  onTaskPromptChange: (value: string) => void;
  onPromptMatch: () => void;
  onSceneChange: (sceneId: string) => void;
  onRecommendationClick: (recommendedSkillId: string, matchedSkillId: string | null) => void;
  onPromptRecommendationClick: (recommendedSkillId: string, matchedSkillId: string | null) => void;
}

export default function RecommendationHome({
  scenes,
  selectedSceneId,
  result,
  detectedSkillCount,
  promptModeOpen,
  taskPrompt,
  promptMatching,
  promptRecommendations,
  promptError,
  promptFallbackUsed,
  promptRequestState,
  promptElapsedSec,
  onTogglePromptMode,
  onTaskPromptChange,
  onPromptMatch,
  onSceneChange,
  onRecommendationClick,
  onPromptRecommendationClick,
}: RecommendationHomeProps) {
  const [showMoreScenes, setShowMoreScenes] = useState(false);
  const primaryScenes = useMemo(() => scenes.filter(scene => scene.is_primary !== false), [scenes]);
  const secondaryScenes = useMemo(() => scenes.filter(scene => scene.is_primary === false), [scenes]);
  const visibleScenes = showMoreScenes ? [...primaryScenes, ...secondaryScenes] : primaryScenes;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-[28px] border border-outline-subtle bg-surface-card/80 p-5 sm:p-7"
    >
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-primary">本地 AI 能力工作台</p>
          <h1 className="font-display text-[2.1rem] leading-[1.02] text-on-surface sm:text-[3rem]">
            先让你想起
            <br />
            自己已经拥有的 AI 能力。
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[15px]">
            Skill Dashboard 在具体任务里，帮你更快找到此刻该用的本地能力。
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-[12px] text-primary">
          <CheckCircle2 className="h-4 w-4" />
          推荐基于你本地已识别的 {detectedSkillCount} 个 skills，不是通用模板。
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-outline-subtle bg-surface-container-low/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-[15px] font-medium text-on-surface">你现在要做什么？</p>
        </div>
        <p className="mb-4 text-[13px] leading-6 text-on-surface-muted">
          先进入任务，再看本地这批能力里哪几个值得先用。
        </p>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {visibleScenes.map(scene => {
            const isActive = scene.scene_id === selectedSceneId;
            return (
              <button
                key={scene.scene_id}
                onClick={() => onSceneChange(scene.scene_id)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all duration-150 ${
                  isActive
                    ? 'border-primary/40 bg-primary/12 shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                    : 'border-outline-variant bg-surface-card hover:border-outline hover:bg-surface-container-high'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={`text-[14px] font-medium ${isActive ? 'text-primary' : 'text-on-surface'}`}>{scene.label}</span>
                  {isActive && <ArrowRight className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[12px] leading-5 text-on-surface-muted">{scene.description}</p>
              </button>
            );
          })}
        </div>
        {secondaryScenes.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowMoreScenes(value => !value)}
              className="rounded-lg border border-outline-variant bg-surface-card px-3 py-1.5 text-[12px] text-on-surface-muted hover:border-outline hover:text-on-surface"
            >
              {showMoreScenes ? '收起更多场景' : `更多场景（${secondaryScenes.length}）`}
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-outline-subtle bg-surface-container-low/70 p-4">
        <button
          onClick={onTogglePromptMode}
          className="w-full text-left text-[14px] font-medium text-on-surface hover:text-primary"
        >
          没命中？描述你的任务
        </button>
        {promptModeOpen && (
          <div className="mt-3 space-y-3">
            <textarea
              value={taskPrompt}
              onChange={event => onTaskPromptChange(event.target.value)}
              placeholder="描述你现在要完成的任务，AI 会在你本地技能库里匹配最合适的 5 个 skill"
              rows={3}
              className="w-full rounded-lg border border-outline-variant bg-surface-card px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-muted"
            />
            <button
              onClick={onPromptMatch}
              disabled={promptMatching || !taskPrompt.trim()}
              className="rounded-lg border border-primary/35 bg-primary px-3 py-2 text-[12px] font-medium text-[#071318] disabled:opacity-50"
            >
              {promptMatching ? '匹配中...' : '开始匹配'}
            </button>
            {promptMatching && (
              <p className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[12px] text-primary">
                正在匹配（{promptElapsedSec}s）
              </p>
            )}
            {promptMatching && promptElapsedSec >= 8 && (
              <p className="rounded-md border border-outline-subtle bg-surface-card px-2 py-1 text-[12px] text-on-surface">
                响应稍慢，仍在处理中。若超过 20 秒可重试一次。
              </p>
            )}
            {promptError && <p className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[12px] text-warning">{promptError}</p>}
            {promptRequestState === 'success' && (
              <p className="rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[12px] font-medium text-success">匹配完成：已返回 {promptRecommendations.length} 条推荐。</p>
            )}
            {promptRequestState === 'empty' && (
              <p className="rounded-md border border-outline-subtle bg-surface-card px-2 py-1 text-[12px] text-on-surface">匹配完成：本次返回 0 条。</p>
            )}
            {promptRequestState === 'error' && (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[12px] font-medium text-warning">匹配失败：请检查后端连接或稍后重试。</p>
            )}
            {promptFallbackUsed && <p className="rounded-md border border-outline-subtle bg-surface-card px-2 py-1 text-[12px] text-on-surface">当前结果来自规则回退（AI 增强不可用）。</p>}
            {promptRecommendations.length > 0 && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
                <p className="text-[12px] font-medium text-primary">AI 为你匹配的 {promptRecommendations.length} 个 skill</p>
                {promptRecommendations.map(item => (
                  <button
                    key={`prompt-${item.id}`}
                    onClick={() => onPromptRecommendationClick(item.id, item.matchedSkillId)}
                    className="w-full rounded-xl border border-outline-variant bg-surface-card px-3 py-2 text-left hover:border-primary/35"
                  >
                    <div className="text-[13px] font-medium text-on-surface">{item.title}</div>
                    <div className="mt-1 space-y-1 text-[12px] text-on-surface">
                      <p>{item.reasonBlocks[0]}</p>
                      {item.reasonBlocks[1] && <p className="text-on-surface-variant">{item.reasonBlocks[1]}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-muted">
        <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">
          这个场景里，当前最值得先看的有 {result.coverage.matchedCount} 个 skills
        </span>
        <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">共展示 {result.coverage.totalCandidates} 个推荐项</span>
        {result.coverage.incompleteCount > 0 && (
          <span className="rounded-full border border-warning/30 bg-warning/12 px-3 py-1 text-warning">
            其中 {result.coverage.incompleteCount} 个条目描述不足，建议后续补充 metadata
          </span>
        )}
      </div>

      <div className="mb-3">
        <h2 className="text-[18px] font-semibold text-on-surface">你现在可以先用这几个 skills</h2>
        <p className="mt-1 text-[13px] text-on-surface-muted">这些推荐优先考虑当前任务、来源平台和条目完整度。</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {result.items.map(item => (
          <button
            key={item.id}
            onClick={() => onRecommendationClick(item.id, item.matchedSkillId)}
            className="rounded-2xl border border-outline-variant bg-surface-container-low/70 p-4 text-left transition-all duration-150 hover:border-outline hover:bg-surface-container-high"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[16px] font-semibold text-on-surface">{item.title}</span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.sourceClassName}`}>
                {item.sourceLabel}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.healthClassName}`}>
                {item.healthLabel}
              </span>
            </div>

            <p className="mb-3 text-[13px] leading-6 text-on-surface-variant">{item.description}</p>
            <div className="rounded-xl border border-primary/15 bg-primary/8 px-3 py-2 text-[12px] leading-5 text-on-surface">
              <div className="mb-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                {item.evidenceLabel}
              </div>
              <div className="space-y-1">
                {item.reasonBlocks.map((line, index) => (
                  <p key={`${item.id}-reason-${index}`}>{index + 1}. {line}</p>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {item.tags.map(tag => (
                <span key={tag} className="rounded-full border border-outline-subtle bg-surface-bright px-2 py-0.5 text-[11px] text-on-surface-muted">
                  {tag}
                </span>
              ))}
              {item.matchedSkillId ? (
                <span className="ml-auto text-[11px] text-primary">查看详情</span>
              ) : (
                <span className="ml-auto text-[11px] text-on-surface-muted">仅展示推荐画像</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
