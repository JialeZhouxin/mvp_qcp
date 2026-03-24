# QCP MVP 椤圭洰浣跨敤鎸囧崡锛堝綋鍓嶇増锛?
## 1. 鏂囨。鐩爣

鏈寚鍗楃敤浜庡揩閫熶笂鎵嬪綋鍓嶄粨搴?`mvp_qcp`锛岃鐩栦互涓嬪唴瀹癸細

- 杩愯鐜鍑嗗
- Docker 涓庢湰鍦颁袱绉嶅惎鍔ㄦ柟寮?- 鍓嶇椤甸潰浣跨敤璺緞
- 鏍稿績 API 涓庤仈璋冩柟寮?- 甯歌鏁呴殰鎺掓煡

閫傜敤鏃堕棿锛?026-03锛堜笌褰撳墠 `master` 鍒嗘敮瀹炵幇涓€鑷达級銆?
## 2. 椤圭洰姒傝

QCP MVP 鏄竴涓噺瀛愪换鍔℃彁浜や笌鎵ц骞冲彴锛屼富娴佺▼涓猴細

1. 鐢ㄦ埛娉ㄥ唽/鐧诲綍鑾峰彇 Token銆?2. 鍓嶇鎻愪氦閲忓瓙浠诲姟锛堝浘褰㈠寲鐢佃矾鎴栦唬鐮佹ā寮忥級銆?3. 鍚庣鍐欏叆浠诲姟骞跺叆闃燂紙Redis + Celery锛夈€?4. Worker 鍦ㄥ彈闄愭墽琛岀幆澧冧腑杩愯浠诲姟锛圦ibo锛夈€?5. 鍓嶇灞曠ず浠诲姟鐘舵€佷笌缁撴灉锛堜换鍔′腑蹇?+ 鍙鍖栫粨鏋滐級銆?
## 3. 鎶€鏈爤涓庣鍙?
- 鍓嶇锛歊eact + Vite锛堥粯璁?`5173`锛?- 鍚庣锛欶astAPI + SQLModel + SQLite锛堥粯璁?`8000`锛?- 闃熷垪锛歊edis + RQ锛堥粯璁?`6379`锛?- 鎵ц锛歈ibo锛圵orker 渚ф墽琛岋級

榛樿璁块棶鍦板潃锛?
- 鍓嶇锛歚http://127.0.0.1:5173`
- 鍚庣鍋ュ悍妫€鏌ワ細`http://127.0.0.1:8000/api/health`
- OpenAPI锛歚http://127.0.0.1:8000/docs`

## 4. 鐜鍑嗗

## 4.1 蹇呭渚濊禆

- Docker Desktop锛堟帹鑽愶紝鏈€蹇笂鎵嬶級
- Node.js + npm锛堟湰鍦板墠绔繍琛岋級
- Python 3.11 + `uv`锛堟湰鍦板悗绔繍琛岋級
- Redis锛堟湰鍦版ā寮忛渶瑕侊級

## 4.2 鐜鍙橀噺

1. 澶嶅埗绀轰緥鏂囦欢锛?
```powershell
Copy-Item ".env.example" ".env"
```

2. 榛樿鍊煎彲鐩存帴杩愯锛涘父鐢ㄥ叧閿」濡備笅锛?
- `TASK_JOB_TIMEOUT_SECONDS=90`
- `QIBO_EXEC_TIMEOUT_SECONDS=60`
- `EXECUTION_BACKEND=remote`（容器模式）
- `REDIS_URL=redis://127.0.0.1:6379/0`锛堟湰鍦版ā寮忥級

## 5. 鍚姩鏂瑰紡

## 5.1 鏂瑰紡 A锛欴ocker锛堟帹鑽愶級

1. 鍦ㄩ」鐩牴鐩綍鍚姩锛?
```powershell
cd "E:/02_Projects/quantuncloudplatform/mvp_qcp"
docker compose up --build -d
```

2. 杩愯鍋ュ悍妫€鏌ワ細

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker
```

3. 娣卞害鑱旇皟妫€鏌ワ紙鍙€夛級锛?
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1" -Docker -Deep
```

4. 鍋滄鏈嶅姟锛?
```powershell
docker compose down
```

5. 娓呯悊鍗凤紙浼氬垹闄ゅ鍣ㄥ嵎涓殑鏁版嵁锛夛細

```powershell
docker compose down -v
```

## 5.2 鏂瑰紡 B锛氭湰鍦拌繘绋嬪惎鍔?
1. 涓€閿惎鍔紙浼氭媺璧峰悗绔?API銆乄orker銆佸墠绔級锛?
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1"
```

说明：该脚本会在宿主机模式下注入 `EXECUTION_BACKEND=local`。容器模式由 `docker-compose.yml` 通过独立 `execution-service` 维持 `EXECUTION_BACKEND=remote`。

2. 鍚姩鍚庢鏌ワ細

```powershell
powershell -ExecutionPolicy Bypass -File "scripts/dev-health-check.ps1"
```

3. 鑻ヤ緷璧栨湭瀹夎锛屽彲浣跨敤锛?
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/start-dev.ps1" -InstallDeps
```

## 6. 鍓嶇浣跨敤璺緞

鐧诲綍鍚庨粯璁よ繘鍏ュ浘褰㈠寲宸ヤ綔鍙帮細

- `/tasks/circuit`锛氬浘褰㈠寲鐢佃矾 + OpenQASM 3 缂栬緫 + 鏈湴妯℃嫙 + 鎻愪氦浠诲姟
- `/tasks/code`锛氫唬鐮佹彁浜ゆā寮忥紙鍏煎鍏ュ彛锛?- `/tasks/center`锛氫换鍔′腑蹇冿紙鍒楄〃銆佽鎯呫€丼SE 瀹炴椂鐘舵€佹祦锛?
璁よ瘉椤甸潰锛?
- `/login`
- `/register`

## 7. 鏍稿績 API锛堝綋鍓嶏級

## 7.1 鍋ュ悍涓庣洃鎺?
- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/metrics`

## 7.2 璁よ瘉

- `POST /api/auth/register`
- `POST /api/auth/login`

## 7.3 浠诲姟

- `POST /api/tasks/submit`
- `GET /api/tasks/{task_id}`
- `GET /api/tasks/{task_id}/result`
- `GET /api/tasks`锛堜换鍔′腑蹇冨垪琛紝鏀寔 `status/limit/offset`锛?- `GET /api/tasks/{task_id}/detail`
- `GET /api/tasks/stream`锛圫SE锛?
璇存槑锛?
- 浠诲姟鐩稿叧鎺ュ彛闇€瑕?`Authorization: Bearer <access_token>`銆?- `POST /api/tasks/submit` 鏀寔 `Idempotency-Key` 璇锋眰澶村幓閲嶃€?- 浠诲姟缁堟€佸寘鍚細`SUCCESS`銆乣FAILURE`銆乣TIMEOUT`銆乣RETRY_EXHAUSTED`銆?
## 7.4 椤圭洰鎸佷箙鍖?
- `PUT /api/projects/{name}`锛堜繚瀛?鏇存柊锛?- `GET /api/projects`锛堝垎椤靛垪琛級
- `GET /api/projects/{project_id}`锛堣鎯咃級

## 8. 甯哥敤楠岃瘉鍛戒护

鍚庣 smoke 娴嬭瘯锛?
```powershell
powershell -ExecutionPolicy Bypass -File "scripts/run-backend-tests.ps1"
```

鍓嶇娴嬭瘯锛?
```powershell
cd "frontend"
npm test
```

鍓嶇 Node fallback 娴嬭瘯锛?
```powershell
cd "frontend"
npm run test:node
```

## 9. 甯歌闂鎺掓煡

1. `api/health` 涓嶉€氾細
- 鍏堢‘璁?`backend` 涓?`worker` 鏄惁姝ｅ父鍚姩銆?- Docker 妯″紡鎵ц `docker compose ps` 鏌ョ湅瀹瑰櫒鐘舵€併€?
2. 鎻愪氦浠诲姟澶辫触锛?03锛夛細
- 鍙兘鏄槦鍒楁嫢濉烇紙`QUEUE_OVERLOADED`锛夋垨鍏ラ槦澶辫触锛坄QUEUE_PUBLISH_ERROR`锛夈€?- 浼樺厛妫€鏌?Redis 杩為€氭€у拰 Worker 鏃ュ織銆?
3. PowerShell 鎵ц鑴氭湰鍙楅檺锛?- 浣跨敤鏂囨。涓殑 `-ExecutionPolicy Bypass` 鍚姩鑴氭湰銆?
4. 鍓嶇鍙墦寮€浣嗕换鍔＄姸鎬佷笉鏇存柊锛?- 妫€鏌ョ櫥褰曟€佹槸鍚︽湁鏁堬紙Bearer Token锛夈€?- 妫€鏌?`/api/tasks/stream` 鏄惁鍙揪锛堜换鍔′腑蹇冧緷璧?SSE锛夈€?
## 10. 鍏抽敭鏂囦欢绱㈠紩

- `README.md`
- `docker-compose.yml`
- `scripts/start-dev.ps1`
- `scripts/dev-health-check.ps1`
- `scripts/run-backend-tests.ps1`
- `backend/app/main.py`
- `frontend/src/App.tsx`

## 11. Workbench P0 鏇存柊锛?026-03锛?
`/tasks/circuit` 鐨勪氦浜掗『搴忓凡璋冩暣涓猴細

1. 缂栬緫鍖猴紙鎷栨嫿鐢佃矾 + QASM锛?2. 鏈湴妯℃嫙缁撴灉鍖猴紙绱ч偦缂栬緫鍖轰笅鏂癸級
3. 鎻愪氦鍖猴紙绱ч偦缁撴灉鍖轰笅鏂癸級
4. 椤圭洰鍖?
鏂板鎺т欢锛?
- `+Qubit` / `-Qubit`锛氱敤浜庤皟鏁寸數璺噺瀛愭瘮鐗规暟閲忋€?
瑙勫垯璇存槑锛?
- 褰撻噺瀛愭瘮鐗规暟閲?`<= 10` 鏃讹紝椤甸潰鏀寔娴忚鍣ㄦ湰鍦板疄鏃舵ā鎷熶笌鐩存柟鍥惧睍绀恒€?- 褰撻噺瀛愭瘮鐗规暟閲?`> 10` 鏃讹紝椤甸潰浼氭樉绀衡€滃凡鍏抽棴瀹炴椂妯℃嫙锛屼絾浠嶅彲鎻愪氦鍚庣鎵ц鈥濈殑鎻愮ず銆?- `> 10` 涓嶄細闃诲浠诲姟鎻愪氦锛涙彁浜よ涓轰笌鏅€氫换鍔′竴鑷淬€?
## 12. Task 瀵艰埅涓庝俊鎭灦鏋?P0 鏇存柊锛?026-03锛?
- `/tasks` 榛樿鍏ュ彛宸茶皟鏁翠负 `/tasks/center`锛屽厛杩涘叆浠诲姟涓績鍐嶅垎娴佸埌鍏蜂綋鎵ц妯″潡銆?- 浠诲姟鍩熸柊澧炲叏灞€椤堕儴瀵艰埅锛岀粺涓€鏄剧ず鍥涗釜妯″潡锛歚浠诲姟涓績`銆乣鍥惧舰鍖栫紪绋媊銆乣浠ｇ爜鎻愪氦`銆乣甯姪鏂囨。`銆?- 浠诲姟鍩熸柊澧炲叏灞€闈㈠寘灞戯紝褰撳墠缁熶竴鏄剧ず涓猴細`浠诲姟 / 褰撳墠妯″潡`銆?- 鏂板甯姪椤甸潰锛歚/tasks/help`锛岀敤浜庤鏄庝换鍔℃祦杞矾寰勪笌鏂囨。绱㈠紩銆?- 浠诲姟涓績椤靛ご鏂板鈥滃府鍔╂枃妗ｂ€濆叆鍙ｏ紝渚夸簬鐢ㄦ埛浠庝换鍔¤瘖鏂洿鎺ヨ繘鍏ヨ鏄庨〉銆?

