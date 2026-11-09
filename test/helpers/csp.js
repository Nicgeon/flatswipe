// Sammelt Verstöße gegen die Content-Security-Policy im Browser (vor jedem Seitenskript aktiv).
// await watchCsp(ctx); … ; const v = await cspViolations(page)
module.exports = {
  watchCsp: ctx => ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI || ''} ${e.sourceFile || ''}:${e.lineNumber || ''}`));
  }),
  cspViolations: page => page.evaluate(() => window.__csp || []),
};
