import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackButton } from "./back-button";

describe("BackButton", () => {
  it("renders a link with the given href and label", () => {
    render(<BackButton href="/dashboard/booths" label="Back to booths" />);
    const link = screen.getByRole("link", { name: /back to booths/i });
    expect(link).toHaveAttribute("href", "/dashboard/booths");
  });

  it("renders through a custom LinkComponent when given one", () => {
    const CustomLink = ({
      href,
      children,
    }: {
      href: string;
      children?: React.ReactNode;
    }) => (
      <a href={href} data-testid="custom-link">
        {children}
      </a>
    );
    render(
      <BackButton
        href="/dashboard"
        label="Back"
        LinkComponent={CustomLink}
      />,
    );
    expect(screen.getByTestId("custom-link")).toBeInTheDocument();
  });
});
