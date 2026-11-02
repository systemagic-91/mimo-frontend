/** Tela de troca de senha: obrigatória enquanto `user.mustChangePassword` for `true`. */
export const CHANGE_PASSWORD_PATH = "/trocar-senha";

/** Estado de navegação para o login mostrar um aviso (ex.: depois da troca de senha). */
export interface LoginNoticeState {
  notice?: string;
}
