import { getContext, redirect, resize } from "@crowdin/serverless-apps-sdk";
import { createCrowdinClient } from "@crowdin/serverless-apps-sdk/api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@crowdin/serverless-apps-sdk/ui";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowDown, ArrowUp, Home, Layers, Lock, Plus } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

dayjs.extend(relativeTime);

type CrowdinClient = ReturnType<typeof createCrowdinClient>;

interface GroupRow {
  id: number;
  name: string;
  parentId: number;
  description?: string;
  subgroupsCount?: number;
  projectsCount?: number;
  createdAt?: string;
}

interface ProjectRow {
  id: number;
  name: string;
  identifier: string;
  groupId: number;
  visibility?: string;
  webUrl?: string;
  targetLanguageIds?: string[];
  lastActivity?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ProgressRow {
  words: {
    total: number;
    translated: number;
    approved: number;
    preTranslateAppliedTo: number;
  };
}

interface Aggregate {
  total: number;
  translated: number;
  approved: number;
  preTranslate: number;
}

interface Crumb {
  id: number;
  name: string;
}

type SortField = "name" | "createdAt" | "lastActivity";
type SortOrder = "asc" | "desc";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; groups: GroupRow[]; projects: ProjectRow[] };

const COLOR_APPROVED = "#6dc271";
const COLOR_TRANSLATED = "#9cc7ff";

const SORT_FIELDS: SortField[] = ["name", "createdAt", "lastActivity"];
const SORT_STORAGE_KEY = "crowdin-app-dashboard-sort";

const ROOT_GROUP_ID = 1;

const LOADING_PLACEHOLDERS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function readStoredSort(): { sortBy: SortField; sortOrder: SortOrder } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        sortBy?: unknown;
        sortOrder?: unknown;
      };
      return {
        sortBy: SORT_FIELDS.includes(parsed.sortBy as SortField)
          ? (parsed.sortBy as SortField)
          : "createdAt",
        sortOrder: parsed.sortOrder === "desc" ? "desc" : "asc",
      };
    }
  } catch {
    /* localStorage may be unavailable in a sandboxed iframe */
  }
  return { sortBy: "createdAt", sortOrder: "asc" };
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return "";
  const date = dayjs(iso);
  return date.isValid() ? date.fromNow() : "";
}

function aggregateProgress(rows: ProgressRow[]): Aggregate {
  const agg: Aggregate = {
    total: 0,
    translated: 0,
    approved: 0,
    preTranslate: 0,
  };
  for (const row of rows) {
    agg.total += row.words.total;
    agg.translated += row.words.translated;
    agg.approved += row.words.approved;
    agg.preTranslate += row.words.preTranslateAppliedTo ?? 0;
  }
  return agg;
}

function rawField(obj: { id: number }, field: string): unknown {
  return (obj as Record<string, unknown>)[field] ?? "";
}

function isNumeric(value: unknown): boolean {
  return !Number.isNaN(Number(value));
}

function compareValues(
  a: string | number,
  b: string | number,
  order: SortOrder,
  asInt: boolean,
): number {
  if (!asInt) {
    let c = String(a)
      .toLowerCase()
      .localeCompare(String(b).toLowerCase(), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    if (order === "desc") c = c > 0 ? -1 : c < 0 ? 1 : 0;
    return c;
  }
  if (a === b) return 0;
  return (order === "asc" && a > b) || (order === "desc" && a < b) ? 1 : -1;
}

function sortRows<T extends { id: number }>(
  rows: T[],
  field: SortField,
  order: SortOrder,
): T[] {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return rows;
  const asInt =
    isNumeric(rawField(first, field)) && isNumeric(rawField(last, field));
  return [...rows].sort((a, b) => {
    const fa = asInt
      ? Number(rawField(a, field))
      : String(rawField(a, field)).toLowerCase();
    const fb = asInt
      ? Number(rawField(b, field))
      : String(rawField(b, field)).toLowerCase();
    if (fa === fb) return compareValues(a.id, b.id, "asc", true);
    return compareValues(fa, fb, order, asInt);
  });
}

function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const pump = () => {
    if (active >= max) return;
    const job = queue.shift();
    if (!job) return;
    active++;
    job();
  };
  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            pump();
          });
      });
      pump();
    });
  };
}

type Limiter = ReturnType<typeof createLimiter>;

function CircleAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
      {initial}
    </div>
  );
}

function GroupGlyph() {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Layers className="size-[18px]" />
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function ProgressBar({ agg }: { agg: Aggregate }) {
  const { t } = useLingui();
  const translatedWidth = agg.total ? (agg.translated / agg.total) * 100 : 0;
  const approvedWidth = agg.total ? (agg.approved / agg.total) * 100 : 0;
  const translatedPct = Math.round(translatedWidth);
  const approvedPct = Math.round(approvedWidth);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="mt-2 flex h-1.5 w-full cursor-default overflow-hidden rounded-full bg-muted">
          <div
            style={{
              width: `${Math.min(approvedWidth, translatedWidth)}%`,
              backgroundColor: COLOR_APPROVED,
            }}
          />
          <div
            style={{
              width: `${Math.max(0, translatedWidth - approvedWidth)}%`,
              backgroundColor: COLOR_TRANSLATED,
            }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            <Dot color={COLOR_TRANSLATED} />
            <Trans>Translated</Trans>
          </div>
          <div className="text-muted-foreground">
            {t`${agg.translated} out of ${agg.total} words (${translatedPct}%)`}
          </div>
          {agg.preTranslate > 0 && (
            <div className="text-muted-foreground">
              {t`(${agg.preTranslate} words auto-translated)`}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            <Dot color={COLOR_APPROVED} />
            <Trans>Approved</Trans>
          </div>
          <div className="text-muted-foreground">{t`${agg.approved} words (${approvedPct}%)`}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function GroupCard({ group, onOpen }: { group: GroupRow; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <Card className="cursor-pointer gap-0 py-0 transition-colors hover:bg-accent/50">
        <div className="flex items-center gap-3 p-4">
          <GroupGlyph />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-sm">{group.name}</div>
            <p className="truncate text-muted-foreground text-xs">
              <Plural
                value={group.projectsCount ?? 0}
                one="# project"
                other="# projects"
              />
              {" · "}
              <Plural
                value={group.subgroupsCount ?? 0}
                one="# subgroup"
                other="# subgroups"
              />
            </p>
          </div>
        </div>
      </Card>
    </button>
  );
}

function ProjectCard({
  client,
  project,
  limit,
}: {
  client: CrowdinClient;
  project: ProjectRow;
  limit: Limiter;
}) {
  const [progress, setProgress] = useState<Aggregate | null>(null);

  useEffect(() => {
    let active = true;
    limit(() =>
      active
        ? client.translationStatusApi
            .withFetchAll()
            .getProjectProgress(project.id)
        : Promise.resolve(null),
    )
      .then((res) => {
        if (!active || !res) return;
        const rows = (res.data ?? []).map(
          (item) => item.data as unknown as ProgressRow,
        );
        setProgress(aggregateProgress(rows));
      })
      .catch(() => {
        if (active) setProgress(null);
      });
    return () => {
      active = false;
    };
  }, [limit, client, project.id]);

  const languages = project.targetLanguageIds?.length ?? 0;
  const time = formatRelative(
    project.lastActivity ?? project.updatedAt ?? project.createdAt,
  );

  const open = () => {
    if (project.webUrl) redirect(project.webUrl);
  };

  return (
    <button type="button" onClick={open} className="w-full text-left">
      <Card className="cursor-pointer gap-0 py-0 transition-colors hover:bg-accent/50">
        <div className="flex items-center gap-3 p-4">
          <CircleAvatar name={project.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-sm">
                {project.name}
              </span>
              {project.visibility === "private" && (
                <Lock className="size-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>
            <p className="truncate text-muted-foreground text-xs">
              <Plural value={languages} one="# language" other="# languages" />
              {time ? ` · ${time}` : ""}
            </p>
            {progress ? (
              <ProgressBar agg={progress} />
            ) : (
              <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}

function EmptyState({
  inGroup,
  isEnterprise,
}: {
  inGroup: boolean;
  isEnterprise: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative">
        <div className="flex size-28 items-center justify-center rounded-full bg-muted">
          <Layers className="size-12 text-muted-foreground/40" />
        </div>
        <div className="absolute right-0 bottom-1 flex size-7 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground">
          <Plus className="size-4" strokeWidth={2.5} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-sm">
          {inGroup ? (
            <Trans>No projects in this group</Trans>
          ) : (
            <Trans>No projects yet</Trans>
          )}
        </p>
        <p className="text-muted-foreground text-sm">
          {inGroup && (
            <Trans>All projects added to the group will appear here</Trans>
          )}
          {!inGroup && isEnterprise && (
            <Trans>Projects added to your organization will appear here</Trans>
          )}
          {!inGroup && !isEnterprise && (
            <Trans>Projects you create or join will appear here</Trans>
          )}
        </p>
      </div>
    </div>
  );
}

function SkeletonCard({ withProgress }: { withProgress: boolean }) {
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center gap-3 p-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex h-4 items-center">
            <Skeleton className="h-3 w-24" />
          </div>
          {withProgress && (
            <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
          )}
        </div>
      </div>
    </Card>
  );
}

function SkeletonSection({
  label,
  cards,
  withProgress,
  className,
}: {
  label: ReactNode;
  cards: string[];
  withProgress: boolean;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
        <Skeleton className="h-[1.375rem] w-7 rounded-full" />
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((key) => (
          <SkeletonCard key={key} withProgress={withProgress} />
        ))}
      </div>
    </section>
  );
}

function SortControl({
  sortBy,
  sortOrder,
  onSortByChange,
  onToggleOrder,
}: {
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortByChange: (field: SortField) => void;
  onToggleOrder: () => void;
}) {
  const { t } = useLingui();
  return (
    <div className="flex items-center gap-1">
      <Select
        value={sortBy}
        onValueChange={(value) => onSortByChange(value as SortField)}
      >
        <SelectTrigger size="sm" className="w-48" aria-label={t`Sort projects`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{t`Sort by name`}</SelectItem>
          <SelectItem value="createdAt">{t`Sort by date added`}</SelectItem>
          <SelectItem value="lastActivity">{t`Sort by last activity`}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onToggleOrder}
        aria-label={t`Reverse the order`}
        title={t`Reverse the order`}
      >
        {sortOrder === "asc" ? (
          <ArrowDown className="size-4" />
        ) : (
          <ArrowUp className="size-4" />
        )}
      </Button>
    </div>
  );
}

export function App() {
  const client = useMemo(() => createCrowdinClient(), []);
  const progressLimit = useMemo(() => createLimiter(6), []);
  const isEnterprise = getContext().app.type === "organization-menu";

  const [path, setPath] = useState<Crumb[]>([]);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [sort, setSort] = useState(readStoredSort);

  const currentGroupId = path[path.length - 1]?.id ?? ROOT_GROUP_ID;

  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
    } catch {
      /* localStorage may be unavailable in a sandboxed iframe */
    }
  }, [sort]);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    Promise.allSettled([
      isEnterprise
        ? client.projectsGroupsApi
            .withFetchAll()
            .listGroups({ parentId: currentGroupId })
        : Promise.resolve(null),
      client.projectsGroupsApi
        .withFetchAll()
        .listProjects(isEnterprise ? { groupId: currentGroupId } : {}),
    ]).then(([groupsRes, projectsRes]) => {
      if (!active) return;
      if (projectsRes.status === "rejected") {
        setState({
          status: "error",
          message: errorMessage(projectsRes.reason),
        });
        return;
      }
      const projects = (projectsRes.value.data ?? []).map(
        (item) => item.data as unknown as ProjectRow,
      );
      const groups =
        groupsRes.status === "fulfilled" && groupsRes.value
          ? (groupsRes.value.data ?? []).map(
              (item) => item.data as unknown as GroupRow,
            )
          : [];
      setState({ status: "ready", groups, projects });
    });

    return () => {
      active = false;
    };
  }, [client, currentGroupId, isEnterprise]);

  useEffect(() => {
    resize();
  });

  const sortedGroups = useMemo(
    () =>
      state.status === "ready"
        ? sortRows(state.groups, sort.sortBy, sort.sortOrder)
        : [],
    [state, sort],
  );
  const sortedProjects = useMemo(
    () =>
      state.status === "ready"
        ? sortRows(state.projects, sort.sortBy, sort.sortOrder)
        : [],
    [state, sort],
  );

  const isEmpty =
    state.status === "ready" &&
    sortedGroups.length === 0 &&
    sortedProjects.length === 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {path.length === 0 ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    <Home className="size-4 shrink-0" />
                    <Trans>Workspace</Trans>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-1.5"
                      onClick={() => setPath([])}
                    >
                      <Home className="size-4 shrink-0" />
                      <Trans>Workspace</Trans>
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {path.map((crumb, index) => {
                const isLast = index === path.length - 1;
                return (
                  <Fragment key={crumb.id}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="max-w-40 truncate">
                          {crumb.name}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            className="max-w-40 cursor-pointer truncate"
                            onClick={() => setPath(path.slice(0, index + 1))}
                          >
                            {crumb.name}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          <SortControl
            sortBy={sort.sortBy}
            sortOrder={sort.sortOrder}
            onSortByChange={(sortBy) =>
              setSort((prev) => ({ ...prev, sortBy }))
            }
            onToggleOrder={() =>
              setSort((prev) => ({
                ...prev,
                sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
              }))
            }
          />
        </div>

        {state.status === "loading" && (
          <>
            {isEnterprise && (
              <SkeletonSection
                label={<Trans>Groups</Trans>}
                cards={LOADING_PLACEHOLDERS.slice(0, 4)}
                withProgress={false}
                className="mb-6"
              />
            )}
            <SkeletonSection
              label={<Trans>Projects</Trans>}
              cards={LOADING_PLACEHOLDERS}
              withProgress
            />
          </>
        )}

        {state.status === "error" && (
          <Alert variant="destructive">
            <AlertTitle>
              <Trans>Could not load this view</Trans>
            </AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {isEmpty && (
          <EmptyState inGroup={path.length > 0} isEnterprise={isEnterprise} />
        )}

        {sortedGroups.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              <Trans>Groups</Trans>
              <Badge variant="secondary">{sortedGroups.length}</Badge>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onOpen={() =>
                    setPath((prev) => [
                      ...prev,
                      { id: group.id, name: group.name },
                    ])
                  }
                />
              ))}
            </div>
          </section>
        )}

        {sortedProjects.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              <Trans>Projects</Trans>
              <Badge variant="secondary">{sortedProjects.length}</Badge>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  client={client}
                  project={project}
                  limit={progressLimit}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </TooltipProvider>
  );
}
