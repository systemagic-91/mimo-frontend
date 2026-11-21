/** Mensagem de erro logo abaixo de um campo do formulário. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-late">
      {message}
    </p>
  );
}
