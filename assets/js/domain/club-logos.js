(function() {
    const clubLogos = [
        {
            id: 'fagerborg',
            name: 'Fagerborg Ballklubb',
            aliases: ['Fagerborg', 'Fagerborg BK', 'Fagerborg Ballklubb'],
            logo: 'assets/img/clubs/fagerborg.png'
        }
    ];

    function normalizeClubName(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\b(fk|bk|fotball|ballklubb|idrettslag|il)\b/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function escapeClubLogoHtml(value) {
        return String(value || '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    window.getClubLogoByName = function(name) {
        const normalizedName = normalizeClubName(name);
        if (!normalizedName) return null;

        return clubLogos.find(club =>
            [club.name, ...(club.aliases || [])].some(alias => normalizeClubName(alias) === normalizedName)
        ) || null;
    };

    window.buildClubLogoImgHtml = function(name, className = 'club-logo-img') {
        const club = window.getClubLogoByName(name);
        if (!club) return '';

        return `<img src="${escapeClubLogoHtml(club.logo)}" alt="" aria-hidden="true" loading="lazy" decoding="async" class="${escapeClubLogoHtml(className)}">`;
    };
})();
