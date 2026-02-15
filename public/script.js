async function notificarSoporte() {
    const WEBHOOK_URL = 'https://n8n-n8n.amv1ou.easypanel.host/webhook/soporte-oxxo';

    const btn = document.querySelector('#soporte-ti button');
    if (!btn) return;

    const originalIcon = btn.innerText;
    btn.innerText = '⌛';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const nombreUsuario = localStorage.getItem('usuarioNombre') 
            || window.currentUserName 
            || 'Usuario de Agenda (Anon)';

        const data = {
            evento: 'Solicitud de Soporte TI',
            usuario: nombreUsuario,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Server Error');
        }

        alert('✅ Soporte TI notificado vía WhatsApp.');

    } catch (error) {
        console.error('Error enviando a n8n:', error);
        alert('❌ No se pudo contactar a soporte.');
    } finally {
        btn.innerText = originalIcon;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}
