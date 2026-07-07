import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Globe,
  CheckCircle2,
  Circle,
  Star,
  MessageSquare,
  Camera,
  Target,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GMB_ACTIVITY_LABELS, GMB_ACTIVITY_ICONS } from "@/hooks/use-gmb-activities";
import { GMB_STATUS_LABELS, GMB_STATUS_COLORS, type GmbStatus } from "@/hooks/use-client-gmb";
import { goalProgressColor } from "@/hooks/use-gmb-goals";

interface DashboardData {
  client: { company_name: string; city: string | null; sector: string | null };
  gmb: any | null;
  activities: Array<{
    id: string;
    action_type: keyof typeof GMB_ACTIVITY_LABELS;
    description: string;
    link: string | null;
    performed_at: string;
  }>;
  goal: any | null;
}

const CHECKLIST_LABELS: Array<{ key: string; label: string }> = [
  { key: "checklist_account_created", label: "Fiche créée sur Google" },
  { key: "checklist_postal_requested", label: "Vérification demandée" },
  { key: "checklist_code_received", label: "Code de vérification reçu" },
  { key: "checklist_verified", label: "Fiche activée & vérifiée" },
  { key: "checklist_logo_added", label: "Logo ajouté" },
  { key: "checklist_photos_added", label: "Photos ajoutées" },
  { key: "checklist_hours_set", label: "Horaires renseignés" },
  { key: "checklist_description_added", label: "Description SEO ajoutée" },
];

export default function GmbPublic() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: res, error } = await (supabase as any).rpc("get_public_gmb_dashboard", {
        p_token: token,
      });
      if (error || !res) setNotFound(true);
      else setData(res as DashboardData);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center">
        <p className="text-white/70">Chargement…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien ne correspond à aucune fiche Google en suivi. Contacte Adamkom pour en obtenir un nouveau.
          </p>
        </Card>
      </div>
    );
  }

  const { client, gmb, activities, goal } = data;

  const checklistDone = gmb
    ? CHECKLIST_LABELS.filter((c) => gmb[c.key]).length
    : 0;
  const checklistPct = Math.round((checklistDone / CHECKLIST_LABELS.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #ff006e 0%, #ff4d94 100%)" }}
            >
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">
                Votre fiche Google
              </h1>
              <p className="text-sm text-white/60">
                Suivi transparent en temps réel — par Adamkom
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6">
        {/* Client info */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold">{client.company_name}</h2>
              {client.city && (
                <p className="mt-1 flex items-center gap-1 text-sm text-white/60">
                  <MapPin className="h-3.5 w-3.5" /> {client.city}
                </p>
              )}
              {client.sector && (
                <Badge variant="outline" className="mt-2 border-white/20 text-white/80">
                  {client.sector}
                </Badge>
              )}
            </div>
            {gmb && (
              <Badge className={`${GMB_STATUS_COLORS[gmb.status as GmbStatus]} border-0`}>
                {GMB_STATUS_LABELS[gmb.status as GmbStatus]}
              </Badge>
            )}
          </div>

          {gmb?.gmb_url && (
            <a
              href={gmb.gmb_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition mr-2"
              style={{ background: "#ff006e", color: "white" }}
            >
              <ExternalLink className="h-4 w-4" /> Voir ma fiche Google
            </a>
          )}
          {gmb && (
            <button
              onClick={async () => {
                const { generateGmbReport } = await import("@/lib/export-gmb-report");
                const now = new Date();
                generateGmbReport({
                  clientName: client.company_name,
                  city: client.city,
                  sector: client.sector,
                  gmbUrl: gmb.gmb_url,
                  monthLabel: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
                  generatedAt: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
                  activities: (activities || []).map((a) => ({
                    action_type: a.action_type,
                    actionLabel: GMB_ACTIVITY_LABELS[a.action_type] || "Action",
                    description: a.description,
                    performed_at: a.performed_at,
                    link: a.link,
                  })),
                  checklist: CHECKLIST_LABELS.map((c) => ({
                    label: c.label,
                    done: Boolean(gmb[c.key]),
                  })),
                  goal: goal || null,
                  totalReviews: gmb.total_reviews,
                  averageRating: gmb.average_rating,
                });
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4" /> Télécharger le rapport PDF
            </button>
          )}
        </section>

        {!gmb && (
          <Card className="p-6 bg-white/5 border-white/10 text-white">
            <p>Le suivi de votre fiche Google n'est pas encore activé. Notre équipe vous contactera bientôt.</p>
          </Card>
        )}

        {gmb && (
          <>
            {/* Global progress */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Target className="h-5 w-5" style={{ color: "#ff006e" }} />
                  Progression globale
                </h3>
                <span className="text-2xl font-bold" style={{ color: "#ff006e" }}>
                  {checklistPct}%
                </span>
              </div>
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${checklistPct}%`,
                    background: "linear-gradient(90deg, #ff006e, #ff4d94)",
                  }}
                />
              </div>
              <ul className="grid gap-2 md:grid-cols-2">
                {CHECKLIST_LABELS.map((c) => {
                  const done = gmb[c.key];
                  return (
                    <li key={c.key} className="flex items-center gap-2 text-sm">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-white/30" />
                      )}
                      <span className={done ? "text-white/90" : "text-white/40"}>{c.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Monthly goals */}
            {goal && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <Target className="h-5 w-5" style={{ color: "#ff006e" }} />
                  Objectifs de {goal.month_year}
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <PublicGoalCard
                    icon={<MessageSquare className="h-5 w-5" />}
                    label="Posts"
                    done={goal.posts_done}
                    target={goal.posts_target}
                  />
                  <PublicGoalCard
                    icon={<Camera className="h-5 w-5" />}
                    label="Photos"
                    done={goal.photos_done}
                    target={goal.photos_target}
                  />
                  <PublicGoalCard
                    icon={<Star className="h-5 w-5" />}
                    label="Avis répondus"
                    done={goal.reviews_replied}
                    target={goal.reviews_received || goal.reviews_replied}
                    unit="/ reçus"
                  />
                </div>
              </section>
            )}

            {/* KPIs */}
            {(gmb.total_reviews > 0 || gmb.average_rating) && (
              <section className="grid gap-4 md:grid-cols-3">
                {gmb.average_rating != null && (
                  <KpiCard icon={<Star className="h-5 w-5 fill-amber-400 text-amber-400" />} label="Note moyenne" value={gmb.average_rating.toFixed(1)} />
                )}
                <KpiCard icon={<MessageSquare className="h-5 w-5" />} label="Avis totaux" value={gmb.total_reviews} />
                {gmb.last_post_at && (
                  <KpiCard
                    icon={<Camera className="h-5 w-5" />}
                    label="Dernier post"
                    value={formatDistanceToNow(new Date(gmb.last_post_at), { locale: fr, addSuffix: true })}
                  />
                )}
              </section>
            )}

            {/* Activity timeline */}
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="mb-4 font-semibold">Ce que nous avons fait pour vous</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-white/60">
                  Aucune action publique pour le moment — le travail commence !
                </p>
              ) : (
                <ol className="relative space-y-3 border-l-2 border-white/10 pl-6">
                  {activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[33px] flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white/10 text-sm">
                        {GMB_ACTIVITY_ICONS[a.action_type]}
                      </span>
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                            {GMB_ACTIVITY_LABELS[a.action_type]}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {format(new Date(a.performed_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-white/90">{a.description}</p>
                        {a.link && (
                          <a
                            href={a.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                            style={{ color: "#ff4d94" }}
                          >
                            <ExternalLink className="h-3 w-3" /> Voir
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}

        <footer className="pt-6 pb-2 text-center text-xs text-white/40">
          Suivi en temps réel · Adamkom · <a href="https://ai.adamkom.com" className="hover:text-white/70">adamkom.com</a>
        </footer>
      </main>
    </div>
  );
}

function PublicGoalCard({
  icon,
  label,
  done,
  target,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  done: number;
  target: number;
  unit?: string;
}) {
  const pct = target > 0 ? Math.round((done / target) * 100) : 0;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-white/80">
          {icon} {label}
        </span>
        <span className="text-xs font-bold">
          {done} {unit ? unit : `/ ${target}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all ${goalProgressColor(pct)}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-white/60">
        {icon} {label}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
