"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GenerateLandingButtonProps {
  eventId: string;
  hasLandingPage: boolean;
}

const STYLE_HINTS = [
  { id: "minimal", label: "简约" },
  { id: "tech", label: "科技感" },
  { id: "vibrant", label: "活力" },
  { id: "retro", label: "复古未来" },
  { id: "luxury", label: "奢华精致" },
  { id: "editorial", label: "杂志风" },
];

export function GenerateLandingButton({
  eventId,
  hasLandingPage,
}: GenerateLandingButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHint, setSelectedHint] = useState("minimal");

  const handleStartGenerate = () => {
    router.push(
      `/admin/events/${eventId}/generating?styleHint=${selectedHint}`
    );
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {hasLandingPage ? "重新生成赛事页" : "生成赛事页"}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 border border-border bg-background p-4 shadow-lg">
          <h3 className="mb-3 text-sm font-semibold">选择风格方向</h3>
          <div className="space-y-2">
            {STYLE_HINTS.map((hint) => (
              <label
                key={hint.id}
                className={`flex cursor-pointer items-center gap-3 border p-3 transition-colors ${
                  selectedHint === hint.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="styleHint"
                  value={hint.id}
                  checked={selectedHint === hint.id}
                  onChange={(e) => setSelectedHint(e.target.value)}
                />
                <div className="text-sm font-medium">{hint.label}</div>
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleStartGenerate}>
              开始生成
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
