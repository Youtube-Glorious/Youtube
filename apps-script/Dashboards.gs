/**
 * =============================================================================
 *  대시보드 (Dashboards.gs)
 * =============================================================================
 *  - "총 대시보드"   : KPI 카드 + 유형별 합계 + 채널별 합계 + 유형별 수익 도넛 차트
 *  - "채널별 대시보드": 채널 선택 → 그 채널 KPI + 영상 목록(FILTER)
 *
 *  모든 수치는 수식이라 데이터가 갱신되면 자동으로 따라 바뀝니다.
 * ========================================================================== */


/** 메뉴 '대시보드 다시 만들기' 에서 호출 */
function rebuildDashboards() {
  buildDashboards_(SpreadsheetApp.getActive());
  safeAlert_('대시보드를 다시 만들었습니다.');
}

/** 대시보드 전체 재구성 */
function buildDashboards_(ss) {
  buildTotalDashboard_(ss);
  buildChannelDashboard_(ss);
}


/**
 * 환율 셀(총 대시보드)과 이름표(USDKRW)를 보장한다.
 * 셀: 실시간 환율 GOOGLEFINANCE, 실패 시 fallback 상수.
 */
function ensureExchangeRate_(ss) {
  const sheet = getOrCreateSheet_(ss, SHEETS.TOTAL);
  const cell = sheet.getRange('E3');
  cell.setFormula('=IFERROR(GOOGLEFINANCE("CURRENCY:USDKRW"),' + CONFIG.FALLBACK_USDKRW + ')');
  cell.setNumberFormat('#,##0.0');

  // 기존 이름표 제거 후 다시 지정
  ss.getNamedRanges().forEach(function (nr) {
    if (nr.getName() === EXCHANGE_NAMED_RANGE) nr.remove();
  });
  ss.setNamedRange(EXCHANGE_NAMED_RANGE, cell);
}


/* ============================ 총 대시보드 =============================== */

function buildTotalDashboard_(ss) {
  const sheet = getOrCreateSheet_(ss, SHEETS.TOTAL);
  sheet.clear();
  sheet.getCharts().forEach(function (c) { sheet.removeChart(c); });
  sheet.setHiddenGridlines(true);

  // ----- 제목 -----
  sheet.getRange('A1:F1').merge()
    .setValue('📊 총 대시보드')
    .setBackground(COLORS.HEADER_BG).setFontColor(COLORS.HEADER_TEXT)
    .setFontSize(16).setFontWeight('bold')
    .setVerticalAlignment('middle').setHorizontalAlignment('left');
  sheet.setRowHeight(1, 40);

  // ----- KPI 카드 3개 (A3:B5) -----
  const kpi = [
    ['💰 총 수익', '=SUM(' + D_REF + 'H2:H)'],
    ['🧾 총 비용', '=SUM(' + D_REF + 'G2:G)'],
    ['📈 순이익',  '=SUM(' + D_REF + 'I2:I)'],
  ];
  for (let i = 0; i < kpi.length; i++) {
    const r = 3 + i;
    sheet.getRange(r, 1).setValue(kpi[i][0])
      .setFontWeight('bold').setBackground(COLORS.CARD_BG);
    sheet.getRange(r, 2).setFormula(kpi[i][1])
      .setNumberFormat(FMT.MONEY).setFontSize(13).setFontWeight('bold')
      .setBackground(COLORS.CARD_BG);
  }

  // ----- 환율 셀 (D3:E3) + 이름표 -----
  sheet.getRange('D3').setValue('환율 (USD→KRW)').setFontWeight('bold');
  ensureExchangeRate_(ss);  // E3 + USDKRW 이름표

  // ----- 채널 유형별 합계 (A7~) -----
  sheet.getRange('A7:E7').merge().setValue('채널 유형별 합계')
    .setBackground(COLORS.LONG).setFontColor(COLORS.HEADER_TEXT).setFontWeight('bold');
  writeTableHeader_(sheet, 8, ['유형', '영상수', '비용', '수익', '순이익']);

  // 쇼츠 / 롱폼 행 (SUMIF/COUNTIF)
  const typeRows = ['쇼츠', '롱폼'];
  typeRows.forEach(function (t, idx) {
    const r = 9 + idx;
    sheet.getRange(r, 1).setValue(t).setFontWeight('bold');
    sheet.getRange(r, 2).setFormula('=COUNTIF(' + D_REF + 'B2:B,"' + t + '")');
    sheet.getRange(r, 3).setFormula('=SUMIF(' + D_REF + 'B2:B,"' + t + '",' + D_REF + 'G2:G)');
    sheet.getRange(r, 4).setFormula('=SUMIF(' + D_REF + 'B2:B,"' + t + '",' + D_REF + 'H2:H)');
    sheet.getRange(r, 5).setFormula('=SUMIF(' + D_REF + 'B2:B,"' + t + '",' + D_REF + 'I2:I)');
  });
  // 전체 행
  sheet.getRange(11, 1).setValue('전체').setFontWeight('bold');
  sheet.getRange(11, 2).setFormula('=COUNTA(' + D_REF + 'C2:C)');
  sheet.getRange(11, 3).setFormula('=SUM(' + D_REF + 'G2:G)');
  sheet.getRange(11, 4).setFormula('=SUM(' + D_REF + 'H2:H)');
  sheet.getRange(11, 5).setFormula('=SUM(' + D_REF + 'I2:I)');

  sheet.getRange(9, 2, 3, 1).setNumberFormat(FMT.VIEWS);            // 영상수
  sheet.getRange(9, 3, 3, 3).setNumberFormat(FMT.MONEY);           // 비용/수익/순이익

  // ----- 채널별 합계 (A13~) -----
  sheet.getRange('A13:E13').merge().setValue('채널별 합계')
    .setBackground(COLORS.LONG).setFontColor(COLORS.HEADER_TEXT).setFontWeight('bold');
  writeTableHeader_(sheet, 14, ['채널명', '영상수', '비용', '수익', '순이익']);

  const names = CONFIG.CHANNELS.map(function (c) { return c.name; });
  names.forEach(function (name, idx) {
    const r = 15 + idx;
    sheet.getRange(r, 1).setValue(name);
    sheet.getRange(r, 2).setFormula('=COUNTIF(' + D_REF + 'A2:A,$A' + r + ')');
    sheet.getRange(r, 3).setFormula('=SUMIF(' + D_REF + 'A2:A,$A' + r + ',' + D_REF + 'G2:G)');
    sheet.getRange(r, 4).setFormula('=SUMIF(' + D_REF + 'A2:A,$A' + r + ',' + D_REF + 'H2:H)');
    sheet.getRange(r, 5).setFormula('=SUMIF(' + D_REF + 'A2:A,$A' + r + ',' + D_REF + 'I2:I)');
  });
  if (names.length) {
    sheet.getRange(15, 2, names.length, 1).setNumberFormat(FMT.VIEWS);
    sheet.getRange(15, 3, names.length, 3).setNumberFormat(FMT.MONEY);
  }

  // ----- 유형별 수익 비중 도넛 차트 (유형별 합계 표의 유형+수익 참조) -----
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sheet.getRange('A9:A10'))  // 유형 라벨 (쇼츠/롱폼)
    .addRange(sheet.getRange('D9:D10'))  // 수익
    .setOption('title', '유형별 수익 비중')
    .setOption('pieHole', 0.45)
    .setOption('colors', [COLORS.SHORTS, COLORS.LONG])
    .setOption('legend', { position: 'right' })
    .setOption('width', 380)
    .setOption('height', 260)
    .setPosition(7, 7, 0, 0)  // G7 부근
    .build();
  sheet.insertChart(chart);

  // 열 너비 정리
  sheet.setColumnWidth(1, 140);
  for (let c = 2; c <= 5; c++) sheet.setColumnWidth(c, 110);
}


/* =========================== 채널별 대시보드 ============================ */

function buildChannelDashboard_(ss) {
  const sheet = getOrCreateSheet_(ss, SHEETS.CHANNEL);
  sheet.clear();
  sheet.getCharts().forEach(function (c) { sheet.removeChart(c); });
  sheet.setHiddenGridlines(true);

  // ----- 제목 -----
  sheet.getRange('A1:F1').merge()
    .setValue('📺 채널별 대시보드')
    .setBackground(COLORS.HEADER_BG).setFontColor(COLORS.HEADER_TEXT)
    .setFontSize(16).setFontWeight('bold')
    .setVerticalAlignment('middle').setHorizontalAlignment('left');
  sheet.setRowHeight(1, 40);

  // ----- 채널 선택 드롭다운 (B3) -----
  const names = CONFIG.CHANNELS.map(function (c) { return c.name; });
  sheet.getRange('A3').setValue('채널 선택 ▶').setFontWeight('bold');
  const selCell = sheet.getRange('B3');
  if (names.length) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(names, true).setAllowInvalid(false).build();
    selCell.setDataValidation(rule);
    if (!selCell.getValue()) selCell.setValue(names[0]);  // 기본 선택
  }
  selCell.setBackground(COLORS.SHORTS).setFontWeight('bold');

  // ----- 선택 채널 KPI (A5:B8) -----
  const kpi = [
    ['영상수', '=COUNTIF(' + D_REF + 'A2:A,$B$3)', FMT.VIEWS],
    ['총 수익', '=SUMIF(' + D_REF + 'A2:A,$B$3,' + D_REF + 'H2:H)', FMT.MONEY],
    ['총 비용', '=SUMIF(' + D_REF + 'A2:A,$B$3,' + D_REF + 'G2:G)', FMT.MONEY],
    ['순이익', '=SUMIF(' + D_REF + 'A2:A,$B$3,' + D_REF + 'I2:I)', FMT.MONEY],
  ];
  for (let i = 0; i < kpi.length; i++) {
    const r = 5 + i;
    sheet.getRange(r, 1).setValue(kpi[i][0]).setFontWeight('bold').setBackground(COLORS.CARD_BG);
    sheet.getRange(r, 2).setFormula(kpi[i][1]).setNumberFormat(kpi[i][2])
      .setFontWeight('bold').setBackground(COLORS.CARD_BG);
  }

  // ----- 선택 채널 영상 목록 (FILTER) -----
  sheet.getRange('A10:I10').merge().setValue('선택 채널 영상 목록')
    .setBackground(COLORS.LONG).setFontColor(COLORS.HEADER_TEXT).setFontWeight('bold');
  writeTableHeader_(sheet, 11,
    ['채널명', '유형', '영상 제목', '올린 날짜', '올린 시간', '조회수', '비용', '수익', '순이익']);

  // A12 에 FILTER 한 방 → A:I 자동 채움
  sheet.getRange('A12').setFormula(
    '=IFERROR(FILTER(' + D_REF + 'A2:I,' + D_REF + 'A2:A=$B$3),"데이터 없음")'
  );

  // 목록 영역 표시 형식 (넉넉히 12~1000행)
  sheet.getRange('D12:D1000').setNumberFormat(FMT.DATE);
  sheet.getRange('E12:E1000').setNumberFormat(FMT.TIME);
  sheet.getRange('F12:F1000').setNumberFormat(FMT.VIEWS);
  sheet.getRange('G12:I1000').setNumberFormat(FMT.MONEY);

  // 열 너비
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 340);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 70);
  sheet.setColumnWidth(6, 100);
  for (let c = 7; c <= 9; c++) sheet.setColumnWidth(c, 100);
}


/* ------------------------------- 공용 ----------------------------------- */

/** 표 헤더 한 줄을 회색 굵게로 쓴다. */
function writeTableHeader_(sheet, row, headers) {
  const range = sheet.getRange(row, 1, 1, headers.length);
  range.setValues([headers])
    .setFontWeight('bold')
    .setBackground('#EEEEEE')
    .setHorizontalAlignment('center');
}
