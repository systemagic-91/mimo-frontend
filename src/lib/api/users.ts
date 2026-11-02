import { apiRequest, buildQueryString } from "./http";
import type {
  CreateUserRequest,
  PageEnvelope,
  PageRequest,
  UpdateUserRequest,
  UserDto,
  UserRole,
} from "./types";

export interface UserListParams extends PageRequest {
  q?: string;
  role?: UserRole;
  active?: boolean;
}

// Criação e redefinição recebem a chave de fora: o backend não considera a senha na idempotência,
// então cada envio do formulário precisa de uma chave nova (e só o retry do mesmo envio a reaproveita).
export const usersApi = {
  list(params: UserListParams = {}, signal?: AbortSignal) {
    return apiRequest<PageEnvelope<UserDto>>(
      `/users${buildQueryString({ ...params, sort: params.sort })}`,
      { signal },
    );
  },

  create(input: CreateUserRequest, idempotencyKey: string) {
    return apiRequest<UserDto>("/users", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: input,
    });
  },

  update(id: string, input: UpdateUserRequest) {
    return apiRequest<UserDto>(`/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    });
  },

  resetPassword(id: string, temporaryPassword: string, idempotencyKey: string) {
    return apiRequest<UserDto>(
      `/users/${encodeURIComponent(id)}/reset-password`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: { temporaryPassword },
      },
    );
  },
};
