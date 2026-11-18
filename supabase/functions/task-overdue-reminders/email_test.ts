import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildTaskReminder, daysLate, firstName, MAX_PER_MEMBER, pickTasksToRemind } from "./email.ts";

const task = (i: number, due: string) => ({
  id: `t${i}`, title: `Tâche ${i}`, due_date: due, client_name: "Client <A>", project_id: "p1", project_name: "Site vitrine",
});

Deno.test("one email per task, naming the task and its project in the subject", () => {
  const { subject, html } = buildTaskReminder(firstName("Anjara Rakoto"), task(1, "2026-11-10"), "2026-11-18", 3);
  assertEquals(subject, "Anjara, tâche en retard : Tâche 1 (Site vitrine)");
  assert(html.includes("Bonjour Anjara,"));
  assert(html.includes("https://ai.adamkom.com/projets/p1"));
  assert(html.includes("8 jours"));
  assert(html.includes("2 autres tâches en retard"));
});

Deno.test("without a name the greeting is a plain Bonjour", () => {
  const { subject, html } = buildTaskReminder(firstName(""), task(1, "2026-11-10"), "2026-11-18", 1);
  assert(subject.startsWith("Tâche en retard"));
  assert(html.includes("Bonjour,"));
});

Deno.test("at most 10 tasks per member each morning", () => {
  const tasks = Array.from({ length: 30 }, (_, i) => task(i, `2026-10-${String(i + 1).padStart(2, "0")}`));
  assertEquals(MAX_PER_MEMBER, 10);
  assertEquals(pickTasksToRemind(tasks, new Map(), "2026-11-18").length, 10);
});

Deno.test("never-reminded tasks go first, then the least recently reminded, oldest deadline breaks ties", () => {
  const tasks = [task(1, "2026-10-01"), task(2, "2026-10-05"), task(3, "2026-10-03")];
  const last = new Map([["t1", "2026-11-17T04:00:00Z"]]);
  assertEquals(pickTasksToRemind(tasks, last, "2026-11-18", 3).map((t) => t.id), ["t3", "t2", "t1"]);
});

Deno.test("tasks already reminded today are skipped", () => {
  const tasks = [task(1, "2026-10-01"), task(2, "2026-10-05")];
  assertEquals(pickTasksToRemind(tasks, new Map(), "2026-11-18", 10, new Set(["t1"])).map((t) => t.id), ["t2"]);
});

Deno.test("escapes client names and computes days late", () => {
  const { html } = buildTaskReminder("Andy", task(1, "2026-11-10"), "2026-11-18", 1);
  assert(html.includes("Client &lt;A&gt;"));
  assertEquals(daysLate("2026-11-10", "2026-11-18"), 8);
});
