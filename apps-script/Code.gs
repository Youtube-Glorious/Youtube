/**
 * =============================================================================
 *  본체 / 진입점 (Code.gs)
 * =============================================================================
 *  - setup()    : 한 번 실행하면 전부 세팅됨 (시트 생성 → 데이터 수집 → 대시보드 → 자동 트리거)
 *  - onOpen()   : 스프레드시트 열 때 커스텀 메뉴 추가
 * ========================================================================== */


/**
 * 전체 설치. 처음 한 번만 실행하면 됩니다.
 * 메뉴 '🔄 유튜브 → 전체 설치(setup)' 또는 편집기에서 직접 실행.
 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  // 1) 시트 3개 생성 + 데이터 시트 서식 + 환율 셀/이름표 준비
  ensureSheets_(ss);

  // 2) 대시보드(수식·표·차트) 먼저 구성 — 환율 이름표(USDKRW)가 여기서 만들어짐
  buildDashboards_(ss);

  // 3) 유튜브에서 데이터 1차 수집 (수익 원화 수식이 USDKRW 를 참조하므로 2번 이후에 실행)
  refreshData();

  // 4) 매일 자동 갱신 트리거 설치 (중복 방지)
  installDailyTrigger_();

  safeAlert_('✅ 설치 완료!\n\n매일 ' + CONFIG.REFRESH_HOUR + '시에 자동으로 갱신됩니다.\n' +
             '지금 바로 갱신하려면 메뉴 [🔄 유튜브 → 지금 갱신] 을 누르세요.');
}


/**
 * 스프레드시트를 열 때 자동 실행 — 상단에 커스텀 메뉴를 만든다.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 유튜브')
    .addItem('지금 갱신', 'refreshData')
    .addItem('대시보드 다시 만들기', 'rebuildDashboards')
    .addSeparator()
    .addItem('전체 설치 (처음 1회)', 'setup')
    .addToUi();
}


/**
 * 시트 3개(영상 관리 / 총 대시보드 / 채널별 대시보드)를 보장한다.
 * 이미 있으면 그대로 두고, 데이터 시트는 헤더/서식을 다시 맞춘다.
 */
function ensureSheets_(ss) {
  ensureDataSheet_(ss);
  getOrCreateSheet_(ss, SHEETS.TOTAL);
  getOrCreateSheet_(ss, SHEETS.CHANNEL);
}


/* ------------------------------- 공용 유틸 -------------------------------- */

/** 이름으로 시트를 가져오거나 없으면 만든다. */
function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/** UI가 없는 환경(트리거 실행 등)에서도 안전하게 알림을 띄운다. */
function safeAlert_(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);  // 트리거 등 UI 불가 상황에서는 로그로만
  }
}
