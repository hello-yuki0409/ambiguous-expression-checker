import { render, screen } from "@testing-library/react";

function SampleComponent({ label = "Hello" }: { label?: string }) {
  return <button>{label}</button>;
}

describe("SampleComponent (smoke)", () => {
  it("renders default label", () => {
    render(<SampleComponent />);
    expect(screen.getByRole("button", { name: "Hello" })).toBeInTheDocument();
  });
});
