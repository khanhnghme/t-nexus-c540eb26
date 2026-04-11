import { createContext, useContext } from "react";

interface TaskBlockContextValue {
  groupId: string;
  editable: boolean;
}

const TaskBlockContext = createContext<TaskBlockContextValue | null>(null);

export function TaskBlockProvider({
  groupId,
  editable,
  children,
}: TaskBlockContextValue & { children: React.ReactNode }) {
  return (
    <TaskBlockContext.Provider value={{ groupId, editable }}>
      {children}
    </TaskBlockContext.Provider>
  );
}

export function useTaskBlockContext() {
  const ctx = useContext(TaskBlockContext);
  if (!ctx) throw new Error("useTaskBlockContext must be used within TaskBlockProvider");
  return ctx;
}
