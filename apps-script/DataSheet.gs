/**
 * =============================================================================
 *  "영상 관리" 데이터 시트 (DataSheet.gs)
 * =============================================================================
 *  - ensureDataSheet_ : 시트 생성 + 헤더/서식/드롭다운/조건부서식
 *  - refreshData      : 유튜브에서 데이터를 가져와 시트를 갱신 (수동입력 비용/수익은 보존)
 * ========================================================================== */


/**
 * "영상 관리" 시트를 보장하고 헤더/서식을 맞춘다.
 */
function ensureDataSheet_(ss) {
  let sheet = ss.getSheetByName(SHEETS.DATA);
  if (!sheet) sheet = ss.insertSheet(SHEETS.DATA, 0);  // 맨 앞에 생성

  // --- 헤더 ---
  const headerRange = sheet.getRange(1, 1, 1, NUM_COLS);
  headerRange.setValues([DATA_HEADERS]);
  headerRange
    .setBackground(COLORS.HEADER_BG)
    .setFontColor(COLORS.HEADER_TEXT)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 32);

  // --- 열 너비 ---
  sheet.setColumnWidth(COL.CHANNEL, 130);
  sheet.setColumnWidth(COL.TYPE, 90);
  sheet.setColumnWidth(COL.TITLE, 360);
  sheet.setColumnWidth(COL.DATE, 100);
  sheet.setColumnWidth(COL.TIME, 70);
  sheet.setColumnWidth(COL.VIEWS, 100);
  sheet.setColumnWidth(COL.COST, 120);
  sheet.setColumnWidth(COL.REVENUE, 110);
  sheet.setColumnWidth(COL.PROFIT, 110);

  // --- 숨김 열 (videoId, 수익_USD) ---
  sheet.hideColumns(COL.VIDEO_ID, 2);

  // --- 유형 드롭다운 (쇼츠/롱폼) ---
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['쇼츠', '롱폼'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('B2:B').setDataValidation(typeRule);

  // --- 조건부 서식 (유형별 색 알약 + 행 옅은 톤) ---
  applyDataConditionalFormats_(sheet);

  return sheet;
}


/**
 * 조건부 서식 규칙을 (재)설정한다.
 * 순서가 중요: 먼저 적힌 규칙이 셀에 우선 적용된다.
 *  1) 유형 열(B)은 진한 색 "알약"
 *  2) 나머지 행 전체는 유형에 따라 옅은 톤
 */
function applyDataConditionalFormats_(sheet) {
  const pillShorts = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="쇼츠"')
    .setBackground(COLORS.SHORTS)
    .setFontColor(COLORS.TEXT_DARK)
    .setBold(true)
    .setRanges([sheet.getRange('B2:B')])
    .build();

  const pillLong = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="롱폼"')
    .setBackground(COLORS.LONG)
    .setFontColor(COLORS.HEADER_TEXT)
    .setBold(true)
    .setRanges([sheet.getRange('B2:B')])
    .build();

  const rowShorts = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="쇼츠"')
    .setBackground(COLORS.SHORTS_LIGHT)
    .setRanges([sheet.getRange('A2:K')])
    .build();

  const rowLong = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B2="롱폼"')
    .setBackground(COLORS.LONG_LIGHT)
    .setRanges([sheet.getRange('A2:K')])
    .build();

  // 알약 규칙(B열)을 먼저, 행 톤 규칙을 나중에
  sheet.setConditionalFormatRules([pillShorts, pillLong, rowShorts, rowLong]);
}


/**
 * ⭐ 메인 갱신 함수.
 * 모든 채널의 영상/조회수/수익을 가져와 "영상 관리" 시트를 새로 채운다.
 * - 수동 입력한 "프리랜서 비용"은 videoId 로 매칭해 절대 지워지지 않게 보존.
 * - 수익은 API 값 우선, 없으면 기존에 있던 값 보존.
 */
function refreshData() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  const sheet = ensureDataSheet_(ss);
  ensureExchangeRate_(ss);  // USDKRW 이름표 보장 (수익 원화 수식이 참조)

  // 기존 수동입력값(비용/수익USD) 보존용 맵
  const existing = readExistingMap_(sheet);

  const rows = [];

  CONFIG.CHANNELS.forEach(function (ch) {
    const info = resolveChannel_(ch);
    if (!info) return;  // 못 찾은 채널은 건너뜀

    const videos = fetchVideos_(info.uploadsPlaylistId, CONFIG.MAX_VIDEOS);
    if (!videos.length) return;

    const stats   = fetchVideoStats_(videos.map(function (v) { return v.videoId; }));
    const revenue = ch.pullRevenue ? fetchRevenue_(info.channelId) : {};

    videos.forEach(function (v) {
      const prev = existing[v.videoId] || {};

      // 비용: 수동 입력 보존
      const cost = (prev.cost !== '' && prev.cost != null) ? prev.cost : '';

      // 수익(USD): API 값 우선, 없으면 기존 값 보존
      let usd = '';
      if (revenue[v.videoId] != null) {
        usd = revenue[v.videoId];
      } else if (prev.usd !== '' && prev.usd != null) {
        usd = prev.usd;
      }

      const dt = new Date(v.publishedAt);  // ISO(UTC) → 시트 타임존으로 표시됨
      rows.push({
        channelName: ch.name,
        type:        ch.type,
        title:       v.title,
        dt:          dt,
        views:       stats[v.videoId] || 0,
        cost:        cost,
        videoId:     v.videoId,
        usd:         usd,
      });
    });
  });

  // 항상 최신순 정렬
  rows.sort(function (a, b) { return b.dt - a.dt; });

  writeRows_(sheet, rows);
  Logger.log('✅ 갱신 완료: 총 ' + rows.length + '개 영상');
}


/**
 * 기존 시트에서 videoId → { cost, usd } 맵을 만든다. (수동 입력 보존용)
 */
function readExistingMap_(sheet) {
  const map = {};
  const last = sheet.getLastRow();
  if (last < 2) return map;

  const values = sheet.getRange(2, 1, last - 1, NUM_COLS).getValues();
  values.forEach(function (row) {
    const vid = row[COL.VIDEO_ID - 1];
    if (!vid) return;
    map[vid] = {
      cost: row[COL.COST - 1],
      usd:  row[COL.USD - 1],
    };
  });
  return map;
}


/**
 * 정리된 rows 를 시트에 기록한다.
 * 데이터 행만 비우고 새로 쓴 뒤, 수익(원화)/순이익 수식과 서식을 다시 건다.
 */
function writeRows_(sheet, rows) {
  const last = sheet.getLastRow();
  if (last >= 2) sheet.getRange(2, 1, last - 1, NUM_COLS).clearContent();
  if (!rows.length) return;

  const n = rows.length;

  // A~K 값 (H 수익원화, I 순이익은 빈칸으로 두고 아래에서 수식으로 채움)
  const values = rows.map(function (r) {
    return [
      r.channelName, r.type, r.title, r.dt, r.dt, r.views,
      r.cost, '', '', r.videoId, r.usd,
    ];
  });
  sheet.getRange(2, 1, n, NUM_COLS).setValues(values);

  // 수식: 수익(원화) = USD × 환율,  순이익 = 수익 - 비용
  const hFormulas = [];
  const iFormulas = [];
  for (let i = 0; i < n; i++) {
    const r = i + 2;
    hFormulas.push(['=IF($K' + r + '="","",$K' + r + '*' + EXCHANGE_NAMED_RANGE + ')']);
    iFormulas.push(['=IF(AND($G' + r + '="",$H' + r + '=""),"",N($H' + r + ')-N($G' + r + '))']);
  }
  sheet.getRange(2, COL.REVENUE, n, 1).setFormulas(hFormulas);
  sheet.getRange(2, COL.PROFIT, n, 1).setFormulas(iFormulas);

  // 표시 형식
  sheet.getRange(2, COL.DATE,  n, 1).setNumberFormat(FMT.DATE);
  sheet.getRange(2, COL.TIME,  n, 1).setNumberFormat(FMT.TIME);
  sheet.getRange(2, COL.VIEWS, n, 1).setNumberFormat(FMT.VIEWS);
  sheet.getRange(2, COL.COST,  n, 3).setNumberFormat(FMT.MONEY);  // 비용/수익/순이익
}
