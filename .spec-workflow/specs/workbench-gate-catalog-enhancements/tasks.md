# Tasks Document

- [x] 1. 寤虹珛缁熶竴 Gate Catalog 涓庣煩闃甸瑙堝厓鏁版嵁
  - File: `frontend/src/features/circuit/model/types.ts`
  - File: `frontend/src/features/circuit/gates/gate-catalog.ts`
  - File: `frontend/src/features/circuit/gates/gate-matrix-preview.ts`
  - 鎵╁睍 `GateName` 鏀寔 `p`銆乣cp`銆乣ccx`
  - 寤虹珛闂ㄧ洰褰曠被鍨嬩笌甯搁噺锛堢被鍒€侀厤鑹?token銆佸弬鏁版爣绛俱€佹帶鍒?鐩爣浣嶆暟閲忋€佹斁缃被鍨嬶級
  - 寤虹珛鐭╅樀棰勮鏁版嵁鍑芥暟锛堝浐瀹氶棬鏁板€肩煩闃点€佸弬鏁伴棬绗﹀彿鐭╅樀銆乣ccx` 8x8 绱у噾鏂囨湰鐭╅樀锛?  - _Leverage: `frontend/src/components/circuit/canvas-gate-utils.ts`, `frontend/src/features/circuit/model/types.ts`_
  - _Requirements: Requirement 1, Requirement 2, Requirement 3_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Domain Model Engineer | Task: Add centralized gate catalog and matrix preview metadata, and extend GateName to include p/cp/ccx, ensuring catalog fields can drive UI grouping and execution mapping | Restrictions: Do not add silent fallback defaults for unknown gates; keep metadata immutable; avoid coupling this module to React components | _Leverage: existing GateName typing and canvas gate utility patterns | _Requirements: Requirement 1, Requirement 2, Requirement 3 | Success: catalog is single source of truth for gate metadata, p/cp/ccx are typed and discoverable, matrix preview payloads are generated deterministically | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 2. 閲嶆瀯闂ㄩ潰鏉夸负鍒嗙粍+棰滆壊+鐭╅樀鎮诞灞曠ず
  - File: `frontend/src/components/circuit/GatePalette.tsx`
  - File: `frontend/src/components/circuit/GateMatrixTooltip.tsx`
  - 鎸?`single / controlled / measurement` 鍒嗙粍娓叉煋闂ㄦ寜閽?  - 鎸夊垎绫诲簲鐢ㄩ鑹叉牱寮忥紝淇濇寔鍙鎬т笌鍙偣鍑绘€?  - 鏀寔 hover/focus 鏄剧ず鐭╅樀 tooltip锛堝鐢ㄧ洰褰曚腑鐨勭煩闃甸瑙堟枃鏈級
  - _Leverage: `frontend/src/features/circuit/gates/gate-catalog.ts`, `frontend/src/features/circuit/gates/gate-matrix-preview.ts`_
  - _Requirements: Requirement 2, Requirement 3_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend UI Engineer | Task: Refactor GatePalette to grouped and color-coded rendering and add accessible matrix tooltip on hover/focus | Restrictions: Do not change drag-and-drop MIME protocol; do not hardcode gate branches in UI; keep keyboard accessibility for tooltip trigger | _Leverage: existing GatePalette drag behavior and test-id conventions | _Requirements: Requirement 2, Requirement 3 | Success: palette renders grouped categories with distinct color styles and matrix tooltip appears correctly for each gate including p/cp/ccx | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 3. 鎵╁睍鐢诲竷鏀剧疆閫昏緫浠ユ敮鎸?cp 涓?ccx 澶氭鏀剧疆
  - File: `frontend/src/components/circuit/canvas-gate-utils.ts`
  - File: `frontend/src/components/circuit/CircuitCanvas.tsx`
  - File: `frontend/src/components/circuit/OperationParameterPanel.tsx`
  - 灏?pending 鏀剧疆鍗囩骇涓哄彲鍙樻鏁帮紙2 姝?`cp`锛? 姝?`ccx`锛?  - 澶嶇敤鐩綍鍏冩暟鎹瀯寤?controls/targets锛岀姝㈠悓灞傞噸澶?qubit 閫夋嫨
  - 涓?`p`銆乣cp` 鏄剧ず骞剁紪杈戝弬鏁版爣绛撅紙渚嬪 `lambda`锛?  - _Leverage: `frontend/src/features/circuit/gates/gate-catalog.ts`, `frontend/src/features/circuit/model/circuit-model.ts`, `frontend/src/features/circuit/ui/message-catalog.ts`_
  - _Requirements: Requirement 1, Requirement 3, Requirement 4_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Interaction Engineer | Task: Extend canvas placement to support cp two-step and ccx three-step interactions with explicit guidance and valid operation construction | Restrictions: Do not bypass existing validateCircuitModel commit guard; do not introduce hidden auto-corrections for invalid user selections; preserve existing single/two-qubit gate behavior | _Leverage: existing pending placement flow in CircuitCanvas and operation builder utilities | _Requirements: Requirement 1, Requirement 3, Requirement 4 | Success: cp/ccx can be placed correctly through guided steps, invalid selections are blocked with explicit messages, parameter panel supports p/cp editing | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 4. 琛ラ綈 QASM 瀵煎叆瀵煎嚭瀵?p/cp/ccx 鐨勬敮鎸?  - File: `frontend/src/features/circuit/qasm/qasm-parser-types.ts`
  - File: `frontend/src/features/circuit/qasm/qasm-parser-utils.ts`
  - File: `frontend/src/features/circuit/qasm/qasm-bridge.ts`
  - 杩藉姞 `p/cp/ccx` gate spec锛堝弬鏁颁釜鏁般€佹搷浣滄暟銆佹帶鍒跺睘鎬э級
  - 瀹炵幇 `toQasm3` 瀵规柊闂ㄥ簭鍒楀寲锛屼繚璇佹牸寮忓悎娉曚笖鍙?round-trip
  - 淇濇寔鍙傛暟/鎿嶄綔鏁版牎楠屼弗鏍煎け璐ョ瓥鐣?  - _Leverage: `frontend/src/features/circuit/qasm/qasm-parser.ts`, `frontend/src/features/circuit/model/types.ts`_
  - _Requirements: Requirement 1, Requirement 4_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Compiler/Parser Engineer | Task: Extend OpenQASM parser and serializer to support p, cp, ccx with strict operand/parameter validation and stable serialization order | Restrictions: Do not relax existing parse validation rules; do not add permissive fallback for malformed statements; preserve existing gate behavior | _Leverage: existing GATE_SPECS-based parser flow and qasm-bridge serialize switch | _Requirements: Requirement 1, Requirement 4 | Success: p/cp/ccx are parseable and serializable, invalid arity/params still raise explicit parse errors, round-trip behavior is deterministic | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 5. 鎵╁睍鏈湴妯℃嫙寮曟搸瀵?p/cp/ccx 鐨勬墽琛岃兘鍔?  - File: `frontend/src/features/circuit/simulation/simulation-core.ts`
  - 鍦ㄥ崟姣旂壒鐭╅樀鎵ц涓姞鍏?`p` 鐨勭浉浣嶉棬鐭╅樀
  - 鍦ㄥ彈鎺ф墽琛岃矾寰勫姞鍏?`cp`锛堟帶鍒舵潯浠剁浉浣嶏級涓?`ccx`锛堝弻鎺?X锛夋墽琛岄€昏緫
  - 淇濇寔 `numQubits <= 10` 鐨勬湰鍦版ā鎷熺害鏉熻涔変笉鍙?  - _Leverage: `frontend/src/features/circuit/model/constants.ts`, `frontend/src/features/circuit/model/types.ts`_
  - _Requirements: Requirement 4_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Quantum Simulation Engineer | Task: Add simulation-core execution support for p, cp, and ccx operations while preserving current probability output contract | Restrictions: Do not increase local simulation qubit cap; do not silently skip unsupported operations; keep algorithm deterministic and side-effect free | _Leverage: existing matrix/controlled gate application helpers in simulation-core | _Requirements: Requirement 4 | Success: circuits containing p/cp/ccx produce valid probability distributions under local simulation constraints, and unsupported cases still fail explicitly | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 6. 鎵╁睍浠诲姟鎻愪氦浠ｇ爜鐢熸垚瀵?p/cp/ccx 鐨勬槧灏?  - File: `frontend/src/features/circuit/submission/circuit-task-submit.ts`
  - 涓?`p/cp/ccx` 娣诲姞鎻愪氦鏄犲皠鎴栨樉寮忓彲楠岃瘉鍒嗚В
  - 淇濇寔 gate 鍙傛暟/鎺у埗浣嶆牎楠屼笌鏄惧紡閿欒淇℃伅
  - 淇濊瘉鎺掑簭銆佹寚绾逛笌骞傜瓑 key 琛屼负涓嶅彈鍥炲綊褰卞搷
  - _Leverage: `frontend/src/features/circuit/model/types.ts`, `frontend/src/features/circuit/submission/use-workbench-task-submit.ts`_
  - _Requirements: Requirement 1, Requirement 4_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Runtime Integration Engineer | Task: Extend Qibo submission code generation to support p/cp/ccx via direct mapping or deterministic decomposition with strict validation | Restrictions: Do not alter API payload contract; do not weaken existing validation exceptions; avoid introducing non-deterministic code emission | _Leverage: existing buildOperationLines and helper validation utilities | _Requirements: Requirement 1, Requirement 4 | Success: generated code includes valid instructions for p/cp/ccx and existing gates remain stable in order and idempotency behavior | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 7. 澧炲姞 UI 涓庝氦浜掓祴璇曡鐩栵紙鍒嗙粍/閰嶈壊/tooltip/澶氭鏀剧疆锛?  - File: `frontend/src/tests/circuit-canvas.test.tsx`
  - File: `frontend/src/tests/gate-palette.test.tsx`
  - 鏂板闂ㄩ潰鏉垮垎缁勩€侀鑹叉牱寮忋€乼ooltip 灞曠ず鏂█
  - 澧炲姞 `cp` 涓ゆ涓?`ccx` 涓夋鏀剧疆琛屼负鏂█
  - _Leverage: `frontend/src/tests/workbench-page.test.tsx`, `frontend/src/tests/circuit-canvas.test.tsx`_
  - _Requirements: Requirement 2, Requirement 3, Requirement 4_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Test Engineer | Task: Add behavior-driven tests for grouped/color gate palette, matrix tooltip visibility, and cp/ccx placement workflows | Restrictions: Do not assert brittle implementation internals; avoid snapshot-only tests; keep assertions user-visible and deterministic | _Leverage: existing RTL/Vitest setup and circuit canvas test helpers | _Requirements: Requirement 2, Requirement 3, Requirement 4 | Success: new tests fail before implementation and pass after, covering tooltip and multi-step placement with stable selectors | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖

- [x] 8. 澧炲姞鎵ц閾捐矾娴嬭瘯瑕嗙洊锛圦ASM/妯℃嫙/鎻愪氦锛?  - File: `frontend/src/tests/qasm-parser.test.ts`
  - File: `frontend/src/tests/qasm-bridge.test.ts`
  - File: `frontend/src/tests/simulation-worker.test.ts`
  - File: `frontend/src/tests/circuit-task-submit.test.ts`
  - 澧炲姞 `p/cp/ccx` 瑙ｆ瀽銆佸簭鍒楀寲 round-trip銆佹ā鎷熺粨鏋滀笌鎻愪氦浠ｇ爜鏂█
  - 纭寮傚父鍒嗘敮锛堝弬鏁版垨鎺у埗浣嶉敊璇級缁存寔鏄惧紡澶辫触
  - _Leverage: 鐜版湁 qasm/simulation/submission 娴嬭瘯妯″紡_
  - _Requirements: Requirement 4_
  - _Prompt: Implement the task for spec workbench-gate-catalog-enhancements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-Stack Verification Engineer | Task: Extend parser/serializer/simulation/submission test suites for p/cp/ccx including positive and explicit failure scenarios | Restrictions: Do not relax assertions for legacy gates; do not remove existing failure-case tests; keep test fixtures minimal and deterministic | _Leverage: existing qasm-parser, qasm-bridge, simulation-worker, and circuit-task-submit test files | _Requirements: Requirement 4 | Success: execution-chain tests prove p/cp/ccx consistency across import/export/simulate/submit paths without regressions on existing gates | Instructions: 寮€濮嬪墠灏?tasks.md 瀵瑰簲浠诲姟浠?[ ] 鏀逛负 [-]锛涘疄鐜板畬鎴愬苟娴嬭瘯鍚庤皟鐢?log-implementation 璁板綍浜х墿锛涙渶鍚庡皢浠诲姟鐘舵€佷粠 [-] 鏀逛负 [x]銆俖



