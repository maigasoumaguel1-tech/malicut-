/* MaliCut Studio — Notifications center */
(function () {
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const icons = { like: '♡', comment: '💬', follow: '＋', repost: '🔁', message: '✉️' };
  let channel = null;

  async function refreshUnread() {
    const dot = $('notificationUnreadDot');
    if (!dot) return;
    if (!window.sb || !window.user) {
      dot.classList.add('hidden');
      return;
    }
    const result = await window.sb.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', window.user.id)
      .eq('is_read', false);
    dot.classList.toggle('hidden', !(result.count || 0));
  }

  window.loadMaliCutNotifications = async function () {
    const root = $('notificationsFeed');
    if (!root) return;
    if (!window.sb) {
      root.textContent = 'Connexion au service de compte indisponible.';
      return;
    }
    if (!window.user) {
      root.innerHTML = '<div class="notice">Connecte-toi pour consulter tes notifications.<br><button class="btn gold" onclick="openPage(\'profile\')">Ouvrir Profil</button></div>';
      await refreshUnread();
      return;
    }

    root.innerHTML = '<div class="notice">Chargement des notifications…</div>';
    const result = await window.sb.from('notifications')
      .select('id,type,message,is_read,created_at,video_id,actor_id')
      .eq('user_id', window.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (result.error) {
      root.textContent = 'Impossible de charger les notifications : ' + result.error.message;
      return;
    }

    const rows = result.data || [];
    if (!rows.length) {
      root.innerHTML = '<div class="notice">Tu n’as pas encore de notification.</div>';
      await refreshUnread();
      return;
    }

    const actorIds = [...new Set(rows.map(row => row.actor_id).filter(Boolean))];
    const profiles = actorIds.length
      ? await window.sb.from('profiles').select('id,display_name,username').in('id', actorIds)
      : { data: [] };
    const names = new Map((profiles.data || []).map(profile => [
      profile.id, profile.display_name || profile.username || 'Membre'
    ]));

    root.innerHTML = rows.map(row => {
      const actor = esc(names.get(row.actor_id) || 'Membre');
      const message = esc(row.message || 'a effectué une activité');
      const date = esc(new Date(row.created_at).toLocaleString('fr-FR'));
      const markButton = row.is_read ? '' :
        '<div style="margin-top:8px"><button class="btn" onclick="markMaliCutNotificationRead(\'' + row.id + '\')">Marquer comme lu</button></div>';
      const fresh = row.is_read ? '' : '<span class="badge">Nouveau</span>';
      return '<article class="panel" style="margin-top:8px"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b>' +
        (icons[row.type] || '🔔') + ' ' + actor + ' ' + message + '</b>' + fresh +
        '</div><small class="muted">' + date + '</small>' + markButton + '</article>';
    }).join('');
    await refreshUnread();
  };

  window.markMaliCutNotificationRead = async function (id) {
    if (!window.sb || !window.user) return;
    const result = await window.sb.from('notifications').update({ is_read: true })
      .eq('id', id).eq('user_id', window.user.id);
    if (result.error) {
      alert('Impossible de marquer la notification : ' + result.error.message);
      return;
    }
    await window.loadMaliCutNotifications();
  };

  window.markAllMaliCutNotificationsRead = async function () {
    if (!window.sb || !window.user) {
      await window.loadMaliCutNotifications();
      return;
    }
    const result = await window.sb.from('notifications').update({ is_read: true })
      .eq('user_id', window.user.id).eq('is_read', false);
    if (result.error) {
      alert('Impossible de mettre à jour les notifications : ' + result.error.message);
      return;
    }
    await window.loadMaliCutNotifications();
  };

  window.addEventListener('load', async () => {
    for (let i = 0; i < 40 && !window.sb; i++) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!window.sb) return;
    await refreshUnread();
    window.sb.auth.onAuthStateChange(async (_event, session) => {
      window.user = session ? session.user : null;
      await refreshUnread();
      if ($('notifications')?.classList.contains('active')) {
        await window.loadMaliCutNotifications();
      }
      if (channel) {
        await window.sb.removeChannel(channel);
        channel = null;
      }
      if (window.user) {
        channel = window.sb.channel('malicut-notifications:' + window.user.id)
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'notifications',
            filter: 'user_id=eq.' + window.user.id
          }, async () => {
            await refreshUnread();
            if ($('notifications')?.classList.contains('active')) {
              await window.loadMaliCutNotifications();
            }
          }).subscribe();
      }
    });
    if (window.user) {
      channel = window.sb.channel('malicut-notifications:' + window.user.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: 'user_id=eq.' + window.user.id
        }, async () => {
          await refreshUnread();
          if ($('notifications')?.classList.contains('active')) {
            await window.loadMaliCutNotifications();
          }
        }).subscribe();
    }
  });
})();
