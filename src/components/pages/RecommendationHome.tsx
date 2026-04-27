import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import type { RecommendationScene, SceneRecommendationResult } from '../../types';

interface RecommendationHomeProps {
  scenes: RecommendationScene[];
  selectedSceneId: string;
  result: SceneRecommendationResult;
  detectedSkillCount: number;
  onSceneChange: (sceneId: string) => void;
  onRecommendationClick: (skillId: string | null) => void;
}

export default function RecommendationHome({
  scenes,
  selectedSceneId,
  result,
  detectedSkillCount,
  onSceneChange,
  onRecommendationClick,
}: RecommendationHomeProps) {
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
            Skill Dashboard 不只是整理本地 skills，而是在具体任务里，帮你更快找到此刻该用的能力。
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-[12px] text-primary">
          <CheckCircle2 className="h-4 w-4" />
          当前推荐基于你本地已识别的 {detectedSkillCount} 个 skills
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-outline-subtle bg-surface-container-low/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-[15px] font-medium text-on-surface">你现在要做什么？</p>
        </div>
        <p className="mb-4 text-[13px] leading-6 text-on-surface-muted">
          从一个具体任务开始，系统会基于你本地已有 skills 给出推荐。
        </p>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {scenes.map(scene => {
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
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-muted">
        <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">
          当前场景已匹配 {result.coverage.matchedCount} 个高相关 skills
        </span>
        <span className="rounded-full border border-outline-subtle bg-surface-bright px-3 py-1">
          共展示 {result.coverage.totalCandidates} 个推荐项
        </span>
        {result.coverage.incompleteCount > 0 && (
          <span className="rounded-full border border-warning/30 bg-warning/12 px-3 py-1 text-warning">
            其中 {result.coverage.incompleteCount} 个条目描述不足，建议后续补充 metadata
          </span>
        )}
      </div>

      <div className="mb-3">
        <h2 className="text-[18px] font-semibold text-on-surface">为你推荐的能力组合</h2>
        <p className="mt-1 text-[13px] text-on-surface-muted">这些推荐来自你本地已经安装和识别到的 skills，不是通用模板。</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {result.items.map(item => (
          <button
            key={item.id}
            onClick={() => onRecommendationClick(item.matchedSkillId)}
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
              {item.recommendationReason}
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
