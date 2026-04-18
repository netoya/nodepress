import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Select } from "../Select";

describe("Select", () => {
  const defaultOptions = [
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" },
    { value: "opt3", label: "Option 3" },
  ];

  it("renders trigger with placeholder", () => {
    render(
      <Select
        options={defaultOptions}
        value=""
        onChange={() => {}}
        placeholder="Choose option"
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("renders label when label prop is passed", () => {
    render(
      <Select
        options={defaultOptions}
        value=""
        onChange={() => {}}
        label="Select item"
      />,
    );
    const label = screen.getByText("Select item");
    expect(label).toBeInTheDocument();
  });

  it("accepts value prop correctly", () => {
    render(
      <Select options={defaultOptions} value="opt2" onChange={() => {}} />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("disables trigger when disabled prop is true", () => {
    render(
      <Select
        options={defaultOptions}
        value=""
        onChange={() => {}}
        disabled={true}
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("disabled");
  });

  it("renders error message when error prop is passed", () => {
    render(
      <Select
        options={defaultOptions}
        value=""
        onChange={() => {}}
        error="Required field"
      />,
    );
    const errorMsg = screen.getByText("Required field");
    expect(errorMsg).toBeInTheDocument();
  });

  it("has aria-invalid=true when error is present", () => {
    render(
      <Select
        options={defaultOptions}
        value=""
        onChange={() => {}}
        error="Error"
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });
});
