import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../Card";

describe("Card", () => {
  it("renders Card container", () => {
    const { container } = render(
      <Card>
        <div>Content</div>
      </Card>,
    );
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("renders complete Card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("CardTitle renders as h3 by default", () => {
    render(<CardTitle>Default Heading</CardTitle>);
    expect(
      screen.getByRole("heading", { level: 3, name: /default heading/i }),
    ).toBeInTheDocument();
  });

  it("CardTitle renders with custom heading level", () => {
    render(<CardTitle as="h2">Custom Heading</CardTitle>);
    expect(
      screen.getByRole("heading", { level: 2, name: /custom heading/i }),
    ).toBeInTheDocument();
  });

  it("CardTitle renders as h1 when specified", () => {
    render(<CardTitle as="h1">H1 Heading</CardTitle>);
    expect(
      screen.getByRole("heading", { level: 1, name: /h1 heading/i }),
    ).toBeInTheDocument();
  });

  it("CardTitle renders as h4 when specified", () => {
    render(<CardTitle as="h4">H4 Heading</CardTitle>);
    expect(
      screen.getByRole("heading", { level: 4, name: /h4 heading/i }),
    ).toBeInTheDocument();
  });
});
