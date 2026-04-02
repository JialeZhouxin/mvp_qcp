import {
  deleteEmptyColumnsBefore,
  insertColumnsBefore,
} from "../features/circuit/model/circuit-model";
import type { CircuitModel } from "../features/circuit/model/types";

describe("circuit column adjust", () => {
  it("inserts columns before target layer and shifts following gates", () => {
    const model: CircuitModel = {
      numQubits: 2,
      operations: [
        { id: "op-1", gate: "x", targets: [0], layer: 0 },
        { id: "op-2", gate: "h", targets: [1], layer: 2 },
      ],
    };

    const next = insertColumnsBefore(model, 1, 2);

    expect(next.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "op-1", layer: 0 }),
        expect.objectContaining({ id: "op-2", layer: 4 }),
      ]),
    );
  });

  it("deletes empty columns before target layer", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 3 }],
    };

    const result = deleteEmptyColumnsBefore(model, 3, 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model.operations[0]).toMatchObject({ id: "op-1", layer: 1 });
    }
  });

  it("rejects delete when range contains gates", () => {
    const model: CircuitModel = {
      numQubits: 1,
      operations: [{ id: "op-1", gate: "x", targets: [0], layer: 1 }],
    };

    const result = deleteEmptyColumnsBefore(model, 3, 2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("COLUMN_DELETE_BLOCKED_BY_OPERATION");
      expect(result.operationId).toBe("op-1");
      expect(result.blockingLayer).toBe(1);
    }
  });

  it("rejects invalid delete range", () => {
    const model: CircuitModel = { numQubits: 1, operations: [] };
    const result = deleteEmptyColumnsBefore(model, 0, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("COLUMN_DELETE_INVALID_RANGE");
    }
  });
});
