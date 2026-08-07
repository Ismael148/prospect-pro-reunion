import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  SEO_CURRICULUM,
  ALL_LESSONS,
  TOTAL_LESSONS,
  TOTAL_DURATION,
  getLevelBadge,
  type SeoLesson,
} from "@/lib/seo-curriculum";
import {
  useMySeoProgress,
  useUpsertSeoProgress,
  useResetSeoLesson,
  useTeamSeoProgress,
} from "@/hooks/use-seo-training";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  ExternalLink,
  Copy,
  Trophy,
  RotateCcw,
  BookOpen,
  Users,
} from "lucide-react";

/* -------------------------------------------------------------- */
function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label ?? "Code"}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-2 text-[11px]"
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Code copié");
          }}
        >
          <Copy className="h-3 w-3" /> Copier
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LessonBody({ lesson }: { lesson: SeoLesson }) {
  return (
    <div className="space-y-4">
      {lesson.blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return (
              <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                {b.text}
              </p>
            );
          case "list":
            return (
              <ul key={i} className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{it}</span>
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={i} className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {j + 1}
                    </span>
                    <span className="text-muted-foreground">{it}</span>
                  </li>
                ))}
              </ol>
            );
          case "code":
            return <CodeBlock key={i} code={b.code} label={b.label} />;
          case "tip":
            return (
              <div
                key={i}
                className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
              >
                <Lightbulb className="h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-sm text-muted-foreground">{b.text}</p>
              </div>
            );
          case "warn":
            return (
              <div
                key={i}
                className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-muted-foreground">{b.text}</p>
              </div>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {b.head.map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-t border-border">
                        {r.map((c, k) => (
                          <td key={k} className="px-3 py-2 text-muted-foreground">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

/* -------------------------------------------------------------- */
function LessonQuiz({
  lesson,
  onValidate,
  savedScore,
}: {
  lesson: SeoLesson;
  onValidate: (score: number, total: number, notes: string) => void;
  savedScore?: { score: number | null; total: number | null; notes: string | null };
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState(savedScore?.notes ?? "");

  const score = lesson.quiz.reduce(
    (s, q, i) => s + (answers[i] === q.answer ? 1 : 0),
    0,
  );
  const total = lesson.quiz.length;
  const allAnswered = Object.keys(answers).length === total;

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-bold">Quiz de validation</h4>
        {savedScore?.score != null && (
          <Badge variant="outline" className="ml-auto text-[11px]">
            Dernier score : {savedScore.score}/{savedScore.total}
          </Badge>
        )}
      </div>

      {lesson.quiz.map((q, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-medium">
            {i + 1}. {q.q}
          </p>
          <div className="grid gap-1.5">
            {q.options.map((opt, j) => {
              const selected = answers[i] === j;
              const isRight = j === q.answer;
              return (
                <button
                  key={j}
                  disabled={submitted}
                  onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                  className={`rounded-lg border px-3 py-2 text-left text-[13px] transition
                    ${
                      submitted && isRight
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : submitted && selected
                          ? "border-destructive/50 bg-destructive/10"
                          : selected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent/50"
                    }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && (
            <p className="text-xs text-muted-foreground">💡 {q.explanation}</p>
          )}
        </div>
      ))}

      <Textarea
        placeholder="Mes notes personnelles sur cette leçon (facultatif)…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="text-sm"
      />

      {!submitted ? (
        <Button
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
          className="w-full"
        >
          Corriger le quiz
        </Button>
      ) : (
        <div className="space-y-2">
          <div
            className={`rounded-lg p-3 text-center text-sm font-semibold ${
              score === total
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            {score === total
              ? `🎉 Parfait — ${score}/${total}`
              : `${score}/${total} — relis la leçon puis réessaie`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Refaire
            </Button>
            <Button className="flex-1" onClick={() => onValidate(score, total, notes)}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Valider la leçon
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- */
export default function FormationSeo() {
  const { hasRole } = useAuth();
  const isManager = hasRole("admin") || hasRole("agent_master");
  const { data: myProgress = [] } = useMySeoProgress();
  const upsert = useUpsertSeoProgress();
  const resetLesson = useResetSeoLesson();
  const { data: team = [] } = useTeamSeoProgress(isManager);

  const doneMap = useMemo(
    () => new Map(myProgress.map((p) => [p.lesson_id, p])),
    [myProgress],
  );
  const doneCount = myProgress.length;
  const globalPct = Math.round((doneCount / TOTAL_LESSONS) * 100);

  const handleValidate = async (
    lesson: SeoLesson,
    moduleId: string,
    score: number,
    total: number,
    notes: string,
  ) => {
    await upsert.mutateAsync({
      lesson_id: lesson.id,
      module_id: moduleId,
      quiz_score: score,
      quiz_total: total,
      notes: notes || null,
    });
    toast.success(`Leçon validée : ${lesson.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-[Space_Grotesk] text-2xl font-bold">
              Académie SEO Webmaster
            </h1>
            <p className="text-sm text-muted-foreground">
              Tout le référencement naturel : CMS (WordPress, Shopify, PrestaShop, Wix,
              Webflow, Joomla, Drupal) et sites sur-mesure HTML / CSS / JS.
            </p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{TOTAL_LESSONS}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Leçons
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Math.round(TOTAL_DURATION / 60)}h</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Durée
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{globalPct}%</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Ma progression
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={globalPct} className="h-2" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {doneCount} / {TOTAL_LESSONS} leçons validées
            {globalPct === 100 && " — 🏆 Certification interne obtenue !"}
          </p>
        </div>
      </motion.div>

      <Tabs defaultValue="cours">
        <TabsList>
          <TabsTrigger value="cours" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Formation
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="suivi" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Suivi de l'équipe
            </TabsTrigger>
          )}
        </TabsList>

        {/* --------------------------- COURS --------------------------- */}
        <TabsContent value="cours" className="mt-4 space-y-4">
          {SEO_CURRICULUM.map((mod) => {
            const modDone = mod.lessons.filter((l) => doneMap.has(l.id)).length;
            const pct = Math.round((modDone / mod.lessons.length) * 100);
            return (
              <Card key={mod.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl">{mod.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{mod.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{mod.tagline}</p>
                    </div>
                    <Badge
                      variant={pct === 100 ? "default" : "outline"}
                      className="shrink-0"
                    >
                      {modDone}/{mod.lessons.length}
                    </Badge>
                  </div>
                  <Progress value={pct} className="mt-2 h-1.5" />
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="single" collapsible className="w-full">
                    {mod.lessons.map((lesson) => {
                      const saved = doneMap.get(lesson.id);
                      return (
                        <AccordionItem key={lesson.id} value={lesson.id}>
                          <AccordionTrigger className="text-left">
                            <div className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                              {saved ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                              )}
                              <span className="text-sm font-medium">{lesson.title}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${getLevelBadge(lesson.level)}`}
                              >
                                {lesson.level}
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" /> {lesson.duration} min
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-5 pt-2">
                            <div className="rounded-lg border-l-2 border-primary bg-muted/30 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                Objectif
                              </p>
                              <p className="text-sm">{lesson.objective}</p>
                            </div>

                            <LessonBody lesson={lesson} />

                            <div className="rounded-lg border border-border p-3">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Checklist terrain
                              </p>
                              <div className="space-y-2">
                                {lesson.checklist.map((c, i) => (
                                  <label
                                    key={i}
                                    className="flex cursor-pointer items-start gap-2 text-sm"
                                  >
                                    <Checkbox className="mt-0.5" />
                                    <span className="text-muted-foreground">{c}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {lesson.resources && lesson.resources.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {lesson.resources.map((r) => (
                                  <a
                                    key={r.url}
                                    href={r.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
                                  >
                                    <ExternalLink className="h-3 w-3" /> {r.label}
                                  </a>
                                ))}
                              </div>
                            )}

                            <LessonQuiz
                              lesson={lesson}
                              savedScore={
                                saved
                                  ? {
                                      score: saved.quiz_score,
                                      total: saved.quiz_total,
                                      notes: saved.notes,
                                    }
                                  : undefined
                              }
                              onValidate={(s, t, n) =>
                                handleValidate(lesson, mod.id, s, t, n)
                              }
                            />

                            {saved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => resetLesson.mutate(lesson.id)}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Réinitialiser ma validation
                              </Button>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* --------------------------- SUIVI --------------------------- */}
        {isManager && (
          <TabsContent value="suivi" className="mt-4 space-y-3">
            {team.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun membre trouvé.</p>
            )}
            {[...team]
              .sort((a, b) => b.rows.length - a.rows.length)
              .map((m) => {
                const pct = Math.round((m.rows.length / TOTAL_LESSONS) * 100);
                const scored = m.rows.filter((r) => r.quiz_score != null);
                const avg = scored.length
                  ? Math.round(
                      (scored.reduce(
                        (s, r) => s + (r.quiz_score! / (r.quiz_total || 1)) * 100,
                        0,
                      ) /
                        scored.length),
                    )
                  : null;
                const last = m.rows
                  .map((r) => r.completed_at)
                  .sort()
                  .at(-1);
                return (
                  <Card key={m.user_id}>
                    <CardContent className="flex flex-wrap items-center gap-4 p-4">
                      <Avatar className="h-10 w-10">
                        {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                        <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                          {m.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-[160px] flex-1">
                        <p className="text-sm font-semibold">{m.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.roles.join(", ") || "—"}
                        </p>
                      </div>
                      <div className="min-w-[180px] flex-[2]">
                        <Progress value={pct} className="h-2" />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {m.rows.length}/{TOTAL_LESSONS} leçons · {pct}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{avg != null ? `${avg}%` : "—"}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">
                          Moy. quiz
                        </p>
                      </div>
                      <div className="min-w-[110px] text-right">
                        <p className="text-[11px] text-muted-foreground">
                          {last
                            ? `Dernière activité : ${new Date(last).toLocaleDateString("fr-FR")}`
                            : "Pas encore commencé"}
                        </p>
                        {pct === 100 && (
                          <Badge className="mt-1 text-[10px]">🏆 Certifié</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            <p className="text-xs text-muted-foreground">
              Progression calculée sur {TOTAL_LESSONS} leçons ·{" "}
              {ALL_LESSONS.length} modules de contenu.
            </p>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
