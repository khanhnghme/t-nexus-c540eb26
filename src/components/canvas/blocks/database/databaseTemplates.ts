import {
  DatabaseBlockData,
  generateId,
  createDefaultView,
  type PropertyDef,
  type DatabaseItem,
  type SelectOption,
} from "./types";

export interface DatabaseTemplate {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  build: () => DatabaseBlockData;
}

/* ── Helpers ─────────────────────────────────────────── */

function item(props: Record<string, any>): DatabaseItem {
  return { id: generateId(), properties: props, createdAt: new Date().toISOString() };
}

function opts(items: [string, string][]): SelectOption[] {
  return items.map(([label, color]) => ({ id: generateId(), label, color }));
}

/* ── Templates ───────────────────────────────────────── */

const blank: DatabaseTemplate = {
  id: "blank",
  name: "Blank",
  icon: "Database",
  description: "Empty database with Name and Status columns",
  build() {
    const props: PropertyDef[] = [
      { id: generateId(), name: "Name", type: "text" },
      { id: generateId(), name: "Status", type: "select", options: opts([["Todo", "#94a3b8"], ["In Progress", "#f59e0b"], ["Done", "#22c55e"]]) },
    ];
    const view = createDefaultView("Table", "table", props.map((p) => p.id));
    return { properties: props, items: [], views: [view], activeViewId: view.id };
  },
};

const taskTracker: DatabaseTemplate = {
  id: "task-tracker",
  name: "Task Tracker",
  icon: "CheckSquare",
  description: "Track tasks with priority, due date and assignee",
  build() {
    const statusOpts = opts([["Todo", "#94a3b8"], ["In Progress", "#f59e0b"], ["Done", "#22c55e"]]);
    const priorityOpts = opts([["High", "#ef4444"], ["Medium", "#f59e0b"], ["Low", "#3b82f6"]]);
    const props: PropertyDef[] = [
      { id: generateId(), name: "Name", type: "text" },
      { id: generateId(), name: "Status", type: "select", options: statusOpts },
      { id: generateId(), name: "Priority", type: "select", options: priorityOpts },
      { id: generateId(), name: "Due Date", type: "date" },
      { id: generateId(), name: "Assignee", type: "person" },
    ];
    const pIds = props.map((p) => p.id);
    const boardView = createDefaultView("Board", "board", pIds);
    boardView.groupBy = props[1].id; // Status
    const tableView = createDefaultView("Table", "table", pIds);
    const items = [
      item({ [props[0].id]: "Design mockups", [props[1].id]: statusOpts[0].id, [props[2].id]: priorityOpts[0].id, [props[3].id]: "2026-04-20" }),
      item({ [props[0].id]: "Write documentation", [props[1].id]: statusOpts[1].id, [props[2].id]: priorityOpts[1].id, [props[3].id]: "2026-04-18" }),
      item({ [props[0].id]: "Fix login bug", [props[1].id]: statusOpts[2].id, [props[2].id]: priorityOpts[0].id, [props[3].id]: "2026-04-15" }),
    ];
    return { properties: props, items, views: [boardView, tableView], activeViewId: boardView.id };
  },
};

const crm: DatabaseTemplate = {
  id: "crm",
  name: "CRM",
  icon: "Users",
  description: "Manage contacts, companies and deal stages",
  build() {
    const stageOpts = opts([["Lead", "#94a3b8"], ["Contact", "#3b82f6"], ["Customer", "#22c55e"]]);
    const props: PropertyDef[] = [
      { id: generateId(), name: "Name", type: "text" },
      { id: generateId(), name: "Email", type: "url" },
      { id: generateId(), name: "Company", type: "text" },
      { id: generateId(), name: "Stage", type: "select", options: stageOpts },
      { id: generateId(), name: "Phone", type: "text" },
    ];
    const pIds = props.map((p) => p.id);
    const view = createDefaultView("Table", "table", pIds);
    const items = [
      item({ [props[0].id]: "Alice Nguyen", [props[1].id]: "alice@example.com", [props[2].id]: "Acme Corp", [props[3].id]: stageOpts[1].id, [props[4].id]: "+84 123 456" }),
      item({ [props[0].id]: "Bob Tran", [props[1].id]: "bob@example.com", [props[2].id]: "Globex Inc", [props[3].id]: stageOpts[0].id }),
    ];
    return { properties: props, items, views: [view], activeViewId: view.id };
  },
};

const contentCalendar: DatabaseTemplate = {
  id: "content-calendar",
  name: "Content Calendar",
  icon: "CalendarDays",
  description: "Plan and schedule content with publish dates",
  build() {
    const typeOpts = opts([["Blog", "#3b82f6"], ["Video", "#ef4444"], ["Social", "#8b5cf6"]]);
    const statusOpts = opts([["Draft", "#94a3b8"], ["Review", "#f59e0b"], ["Published", "#22c55e"]]);
    const props: PropertyDef[] = [
      { id: generateId(), name: "Title", type: "text" },
      { id: generateId(), name: "Type", type: "select", options: typeOpts },
      { id: generateId(), name: "Publish Date", type: "date" },
      { id: generateId(), name: "Status", type: "select", options: statusOpts },
      { id: generateId(), name: "URL", type: "url" },
    ];
    const pIds = props.map((p) => p.id);
    const calView = createDefaultView("Calendar", "calendar", pIds);
    calView.dateProperty = props[2].id;
    const tableView = createDefaultView("Table", "table", pIds);
    const items = [
      item({ [props[0].id]: "Getting Started Guide", [props[1].id]: typeOpts[0].id, [props[2].id]: "2026-04-14", [props[3].id]: statusOpts[0].id }),
      item({ [props[0].id]: "Product Demo Video", [props[1].id]: typeOpts[1].id, [props[2].id]: "2026-04-18", [props[3].id]: statusOpts[1].id }),
      item({ [props[0].id]: "Launch Announcement", [props[1].id]: typeOpts[2].id, [props[2].id]: "2026-04-22", [props[3].id]: statusOpts[2].id }),
    ];
    return { properties: props, items, views: [calView, tableView], activeViewId: calView.id };
  },
};

const readingList: DatabaseTemplate = {
  id: "reading-list",
  name: "Reading List",
  icon: "BookOpen",
  description: "Track books with author, genre and rating",
  build() {
    const genreOpts = opts([["Fiction", "#8b5cf6"], ["Non-fiction", "#3b82f6"], ["Technical", "#f59e0b"]]);
    const props: PropertyDef[] = [
      { id: generateId(), name: "Title", type: "text" },
      { id: generateId(), name: "Author", type: "text" },
      { id: generateId(), name: "Genre", type: "select", options: genreOpts },
      { id: generateId(), name: "Rating", type: "number" },
      { id: generateId(), name: "Finished", type: "checkbox" },
      { id: generateId(), name: "URL", type: "url" },
    ];
    const pIds = props.map((p) => p.id);
    const view = createDefaultView("List", "list", pIds);
    const items = [
      item({ [props[0].id]: "Atomic Habits", [props[1].id]: "James Clear", [props[2].id]: genreOpts[1].id, [props[3].id]: 5, [props[4].id]: true }),
      item({ [props[0].id]: "Dune", [props[1].id]: "Frank Herbert", [props[2].id]: genreOpts[0].id, [props[3].id]: 4, [props[4].id]: false }),
    ];
    return { properties: props, items, views: [view], activeViewId: view.id };
  },
};

const meetingNotes: DatabaseTemplate = {
  id: "meeting-notes",
  name: "Meeting Notes",
  icon: "FileText",
  description: "Record meeting dates, attendees and action items",
  build() {
    const statusOpts = opts([["Scheduled", "#3b82f6"], ["Completed", "#22c55e"], ["Cancelled", "#ef4444"]]);
    const props: PropertyDef[] = [
      { id: generateId(), name: "Title", type: "text" },
      { id: generateId(), name: "Date", type: "date" },
      { id: generateId(), name: "Attendees", type: "text" },
      { id: generateId(), name: "Action Items", type: "text" },
      { id: generateId(), name: "Status", type: "select", options: statusOpts },
    ];
    const pIds = props.map((p) => p.id);
    const view = createDefaultView("Table", "table", pIds);
    const items = [
      item({ [props[0].id]: "Sprint Planning", [props[1].id]: "2026-04-14", [props[2].id]: "Team A", [props[3].id]: "Review backlog, assign tasks", [props[4].id]: statusOpts[0].id }),
    ];
    return { properties: props, items, views: [view], activeViewId: view.id };
  },
};

export const DATABASE_TEMPLATES: DatabaseTemplate[] = [
  blank,
  taskTracker,
  crm,
  contentCalendar,
  readingList,
  meetingNotes,
];
