/*! Eretek Online Araçlar #31 — AD Distinguished Name ve OU Ayrıştırıcı */
ERT.def('31', {
	parse: function (dn) {
		var rdns = [], cur = [], buf = '', i = 0, key = null, esc = false;
		var push = function () { if (key === null) { throw 'noeq'; } cur.push([key.trim(), buf.replace(/\s+$/, '')]); key = null; buf = ''; };
		for (; i < dn.length; i++) {
			var ch = dn[i];
			if (esc) { if (/[0-9a-fA-F]/.test(ch) && /[0-9a-fA-F]/.test(dn[i + 1] || '')) { buf += String.fromCharCode(parseInt(ch + dn[i + 1], 16)); i++; } else { buf += ch; } esc = false; continue; }
			if (ch === '\\') { esc = true; continue; }
			if (key === null && ch === '=') { key = buf; buf = ''; continue; }
			if (ch === '+' && key !== null) { push(); continue; }
			if ((ch === ',' || ch === ';') && key === null) { throw 'noeq'; }
			if ((ch === ',' || ch === ';') && key !== null) { push(); rdns.push(cur); cur = []; continue; }
			if (buf === '' && ch === ' ' && key !== null) { continue; }
			buf += ch;
		}
		if (esc) { throw 'esc'; }
		push(); rdns.push(cur);
		return rdns;
	},
	run: function (v, c) {
		var self = ERT.tools['31'], out = [], rowsAll = [];
		c.lines(v.dn, 2000, 'dn').forEach(function (dn, li) {
			var rd;
			try { rd = self.parse(dn); } catch (e) { throw c.fe('dn', 'bad', { r: li + 1 }); }
			var dc = [], ou = [], cn = [];
			rd.forEach(function (r) { r.forEach(function (a) { var k = a[0].toUpperCase(); if (k === 'DC') { dc.push(a[1]); } else if (k === 'OU') { ou.push(a[1]); } else if (k === 'CN') { cn.push(a[1]); } }); });
			var domain = dc.join('.'), canon = (domain || '?') + '/' + ou.slice().reverse().concat(cn.slice(1).reverse()).join('/') + (cn.length ? '/' + cn[0] : '');
			var leaf = rd[0].map(function (a) { return a[0] + '=' + a[1]; }).join(' + ');
			out.push({ cn: cn[0] || null, ou: ou, domain: domain, rdns: rd.length, multi: rd.some(function (r) { return r.length > 1; }) });
			rowsAll.push([dn, leaf, ou.slice().reverse().join(' / ') || '–', domain || '–', canon, rd.length]);
		});
		var cols = [c.t('c_dn'), c.t('c_leaf'), c.t('c_ou'), c.t('c_dom'), c.t('c_canon'), c.t('c_n')];
		var msgs = []; if (out.some(function (o) { return o.multi; })) { msgs.push(['info', c.t('multi')]); }
		if (out.some(function (o) { return !o.domain; })) { msgs.push(['warn', c.t('noDc')]); }
		return { big: c.t('big', { n: out.length }), msgs: msgs, tables: [{ cols: cols, rows: rowsAll }], x: { copy: rowsAll.map(function (r) { return r.join('\t'); }).join('\n') }, v: { items: out } };
	}
});
