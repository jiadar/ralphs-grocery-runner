(async () => {
  if (typeof TARGET === 'undefined' || !TARGET.trim()) {
    console.error('Set TARGET first: var TARGET = "someusername"');
    return;
  }

  const getCookie = name =>
    document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];

  const csrf    = getCookie('csrftoken');
  const headers = { 'x-csrftoken': csrf, 'x-ig-app-id': '936619743392459' };

  console.log(`Looking up @${TARGET}...`);
  const userRes = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${TARGET}`,
    { headers, credentials: 'include' }
  );

  if (!userRes.ok) { console.error('Lookup failed:', userRes.status); return; }

  const targetUserId = (await userRes.json())?.data?.user?.id;
  if (!targetUserId) { console.error('User not found or account is private.'); return; }

  window._igFollowers = [];
  let nextCursor = null;
  let lastLoggedAt = 0;

  do {
    const params = new URLSearchParams({ count: 200, ...(nextCursor ? { max_id: nextCursor } : {}) });
    const res = await fetch(
      `https://www.instagram.com/api/v1/friendships/${targetUserId}/followers/?${params}`,
      { headers, credentials: 'include' }
    );

    if (!res.ok) { console.error('Request failed:', res.status); break; }

    const data  = await res.json();
    const users = data.users || [];
    users.forEach(u => window._igFollowers.push({ name: u.full_name, handle: u.username }));

    const total = window._igFollowers.length;
    const milestone = Math.floor(total / 100) * 100;
    if (milestone > lastLoggedAt) {
      console.log(`${milestone} followers downloaded...`);
      lastLoggedAt = milestone;
    }

    nextCursor = data.next_max_id || null;
    await new Promise(r => setTimeout(r, 1200));
  } while (nextCursor);

  console.log(`Done — ${window._igFollowers.length} followers saved to window._igFollowers. Run the export snippet to download.`);
})();
