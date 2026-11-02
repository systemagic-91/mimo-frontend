import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { authApi } from "./auth";
import { ApiError, authTokenStore } from "./http";
import { consignmentsApi, type ConsignmentListParams } from "./consignments";
import { dashboardApi } from "./dashboard";
import { queryKeys } from "./query-keys";
import { piecesApi, type PieceListParams } from "./pieces";
import { reportsApi } from "./reports";
import { sellersApi, type SellerListParams } from "./sellers";
import { settingsApi } from "./settings";
import { usersApi, type UserListParams } from "./users";
import type {
  ChangePasswordRequest,
  CreateConsignmentRequest,
  CreateSellerRequest,
  CreateUserRequest,
  ConsignmentStatus,
  AuthSessionResponse,
  LabelPieceRequest,
  PageRequest,
  PieceStage,
  UpdateSellerRequest,
  UpdateSettingsRequest,
  UpdateUserRequest,
  UserDto,
} from "./types";

function useInvalidateOperationalData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pieces.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.consignments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all }),
    ]);
}

export function useCurrentUserQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async ({ signal }): Promise<AuthSessionResponse | null> => {
      if (!authTokenStore.getAccessToken() && !(await authApi.refresh())) {
        return null;
      }
      try {
        return await authApi.me(signal);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          authTokenStore.clear();
          return null;
        }
        throw error;
      }
    },
    enabled,
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.auth.me(), {
        user: response.user,
        session: response.session,
      });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onMutate: () => {
      queryClient.setQueryData<AuthSessionResponse | null>(
        queryKeys.auth.me(),
        null,
      );
    },
    onSettled: () => queryClient.clear(),
  });
}

/** Troca a própria senha. O backend revoga todas as sessões, então o front também encerra a dele. */
export function useChangePasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangePasswordRequest) => authApi.changePassword(input),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData<AuthSessionResponse | null>(
        queryKeys.auth.me(),
        null,
      );
    },
  });
}

export function useUsersQuery(params: UserListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) => usersApi.list(params, signal),
    enabled,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateUserRequest;
      idempotencyKey: string;
    }) => usersApi.create(input, idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return (user: UserDto) => {
    const current = queryClient.getQueryData<AuthSessionResponse | null>(
      queryKeys.auth.me(),
    );
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      // Nome e e-mail da própria conta aparecem no menu.
      current?.user.id === user.id
        ? queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() })
        : undefined,
    ]);
  };
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserRequest }) =>
      usersApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useResetUserPasswordMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({
      id,
      temporaryPassword,
      idempotencyKey,
    }: {
      id: string;
      temporaryPassword: string;
      idempotencyKey: string;
    }) => usersApi.resetPassword(id, temporaryPassword, idempotencyKey),
    onSuccess: invalidate,
  });
}

export function usePiecesQuery(params: PieceListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pieces.list(params),
    queryFn: ({ signal }) => piecesApi.list(params, signal),
    enabled,
  });
}

export function usePieceQuery(id: string, enabled = Boolean(id)) {
  return useQuery({
    queryKey: queryKeys.pieces.detail(id),
    queryFn: ({ signal }) => piecesApi.get(id, signal),
    enabled,
  });
}

export function usePieceEventsQuery(id: string, enabled = Boolean(id)) {
  return useQuery({
    queryKey: queryKeys.pieces.events(id),
    queryFn: ({ signal }) => piecesApi.events(id, signal),
    enabled,
  });
}

export function useReceivePieceMutation() {
  const invalidate = useInvalidateOperationalData();
  return useMutation({
    mutationFn: (input: { type: string; valueCents: number; stage: "fabrica" | "banho_ouro"; note?: string }) =>
      piecesApi.receive(input),
    onSuccess: invalidate,
  });
}

export function useLabelPieceMutation() {
  const invalidate = useInvalidateOperationalData();
  return useMutation({
    mutationFn: (input: LabelPieceRequest) => piecesApi.label(input),
    onSuccess: invalidate,
  });
}

export function useUploadPiecePhotoMutation() {
  return useMutation({
    mutationFn: (file: File) => piecesApi.uploadPhoto(file),
  });
}

export function useSellersQuery(params: SellerListParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.sellers.list(params),
    queryFn: ({ signal }) => sellersApi.list(params, signal),
    enabled,
  });
}

export function useSellerQuery(id: string, enabled = Boolean(id)) {
  return useQuery({
    queryKey: queryKeys.sellers.detail(id),
    queryFn: ({ signal }) => sellersApi.get(id, signal),
    enabled,
  });
}

export function useSellerStatsQuery(id: string, enabled = Boolean(id)) {
  return useQuery({
    queryKey: queryKeys.sellers.stats(id),
    queryFn: ({ signal }) => sellersApi.stats(id, signal),
    enabled,
  });
}

export function useSellerCommissionQuery(
  id: string,
  from: string,
  to: string,
  enabled = Boolean(id && from && to),
) {
  return useQuery({
    queryKey: queryKeys.sellers.commission(id, from, to),
    queryFn: ({ signal }) => sellersApi.commission(id, from, to, signal),
    enabled,
  });
}

export function useCreateSellerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSellerRequest) => sellersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all }),
  });
}

export function useUpdateSellerMutation() {
  const invalidate = useInvalidateOperationalData();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSellerRequest }) =>
      sellersApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useConsignmentsQuery(
  params: ConsignmentListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.consignments.list(params),
    queryFn: ({ signal }) => consignmentsApi.list(params, signal),
    enabled,
  });
}

export function useConsignmentQuery(id: string, enabled = Boolean(id)) {
  return useQuery({
    queryKey: queryKeys.consignments.detail(id),
    queryFn: ({ signal }) => consignmentsApi.get(id, signal),
    enabled,
  });
}

export function useSellerConsignmentsQuery(
  id: string,
  params: PageRequest & { status?: ConsignmentStatus } = {},
  enabled = Boolean(id),
) {
  return useQuery({
    queryKey: queryKeys.consignments.seller(id, params),
    queryFn: ({ signal }) => consignmentsApi.forSeller(id, params, signal),
    enabled,
  });
}

export function useCreateConsignmentMutation() {
  const invalidate = useInvalidateOperationalData();
  return useMutation({
    mutationFn: ({
      input,
      idempotencyKey,
    }: {
      input: CreateConsignmentRequest;
      idempotencyKey: string;
    }) => consignmentsApi.create(input, idempotencyKey),
    onSuccess: invalidate,
  });
}

function useConsignmentItemAction(action: "sold" | "returned") {
  const invalidate = useInvalidateOperationalData();
  return useMutation({
    mutationFn: ({
      consignmentId,
      pieceId,
      note,
    }: {
      consignmentId: string;
      pieceId: string;
      note?: string;
    }) =>
      action === "sold"
        ? consignmentsApi.markSold(consignmentId, pieceId, note)
        : consignmentsApi.markReturned(consignmentId, pieceId, note),
    onSuccess: invalidate,
  });
}

export function useMarkItemSoldMutation() {
  return useConsignmentItemAction("sold");
}

export function useMarkItemReturnedMutation() {
  return useConsignmentItemAction("returned");
}

export function useDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: ({ signal }) => dashboardApi.get(signal),
    enabled,
  });
}

export function useTurnoverReportQuery(
  from: string,
  to: string,
  enabled = Boolean(from && to),
) {
  return useQuery({
    queryKey: queryKeys.reports.turnover(from, to),
    queryFn: ({ signal }) => reportsApi.turnover(from, to, signal),
    enabled,
  });
}

export function useOverdueReportQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.overdue(),
    queryFn: ({ signal }) => reportsApi.overdue(signal),
    enabled,
  });
}

export function useStalePiecesReportQuery(days = 60, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reports.stalePieces(days),
    queryFn: ({ signal }) => reportsApi.stalePieces(days, signal),
    enabled,
  });
}

export function useSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.detail(),
    queryFn: ({ signal }) => settingsApi.get(signal),
    enabled,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsRequest) => settingsApi.update(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sellers.all }),
      ]),
  });
}

export type { PieceStage };
