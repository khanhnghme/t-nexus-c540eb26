import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPagesByGroupId,
  createPage,
  updatePageContent,
  updatePage,
  deletePage,
} from "@/services/projectPages";

export function useProjectPages(groupId: string | undefined) {
  return useQuery({
    queryKey: ["project-pages", groupId],
    queryFn: () => fetchPagesByGroupId(groupId!),
    enabled: !!groupId,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPage,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project-pages", variables.group_id],
      });
    },
  });
}

export function useUpdatePageContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, content }: { pageId: string; content: any }) =>
      updatePageContent(pageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-pages"] });
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageId,
      updates,
    }: {
      pageId: string;
      updates: Parameters<typeof updatePage>[1];
    }) => updatePage(pageId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-pages"] });
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-pages"] });
    },
  });
}
