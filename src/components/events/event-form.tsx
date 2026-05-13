"use client";

import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import {
  createEmptyEventCustomField,
  getDefaultEventFormValues,
  normalizeEventFormValues,
  type EventCustomFieldInput,
  type EventCustomFieldType,
  type EventFormInitialValues,
  type EventFormInput,
} from "@/lib/events/schema";

type EventMutationResult = {
  id: string;
  slug: string;
  published: boolean;
};

type EventFormProps = {
  action: (input: EventFormInput) => Promise<ActionResult<EventMutationResult>>;
  initialValues?: EventFormInitialValues;
  submitLabel?: string;
  helperText?: string;
  showGenerateLanding?: boolean;
};

type ArrayFieldName =
  | "tracks"
  | "challenges"
  | "prizes"
  | "scoringCriteria"
  | "customFields";

export function EventForm({
  action,
  initialValues,
  submitLabel = "创建赛事",
  helperText = "创建后默认保存为草稿，可回到列表页发布。",
  showGenerateLanding = false,
}: EventFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<EventFormInput>(() =>
    initialValues
      ? cloneEventFormValues(normalizeEventFormValues(initialValues))
      : getDefaultEventFormValues()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [shouldGenerateLanding, setShouldGenerateLanding] = useState(false);

  function updateValue<Key extends keyof EventFormInput>(key: Key, value: EventFormInput[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function addArrayItem<Key extends ArrayFieldName>(key: Key, item: EventFormInput[Key][number]) {
    setValues((current) => ({
      ...current,
      [key]: [...current[key], item] as EventFormInput[Key],
    }));
  }

  function updateArrayItem<Key extends ArrayFieldName>(
    key: Key,
    index: number,
    item: EventFormInput[Key][number]
  ) {
    setValues((current) => ({
      ...current,
      [key]: current[key].map((currentItem, currentIndex) =>
        currentIndex === index ? item : currentItem
      ) as EventFormInput[Key],
    }));
  }

  function removeArrayItem(key: ArrayFieldName, index: number) {
    setValues((current) => ({
      ...current,
      [key]: current[key].filter((_, currentIndex) => currentIndex !== index) as EventFormInput[
        typeof key
      ],
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await action(values);

      if (!result.success) {
        setFormError(result.error.message);
        setFieldErrors(result.error.fieldErrors ?? {});
        return;
      }

      if (shouldGenerateLanding && result.success) {
        router.push(`/admin/events/${result.data.id}/generating`);
      } else {
        router.push("/admin/events");
      }
      router.refresh();
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="赛事名称" error={fieldErrors.name?.[0]}>
              <Input
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                placeholder="例如：AI 创新挑战赛 2026"
              />
            </Field>

            <Field label="赛事描述" error={fieldErrors.description?.[0]} className="md:col-span-2">
              <Textarea
                value={values.description}
                onChange={(event) => updateValue("description", event.target.value)}
                placeholder="介绍赛事目标、适合人群、交付要求等"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>时间窗口</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="赛事开始" error={fieldErrors.startDate?.[0]}>
            <Input
              type="datetime-local"
              value={values.startDate}
              onChange={(event) => updateValue("startDate", event.target.value)}
            />
          </Field>
          <Field label="赛事结束" error={fieldErrors.endDate?.[0]}>
            <Input
              type="datetime-local"
              value={values.endDate}
              onChange={(event) => updateValue("endDate", event.target.value)}
            />
          </Field>
          <Field label="报名开始" error={fieldErrors.registrationStart?.[0]}>
            <Input
              type="datetime-local"
              value={values.registrationStart}
              onChange={(event) => updateValue("registrationStart", event.target.value)}
            />
          </Field>
          <Field label="报名截止" error={fieldErrors.registrationEnd?.[0]}>
            <Input
              type="datetime-local"
              value={values.registrationEnd}
              onChange={(event) => updateValue("registrationEnd", event.target.value)}
            />
          </Field>
          <Field label="提交开始" error={fieldErrors.submissionStart?.[0]}>
            <Input
              type="datetime-local"
              value={values.submissionStart}
              onChange={(event) => updateValue("submissionStart", event.target.value)}
            />
          </Field>
          <Field label="提交截止" error={fieldErrors.submissionEnd?.[0]}>
            <Input
              type="datetime-local"
              value={values.submissionEnd}
              onChange={(event) => updateValue("submissionEnd", event.target.value)}
            />
          </Field>
          <Field label="评审开始" error={fieldErrors.reviewStart?.[0]}>
            <Input
              type="datetime-local"
              value={values.reviewStart}
              onChange={(event) => updateValue("reviewStart", event.target.value)}
            />
          </Field>
          <Field label="评审截止" error={fieldErrors.reviewEnd?.[0]}>
            <Input
              type="datetime-local"
              value={values.reviewEnd}
              onChange={(event) => updateValue("reviewEnd", event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <ArraySection
        title="赛道配置"
        description="用于前台详情页展示与后续作品归档。"
        error={fieldErrors.tracks?.[0]}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem("tracks", { name: "", description: "" })}
          >
            <Plus />
            添加赛道
          </Button>
        }
      >
        {values.tracks.length === 0 ? (
          <EmptyArrayState text="暂未添加赛道，可稍后补充。" />
        ) : (
          <div className="space-y-3">
            {values.tracks.map((track, index) => (
              <ArrayItemCard
                key={`track-${index}`}
                title={`赛道 ${index + 1}`}
                onRemove={() => removeArrayItem("tracks", index)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="赛道名称">
                    <Input
                      value={track.name}
                      onChange={(event) =>
                        updateArrayItem("tracks", index, {
                          ...track,
                          name: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="赛道描述" className="md:col-span-2">
                    <Textarea
                      value={track.description}
                      onChange={(event) =>
                        updateArrayItem("tracks", index, {
                          ...track,
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </ArrayItemCard>
            ))}
          </div>
        )}
      </ArraySection>

      <ArraySection
        title="赛题配置"
        description="用于说明赛事主办方希望重点解决的问题。"
        error={fieldErrors.challenges?.[0]}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem("challenges", { title: "", description: "" })}
          >
            <Plus />
            添加赛题
          </Button>
        }
      >
        {values.challenges.length === 0 ? (
          <EmptyArrayState text="如赛事没有明确赛题，可留空。" />
        ) : (
          <div className="space-y-3">
            {values.challenges.map((challenge, index) => (
              <ArrayItemCard
                key={`challenge-${index}`}
                title={`赛题 ${index + 1}`}
                onRemove={() => removeArrayItem("challenges", index)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="赛题标题">
                    <Input
                      value={challenge.title}
                      onChange={(event) =>
                        updateArrayItem("challenges", index, {
                          ...challenge,
                          title: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="赛题描述" className="md:col-span-2">
                    <Textarea
                      value={challenge.description}
                      onChange={(event) =>
                        updateArrayItem("challenges", index, {
                          ...challenge,
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </ArrayItemCard>
            ))}
          </div>
        )}
      </ArraySection>

      <ArraySection
        title="奖项配置"
        description="展示奖项名称、说明与奖金信息。"
        error={fieldErrors.prizes?.[0]}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem("prizes", { title: "", description: "", amount: "" })}
          >
            <Plus />
            添加奖项
          </Button>
        }
      >
        {values.prizes.length === 0 ? (
          <EmptyArrayState text="如暂无奖金信息，可在后续再补。" />
        ) : (
          <div className="space-y-3">
            {values.prizes.map((prize, index) => (
              <ArrayItemCard
                key={`prize-${index}`}
                title={`奖项 ${index + 1}`}
                onRemove={() => removeArrayItem("prizes", index)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="奖项名称">
                    <Input
                      value={prize.title}
                      onChange={(event) =>
                        updateArrayItem("prizes", index, {
                          ...prize,
                          title: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="奖金 / 奖励">
                    <Input
                      value={prize.amount}
                      onChange={(event) =>
                        updateArrayItem("prizes", index, {
                          ...prize,
                          amount: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="奖项描述" className="md:col-span-2">
                    <Textarea
                      value={prize.description}
                      onChange={(event) =>
                        updateArrayItem("prizes", index, {
                          ...prize,
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              </ArrayItemCard>
            ))}
          </div>
        )}
      </ArraySection>

      <ArraySection
        title="评分维度"
        description="至少配置一个评分维度，支持最高分与权重。"
        error={fieldErrors.scoringCriteria?.[0]}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              addArrayItem("scoringCriteria", { name: "", maxScore: 10, weight: 10 })
            }
          >
            <Plus />
            添加维度
          </Button>
        }
      >
        <div className="space-y-3">
          {values.scoringCriteria.map((criterion, index) => (
            <ArrayItemCard
              key={`criterion-${index}`}
              title={`评分维度 ${index + 1}`}
              onRemove={() => removeArrayItem("scoringCriteria", index)}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="维度名称">
                  <Input
                    value={criterion.name}
                    onChange={(event) =>
                      updateArrayItem("scoringCriteria", index, {
                        ...criterion,
                        name: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="最高分">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={String(criterion.maxScore)}
                    onChange={(event) =>
                      updateArrayItem("scoringCriteria", index, {
                        ...criterion,
                        maxScore: Number(event.target.value || 0),
                      })
                    }
                  />
                </Field>
                <Field label="权重 (%)">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={String(criterion.weight)}
                    onChange={(event) =>
                      updateArrayItem("scoringCriteria", index, {
                        ...criterion,
                        weight: Number(event.target.value || 0),
                      })
                    }
                  />
                </Field>
              </div>
            </ArrayItemCard>
          ))}
        </div>
      </ArraySection>

      <ArraySection
        title="报名表单字段"
        description="可选配置用户报名时需要额外填写的信息。"
        error={fieldErrors.customFields?.[0]}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addArrayItem("customFields", createEmptyEventCustomField())}
          >
            <Plus />
            添加字段
          </Button>
        }
      >
        {values.customFields.length === 0 ? (
          <EmptyArrayState text="默认只收集账号信息与队伍名称。" />
        ) : (
          <div className="space-y-3">
            {values.customFields.map((field, index) => (
              <ArrayItemCard
                key={`field-${index}`}
                title={`字段 ${index + 1}`}
                onRemove={() => removeArrayItem("customFields", index)}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="字段名称">
                    <Input
                      value={field.label}
                      onChange={(event) =>
                        updateArrayItem("customFields", index, {
                          ...field,
                          label: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="字段类型" htmlFor={`custom-field-type-${index}`}>
                    <select
                      id={`custom-field-type-${index}`}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={field.type}
                      onChange={(event) =>
                        updateArrayItem("customFields", index, {
                          ...field,
                          type: event.target.value as EventCustomFieldType,
                          options:
                            event.target.value === "select" ? field.options : [],
                        })
                      }
                    >
                      <option value="text">单行文本</option>
                      <option value="textarea">多行文本</option>
                      <option value="url">链接</option>
                      <option value="select">下拉选择</option>
                    </select>
                  </Field>
                  <Field label="字段选项（逗号分隔）" className="md:col-span-2">
                    <Input
                      disabled={field.type !== "select"}
                      value={field.options.join(", ")}
                      onChange={(event) =>
                        updateArrayItem("customFields", index, {
                          ...field,
                          options: splitOptions(event.target.value),
                        })
                      }
                      placeholder="如：企业服务, 内容生成, 智能办公"
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        updateArrayItem("customFields", index, {
                          ...field,
                          required: event.target.checked,
                        })
                      }
                      className="size-4 rounded border-border text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    设为必填字段
                  </label>
                </div>
              </ArrayItemCard>
            ))}
          </div>
        )}
      </ArraySection>

      <div className="border border-border bg-card p-6">
        {formError ? (
          <div className="mb-4 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{helperText}</p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/events")}>
              取消
            </Button>
            {showGenerateLanding ? (
              <>
                <Button type="submit" disabled={isPending} onClick={() => setShouldGenerateLanding(false)}>
                  {isPending && !shouldGenerateLanding ? <LoaderCircle className="animate-spin" /> : null}
                  {isPending && !shouldGenerateLanding ? "保存中..." : "仅保存"}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  onClick={() => setShouldGenerateLanding(true)}
                >
                  {isPending && shouldGenerateLanding ? <LoaderCircle className="animate-spin" /> : null}
                  {isPending && shouldGenerateLanding ? "保存中..." : "保存并生成赛事页"}
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? <LoaderCircle className="animate-spin" /> : null}
                {isPending ? "提交中..." : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  className,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ArraySection({
  title,
  description,
  error,
  action,
  children,
}: {
  title: string;
  description: string;
  error?: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-col gap-4 border-b border-border/80 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ArrayItemCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border border-border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 />
          删除
        </Button>
      </div>
      {children}
    </div>
  );
}

function EmptyArrayState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function splitOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cloneEventFormValues(values: EventFormInput): EventFormInput {
  return {
    ...values,
    tracks: values.tracks.map((item) => ({ ...item })),
    challenges: values.challenges.map((item) => ({ ...item })),
    prizes: values.prizes.map((item) => ({ ...item })),
    scoringCriteria: values.scoringCriteria.map((item) => ({ ...item })),
    customFields: values.customFields.map((item) => cloneCustomField(item)),
  };
}

function cloneCustomField(field: EventCustomFieldInput): EventCustomFieldInput {
  return {
    ...field,
    id: field.id,
    options: [...field.options],
  };
}
