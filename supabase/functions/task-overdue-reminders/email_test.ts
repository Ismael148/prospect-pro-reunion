import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildOverdueDigest, daysLate, firstName, MAX_ROWS } from "./email.ts";

const task = (i: number, due: string) => ({ id: `t${i}`, title: `Tâche ${i}`, due_date: due, client_name: "Client <A>", project_name: null });

Deno.test("greets the team member by first name and counts tasks in the subject", () => {
  const { subject, html } = buildOverdueDigest(firstName("Anjara Rakoto"), [task(1, "2026-11-10"), task(2, "2026-11-12")], "2026-11-18");
  assertEquals(subject, "Anjara, vous avez 2 tâches en retard");
  assert(html.includes("Bonjour Anjara,"));
});

Deno.test("without a name the greeting is a plain Bonjour", () => {
  const { html } = buildOverdueDigest(firstName(""), [task(1, "2026-11-10")], "2026-11-18");
  assert(html.includes("Bonjour,"));
});

Deno.test("lists at most 25 tasks, oldest first, and mentions the rest", () => {
  const tasks = Array.from({ length: 30 }, (_, i) => task(i, `2026-10-${String(i + 1).padStart(2, "0")}`));
  const { html } = buildOverdueDigest("Andy", tasks.reverse(), "2026-11-18");
  assertEquals((html.match(/<strong>Tâche/g) || []).length, MAX_ROWS);
  assert(html.indexOf("Tâche 0<") < html.indexOf("Tâche 1<"));
  assert(html.includes("… et 5 autres tâches en retard"));
});

Deno.test("escapes client names and computes days late", () => {
  const { html } = buildOverdueDigest("Andy", [task(1, "2026-11-10")], "2026-11-18");
  assert(html.includes("Client &lt;A&gt;"));
  assertEquals(daysLate("2026-11-10", "2026-11-18"), 8);
});
