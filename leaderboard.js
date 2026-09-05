const { getContent } = require('./_lib/db');

function normalizeColumn(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function maskUsername(value) {
  const text = String(value || '').trim();

  if (text.length <= 1) return text;
  if (text.length === 2) return text[0] + '*' + text[1];

  return (
    text[0] +
    '*'.repeat(Math.min(12, text.length - 2)) +
    text[text.length - 1]
  );
}

function extractSheet(url) {
  const text = String(url || '').trim();

  const id = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  const gid = text.match(/[?#&]gid=(\d+)/)?.[1] || '0';

  if (!id) {
    throw new Error('Geçerli bir Google Sheets URL girin.');
  }

  return { id, gid };
}

function parseCsv(csv) {
  const rows = [];

  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];

    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') {
        i++;
      }

      row.push(value);
      value = '';

      if (row.some(v => String(v).trim())) {
        rows.push(row);
      }

      row = [];
    } else {
      value += c;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

module.exports = async (req, res) => {
  try {
    const raw = String(req.query.url || '');

    const { id, gid } = extractSheet(raw);

    const csvUrl =
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;

    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(
        'Sheet okunamadı. Paylaşım ayarını kontrol edin.'
      );
    }

    const rows = parseCsv(await response.text());

    if (!rows.length) {
      return res.status(200).json({
        ok: true,
        columns: [],
        rows: []
      });
    }

    let columns = rows[0].map((v, i) =>
      String(v || `Kolon ${i + 1}`).trim()
    );

    let data = rows
      .slice(1)
      .filter(r => r.some(v => String(v).trim()))
      .map((r, idx) => ({
        _row: idx + 1,
        values: columns.map((_, i) =>
          String(r[i] ?? '').trim()
        )
      }));

    // Privacy settings
    let privacy = {
      hideAffiliate: true,
      hideCampaignCode: true,
      maskUsernames: true
    };

    try {
      const content = await getContent();

      privacy = {
        ...privacy,
        ...(content?.data?.leaderboard || {})
      };
    } catch (_) {}

    // Kullanıcı adlarını maskeler
    if (privacy.maskUsernames !== false) {
      const userIndex = columns.findIndex(c =>
        ['user_name', 'username', 'user'].includes(
          normalizeColumn(c)
        )
      );

      if (userIndex >= 0) {
        data = data.map(row => ({
          ...row,
          values: row.values.map((v, i) =>
            i === userIndex ? maskUsername(v) : v
          )
        }));
      }
    }

    // Affiliate ve Campaign Code kolonlarını tamamen gizler
    const hiddenColumns = new Set();

    columns.forEach((column, index) => {
      const normalized = normalizeColumn(column);

      if (
        privacy.hideAffiliate !== false &&
        ['affiliate_name', 'affiliate', 'affiliate_id'].includes(normalized)
      ) {
        hiddenColumns.add(index);
      }

      if (
        privacy.hideCampaignCode !== false &&
        [
          'campaign_code',
          'campaign',
          'campaigncode'
        ].includes(normalized)
      ) {
        hiddenColumns.add(index);
      }
    });

    if (hiddenColumns.size) {
      columns = columns.filter(
        (_, index) => !hiddenColumns.has(index)
      );

      data = data.map(row => ({
        ...row,
        values: row.values.filter(
          (_, index) => !hiddenColumns.has(index)
        )
      }));
    }

    res.setHeader(
      'Cache-Control',
      's-maxage=30, stale-while-revalidate=60'
    );

    return res.status(200).json({
      ok: true,
      columns,
      rows: data,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    return res.status(400).json({
      ok: false,
      error:
        error.message ||
        'Leaderboard yüklenemedi.'
    });
  }
};
