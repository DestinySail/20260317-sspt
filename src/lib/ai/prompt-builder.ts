import { readFileSync } from "fs";
import { join } from "path";

export interface EventData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  submissionStart: string;
  submissionEnd: string;
  reviewStart: string;
  reviewEnd: string;
  tracks: Array<{ name: string; description: string }>;
  challenges: Array<{ title: string; description: string }>;
  prizes: Array<{ title: string; amount: string; description: string }>;
  scoringCriteria: Array<{ name: string; maxScore: number; weight: number }>;
}

let cachedSkillContent: string | null = null;

export function loadSkillContent(): string {
  if (cachedSkillContent) return cachedSkillContent;

  const skillPath = join(
    process.cwd(),
    "skills",
    "frontend-design",
    "SKILL.md"
  );
  cachedSkillContent = readFileSync(skillPath, "utf-8");
  return cachedSkillContent;
}

export function buildSystemPrompt(skillContent: string): string {
  return `你是一个顶级的前端工程师和视觉设计师。你的任务是为赛事活动生成一个完整的、可直接在浏览器中运行的 HTML 页面。

## 设计指南

${skillContent}

## 技术要求

1. 输出一个完整的 \`<!DOCTYPE html>\` 文档
2. 所有 CSS 必须写在 \`<style>\` 标签内（内联样式）
3. 所有 JavaScript 必须写在 \`<script>\` 标签内
4. 字体可以通过 \`<link>\` 引入 Google Fonts CDN
5. 页面必须是响应式的，在移动端和桌面端都能正常显示
6. 使用语义化 HTML 标签
7. 确保页面可访问性（适当的 alt 文本、ARIA 标签等）
8. 所有文案使用中文
9. 页面中的"立即报名"按钮链接到 \`/events/{slug}/register\`（slug 会在 user prompt 中提供）
10. 页面中的"查看作品"按钮链接到 \`/events/{slug}/submit\`
11. 页面中的"返回赛事详情"按钮链接到 \`/events/{slug}\`

## 输出要求

- 只输出完整的 HTML 代码，不要包含任何解释、markdown 代码块标记或其他内容
- 确保 HTML 语法正确，可以在现代浏览器中直接渲染
- 代码要整洁、有组织，CSS 变量定义在 \`:root\` 中
- 不要使用任何需要构建工具或 npm 包的资源`;
}

export function buildUserPrompt(
  eventData: EventData,
  styleHint: string,
  eventSlug: string
): string {
  const tracksSection =
    eventData.tracks.length > 0
      ? `## 赛道\n${eventData.tracks.map((t) => `- **${t.name}**：${t.description}`).join("\n")}`
      : "";

  const challengesSection =
    eventData.challenges.length > 0
      ? `## 赛题\n${eventData.challenges.map((c) => `- **${c.title}**：${c.description}`).join("\n")}`
      : "";

  const prizesSection =
    eventData.prizes.length > 0
      ? `## 奖项设置\n${eventData.prizes.map((p) => `- **${p.title}**（${p.amount}）：${p.description}`).join("\n")}`
      : "";

  const scoringSection =
    eventData.scoringCriteria.length > 0
      ? `## 评分维度\n${eventData.scoringCriteria.map((s) => `- ${s.name}：最高分 ${s.maxScore}，权重 ${s.weight}%`).join("\n")}`
      : "";

  return `请为以下赛事生成一个完整的 HTML 落地页。

## 赛事信息
- 赛事名称：${eventData.name}
- 赛事描述：${eventData.description}
- 赛事时间：${eventData.startDate} 至 ${eventData.endDate}
- 报名时间：${eventData.registrationStart} 至 ${eventData.registrationEnd}
- 提交时间：${eventData.submissionStart} 至 ${eventData.submissionEnd}
- 评审时间：${eventData.reviewStart} 至 ${eventData.reviewEnd}
- 赛事 slug：${eventSlug}

${tracksSection}
${challengesSection}
${prizesSection}
${scoringSection}

## 风格要求
${styleHint}

请直接输出完整的 HTML 代码。`;
}

export interface PromptBundle {
  systemPrompt: string;
  userPrompt: string;
}

export function buildPrompts(
  eventData: EventData,
  styleHint: string,
  eventSlug: string
): PromptBundle {
  const skillContent = loadSkillContent();
  return {
    systemPrompt: buildSystemPrompt(skillContent),
    userPrompt: buildUserPrompt(eventData, styleHint, eventSlug),
  };
}
