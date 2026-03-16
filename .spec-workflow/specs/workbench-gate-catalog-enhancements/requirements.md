# Requirements Document

## Introduction

This spec upgrades the graphical circuit workbench gate palette from a flat list into a categorized, color-coded, and extensible gate catalog system. It also adds matrix tooltip education support and introduces three new gates: `p`, `cp`, and `ccx`.

The goal is to reduce gate discovery cost, lower cognitive load, and make adding future gates predictable without scattered file edits.

## Alignment with Product Vision

This work supports MVP usability and execution reliability in the existing closed loop:

- Improves task authoring efficiency in the core graphical workbench flow.
- Preserves Debug-First behavior by making gate support explicit across UI, QASM, local simulation, and submission mapping.
- Improves maintainability for rapid iteration by reducing duplicated gate-definition logic.

## Requirements

### Requirement 1

**User Story:** As a quantum circuit author, I want gate definitions managed in one catalog, so that the workbench can scale with new gates without fragile multi-file manual syncing.

#### Acceptance Criteria

1. WHEN the frontend initializes supported gate metadata THEN the system SHALL load gate identity, category, color token, arity, parameter metadata, and matrix tooltip metadata from a single catalog module.
2. IF a gate is exposed in the drag palette THEN the system SHALL provide enough metadata to render grouping/color and tooltip matrix without hardcoded per-component gate branches.
3. WHEN a new gate is added to the catalog THEN the system SHALL fail fast in unsupported execution paths (QASM parse/serialize, local simulation, submit mapping) with explicit errors rather than silent fallback.

### Requirement 2

**User Story:** As a workbench user, I want gates grouped and color-coded by type, so that I can quickly find the gate I need.

#### Acceptance Criteria

1. WHEN the gate palette is rendered THEN the system SHALL display grouped sections at minimum for single-qubit gates, multi-qubit/controlled gates, and measurement.
2. WHEN gates are rendered in palette THEN the system SHALL apply distinct visual colors per category and keep contrast readable.
3. WHEN the user opens the updated palette THEN the system SHALL include `p`, `cp`, and `ccx` in the correct category groups.

### Requirement 3

**User Story:** As a learner and practitioner, I want to see a gate matrix on hover/focus, so that I can understand gate behavior directly in context.

#### Acceptance Criteria

1. WHEN the pointer hovers over a gate item (or keyboard focus lands on it) THEN the system SHALL show a matrix tooltip near the gate.
2. IF the gate is parameterized THEN the system SHALL show a symbolic matrix form (for example using `theta` / `lambda`) and not hide parameter dependence.
3. WHEN tooltip content is shown for `p`, `cp`, and `ccx` THEN the system SHALL provide mathematically valid matrix representation consistent with their gate definitions.

### Requirement 4

**User Story:** As a workbench user, I want newly added gates to be executable across editor flows, so that drag-build, QASM import/export, local simulation, and backend submission remain consistent.

#### Acceptance Criteria

1. WHEN `p`, `cp`, or `ccx` operations are created in the graphical editor THEN the circuit model SHALL represent them with correct control/target/parameter structure.
2. WHEN OpenQASM is exported/imported THEN the system SHALL serialize and parse `p`, `cp`, and `ccx` correctly.
3. WHEN local simulation is available (`numQubits <= 10`) THEN the system SHALL compute probabilities for circuits containing `p`, `cp`, and `ccx`.
4. WHEN task code is generated for backend submission THEN the system SHALL emit valid executable logic for `p`, `cp`, and `ccx` using explicit mapping or decomposition.

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: Isolate gate metadata, tooltip rendering, placement interaction, and execution mapping responsibilities.
- **Modular Design**: Keep gate catalog reusable by palette UI, canvas helpers, QASM bridge/parser, simulation core, and submit builder.
- **Dependency Management**: UI components depend on catalog abstractions; execution layers do not depend on UI presentation internals.
- **Clear Interfaces**: Define typed gate metadata contracts for category, arity, parameters, and matrix preview.

### Performance
- Palette rendering and tooltip display SHALL remain responsive with current and near-future gate counts.
- Tooltip generation SHALL avoid expensive recomputation on every mouse move.

### Security
- No relaxation of existing input validation for QASM parsing and operation validation.
- No use of dynamic evaluation for matrix tooltip rendering.

### Reliability
- Existing supported gates SHALL keep current behavior.
- New gate support SHALL be covered by automated tests for parser, serializer, simulator, submit mapping, and UI interactions.

### Usability
- Group labels and color coding SHALL be clear under desktop and mobile viewport constraints.
- Tooltip content SHALL remain readable in monospace-formatted matrix blocks.
