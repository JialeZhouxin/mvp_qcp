# 閲忓瓙浠诲姟绔埌绔暟鎹祦锛圡VP锛?
鏈枃妗ｆ弿杩扮敤鎴峰湪鍓嶇鐐瑰嚮鈥滆繍琛岃绠?鎻愪氦浠诲姟鈥濆悗锛屼唬鐮佷笌娴嬮噺姒傜巼鍦ㄧ郴缁熶腑鐨勫畬鏁存祦鍔ㄨ矾寰勩€?
## 1. 鍓嶇瑙﹀彂鎻愪氦

1. 鐢ㄦ埛鍦?`Monaco Editor` 杈撳叆 Python 鑴氭湰锛堝熀浜?Qibo锛夈€?2. 鐐瑰嚮鈥滄彁浜や换鍔♀€濇寜閽紝瑙﹀彂 `TasksPage.onSubmit`銆?3. 鍓嶇璋冪敤 `submitTask(code)`锛屽彂璧凤細
   - `POST /api/tasks/submit`
   - Header: `Authorization: Bearer <token>`
   - Body:

```json
{
  "code": "from qibo import Circuit\\n...\\ndef main():\\n    return {\"counts\": {\"00\": 512, \"11\": 512}}"
}
```

## 2. 鍚庣鎺ユ敹骞跺叆闃?
1. FastAPI `submit_task` 鎺ユ敹璇锋眰锛屽厛鍋氶壌鏉冿紙Bearer Token锛夈€?2. 灏嗕换鍔″啓鍏?SQLite `tasks` 琛細
   - `user_id`: 褰撳墠鐢ㄦ埛
   - `code`: 鐢ㄦ埛鑴氭湰鍘熸枃
   - `status`: `PENDING`
3. 璋冪敤 `queue.enqueue("app.worker.tasks.run_quantum_task", task_id)` 灏嗕换鍔″彂甯冨埌 Redis锛圧Q Queue锛夈€?4. 绔嬪嵆杩斿洖缁欏墠绔紙寮傛锛屼笉闃诲锛夛細

```json
{
  "task_id": 123,
  "status": "PENDING"
}
```

## 3. 鍓嶇杞浠诲姟鐘舵€?
1. 鍓嶇淇濆瓨 `task_id`锛屽惎鍔ㄥ畾鏃惰疆璇紙榛樿 1.5 绉掞級銆?2. 杞鎺ュ彛锛?   - `GET /api/tasks/{task_id}`
3. 杩斿洖鐘舵€佸彲鑳戒负锛?   - `PENDING`
   - `RUNNING`
   - `SUCCESS`
   - `FAILURE`

## 4. Worker 鎵ц閲忓瓙鑴氭湰

1. Celery Worker 浠?Redis 鎷夊彇浠诲姟 `task_id`銆?2. 灏嗘暟鎹簱鐘舵€佹洿鏂颁负 `RUNNING`銆?3. 璋冪敤鎵ц鍣?`execute_qibo_script(task.code)`锛屽唴閮ㄦ祦绋嬶細
   - 娌欑鏍￠獙锛欰ST 妫€鏌ャ€佸鍏ョ櫧鍚嶅崟銆佸嵄闄╄皟鐢ㄩ檺鍒躲€?   - 瀛愯繘绋嬫墽琛岋細闄愬埗瓒呮椂锛岄伩鍏嶉樆濉炰富杩涚▼銆?   - 鑾峰彇鐢ㄦ埛杩斿洖鍊硷細瑕佹眰 `main()` 鎴?`RESULT` 缁欏嚭缁撴灉銆?4. 缁撴灉瑙勮寖鍖栭€昏緫锛?   - 鏈熸湜鏍稿績涓?`counts`锛坆itstring -> 璁℃暟锛夈€?   - 鑻ユ湭鎻愪緵 `probabilities`锛屽悗绔寜 `count / total` 鑷姩璁＄畻銆?5. 鎵ц鎴愬姛锛?   - `status = SUCCESS`
   - `result_json = {"counts": ..., "probabilities": ...}`
6. 鎵ц澶辫触锛?   - `status = FAILURE`
   - `error_message` 璁板綍閿欒淇℃伅銆?
## 5. 缁撴灉鍥炰紶鍓嶇

1. 褰撳墠绔疆璇㈠埌 `status = SUCCESS`锛屼細璇锋眰缁撴灉鎺ュ彛锛?   - `GET /api/tasks/{task_id}/result`
2. 鍚庣杩斿洖锛?
```json
{
  "task_id": 123,
  "status": "SUCCESS",
  "result": {
    "counts": {
      "00": 512,
      "11": 512
    },
    "probabilities": {
      "00": 0.5,
      "11": 0.5
    }
  },
  "message": null
}
```

3. 鍓嶇灏嗭細
   - `result` 鍘熸枃灞曠ず鍦ㄧ粨鏋滈潰鏉?   - `result.probabilities` 浼犵粰 ECharts 缁勪欢娓叉煋姒傜巼鏌辩姸鍥俱€?
## 6. 鏁版嵁涓荤嚎鎬荤粨

1. **浠ｇ爜鏁版嵁娴?*锛歚Monaco -> POST /submit -> SQLite(code) -> Worker(sandbox+qibo)`
2. **姒傜巼鏁版嵁娴?*锛歚Worker璁＄畻/褰掍竴鍖?-> SQLite(result_json) -> GET /result -> ECharts鍙鍖朻

## 7. 鐘舵€佹満锛堜换鍔＄淮搴︼級

`PENDING -> RUNNING -> SUCCESS`

`PENDING -> RUNNING -> FAILURE`

鐘舵€佺敱鍚庣鍗曞悜鎺ㄨ繘锛屽墠绔彧璇诲睍绀恒€?
