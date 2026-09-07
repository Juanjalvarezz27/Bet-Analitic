// Motor de reglas estadísticas — sin IA, sin suposiciones
// Organizado por categorías de apuesta

export interface BettingOption {
  id: string;
  label: string;
  score: number; // 0-100
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface BettingCategory {
  id: string;
  label: string;
  icon: string;
  bets: BettingOption[]; // top 5 dentro de la categoría, ordenados por score
  hasData: boolean;
}

export interface ParsedMatchData {
  categories: BettingCategory[];
  dataQuality: number;
  warnings: string[];
  extractedStats: Record<string, number>;
  homeTeam: string;
  awayTeam: string;
}

function extractPercent(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : Math.min(100, Math.max(0, num));
}

function extractAllPercents(text: string, pattern: RegExp): number[] {
  const results: number[] = [];
  let match;
  const regex = new RegExp(pattern.source, 'gi');
  while ((match = regex.exec(text)) !== null) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) results.push(Math.min(100, Math.max(0, num)));
  }
  return results;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function confidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

// Construye una BettingOption a partir de un mapa de stats con pesos
function buildOption(
  id: string,
  label: string,
  stats: Record<string, number>,
  keys: string[]
): BettingOption | null {
  const sources: string[] = [];
  const values: number[] = [];
  for (const k of keys) {
    if (stats[k] !== undefined) {
      values.push(stats[k]);
      const readable = k.replace(/_/g, ' ');
      sources.push(`${readable}: ${stats[k].toFixed(0)}%`);
    }
  }
  if (values.length === 0) return null;
  const score = Math.round(avg(values));
  return { id, label, score, sources, confidence: confidence(score) };
}

function buildCategory(
  id: string,
  label: string,
  icon: string,
  options: Array<BettingOption | null>
): BettingCategory {
  const bets = (options.filter(Boolean) as BettingOption[])
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return { id, label, icon, bets, hasData: bets.length > 0 };
}

export function parseMatchData(rawText: string): ParsedMatchData {
  const text = rawText;
  const warnings: string[] = [];
  const s: Record<string, number> = {}; // alias corto para extractedStats

  // ─── Extraer nombres de equipos ────────────────────────────────────
  let homeTeam = 'Local';
  let awayTeam = 'Visitante';

  const titleMatch = text.match(/Head to Head Statistics - (.*?) vs (.*?)\n/i);
  const sentenceMatch = text.match(/(.*?) vs (.*?)'s head to head record shows/i);
  
  if (titleMatch) {
    homeTeam = titleMatch[1].trim();
    awayTeam = titleMatch[2].trim();
  } else if (sentenceMatch) {
    homeTeam = sentenceMatch[1].trim();
    awayTeam = sentenceMatch[2].trim();
  }


  // ─── H2H Over stats ───────────────────────────────────────────────
  const h2hOver05 = extractPercent(text, /(\d+)%\s*Over 0\.5/i);
  const h2hOver15 = extractPercent(text, /(\d+)%\s*Over 1\.5/i);
  const h2hOver25 = extractPercent(text, /(\d+)%\s*Over 2\.5/i);
  const h2hOver35 = extractPercent(text, /(\d+)%\s*Over 3\.5/i);
  const h2hBTTS   = extractPercent(text, /(\d+)%\s*BTTS/i);

  if (h2hOver05 !== null) s['h2h_over05'] = h2hOver05;
  if (h2hOver15 !== null) s['h2h_over15'] = h2hOver15;
  if (h2hOver25 !== null) s['h2h_over25'] = h2hOver25;
  if (h2hOver35 !== null) s['h2h_over35'] = h2hOver35;
  if (h2hBTTS   !== null) s['h2h_btts']   = h2hBTTS;

  // Under H2H implícito (complemento del Over si lo tenemos)
  if (h2hOver05 !== null) s['h2h_under05'] = 100 - h2hOver05;
  if (h2hOver15 !== null) s['h2h_under15'] = 100 - h2hOver15;
  if (h2hOver25 !== null) s['h2h_under25'] = 100 - h2hOver25;
  if (h2hOver35 !== null) s['h2h_under35'] = 100 - h2hOver35;

  // ─── Prediction Stats de liga ──────────────────────────────────────
  const predOver25 = text.match(/(\d+)%\s*Over 2\.5\s*\n?League Average/i);
  const predOver15 = text.match(/(\d+)%\s*Over 1\.5\s*\n?League Average/i);
  const predBTTS   = text.match(/(\d+)%\s*BTTS\s*\n?League Average/i);

  if (predOver25) s['pred_over25'] = parseFloat(predOver25[1]);
  if (predOver15) s['pred_over15'] = parseFloat(predOver15[1]);
  if (predBTTS)   s['pred_btts']   = parseFloat(predBTTS[1]);

  if (s['pred_over25']) s['pred_under25'] = 100 - s['pred_over25'];
  if (s['pred_over15']) s['pred_under15'] = 100 - s['pred_over15'];

  // ─── Goals Scored/Conceded Over/Under por equipo ───────────────────
  // Extrae pares: "Over X.5 | TM1% | TM2%"
  const goalsOver = (x: string) => extractAllPercents(text, new RegExp(`Over ${x}[\\s|]+(\\d+)%`, 'i'));
  const goalsUnder = (x: string) => {
    // Busca la sección "Under X Goals" con dos valores
    const vals = extractAllPercents(text, new RegExp(`Under ${x}[\\s|]+(\\d+)%`, 'i'));
    return vals;
  };

  const go05 = goalsOver('0\\.5');
  const go15 = goalsOver('1\\.5');
  const go25 = goalsOver('2\\.5');
  const go35 = goalsOver('3\\.5');
  const go45 = goalsOver('4\\.5');
  const gu05 = goalsUnder('0\\.5');
  const gu15 = goalsUnder('1\\.5');
  const gu25 = goalsUnder('2\\.5');
  const gu35 = goalsUnder('3\\.5');
  const gu45 = goalsUnder('4\\.5');

  if (go05.length > 0) s['goals_over05_avg'] = avg(go05);
  if (go15.length > 0) s['goals_over15_avg'] = avg(go15);
  if (go25.length > 0) s['goals_over25_avg'] = avg(go25);
  if (go35.length > 0) s['goals_over35_avg'] = avg(go35);
  if (go45.length > 0) s['goals_over45_avg'] = avg(go45);
  if (gu05.length > 0) s['goals_under05_avg'] = avg(gu05);
  if (gu15.length > 0) s['goals_under15_avg'] = avg(gu15);
  if (gu25.length > 0) s['goals_under25_avg'] = avg(gu25);
  if (gu35.length > 0) s['goals_under35_avg'] = avg(gu35);
  if (gu45.length > 0) s['goals_under45_avg'] = avg(gu45);

  // ─── BTTS % de stats de equipo ────────────────────────────────────
  const bttsVals = extractAllPercents(text, /BTTS\s*(\d+)%/gi);
  if (bttsVals.length > 0) s['btts_team_avg'] = avg(bttsVals.slice(0, 2));
  if (s['btts_team_avg'] !== undefined) s['no_btts_team_avg'] = 100 - s['btts_team_avg'];

  // ─── Win % y Draw % ───────────────────────────────────────────────
  const winMatch = text.match(/Win %[\s\S]{0,300}?(\d+)%\s*\n?\s*(\d+)%/i);
  if (winMatch) {
    const hw = parseFloat(winMatch[1]);
    const aw = parseFloat(winMatch[2]);
    if (!isNaN(hw)) s['home_win_pct'] = hw;
    if (!isNaN(aw)) s['away_win_pct'] = aw;
  }
  const drawMatch = text.match(/Draw %\s*FT\s*(\d+)%/i) ?? text.match(/Draw %\s*(\d+)%/i);
  if (drawMatch) {
    const d = parseFloat(drawMatch[1]);
    if (!isNaN(d)) s['draw_pct'] = d;
  }

  // Doble oportunidad calculado
  if (s['home_win_pct'] !== undefined && s['draw_pct'] !== undefined)
    s['dc_1x'] = Math.min(100, s['home_win_pct'] + s['draw_pct']);
  if (s['away_win_pct'] !== undefined && s['draw_pct'] !== undefined)
    s['dc_2x'] = Math.min(100, s['away_win_pct'] + s['draw_pct']);

  // ─── Odds Market ──────────────────────────────────────────────────
  const oddsSection = text.match(/Odds Market[\s\S]{0,3000}/i)?.[0] ?? '';
  if (oddsSection) {
    const patterns: Array<[string, RegExp]> = [
      ['odds_over05',   /Over 0\.5[\s\S]{0,80}?(\d+)%/i],
      ['odds_over15',   /Over 1\.5[\s\S]{0,80}?(\d+)%/i],
      ['odds_over25',   /Over 2\.5[\s\S]{0,80}?(\d+)%/i],
      ['odds_over35',   /Over 3\.5[\s\S]{0,80}?(\d+)%/i],
      ['odds_over45',   /Over 4\.5[\s\S]{0,80}?(\d+)%/i],
      ['odds_btts',     /BTTS[\s\S]{0,80}?(\d+)%/i],
      ['odds_draw',     /Draw[\s\S]{0,80}?(\d+)%/i],
    ];
    for (const [key, pat] of patterns) {
      const val = extractPercent(oddsSection, pat);
      if (val !== null) s[key] = val;
    }
    // Odds implícitos de Under
    if (s['odds_over05']) s['odds_under05'] = 100 - s['odds_over05'];
    if (s['odds_over15']) s['odds_under15'] = 100 - s['odds_over15'];
    if (s['odds_over25']) s['odds_under25'] = 100 - s['odds_over25'];
    if (s['odds_over35']) s['odds_under35'] = 100 - s['odds_over35'];
    if (s['odds_over45']) s['odds_under45'] = 100 - s['odds_over45'];

    // Odds home / away (busca el patrón "X Win \n odds \n stats%")
    const homeOdds = extractPercent(oddsSection, /(?:Torino|Home)\s+Win[\s\S]{0,80}?(\d+)%/i);
    const awayOdds = extractPercent(oddsSection, /(?:Monza|Away)\s+Win[\s\S]{0,80}?(\d+)%/i);
    if (homeOdds !== null) s['odds_home'] = homeOdds;
    if (awayOdds !== null) s['odds_away'] = awayOdds;
  }

  // ─── Corners ──────────────────────────────────────────────────────
  // Intenta extraer datos de corner si el texto tiene el desglose
  const cornerSection = text.match(/(?:Number of Corners|Match Corners)[\s\S]{0,1500}/i)?.[0] ?? '';
  const cornerVals: Record<string, number> = {};
  if (cornerSection && !/UNLOCK|Premium/i.test(cornerSection.slice(0, 100))) {
    ['6','7','8','9','10','11','12','13'].forEach(n => {
      const vals = extractAllPercents(cornerSection, new RegExp(`Over ${n}[\\s|]+(\\d+)%`, 'i'));
      if (vals.length > 0) cornerVals[`corner_over${n}`] = avg(vals);
    });
  }
  Object.assign(s, cornerVals);

  // ─── Tarjetas ─────────────────────────────────────────────────────
  const cardSection = text.match(/(?:Number of Cards|Match Cards)[\s\S]{0,1500}/i)?.[0] ?? '';
  const cardVals: Record<string, number> = {};
  if (cardSection && !/UNLOCK|Premium/i.test(cardSection.slice(0, 100))) {
    ['2','3','4','5','6'].forEach(n => {
      const vals = extractAllPercents(cardSection, new RegExp(`Over ${n}\\.5[\\s|]+(\\d+)%`, 'i'));
      if (vals.length > 0) cardVals[`card_over${n}5`] = avg(vals);
    });
  }
  Object.assign(s, cardVals);

  // ─── Warnings ─────────────────────────────────────────────────────
  const totalStats = Object.keys(s).length;
  if (totalStats === 0)
    warnings.push('No se detectaron estadísticas. Verifica que el contenido sea de footystats u otra fuente.');
  else if (totalStats < 5)
    warnings.push('Pocos datos detectados. Pega más estadísticas del partido para mayor precisión.');

  // ─── CATEGORÍAS ───────────────────────────────────────────────────

  // 1. Over Goles
  const catOverGoles = buildCategory('over_goals', 'Over Goles', '⚽', [
    buildOption('over05', 'Over 0.5', s, ['h2h_over05', 'goals_over05_avg', 'odds_over05']),
    buildOption('over15', 'Over 1.5', s, ['h2h_over15', 'pred_over15', 'goals_over15_avg', 'odds_over15']),
    buildOption('over25', 'Over 2.5', s, ['h2h_over25', 'pred_over25', 'goals_over25_avg', 'odds_over25']),
    buildOption('over35', 'Over 3.5', s, ['h2h_over35', 'goals_over35_avg', 'odds_over35']),
    buildOption('over45', 'Over 4.5', s, ['goals_over45_avg', 'odds_over45']),
  ]);

  // 2. Under Goles
  const catUnderGoles = buildCategory('under_goals', 'Under Goles', '🔒', [
    buildOption('under05', 'Under 0.5', s, ['h2h_under05', 'goals_under05_avg', 'odds_under05']),
    buildOption('under15', 'Under 1.5', s, ['h2h_under15', 'goals_under15_avg', 'odds_under15']),
    buildOption('under25', 'Under 2.5', s, ['h2h_under25', 'goals_under25_avg', 'odds_under25']),
    buildOption('under35', 'Under 3.5', s, ['h2h_under35', 'goals_under35_avg', 'odds_under35']),
    buildOption('under45', 'Under 4.5', s, ['goals_under45_avg', 'odds_under45']),
  ]);

  // 3. Ambos Marcan (BTTS)
  const catBTTS = buildCategory('btts', 'Ambos Marcan', '🤝', [
    buildOption('btts_yes', 'Sí Marcan Ambos', s, ['h2h_btts', 'pred_btts', 'btts_team_avg', 'odds_btts']),
    buildOption('btts_no',  'No Marcan Ambos', s, ['no_btts_team_avg']),
  ]);

  // 4. Over Corners
  const cornerOverOpts = ['6','7','8','9','10','11','12','13'].map(n =>
    buildOption(`corner_over${n}`, `Over ${n} Corners`, s, [`corner_over${n}`])
  );
  const catOverCorners = buildCategory('over_corners', 'Over Corners', '🚩', cornerOverOpts);

  // 5. Under Corners
  const cornerUnderOpts = ['6','7','8','9','10','11','12','13'].map(n => {
    const cv = s[`corner_over${n}`];
    if (cv === undefined) return null;
    const underVal = 100 - cv;
    s[`corner_under${n}`] = underVal;
    return buildOption(`corner_under${n}`, `Under ${n} Corners`, s, [`corner_under${n}`]);
  });
  const catUnderCorners = buildCategory('under_corners', 'Under Corners', '📐', cornerUnderOpts);

  // 6. Over Tarjetas
  const cardOverOpts = ['2','3','4','5','6'].map(n =>
    buildOption(`card_over${n}5`, `Over ${n}.5 Tarjetas`, s, [`card_over${n}5`])
  );
  const catOverCards = buildCategory('over_cards', 'Over Tarjetas', '🟨', cardOverOpts);

  // 7. Under Tarjetas
  const cardUnderOpts = ['2','3','4','5','6'].map(n => {
    const cv = s[`card_over${n}5`];
    if (cv === undefined) return null;
    const underVal = 100 - cv;
    s[`card_under${n}5`] = underVal;
    return buildOption(`card_under${n}5`, `Under ${n}.5 Tarjetas`, s, [`card_under${n}5`]);
  });
  const catUnderCards = buildCategory('under_cards', 'Under Tarjetas', '🟥', cardUnderOpts);

  // 8. Handicap (se aproxima desde Win% y odds si hay)
  // Handicap -0.5 local ≈ Win% local; +0.5 local ≈ No pierde local = Win + Draw
  const handicapOpts = [
    s['home_win_pct'] !== undefined
      ? buildOption('hc_home_05', `Hándicap -0.5 ${homeTeam}`,  s, ['home_win_pct', 'odds_home'])
      : null,
    s['away_win_pct'] !== undefined
      ? buildOption('hc_away_05', `Hándicap -0.5 ${awayTeam}`, s, ['away_win_pct', 'odds_away'])
      : null,
    s['dc_1x'] !== undefined
      ? buildOption('hc_home_p05', `Hándicap +0.5 ${homeTeam}`, s, ['dc_1x'])
      : null,
    s['dc_2x'] !== undefined
      ? buildOption('hc_away_p05', `Hándicap +0.5 ${awayTeam}`, s, ['dc_2x'])
      : null,
  ];
  const catHandicap = buildCategory('handicap', 'Hándicap', '⚖️', handicapOpts);

  // 9. Doble Oportunidad
  const catDC = buildCategory('double_chance', 'Doble Oportunidad', '🛡️', [
    buildOption('dc_1x', `${homeTeam} o Empate (1X)`, s, ['dc_1x', 'home_win_pct', 'draw_pct']),
    buildOption('dc_2x', `${awayTeam} o Empate (2X)`, s, ['dc_2x', 'away_win_pct', 'draw_pct']),
  ]);

  // 10. Ganador Directo (1X2)
  const catWinner = buildCategory('winner', 'Ganador Directo', '🏆', [
    buildOption('win_home', `Victoria ${homeTeam} (1)`,    s, ['home_win_pct', 'odds_home']),
    buildOption('win_draw', 'Empate (X)',            s, ['draw_pct', 'odds_draw']),
    buildOption('win_away', `Victoria ${awayTeam} (2)`,s, ['away_win_pct', 'odds_away']),
  ]);

  const categories = [
    catOverGoles, catUnderGoles, catBTTS,
    catOverCorners, catUnderCorners,
    catOverCards, catUnderCards,
    catHandicap, catDC, catWinner,
  ];

  // Calidad de datos
  const keyStats = ['h2h_over15','h2h_over25','h2h_btts','pred_over25','home_win_pct','btts_team_avg'];
  const foundKey = keyStats.filter(k => s[k] !== undefined).length;
  const dataQuality = Math.round((foundKey / keyStats.length) * 100);

  const totalBets = categories.reduce((acc, c) => acc + c.bets.length, 0);
  if (totalBets === 0)
    warnings.push('No se pudieron calcular apuestas. Pega la página completa de estadísticas H2H.');

  return { categories, dataQuality, warnings, extractedStats: s, homeTeam, awayTeam };
}

