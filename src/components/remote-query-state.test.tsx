import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RemoteQueryState } from "./remote-query-state";

describe("RemoteQueryState", () => {
  it("exposes loading and empty states to assistive technology", () => {
    const { rerender } = render(<RemoteQueryState state="loading" />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");

    rerender(
      <RemoteQueryState state="empty" message="Nenhuma peça encontrada." />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nenhuma peça encontrada.",
    );
  });

  it("shows an accessible error and invokes retry", () => {
    const onRetry = vi.fn();
    render(
      <RemoteQueryState
        state="error"
        message="API indisponível."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("API indisponível.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
