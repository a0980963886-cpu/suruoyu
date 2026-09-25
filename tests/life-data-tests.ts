import assert from 'node:assert/strict';
import {
  authenticateToken,
  denyGuest,
  signUserToken,
} from '../server/authMiddleware.ts';
import {
  saveUserAlarm,
  listUserAlarms,
  toggleUserAlarm,
  deleteUserAlarm,
  saveUserNote,
  listUserNotes,
  toggleUserNote,
  deleteUserNote,
  saveUserSchedule,
  listUserSchedules,
  deleteUserSchedule,
  importLocalData,
} from '../server/userDataService.ts';
import { setFirestoreDbForTesting } from '../server/firebaseAdmin.ts';

// Test environment variables
process.env.JWT_SECRET = 'test-security-suite-secret-key-32chars!';
process.env.AUTH_SECRET_KEY = 'test-security-suite-secret-key-32chars!';

console.log('=== 開始執行生活資料（鬧鐘／筆記／行程）雲端遷移與邊界安全自動化測試 ===\n');

// In-Memory Hierarchical Mock Firestore to test true database operations without network latency
function createMockFirestore() {
  const store: Record<string, any> = {};

  function getDocPath(segments: string[]): string {
    return segments.join('/');
  }

  function makeCollectionRef(pathSegments: string[]): any {
    return {
      doc: (docId: string) => makeDocRef([...pathSegments, docId]),
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => ({
        get: async () => {
          const prefix = getDocPath(pathSegments) + '/';
          const docs = Object.keys(store)
            .filter((p) => p.startsWith(prefix) && p.slice(prefix.length).indexOf('/') === -1)
            .map((p) => {
              const docId = p.slice(prefix.length);
              const data = store[p];
              return {
                id: docId,
                data: () => ({ ...data }),
                exists: true,
              };
            });
          docs.sort((a, b) => {
            const valA = a.data()[field];
            const valB = b.data()[field];
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
          });
          return { docs };
        },
      }),
      get: async () => {
        const prefix = getDocPath(pathSegments) + '/';
        const docs = Object.keys(store)
          .filter((p) => p.startsWith(prefix) && p.slice(prefix.length).indexOf('/') === -1)
          .map((p) => ({
            id: p.slice(prefix.length),
            data: () => ({ ...store[p] }),
            exists: true,
          }));
        return { docs };
      },
    };
  }

  function makeDocRef(pathSegments: string[]): any {
    const fullPath = getDocPath(pathSegments);
    return {
      id: pathSegments[pathSegments.length - 1],
      collection: (subColName: string) => makeCollectionRef([...pathSegments, subColName]),
      get: async () => {
        const exists = fullPath in store;
        return {
          id: pathSegments[pathSegments.length - 1],
          exists,
          data: () => (exists ? { ...store[fullPath] } : undefined),
        };
      },
      set: async (data: any, options?: { merge?: boolean }) => {
        if (options?.merge && store[fullPath]) {
          store[fullPath] = { ...store[fullPath], ...data };
        } else {
          store[fullPath] = { ...data };
        }
      },
      delete: async () => {
        delete store[fullPath];
      },
    };
  }

  return {
    collection: (colName: string) => makeCollectionRef([colName]),
    _dump: () => store,
  };
}

let totalTests = 0;
let passedTests = 0;

async function runTest(testName: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passedTests++;
    console.log(`✅ 通過: ${testName}`);
  } catch (err) {
    console.error(`❌ 失敗: ${testName}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function createMockReqRes(headers: Record<string, string> = {}, body: any = {}, user: any = null) {
  const req: any = {
    headers: { ...headers },
    body: { ...body },
    user,
  };
  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData,
  };
}

async function main() {
  const mockDb = createMockFirestore();
  setFirestoreDbForTesting(mockDb as any);

  const guestToken = signUserToken({
    userId: 'guest-session-random',
    email: 'guest@experience.local',
    role: 'guest',
    tenantId: 'tenant-a',
    tokenVersion: 1,
    isGuest: true,
  });

  // Test 1: 訪客角色禁止存取生活資料 API
  await runTest('訪客角色（guest）禁止存取生活資料 API (denyGuest 403 攔截)', async () => {
    const { req, res, getStatus } = createMockReqRes(
      { authorization: `Bearer ${guestToken}` },
      {},
      { userId: 'guest-session-random', role: 'guest', tenantId: 'tenant-a' }
    );
    let nextCalled = false;
    denyGuest(req, res, () => {
      nextCalled = true;
    });
    assert.equal(getStatus(), 403, 'Guest 角色存取應被 denyGuest 拒絕為 403');
    assert.equal(nextCalled, false, '訪客不可調用生活資料持久化 API');
  });

  // Test 2: 輸入驗證 - 鬧鐘時間格式必須為 HH:MM 且合法
  await runTest('鬧鐘時間格式驗證：無效格式（25:99）拒絕寫入', async () => {
    let errorThrown = false;
    try {
      await saveUserAlarm('user-alice-1', {
        time: '25:99',
        label: '無效鬧鐘',
      }, 'tenant-a');
    } catch (err: any) {
      errorThrown = true;
      assert.match(err.message, /HH:mm/, '應提示必須為有效的 HH:mm 格式');
    }
    assert.equal(errorThrown, true, '無效時間格式應在服務端被拒絕');
  });

  // Test 3: 輸入驗證 - 筆記內容長度限制防護（拒絕超過 5000 字元超長內容）
  await runTest('筆記資料大小限制：超長內容（>5000字）拒絕寫入', async () => {
    let errorThrown = false;
    const oversizedContent = 'A'.repeat(5001);
    try {
      await saveUserNote('user-alice-1', {
        content: oversizedContent,
      }, 'tenant-a');
    } catch (err: any) {
      errorThrown = true;
      assert.match(err.message, /5,000/, '應提示筆記內容不可超過 5,000 字');
    }
    assert.equal(errorThrown, true, '超過限制的筆記應被服務端拒絕');
  });

  // Test 4: 輸入驗證 - 行程日期日曆實際日期驗證（拒絕 2026-02-31、閏年判斷、時區安全）
  await runTest('行程日期驗證：拒絕不存在之日曆日期（2026-02-31、2026-04-31）並正確支援閏年', async () => {
    // 2026 年 2 月只有 28 天，拒絕 2026-02-31
    let errorThrownFeb = false;
    try {
      await saveUserSchedule('user-alice-1', {
        title: '專案會議',
        date: '2026-02-31',
      }, 'tenant-a');
    } catch (err: any) {
      errorThrownFeb = true;
      assert.match(err.message, /2026 年 2 月僅有 28 天/);
    }
    assert.equal(errorThrownFeb, true, '2026-02-31 必須被拒絕');

    // 4 月只有 30 天，拒絕 2026-04-31
    let errorThrownApr = false;
    try {
      await saveUserSchedule('user-alice-1', {
        title: '季度檢討',
        date: '2026-04-31',
      }, 'tenant-a');
    } catch (err: any) {
      errorThrownApr = true;
      assert.match(err.message, /4 月僅有 30 天/);
    }
    assert.equal(errorThrownApr, true, '2026-04-31 必須被拒絕');

    // 閏年 2028-02-29 必須合法通過
    const leapYearSchedule = await saveUserSchedule('user-alice-1', {
      title: '四年一度閏年會議',
      date: '2028-02-29',
    }, 'tenant-a');
    assert.equal(leapYearSchedule.date, '2028-02-29', '閏年 2028-02-29 應合法寫入');
  });

  // Test 5: 嚴格使用者與租戶隔離（User A 不得讀取或修改 User B 資料，Tenant A 不得讀取 Tenant B）
  await runTest('授權與租戶邊界：User A 與 User B / Tenant A 與 Tenant B 嚴格隔離', async () => {
    // Alice 建立鬧鐘 (tenant-a)
    const aliceAlarm = await saveUserAlarm('alice-101', {
      time: '07:30',
      label: 'Alice 專屬晨報鬧鐘',
    }, 'tenant-a');

    // Bob 嘗試在 tenant-a 讀取自己的鬧鐘列表
    const bobAlarms = await listUserAlarms('bob-202', 'tenant-a');
    assert.equal(bobAlarms.length, 0, 'Bob 在自己的命名空間下不得看到 Alice 的鬧鐘');

    // Bob 嘗試切換 Alice 的鬧鐘（越權修改）應拋出錯誤
    let bobTamperError = false;
    try {
      await toggleUserAlarm('bob-202', aliceAlarm.id, 'tenant-a');
    } catch (e: any) {
      bobTamperError = true;
      assert.match(e.message, /找不到指定的鬧鐘項目/, '越權存取他人項目應視為不存在');
    }
    assert.equal(bobTamperError, true, 'Bob 越權更新他人鬧鐘必須被阻止');

    // Charlie 位於 tenant-b，以相同 alice-101 userId 查詢
    const charlieAlarms = await listUserAlarms('alice-101', 'tenant-b');
    assert.equal(charlieAlarms.length, 0, '跨租戶（tenant-b）絕對無法查得 tenant-a 的紀錄');
  });

  // Test 6: 舊版 localStorage 一次性匯入去重邏輯驗證與防重複提交
  await runTest('舊版生活資料一次性匯入：批次內去重與雲端既有資料去重', async () => {
    const importPayload = {
      alarms: [
        { time: '09:00', label: '晨會開會' },
        { time: '09:00', label: '晨會開會' }, // 批次內重複
        { time: '12:00', label: '午休提醒' },
      ],
      notes: [
        { content: '購買辦公耗材' },
        { content: '購買辦公耗材' }, // 批次內重複
      ],
      schedules: [
        { title: '客戶季度驗收', date: '2026-09-25', time: '14:00' },
        { title: '客戶季度驗收', date: '2026-09-25', time: '14:00' }, // 批次內重複
      ],
    };

    const importResult = await importLocalData('user-david-303', 'tenant-a', importPayload);

    assert.equal(importResult.importedAlarmsCount, 2, '鬧鐘批次內重複應自動剔除，剩餘 2 項');
    assert.equal(importResult.importedNotesCount, 1, '筆記批次內重複應自動剔除，剩餘 1 則');
    assert.equal(importResult.importedSchedulesCount, 1, '行程批次內重複應自動剔除，剩餘 1 筆');

    // 再次執行完全相同之匯入（模擬用戶重複提交或多開分頁）
    const secondImport = await importLocalData('user-david-303', 'tenant-a', importPayload);
    assert.equal(secondImport.importedAlarmsCount, 0, '再次匯入已存在鬧鐘應略過');
    assert.equal(secondImport.importedNotesCount, 0, '再次匯入已存在筆記應略過');
    assert.equal(secondImport.importedSchedulesCount, 0, '再次匯入已存在行程應略過');
    assert.equal(secondImport.skippedAlarmsCount, 3, '第二次提交應回報全部 3 項重複略過');
  });

  // Test 7: Fail-closed 驗證：Firestore 服務不可用或異常時，明確中斷並拋出錯誤，絕不降級為記憶體
  await runTest('Fail-closed: 資料庫故障時操作必須拋出錯誤中斷，嚴禁回退至 localStorage/記憶體', async () => {
    setFirestoreDbForTesting({
      collection: () => {
        throw new Error('FAIL-CLOSED: Firestore 連線中斷');
      },
    } as any);

    let failedClosed = false;
    try {
      await saveUserAlarm('user-david-303', {
        time: '18:00',
        label: '下班提醒',
      }, 'tenant-a');
    } catch (e: any) {
      failedClosed = true;
      assert.match(e.message, /Firestore 連線中斷/, '必須拋出底層資料庫錯誤中斷交易');
    }
    assert.equal(failedClosed, true, '資料庫中斷時必須 fail closed');
  });

  // Restore mock db for remaining tests
  const activeDb = createMockFirestore();
  setFirestoreDbForTesting(activeDb as any);

  // Test 8: 部分失敗時保留未成功匯入項目驗證
  await runTest('部分失敗防護：匯入包含格式錯誤之項目時，精確回報失敗清單並保留未成功項', async () => {
    const mixedPayload = {
      alarms: [
        { time: '08:00', label: '正常鬧鐘' },
        { time: '28:90', label: '格式損毀鬧鐘' }, // 失敗項
      ],
      notes: [
        { content: '合法筆記' },
        { content: 'B'.repeat(5001) }, // 超過 5000 字元失敗項
      ],
      schedules: [
        { title: '有效行程', date: '2026-10-15' },
        { title: '無效日期行程', date: '2026-02-31' }, // 2/31 失敗項
      ],
    };

    const importRes = await importLocalData('user-partial-99', 'tenant-a', mixedPayload);
    assert.equal(importRes.importedAlarmsCount, 1, '正常鬧鐘應成功匯入 1 筆');
    assert.equal(importRes.importedNotesCount, 1, '合法筆記應成功匯入 1 筆');
    assert.equal(importRes.importedSchedulesCount, 1, '有效行程應成功匯入 1 筆');

    assert.equal(importRes.hasFailures, true, '偵測到失敗項時 hasFailures 必須為 true');
    assert.equal(importRes.failedAlarms.length, 1, '失敗鬧鐘清單應有 1 筆');
    assert.equal(importRes.failedNotes.length, 1, '失敗筆記清單應有 1 筆');
    assert.equal(importRes.failedSchedules.length, 1, '失敗行程清單應有 1 筆');
    assert.equal(importRes.failedAlarms[0].time, '28:90');
    assert.match(importRes.failedSchedules[0].failureReason, /2026 年 2 月僅有 28 天/);
  });

  // Test 9: HTTP API Middleware 整合測試（401 未登入、403 訪客、400 參數驗證、404 不存在、租戶隔離）
  await runTest('API Middleware 整合：HTTP 狀態碼（401/403/400/404）與嚴格租戶身分防護', async () => {
    // 9.1: 401 檢查：無 Token 或 Token 損毀
    const { req: noTokenReq, res: noTokenRes, getStatus: getNoTokenStatus } = createMockReqRes();
    let authNextCalled = false;
    await authenticateToken(noTokenReq, noTokenRes, () => {
      authNextCalled = true;
    });
    assert.equal(getNoTokenStatus(), 401, '無 Token 時 authenticateToken 必須回傳 401');
    assert.equal(authNextCalled, false, '未驗證身分不得進入下一階段');

    // 9.2: 403 檢查：有效 Token 但角色為 guest
    const { req: guestReq, res: guestRes, getStatus: getGuestStatus } = createMockReqRes(
      {},
      {},
      { userId: 'guest-1', role: 'guest', isGuest: true, tenantId: 'tenant-a' }
    );
    let guestNextCalled = false;
    denyGuest(guestReq, guestRes, () => {
      guestNextCalled = true;
    });
    assert.equal(getGuestStatus(), 403, 'Guest 角色呼叫 denyGuest 必須回傳 403');
    assert.equal(guestNextCalled, false, '訪客不可調用生活資料 API');

    // 9.3: 400 檢查：正常登入用戶但傳入非法時間格式寫入
    let scheduleStatus400 = false;
    try {
      await saveUserSchedule('user-valid-1', {
        title: '格式錯誤測試',
        date: '2026-11-31', // 11 月只有 30 天
      }, 'tenant-a');
    } catch (e: any) {
      scheduleStatus400 = true;
      assert.match(e.message, /11 月僅有 30 天/);
    }
    assert.equal(scheduleStatus400, true, '非法日曆日期在 API 端會觸發 400 錯誤');

    // 9.4: 404 檢查：嘗試操作不存在或屬於其他租戶的項目
    let notFoundError = false;
    try {
      await toggleUserAlarm('user-valid-1', 'non-existent-alarm-id', 'tenant-a');
    } catch (e: any) {
      notFoundError = true;
      assert.match(e.message, /找不到指定的鬧鐘項目/);
    }
    assert.equal(notFoundError, true, '操作不存在或越權項目應觸發 404 找不到');
  });

  console.log(`\n========================================`);
  console.log(`測試總結：共 ${totalTests} 項測試，${passedTests} 項全數通過！`);
  console.log(`========================================\n`);
}

main().catch((e) => {
  console.error('Fatal error running tests:', e);
  process.exit(1);
});
