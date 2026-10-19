/* Dashboard charts. Colours come from the CSS variables in style.css, so light and dark mode match. */
(function () {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  const series = v('--series-1');
  const ink2 = v('--text-secondary');
  const grid = v('--grid');

  Chart.defaults.font.family = v('--font-sans');
  Chart.defaults.font.size = 12;
  Chart.defaults.color = ink2;
  Chart.defaults.plugins.legend.display = false; // every chart is a single series; the title names it
  Chart.defaults.maintainAspectRatio = false;

  const tooltip = {
    backgroundColor: v('--surface-raised'),
    titleColor: v('--text-primary'),
    bodyColor: v('--text-primary'),
    borderColor: grid,
    borderWidth: 1,
    padding: 10,
    displayColors: false,
    callbacks: { label: (c) => `${c.parsed[c.chart.options.indexAxis === 'y' ? 'x' : 'y'].toLocaleString()} views` },
  };
  const axis = (extra = {}) => ({
    grid: { color: grid, drawTicks: false },
    border: { display: false },
    ticks: { padding: 6 },
    ...extra,
  });

  new Chart(document.getElementById('daily'), {
    type: 'line',
    data: {
      labels: DATA.daily.map((d) => d.label),
      datasets: [{
        data: DATA.daily.map((d) => d.views),
        borderColor: series,
        backgroundColor: series,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 12,
        tension: 0.25,
      }],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip },
      scales: {
        x: axis({ grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } }),
        y: axis({ beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 5 } }),
      },
    },
  });

  const bar = { backgroundColor: series, borderRadius: 4, borderSkipped: 'start', maxBarThickness: 28 };

  new Chart(document.getElementById('hourly'), {
    type: 'bar',
    data: { labels: DATA.hourly.map((h) => h.label), datasets: [{ data: DATA.hourly.map((h) => h.views), ...bar }] },
    options: {
      plugins: { tooltip },
      scales: {
        x: axis({ grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 8, maxRotation: 0 } }),
        y: axis({ beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 5 } }),
      },
    },
  });

  new Chart(document.getElementById('top'), {
    type: 'bar',
    data: { labels: DATA.top, datasets: [{ data: DATA.topViews, ...bar }] },
    options: {
      indexAxis: 'y',
      plugins: { tooltip },
      scales: {
        x: axis({ beginAtZero: true, ticks: { precision: 0, maxTicksLimit: 5 } }),
        y: axis({ grid: { display: false } }),
      },
    },
  });
})();
