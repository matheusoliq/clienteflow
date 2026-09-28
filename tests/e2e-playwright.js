// Teste E2E em Chromium real. Uso: npm i -D playwright && npx playwright install chromium && node tests/e2e-playwright.js
const { chromium } = require('playwright');
const path = require('path');

function log(titulo, ok, extra = '') {
  console.log(`${ok ? 'OK    ' : 'FALHOU'} - ${titulo} ${extra}`);
  if (!ok) global.__falhou = true;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errosReais = [];
  page.on('pageerror', (err) => errosReais.push(`[pageerror] ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('403') && !msg.text().includes('fonts.googleapis')) {
      errosReais.push(`[console.error] ${msg.text()}`);
    }
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(fileUrl);
  await page.waitForTimeout(300);

  log('Estado vazio inicial', await page.isVisible('#lista-clientes .empty-state'));

  // --- Criar cliente ---
  await page.click('#btn-novo-cliente');
  await page.fill('#nome', 'Ana Beatriz Souza');
  await page.fill('#email', 'ana@studio.com');
  await page.fill('#telefone', '11988887777');
  await page.click('#form-cliente button[type=submit]');
  await page.waitForTimeout(150);
  log('Cliente criado aparece na lista', await page.locator('text=Ana Beatriz Souza').count() > 0);
  log('Avatar com iniciais renderizado', (await page.locator('.avatar').textContent()) === 'AS');
  log('Toast de sucesso apareceu', await page.locator('.toast').count() > 0);

  // --- Segundo cliente ---
  await page.click('#btn-novo-cliente');
  await page.fill('#nome', 'Construtora Vega');
  await page.fill('#email', 'contato@vega.com');
  await page.fill('#telefone', '1133334444');
  await page.click('#form-cliente button[type=submit]');
  await page.waitForTimeout(150);
  log('Segundo cliente também criado', await page.locator('text=Construtora Vega').count() > 0);

  // --- Editar cliente ---
  await page.click('#lista-clientes button:has-text("Editar") >> nth=0');
  await page.waitForTimeout(100);
  await page.fill('#empresa', 'Ana Design Studio');
  await page.click('#form-cliente button[type=submit]');
  await page.waitForTimeout(150);
  log('Edição de cliente reflete na lista', await page.locator('text=Ana Design Studio').count() > 0);

  // --- Criar projeto ---
  await page.click('.tabs__btn[data-view="projetos"]');
  await page.click('#btn-novo-projeto');
  await page.waitForTimeout(100);
  await page.selectOption('#clienteId', { label: 'Ana Beatriz Souza' });
  await page.fill('#titulo', 'Landing page institucional');
  await page.fill('#valor', '3200');
  await page.fill('#dataInicio', '2026-08-01');
  await page.fill('#prazo', '2026-09-10');
  await page.selectOption('#status', 'em_andamento');
  await page.click('#form-projeto button[type=submit]');
  await page.waitForTimeout(150);
  log('Projeto criado aparece na lista', await page.locator('text=Landing page institucional').count() > 0);
  log('Card do projeto tem cor por status (atrasado, prazo já passou)', await page.locator('.card--danger').count() > 0);

  const dashboardTexto = (await page.locator('#dashboard').textContent()).replace(/\s+/g, ' ');
  log('Painel de alertas mostra 1 atrasado', dashboardTexto.includes('1Atrasados'), `("${dashboardTexto}")`);

  // --- Segundo projeto, sem atraso ---
  await page.click('#btn-novo-projeto');
  await page.selectOption('#clienteId', { label: 'Construtora Vega' });
  await page.fill('#titulo', 'Site institucional + CRM');
  await page.fill('#valor', '12000');
  await page.fill('#dataInicio', '2026-06-01');
  await page.fill('#prazo', '2027-01-15');
  await page.selectOption('#status', 'em_andamento');
  await page.click('#form-projeto button[type=submit]');
  await page.waitForTimeout(150);
  log('Segundo projeto criado', await page.locator('text=Site institucional + CRM').count() > 0);

  // --- Editar projeto: marcar como concluído ---
  await page.click('#lista-projetos button:has-text("Editar") >> nth=1');
  await page.waitForTimeout(100);
  await page.selectOption('#status', 'concluido');
  await page.click('#form-projeto button[type=submit]');
  await page.waitForTimeout(150);
  const dashboardTexto2 = (await page.locator('#dashboard').textContent()).replace(/\s+/g, ' ');
  log('Recebido soma após marcar como concluído', dashboardTexto2.includes('R$ 12.000,00Recebido'), `("${dashboardTexto2}")`);

  // --- Validação ---
  await page.click('#btn-novo-projeto');
  await page.waitForTimeout(100);
  await page.click('#form-projeto button[type=submit]');
  await page.waitForTimeout(100);
  log('Formulário inválido mostra erro (sem cliente selecionado)', await page.locator('.field__erro').count() > 0);
  await page.click('[data-fechar-modal]');
  await page.waitForTimeout(100);

  // --- Busca ---
  await page.fill('#busca-projetos', 'Landing');
  await page.waitForTimeout(350);
  log('Busca filtra por título', await page.locator('text=Landing page institucional').count() > 0);
  await page.fill('#busca-projetos', 'não existe');
  await page.waitForTimeout(350);
  log('Busca sem resultado mostra estado vazio', await page.isVisible('#lista-projetos .empty-state'));
  await page.fill('#busca-projetos', '');
  await page.waitForTimeout(350);

  // --- Persistência (reload) ---
  await page.reload();
  await page.waitForTimeout(300);
  log('Dados sobrevivem a um reload da página', await page.locator('text=Ana Beatriz Souza').count() > 0);

  // --- Exclusão em cascata ---
  await page.click('.tabs__btn[data-view="clientes"]');
  await page.click('#lista-clientes button:has-text("Excluir") >> nth=0');
  await page.waitForTimeout(100);
  log('Modal de confirmação abre', await page.isVisible('.modal__confirmacao'));
  await page.click('#btn-confirmar-exclusao');
  await page.waitForTimeout(150);
  log('Cliente removido da lista', await page.locator('text=Ana Beatriz Souza').count() === 0);
  await page.click('.tabs__btn[data-view="projetos"]');
  log('Projetos do cliente removido somem em cascata', await page.locator('text=Landing page institucional').count() === 0);

  await page.screenshot({ path: 'screenshot-final.png', fullPage: true });

  log('Nenhum erro real de console/JS durante todo o fluxo', errosReais.length === 0, errosReais.join(' | '));

  console.log(global.__falhou ? '\nALGUM TESTE FALHOU.' : '\nTODOS OS TESTES PASSARAM — fluxo completo validado em navegador real.');
  await browser.close();
  process.exit(global.__falhou ? 1 : 0);
})();
