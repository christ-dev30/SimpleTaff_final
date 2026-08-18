const fs = require('fs');
let code = fs.readFileSync('src/main/resources/static/super-admin/super-admin.js', 'utf8');

const notifFix = `
        window.loadNotifications = async function() {
            try {
                const notifications = await apiFetch('/notifications').catch(() => []);
                const container = document.getElementById('notificationsContainer');
                const badge = document.getElementById('notificationBadge');

                const validNotifications = Array.isArray(notifications) ? notifications : [];
                const unread = validNotifications.filter(n => n.statut !== 'LU');
                
                const lastUnreadCount = parseInt(badge?.dataset?.lastCount || '0');
                if (unread.length > lastUnreadCount) {
                    if (window.showToast) window.showToast('Vous avez de nouvelles notifications', 'info');
                }
                if(badge) badge.dataset.lastCount = unread.length;

                if (badge) {
                    if (unread.length > 0) {
                        badge.textContent = unread.length;
                        badge.classList.remove('hidden');
                        badge.style.display = 'inline-flex';
                    } else {
                        badge.classList.add('hidden');
                        badge.style.display = 'none';
                    }
                }

                if (container) {
                    if (validNotifications.length === 0) {
                        container.innerHTML = '<div class="p-4 text-center text-slate-400">Aucune notification.</div>';
                    } else {
                        container.innerHTML = validNotifications.slice(0, 10).map(n => {
                            const isUnread = n.statut !== 'LU';
                            const dateMatch = n.dateEnvoi ? new Date(n.dateEnvoi) : new Date();
                            const dateStr = !isNaN(dateMatch) ? dateMatch.toLocaleDateString() + ' ' + dateMatch.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                            return \`<div class="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer \${isUnread ? 'bg-indigo-50/30' : ''}">
                                <div class="flex items-start gap-3">
                                    <div class="w-2 h-2 mt-2 rounded-full \${isUnread ? 'bg-[#12312E]' : 'bg-transparent'}"></div>
                                    <div>
                                        <p class="text-sm \${isUnread ? 'text-slate-800 font-medium' : 'text-slate-600'}">\${n.message || 'Notification'}</p>
                                        <p class="text-[10px] text-slate-400 mt-1">\${dateStr}</p>
                                    </div>
                                </div>
                            </div>\`;
                        }).join('');
                    }
                }
            } catch (e) {
                console.error('Erreur chargement notifications', e);
            }
        };
`;

code = code.replace('window.logout = logout;', 'window.logout = logout;' + notifFix);
fs.writeFileSync('src/main/resources/static/super-admin/super-admin.js', code, 'utf8');
console.log('Fixed super-admin.js notifications');
