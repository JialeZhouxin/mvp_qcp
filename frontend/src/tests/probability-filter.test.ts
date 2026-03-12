import {
  calculateEpsilon,
  filterProbabilities,
} from "../features/circuit/simulation/probability-filter";

describe("probability filter", () => {
  it("calculates epsilon as 2^-(n+2)", () => {
    expect(calculateEpsilon(1)).toBeCloseTo(0.125);
    expect(calculateEpsilon(3)).toBeCloseTo(0.03125);
  });

  it("filters states with probability <= epsilon", () => {
    const result = filterProbabilities(3, {
      "000": 0.5,
      "001": 0.03125,
      "010": 0.02,
      "111": 0.44875,
    });

    expect(result.visible).toEqual({
      "000": 0.5,
      "111": 0.44875,
    });
    expect(result.hiddenCount).toBe(2);
    expect(result.totalCount).toBe(4);
    expect(result.visibleCount).toBe(2);
    expect(result.probabilitySum).toBeCloseTo(1);
  });

  it("throws when probability is invalid", () => {
    expect(() =>
      filterProbabilities(2, { "00": Number.NaN }),
    ).toThrow("must be finite");
    expect(() => filterProbabilities(2, { "00": -0.1 })).toThrow(
      "must be non-negative",
    );
  });
});

