/**
 * =============================================================================
 *  자동 트리거 (Triggers.gs)
 * =============================================================================
 *  매일 지정 시각에 refreshData() 가 자동 실행되도록 설정한다.
 *  중복 설치를 막기 위해 기존 refreshData 트리거는 먼저 제거한다.
 * ========================================================================== */

function installDailyTrigger_() {
  // 기존 refreshData 트리거 제거 (중복 방지)
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshData') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 매일 CONFIG.REFRESH_HOUR 시에 갱신
  ScriptApp.newTrigger('refreshData')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.REFRESH_HOUR)
    .create();

  Logger.log('⏰ 매일 ' + CONFIG.REFRESH_HOUR + '시 자동 갱신 트리거 설치 완료');
}
