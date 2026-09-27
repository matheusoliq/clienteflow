# Checklist de Testes Manuais — ClientFlow

## Clientes
- [ ] Criar cliente com todos os campos válidos
- [ ] Tentar criar cliente sem nome (deve bloquear e mostrar erro)
- [ ] Tentar criar cliente com e-mail inválido (ex.: `teste@teste`)
- [ ] Editar um cliente existente e confirmar que os dados são atualizados na lista
- [ ] Excluir um cliente **sem** projetos vinculados
- [ ] Excluir um cliente **com** projetos vinculados e confirmar que os projetos somem junto

## Projetos
- [ ] Tentar criar projeto sem nenhum cliente cadastrado — deve abrir um aviso explicando o motivo, com um botão que leva direto ao formulário de novo cliente
- [ ] Criar projeto válido vinculado a um cliente
- [ ] Tentar criar projeto com valor zero ou negativo
- [ ] Tentar criar projeto com prazo anterior à data de início
- [ ] Editar um projeto e mudar o status para "Concluído" (verificar que a data de conclusão é preenchida)
- [ ] Mudar o status de volta para "Em andamento" (verificar que a data de conclusão é limpa)
- [ ] Excluir um projeto

## Busca, filtros e ordenação
- [ ] Buscar cliente por parte do nome
- [ ] Buscar cliente por parte do nome da empresa
- [ ] Buscar projeto por parte do título
- [ ] Filtrar projetos por cliente específico
- [ ] Filtrar projetos por status específico
- [ ] Combinar busca + filtro de cliente + filtro de status ao mesmo tempo
- [ ] Ordenar projetos por prazo, valor e mais recentes
- [ ] Limpar a busca e conferir que a lista completa volta a aparecer
- [ ] Buscar/filtrar algo que não existe e conferir a mensagem de "nenhum resultado"

## Painel de alertas
- [ ] Criar um projeto com prazo no passado e status "Em andamento" → deve aparecer em "Atrasados"
- [ ] Criar um projeto com prazo nos próximos 7 dias → deve aparecer em "Vencem em 7 dias"
- [ ] Conferir que "Receita prevista" soma projetos orçados + em andamento
- [ ] Conferir que "Recebido" soma apenas projetos concluídos
- [ ] Marcar um projeto atrasado como "Concluído" e conferir que ele sai do contador de atrasados

## Persistência
- [ ] Atualizar a página (F5) e confirmar que os dados continuam lá
- [ ] Fechar e reabrir o navegador e confirmar que os dados persistem
- [ ] Abrir o DevTools → Application → Local Storage e apagar manualmente uma das chaves; recarregar e confirmar que a aplicação não quebra (deve tratar como lista vazia)
- [ ] Editar manualmente o valor salvo no LocalStorage para um JSON inválido; recarregar e confirmar que a aplicação não quebra

## Acessibilidade e teclado
- [ ] Navegar pela aplicação inteira só com Tab/Shift+Tab
- [ ] Abrir um modal e confirmar que o foco vai para o primeiro campo
- [ ] Fechar um modal com a tecla Esc
- [ ] Confirmar que o foco visível (contorno) aparece em botões, campos e links ao navegar por teclado
- [ ] Testar com leitor de tela (ou inspecionar a árvore de acessibilidade do navegador) se os labels dos campos são lidos corretamente

## Responsividade
- [ ] Testar em 320px, 375px, 390px e 412px de largura (celular)
- [ ] Testar em 768px (tablet)
- [ ] Testar em 1024px e 1440px (notebook/desktop)
- [ ] Testar em orientação vertical e horizontal no celular
- [ ] Confirmar que não há rolagem horizontal indesejada em nenhuma largura

## Abertura direta (sem servidor)
- [ ] Dar duplo clique em `index.html` e confirmar que a interface responde normalmente (cadastro, busca, filtros, painel de alertas)
- [ ] Confirmar no console que não há erro de CORS/módulo bloqueado

## PWA
- [ ] Verificar se o botão "Instalar aplicativo" aparece em um navegador baseado em Chromium
- [ ] Instalar o app e abrir como aplicativo separado (não como aba do navegador)
- [ ] Com o app já carregado uma vez, ativar o modo avião e recarregar — a aplicação deve continuar funcionando
- [ ] Confirmar que o app abre direto na tela correta ao ser aberto via ícone instalado

## Geral
- [ ] Verificar o console do navegador em busca de erros durante o uso normal
- [ ] Verificar que não há nenhum aviso de acessibilidade grave no painel "Lighthouse" do DevTools
