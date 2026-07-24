/* ============================================================
   FC1 — Configuracao central da coleta de respostas (Fase 1)
   ============================================================
   Preencher "url" com a URL do Web App do Google Apps Script
   (a que termina em /exec), fornecida apos a implantacao.

   Enquanto "url" estiver vazia, TODOS os OAs publicados
   funcionam em modo offline: sem login por RA e sem envio —
   identico ao comportamento original.
   ============================================================ */
window.COLETA = {
  url: ""
};
