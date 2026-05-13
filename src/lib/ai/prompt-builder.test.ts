import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildPrompts,
  type EventData,
} from "@/lib/ai/prompt-builder";

const mockEventData: EventData = {
  name: "AI 创新大赛 2026",
  description: "面向全球开发者的 AI 应用创新赛事",
  startDate: "2026-04-01T00:00:00Z",
  endDate: "2026-06-30T23:59:59Z",
  registrationStart: "2026-04-01T00:00:00Z",
  registrationEnd: "2026-05-15T23:59:59Z",
  submissionStart: "2026-05-16T00:00:00Z",
  submissionEnd: "2026-06-15T23:59:59Z",
  reviewStart: "2026-06-16T00:00:00Z",
  reviewEnd: "2026-06-30T23:59:59Z",
  tracks: [
    { name: "企业智能体", description: "面向企业场景的 AI Agent 应用" },
    { name: "创意工具", description: "AI 驱动的创意内容生成工具" },
  ],
  challenges: [
    {
      title: "最佳用户体验",
      description: "在保证功能的同时提供极致用户体验",
    },
  ],
  prizes: [
    { title: "一等奖", amount: "10万元", description: "最具创新性的作品" },
    { title: "二等奖", amount: "5万元", description: "优秀技术实现" },
  ],
  scoringCriteria: [
    { name: "创新性", maxScore: 10, weight: 40 },
    { name: "完成度", maxScore: 10, weight: 35 },
    { name: "落地价值", maxScore: 10, weight: 25 },
  ],
};

describe("buildSystemPrompt", () => {
  it("包含 SKILL.md 内容", () => {
    const skillContent = "# Test Skill\nDesign guidelines here.";
    const prompt = buildSystemPrompt(skillContent);
    expect(prompt).toContain("Test Skill");
    expect(prompt).toContain("Design guidelines here.");
  });

  it("包含技术要求", () => {
    const prompt = buildSystemPrompt("skill");
    expect(prompt).toContain("<!DOCTYPE html>");
    expect(prompt).toContain("<style>");
    expect(prompt).toContain("Google Fonts");
    expect(prompt).toContain("响应式");
  });

  it("包含报名链接格式", () => {
    const prompt = buildSystemPrompt("skill");
    expect(prompt).toContain("/events/{slug}/register");
    expect(prompt).toContain("/events/{slug}/submit");
  });
});

describe("buildUserPrompt", () => {
  it("包含赛事基本信息", () => {
    const prompt = buildUserPrompt(mockEventData, "简约", "ai-innovation-2026");
    expect(prompt).toContain("AI 创新大赛 2026");
    expect(prompt).toContain("面向全球开发者");
    expect(prompt).toContain("ai-innovation-2026");
  });

  it("包含赛道信息", () => {
    const prompt = buildUserPrompt(mockEventData, "简约", "slug");
    expect(prompt).toContain("企业智能体");
    expect(prompt).toContain("创意工具");
  });

  it("包含奖项信息", () => {
    const prompt = buildUserPrompt(mockEventData, "简约", "slug");
    expect(prompt).toContain("一等奖");
    expect(prompt).toContain("10万元");
  });

  it("包含风格提示词", () => {
    const prompt = buildUserPrompt(mockEventData, "科技感十足", "slug");
    expect(prompt).toContain("科技感十足");
  });

  it("处理空赛道列表", () => {
    const data = { ...mockEventData, tracks: [] };
    const prompt = buildUserPrompt(data, "简约", "slug");
    expect(prompt).not.toContain("## 赛道");
  });

  it("处理空奖项列表", () => {
    const data = { ...mockEventData, prizes: [] };
    const prompt = buildUserPrompt(data, "简约", "slug");
    expect(prompt).not.toContain("## 奖项设置");
  });
});

describe("buildPrompts", () => {
  it("返回 system 和 user prompt", () => {
    const prompts = buildPrompts(mockEventData, "简约", "slug");
    expect(prompts.systemPrompt).toBeTruthy();
    expect(prompts.userPrompt).toBeTruthy();
    expect(prompts.systemPrompt).toContain("前端工程师");
    expect(prompts.userPrompt).toContain("AI 创新大赛 2026");
  });
});
