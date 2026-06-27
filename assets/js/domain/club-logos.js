(function() {
    const clubLogos = [
        {
            id: 'fagerborg',
            name: 'Fagerborg Ballklubb',
            aliases: ['Fagerborg', 'Fagerborg BK', 'Fagerborg Ballklubb'],
            logo: 'assets/img/clubs/fagerborg-20260627.png'
        },
        {
            id: 'baekkelaget',
            name: 'Bækkelaget',
            aliases: ['Bækkelaget', 'Bækkelaget SK', 'Bækkelagets Sportsklub', 'BSK'],
            logo: 'assets/img/clubs/baekkelaget-20260627.png'
        },
        {
            id: 'furuset',
            name: 'Furuset IF',
            aliases: ['Furuset', 'Furuset IF', 'Furuset Fotball'],
            logo: 'assets/img/clubs/furuset-20260627.png'
        },
        {
            id: 'hoybraten-stovner',
            name: 'Høybråten og Stovner IL',
            aliases: [
                'Høybråten og Stovner',
                'Høybråten og Stovner IL',
                'Høybråten Stovner',
                'Høybr/Stovn',
                'Hoybraten og Stovner',
                'HSIL'
            ],
            logo: 'assets/img/clubs/hoybraten-stovner-20260627.png'
        },
        {
            id: 'jusstudentene',
            name: 'Jusstudentene',
            aliases: ['Jusstudentene', 'Jusstudentenes IK', 'JIK'],
            logo: 'assets/img/clubs/jusstudentene-20260627.png'
        },
        {
            id: 'klemetsrud',
            name: 'Klemetsrud IL',
            aliases: ['Klemetsrud', 'Klemetsrud IL', 'KIL'],
            logo: 'assets/img/clubs/klemetsrud-20260627.png'
        },
        {
            id: 'korsvoll',
            name: 'Korsvoll IL',
            aliases: ['Korsvoll', 'Korsvoll IL'],
            logo: 'assets/img/clubs/korsvoll-20260627.png'
        },
        {
            id: 'frigg',
            name: 'Frigg Oslo FK',
            aliases: ['Frigg', 'Frigg Oslo', 'Frigg Oslo FK', 'Frigg Fotballklubb'],
            logo: 'assets/img/clubs/frigg-20260627.png'
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
