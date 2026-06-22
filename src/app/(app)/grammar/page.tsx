"use client";

import { useState } from "react";
import { Loader2, SpellCheck } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, Panel, Select } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import type { GrammarLesson } from "@/lib/ai/schemas";

const topics = [
  "Present simple",
  "Past simple",
  "Present perfect",
  "Modal verbs",
  "Conditional sentences",
  "Comparatives",
  "Prepositions",
  "Articles",
];

export default function GrammarPage() {
  const [topic, setTopic] = useState(topics[0]);
  const [lesson, setLesson] = useState<GrammarLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await postJson<GrammarLesson>("/api/ai/grammar", { topic, level: "A2" });
      setLesson(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate grammar lesson.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Grammar"
        title="Learn grammar through practical examples"
        description="Choose a topic and get a Vietnamese explanation, daily examples, work examples, exercises, and answers."
        action={
          <Button onClick={generate} disabled={loading} icon={loading ? <Loader2 className="animate-spin" size={18} /> : <SpellCheck size={18} />}>
            Generate
          </Button>
        }
      />
      <Panel>
        <div className="max-w-sm space-y-2">
          <FieldLabel htmlFor="topic">Topic</FieldLabel>
          <Select id="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
            {topics.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </div>
        {error ? <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm text-[#7b3f34]">{error}</div> : null}
      </Panel>
      <Panel>
        {lesson ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">{lesson.topic}</h2>
              <p className="mt-3 text-sm leading-6 text-[#66716c]">{lesson.explanationVi}</p>
            </div>
            <ExampleList title="Daily examples" items={lesson.dailyExamples} />
            <ExampleList title="Work examples" items={lesson.workExamples} />
            <div>
              <h3 className="font-semibold">Exercise</h3>
              <div className="mt-3 grid gap-3">
                {lesson.exercise.map((item) => (
                  <div key={item.question} className="rounded-[8px] border border-line p-4 text-sm leading-6">
                    <p>{item.question}</p>
                    <p className="mt-2 text-[#66716c]">Answer: {item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No grammar lesson yet" description="Generate a topic when DeepSeek is connected." />
        )}
      </Panel>
    </div>
  );
}

function ExampleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p key={item} className="rounded-[8px] bg-panel-muted p-3 text-sm">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
