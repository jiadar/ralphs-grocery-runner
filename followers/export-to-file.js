// Export as CSV
(() => {
  if (!window._igFollowers?.length) {
    console.error('No data found. Run the scraper first.');
    return;
  }

  const csv  = 'Name,Handle\n' + window._igFollowers.map(f => `"${f.name}","${f.handle}"`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');

  a.href     = url;
  a.download = `${TARGET}_followers.csv`;
  a.click();

  URL.revokeObjectURL(url);
  console.log(`Exported ${window._igFollowers.length} rows to ${TARGET}_followers.csv`);
})();
