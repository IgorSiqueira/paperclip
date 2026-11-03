import { useMemo, useState } from "react";
import { useCoordinatorChatTaskHandoffs } from "./CoordinatorChatTaskHandoffs";
import { CoordinatorCreatedTaskLink } from "./CoordinatorTaskCommitment";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

/** The task list is source-conversation scoped, independent of reassignment. */
export function CoordinatorConversationTasksPanel({ conversationIssueId }: { conversationIssueId: string }) {
  const tasks = useCoordinatorChatTaskHandoffs(conversationIssueId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return tasks.handoffs.filter(task => (!status || task.status === status) && (!needle || `${task.identifier ?? ""} ${task.title}`.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : (sort === "oldest" ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [tasks.handoffs, query, status, sort]);
  return <section className="space-y-4" aria-label={t("Tasks from this conversation")}>
    <div className="space-y-1"><h2 className="text-lg font-medium">{t("Tasks")}</h2><p className="text-sm text-muted-foreground">{t("Created from this conversation.")}</p></div>
    <ToolbarSearch query={query} onQueryChange={setQuery} label={t("Search conversation tasks")} placeholder={t("Search tasks or IDs…")} />
    <div className="flex flex-wrap gap-2">
      <NativeSelect value={status} onChange={event => setStatus(event.target.value)} aria-label={t("Filter conversation tasks by status")} className="w-auto"><option value="">{t("All statuses")}</option><option value="todo">{t("Ready to start")}</option><option value="in_progress">{t("In progress")}</option><option value="in_review">{t("Needs review")}</option><option value="blocked">{t("Blocked")}</option><option value="done">{t("Done")}</option><option value="cancelled">{t("Cancelled")}</option></NativeSelect>
      <NativeSelect value={sort} onChange={event => setSort(event.target.value)} aria-label={t("Sort conversation tasks")} className="w-auto"><option value="newest">{t("Newest first")}</option><option value="oldest">{t("Oldest first")}</option><option value="title">{t("Title")}</option></NativeSelect>
    </div>
    {tasks.isPending && <p role="status" className="text-sm text-muted-foreground">{t("Loading tasks…")}</p>}
    {tasks.isError && <div role="alert" className="space-y-2"><p className="text-sm">{t("Tasks couldn’t load.")}</p><Button variant="outline" onClick={() => void tasks.refetch()}>{t("Retry")}</Button></div>}
    <div className="space-y-3">{visible.map(task => <div key={task.id} className="overflow-hidden rounded-xl border border-border bg-card"><CoordinatorCreatedTaskLink task={task} /></div>)}</div>
    {!tasks.isPending && !tasks.isError && !visible.length && <p className="py-4 text-sm text-muted-foreground">{query || status ? t("No loaded tasks match these filters.") : t("Tasks created from this conversation will appear here.")}</p>}
    {tasks.hasNextPage && <Button variant="outline" disabled={tasks.isFetchingNextPage} onClick={() => void tasks.fetchNextPage()}>{tasks.isFetchingNextPage ? t("Loading…") : t("Load more tasks")}</Button>}
  </section>;
}
