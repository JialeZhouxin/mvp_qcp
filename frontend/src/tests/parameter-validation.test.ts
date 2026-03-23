import { validateParameterValue } from "../features/circuit/components/parameter-validation";

describe("parameter validation", () => {
  it("accepts finite values in suggested range", () => {
    const result = validateParameterValue(Math.PI / 2);
    expect(result.level).toBe("none");
    expect(result.message).toBeNull();
    expect(result.normalizedValue).toBeNull();
  });

  it("returns warning for out-of-range values with normalize candidate", () => {
    const result = validateParameterValue(20);
    expect(result.level).toBe("warning");
    expect(result.message).not.toBeNull();
    expect(result.normalizedValue).not.toBeNull();
    expect(result.normalizedValue).toBeGreaterThan(-2 * Math.PI);
    expect(result.normalizedValue).toBeLessThan(2 * Math.PI);
  });

  it("rejects non-finite values", () => {
    const result = validateParameterValue(Number.NaN);
    expect(result.level).toBe("error");
    expect(result.message).not.toBeNull();
    expect(result.normalizedValue).toBeNull();
  });
});


