const BASE = process.env.TEST_BASE;            // set by test/run.js
const SC=process.argv[2]; const { chromium, launchOptions } = require('../helpers/browser');
const { watchCsp, cspViolations } = require('../helpers/csp');
const B=BASE;
(async()=>{
  const b=await chromium.launch(launchOptions);
  const errs=[]; let fails=0; const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m); if(!c)fails++;};
  for (const [label,w,h] of [['d',1440,900],['m',390,844]]) for (const th of ['dark','light']) {
    const desk = w>=900;
    const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:!desk}); await watchCsp(ctx);
    const page=await ctx.newPage(); page.on('pageerror',e=>errs.push(label+': '+e.message)); page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|fonts.g/.test(m.text()))errs.push(m.text())});
    await page.goto(B);
    await page.evaluate(async(th)=>{localStorage.setItem('ws-theme',th);await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'anna@x.de',password:'secret123'})})},th);
    await page.reload(); await page.waitForSelector('.swipe-card',{timeout:8000}); await page.waitForTimeout(600);
    const L=`${label} ${th}`; const vis=s=>page.isVisible(s); const act=()=>page.evaluate(()=>document.querySelector('.tab-nav.active')?.dataset.tab);
    const labels=(await page.$$eval('.tab-nav',e=>e.map(x=>x.textContent.trim().replace(/^\d+/,'')))).join(',');
    ok(labels==='Swipen,Bewertet,Suche,Gruppen,Profil',`${L}: five tabs (${labels})`);
    ok((await page.$$('#nav-inserate, #account-menu, .tab-nav[data-view="more"]')).length===0,`${L}: no dropdown menus / Mehr tab any more`);
    // tab bar position
    const top=await page.evaluate(()=>document.querySelector('.tab-bar').getBoundingClientRect().top);
    ok(desk ? top<120 : top>h-120,`${L}: tab bar ${desk?'in header':'at bottom'} (${top})`);
    // every tab shows its page and is highlighted
    for (const [t,v] of [['rated','view-rated'],['search','view-jobs'],['groups','view-groups'],['me','view-me'],['swipe','view-swipe']]) {
      await page.click(`.tab-nav[data-tab="${t}"]`); await page.waitForTimeout(350);
      ok(await page.evaluate(v=>document.getElementById(v).classList.contains('active'),v)&&await act()===t,`${L}: tab ${t} → ${v}`);
    }
    // Suche: three segments, tab stays highlighted
    await page.click('.tab-nav[data-tab="search"]'); await page.waitForTimeout(300);
    ok((await page.locator('#view-jobs [data-subtabs] button').allTextContents()).map(x=>x.replace(/\d+$/,'')).join('|')==='Agenten|Hinzufügen|Archiv',`${L}: Suche segments`);
    for (const [seg,v] of [['add','view-add'],['archive','view-archive'],['jobs','view-jobs']]) {
      await page.click(`.view.active [data-subtabs] [data-goto="${seg}"]`); await page.waitForTimeout(350);
      ok(await vis('#'+v)&&await act()==='search'&&await page.evaluate(()=>document.querySelector('.view.active [data-subtabs] .on')?.dataset.goto)===seg,`${L}: segment ${seg}`);
    }
    // Profil page
    await page.click('.tab-nav[data-tab="me"]'); await page.waitForTimeout(500);
    ok((await page.locator('#view-me .mh-row:not([hidden])').count())===4,`${L}: 4 rows on Profil page (Anna is admin)`);
    ok((await page.textContent('#mh-notify-sub')).length>0&&/^\d+$/.test((await page.textContent('#stat-likes')).trim()),`${L}: status line + stats on Profil page`);
    ok((await page.locator('#view-me .mh-group').allTextContents()).join('|')==='Darstellung',`${L}: only "Darstellung" group left`);
    ok((await page.textContent('#me-name')).trim()==='Anna'&&(await page.textContent('#me-email')).includes('@'),`${L}: name + email on Profil page`);
    ok((await page.locator('#logout-btn').count())===1&&(await page.locator('#settings-logout-btn').count())===0,`${L}: logout exists exactly once`);
    await page.screenshot({path:`${SC}/nav-${label}-${th}-me.png`});
    await page.click('#view-me [data-theme-mode="light"]'); await page.waitForTimeout(150);
    ok(await page.evaluate(()=>document.documentElement.dataset.theme)==='light',`${L}: theme toggle`);
    await page.click('#view-me [data-theme-mode="'+th+'"]');
    // avatar = shortcut to Profil, ring while there
    await page.click('.tab-nav[data-tab="swipe"]'); await page.waitForTimeout(300);
    await page.click('#account-btn'); await page.waitForTimeout(400);
    ok(await vis('#view-me')&&await page.evaluate(()=>document.getElementById('account-btn').classList.contains('on')),`${L}: avatar → Profil, ring on`);
    // sub-pages keep Profil highlighted; back button returns to Profil
    for (const v of ['notify','account','admin']) {
      await page.click(`#view-me [data-goto="${v}"]`); await page.waitForTimeout(400);
      ok(await act()==='me'&&await vis('#view-'+v),`${L}: ${v} highlights Profil`);
      if (v==='admin') ok((await page.locator('#admin-users-list .admin-user-row').count())>=1,`${L}: user list shown right away`);
      await page.click(`#view-${v} [data-back]`); await page.waitForTimeout(400);
      ok(await vis('#view-me'),`${L}: ${v} back → Profil`);
    }
    await page.click('#logout-btn'); await page.waitForTimeout(600);
    ok(await vis('#login-form')||await vis('.auth-tabs'),`${L}: logout on Profil page`);
    { const v = await cspViolations(page); ok(!v.length, 'no CSP violations ' + JSON.stringify(v)); }
    await ctx.close();
  }
  console.log('errors:',errs.length?errs:'none'); console.log('fails:',fails); await b.close();
})();
