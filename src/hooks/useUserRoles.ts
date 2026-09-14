import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  getMyAccess,
  grantRole,
  listUsersWithRoles,
  revokeRole,
  type AppRoleName,
  type MyAccess,
  type UserWithRoles,
} from "@/lib/users.functions";

const STALE = 30_000;

function mutationError(error: Error) {
  const message = /row-level security/i.test(error.message)
    ? "Only an owner or admin can change roles."
    : error.message;
  toast.error(message);
}

export function useMyAccess() {
  const fn = useServerFn(getMyAccess);
  return useQuery<MyAccess>({
    queryKey: ["my-access"],
    queryFn: () => fn(),
    staleTime: STALE,
  });
}

export function useUsersWithRoles() {
  const fn = useServerFn(listUsersWithRoles);
  return useQuery<UserWithRoles[]>({
    queryKey: ["users-with-roles"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    void queryClient.invalidateQueries({ queryKey: ["my-access"] });
  };
}

export function useGrantRole() {
  const fn = useServerFn(grantRole);
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: { user_id: string; role: AppRoleName }) => fn({ data: input }),
    onSuccess: () => {
      toast.success("Role granted");
      invalidate();
    },
    onError: mutationError,
  });
}

export function useRevokeRole() {
  const fn = useServerFn(revokeRole);
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (input: { user_id: string; role: AppRoleName }) => fn({ data: input }),
    onSuccess: () => {
      toast.success("Role revoked");
      invalidate();
    },
    onError: mutationError,
  });
}
