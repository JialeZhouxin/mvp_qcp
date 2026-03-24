# QCP MVP 椤圭洰杩涘害涓庝娇鐢ㄦ寚鍗楋紙褰撳墠鐗堬級

## 1. 椤圭洰绠€浠?
Quantum Cloud Platform锛圦CP锛夋槸涓€涓潰鍚戦噺瀛愪换鍔℃彁浜や笌缁撴灉鍙鍖栫殑 MVP 椤圭洰銆傚綋鍓嶅疄鐜颁簡浠庣敤鎴疯璇佸埌浠诲姟鎵ц涓庡墠绔睍绀虹殑鏈€灏忎笟鍔￠棴鐜細

1. 鐢ㄦ埛娉ㄥ唽/鐧诲綍锛岃幏鍙栬闂护鐗?2. 鍓嶇鎻愪氦 Python 閲忓瓙鑴氭湰
3. 鍚庣灏嗕换鍔″紓姝ュ叆闃燂紙Redis + Celery锛?4. Worker 鎵ц鑴氭湰骞跺洖鍐欑粨鏋?5. 鍓嶇杞鐘舵€佸苟灞曠ず缁撴灉锛圝SON + 姒傜巼鍒嗗竷鍥撅級

## 2. 褰撳墠椤圭洰杩涘害

## 2.1 宸插畬鎴?
- 鍓嶇锛氱櫥褰?娉ㄥ唽/浠诲姟椤点€丮onaco 缂栬緫鍣ㄣ€丒Charts 缁撴灉鍥俱€佽疆璇笌鍒锋柊
- 鍚庣锛欶astAPI API銆丼QLite + SQLModel銆佽璇併€佷换鍔℃彁浜?鐘舵€?缁撴灉鎺ュ彛
- 寮傛鎵ц锛歊edis 闃熷垪 + Celery Worker
- 鎵ц寮曟搸锛歈ibo 鍙楅檺鎵ц锛堝惈 AST 鏍￠獙鍜岃秴鏃舵帶鍒讹級
- 娴嬭瘯锛氬悗绔?smoke/integration銆佸墠绔?Vitest + `test:node` 鍏滃簳
- 杩愯妯″紡锛氭湰鏈烘ā寮?+ Docker 寮€鍙?婕旂ず妯″紡

## 2.2 瀹瑰櫒鍖栬縼绉荤姸鎬?
- 宸插畬鎴?`spec-workflow` 鍏ㄦ祦绋嬶紙Requirements/Design/Tasks/Implementation锛?- `dockerized-dev-demo-runtime` 瑙勬牸宸插畬鎴愶紝8/8 浠诲姟瀹屾垚
- 宸叉柊澧炲苟楠岃瘉锛?  - `docker-compose.yml`
  - `backend/Dockerfile`, `frontend/Dockerfile`
  - `backend/.dockerignore`, `frontend/.dockerignore`
  - Docker 妯″紡鍋ュ悍妫€鏌ワ紙`scripts/dev-health-check.ps1 -Docker`锛?- 宸查獙璇?SQLite 鎸佷箙鍖栧嵎锛氬鍣ㄩ噸鍚悗鏁版嵁淇濈暀

## 2.3 浠嶅緟瀹屽杽锛圡VP 鍚庣画锛?
- 鐢熶骇绾ф矙绠变笌璧勬簮闅旂寮哄寲锛圕PU/鍐呭瓨绮掑害锛?- 鍓嶇 UI 涓庝氦浜掔粏鑺備紭鍖?- 鍓嶇娴嬭瘯鎵弿瑙勫垯杩涗竴姝ユ竻鐞嗭紙tests-node 涓?Vitest 杈圭晫锛?
## 3. 鎶€鏈爤涓庢灦鏋?
- 鍓嶇锛歊eact + Vite + React Router + Monaco + ECharts
- 鍚庣锛欶astAPI + SQLModel + SQLite
- 闃熷垪锛歊edis + RQ
- 鎵ц锛歈ibo
- 娴嬭瘯锛歱ytest / Vitest

鏍稿績杩愯閾捐矾锛?
`Browser -> Frontend(5173) -> Backend(8000) -> Redis -> Worker -> SQLite -> Frontend`

## 4. 濡備綍浣跨敤鏈」鐩紙閲嶇偣锛?
鎺ㄨ崘浼樺厛浣跨敤 Docker 妯″紡锛岀粺涓€鐜銆佸惎鍔ㄧ畝鍗曘€佽仈璋冪ǔ瀹氥€?
## 4.1 Docker 妯″紡锛堟帹鑽愶級

鍓嶇疆鏉′欢锛?
- 宸插畨瑁?Docker Desktop
- 宸插惎鍔?Docker Engine

鍚姩锛?
```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

璁块棶锛?
- 鍓嶇锛歚http://127.0.0.1:5173`
- 鍚庣鍋ュ悍妫€鏌ワ細`http://127.0.0.1:8000/api/health`
- API 鏂囨。锛歚http://127.0.0.1:8000/docs`

鍋ュ悍妫€鏌ワ細

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

娣卞害妫€鏌ワ紙璁よ瘉 + 鎻愪氦浠诲姟 + 鏌ヨ鐘舵€侊級锛?
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

鍋滄锛?
```powershell
docker compose down
```

鍋滄骞跺垹闄ゅ嵎锛堜細娓呯┖ SQLite 鏁版嵁锛夛細

```powershell
docker compose down -v
```

## 4.2 鏈満妯″紡锛堝閫夛級

涓€閿惎鍔細

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

本机启动脚本默认以 `EXECUTION_BACKEND=local` 运行 API/worker，避免宿主机进程直接依赖 Docker API 权限；容器链路改为经 `execution-service` 走 `EXECUTION_BACKEND=remote`。

鏈満鍋ュ悍妫€鏌ワ細

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1"
```

## 5. 鍏稿瀷浣跨敤娴佺▼锛堜笟鍔¤瑙掞級

1. 鎵撳紑鍓嶇椤甸潰骞舵敞鍐岃处鍙?2. 鐧诲綍鍚庤繘鍏ヤ换鍔￠〉
3. 鍦ㄧ紪杈戝櫒涓彁浜ら噺瀛愯剼鏈?4. 瑙傚療浠诲姟鐘舵€佷粠 `PENDING/RUNNING` 鍒?`SUCCESS/FAILURE`
5. 鏌ョ湅杩斿洖缁撴灉涓庢鐜囧垎甯冨浘

## 6. 鍏抽敭鎺ュ彛閫熻

- `GET /api/health`锛氭湇鍔″仴搴锋鏌?- `POST /api/auth/register`锛氭敞鍐?- `POST /api/auth/login`锛氱櫥褰?- `POST /api/tasks/submit`锛氭彁浜や换鍔★紙闇€ Bearer Token锛?- `GET /api/tasks/{task_id}`锛氭煡璇㈢姸鎬侊紙闇€ Bearer Token锛?- `GET /api/tasks/{task_id}/result`锛氭煡璇㈢粨鏋滐紙闇€ Bearer Token锛?
## 7. 甯歌闂涓庢帓闅?
## 7.1 `/api/health` 娴忚鍣ㄢ€滅湅璧锋潵娌″唴瀹光€?
璇ユ帴鍙ｈ繑鍥炵殑鏄?JSON锛屼笉鏄?HTML 椤甸潰銆傚彲鐩存帴鍦ㄧ粓绔獙璇侊細

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/health"
```

## 7.2 Docker 鍛戒护鏉冮檺鎶ラ敊

- 鍦ㄥ綋鍓嶇幆澧冧腑锛岄儴鍒?Docker 鍛戒护鍙兘闇€瑕佹洿楂樻潈闄愭墠鑳借闂?`dockerDesktopLinuxEngine`
- 鍏堟墽琛?`docker version` 楠岃瘉寮曟搸鐘舵€侊紝鍐嶆墽琛?`docker compose ps` 鎺掓煡鏈嶅姟鐘舵€?
## 7.3 鍓嶇鍙墦寮€浣嗕换鍔℃彁浜ゅけ璐?
浼樺厛妫€鏌ワ細

1. `backend` 涓?`worker` 鏄惁閮藉湪杩愯锛坄docker compose ps`锛?2. Redis 鏄惁鍋ュ悍
3. 鐧诲綍鍚庢槸鍚︽惡甯?Bearer Token

## 8. 鏂囨。涓庝唬鐮佸叆鍙?
- 涓昏鏄庯細`README.md`
- 鍋ュ悍妫€鏌ヨ剼鏈細`scripts/dev-health-check.ps1`
- 涓€閿惎鍔ㄨ剼鏈紙鏈満妯″紡锛夛細`scripts/start-dev.ps1`
- Docker 缂栨帓锛歚docker-compose.yml`
- 鍚庣鍏ュ彛锛歚backend/app/main.py`
- Worker 鍏ュ彛锛歚backend/app/worker/celery_app.py`
- 鍓嶇鍏ュ彛锛歚frontend/src/main.tsx`
## Reliability and Observability Update (2026-03-10)

### New task terminal states

- `TIMEOUT`
- `RETRY_EXHAUSTED`

### New submit behavior

- `POST /api/tasks/submit` supports optional `Idempotency-Key` header.
- Submit response includes `deduplicated` field.
- Queue overload now returns `503` with code `QUEUE_OVERLOADED`.

### New health and metrics endpoints

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/metrics`

### New environment keys

- `TASK_MAX_RETRIES`
- `TASK_RETRY_BACKOFF_SECONDS`
- `QUEUE_MAX_DEPTH`
- `IDEMPOTENCY_TTL_HOURS`
- `IDEMPOTENCY_CLEANUP_BATCH_SIZE`

## Graphical Workbench Update (2026-03-12)

### New frontend entries

- `/tasks/circuit`: graphical quantum workbench (drag gates + editable OpenQASM 3 + browser-local simulation).
- `/tasks/code`: legacy code submission page retained for compatibility.

### Workbench runtime limits

- `qubits <= 10`
- `depth <= 200`
- `total_gates <= 1000`

### Histogram filtering rule

- Display only states with `p > 2^-(n+2)`.
- Show total/visible/hidden state counts and probability sum for explainability.

## Workbench UX Iteration (2026-03-13)

### New capabilities

- Two-qubit gate placement now has step guidance and actionable Chinese error hints.
- Added toolbar operations: `鎾ら攢` / `閲嶅仛` / `娓呯┖绾胯矾` / `閲嶇疆宸ヤ綔鍙癭.
- Added result display mode toggle: filtered-only vs all states.
- Added epsilon visibility (`2^-(n+2)`) and display statistics in result panel.
- Added built-in templates (Bell / superposition) for quick demo startup.
- Added first-time quick guide with persisted dismiss preference.
- Added local draft persistence and restore for circuit/QASM/display mode.
- Localized QASM parse feedback with structured fix suggestions.

### Updated usage flow

1. Open `/tasks/circuit` and load a template first for baseline verification.
2. Modify the circuit via drag-drop or edit QASM directly.
3. Use undo/redo while iterating to compare nearby circuit variants.
4. Switch display mode to inspect filtered and full probability distributions.
5. Refresh the page to verify draft auto-restore behavior.
6. Click `Submit Task` to send the current circuit as a backend task (with idempotency key).
7. Check `task_id` and `task status` in-place, and use `Refresh Status` to fetch latest progress.
8. If the UI shows deduplicated hint, repeated submit was bound to an existing task.
9. Jump to `/tasks/center` for full task timeline and diagnostics.


