/* =====================================================================
   static-fix.js — O JAVASCRIPT DO SEU SITE
   ---------------------------------------------------------------------
   O site original usava React (js/index-*.js, 850 KB) e quebrava fora do
   servidor. Este arquivo pequeno substitui o React e cuida de tudo que
   "se mexe" na página. Ele é carregado no fim do index.html:
       <script src="js/static-fix.js" defer></script>

   O QUE ELE FAZ (na ordem em que aparece abaixo):
     1. Preloader ........ tela preta "IAN CHAVES 0% → 100%" no início
     2. Imagens .......... força carregar imagens "lazy"
     3. Contadores ....... números animados (+150, +20, +7K, 100%)
     4. Barra flutuante .. botão de WhatsApp que aparece ao rolar
     5. Menu ativo ....... destaca no menu a seção em que você está
     6. Scroll suave ..... rolagem animada ao clicar em links "#algo"
     7. FAQ .............. abre/fecha as perguntas
     8. Menu hambúrguer .. mostra/esconde o menu

   COMO LER: "$" é um atalho para document.querySelector (acha 1 elemento
   pela classe/id, igual ao CSS) e "$$" acha TODOS (devolve uma lista).
   ===================================================================== */
(function () {
  // Tudo fica dentro desta função "(function(){ ... })()" para não
  // misturar nossas variáveis com as do navegador.

  // $("seletor")  -> primeiro elemento que combina. Ex.: $(".preloader")
  var $ = function (s, r) { return (r || document).querySelector(s); };
  // $$("seletor") -> todos os elementos que combinam, como lista (array)
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  // root = a tag <html>. Usamos para ligar/desligar a classe "is-preloading"
  var root = document.documentElement;

  /* ---------------------------------------------------------------
     1. PRELOADER
     HTML:  <div class="preloader"> ... (index.html, perto do fim)
     CSS:   .preloader, .preloader-count, .preloader-bar
     Faz: conta de 0% a 100% em D milissegundos, enche a barra branca
     embaixo, depois some com um fade (efeito de desaparecer).
     ✏️ Para deixar mais rápido/lento, mude D (1600 = 1,6 segundos).
     --------------------------------------------------------------- */
  var pre = $(".preloader");
  if (pre) {
    // Trava a rolagem da página enquanto o preloader está na tela
    root.classList.add("is-preloading");
    var cnt = $(".preloader-count"),   // o texto "0%"
        bar = $(".preloader-bar"),     // a barra branca
        t0 = performance.now(),        // momento em que começou
        D = 1600;                      // duração total (ms)

    // tick: roda a cada "quadro" da tela (~60x por segundo) e atualiza
    (function tick(now) {
      // p = progresso de 0 (começo) a 1 (fim)
      var p = Math.min(1, (now - t0) / D);
      if (cnt) cnt.textContent = Math.round(p * 100) + "%";
      if (bar) bar.style.transform = "scaleX(" + p + ")"; // largura da barra
      if (p < 1) return requestAnimationFrame(tick);      // ainda não acabou: repete

      // Acabou: fade-out de 0,6s e depois remove o preloader de vez
      pre.style.transition = "opacity .6s ease";
      pre.style.opacity = "0";
      setTimeout(function () {
        pre.style.display = "none";                // some
        root.classList.remove("is-preloading");    // libera a rolagem
      }, 650);
    })(t0);
  }

  /* ---------------------------------------------------------------
     2. IMAGENS
     Imagens com loading="lazy" só carregam quando chegam perto da tela.
     Aqui trocamos para "eager" (carregar já) para não aparecerem
     vazias, principalmente nos cartões de projetos.
     --------------------------------------------------------------- */
  $$("img[loading=lazy]").forEach(function (i) { i.loading = "eager"; });

  /* ---------------------------------------------------------------
     3. CONTADORES (seção "Números")
     HTML:  <dt class="stats-value" aria-label="+150"> ... <span data-count>0</span>
     Faz: quando a seção aparece na tela, anima o número de 0 até o valor
     que está no aria-label (apenas dígitos: "+150" -> 150).
     ✏️ Para mudar um número, edite o aria-label no index.html.
     --------------------------------------------------------------- */
  var spans = $$("[data-count]");   // todos os números animados

  // runCount: anima UM número de 0 até o alvo em d milissegundos
  function runCount(el) {
    var host = el.closest(".stats-value");  // elemento pai que tem o aria-label
    // pega só os dígitos do aria-label ("+7K" -> 7)
    var target = parseInt((host.getAttribute("aria-label") || "0").replace(/\D/g, ""), 10) || 0;
    var s = performance.now(), d = 1800;     // d = duração da animação
    (function step(n) {
      var p = Math.min(1, (n - s) / d);          // progresso 0..1
      var e = 1 - Math.pow(1 - p, 3);            // "easing": começa rápido e desacelera
      el.textContent = Math.round(target * e);   // escreve o número atual
      if (p < 1) requestAnimationFrame(step);
    })(s);
  }

  // IntersectionObserver = "avisa quando este elemento aparece na tela".
  // threshold 0.4 = quando 40% dele estiver visível. Dispara 1 vez só.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    spans.forEach(function (s) { io.observe(s); });
  } else {
    spans.forEach(runCount);   // navegador antigo: anima direto
  }

  /* ---------------------------------------------------------------
     4 e 5. EVENTO DE SCROLL (roda toda vez que você rola a página)
     4) Barra flutuante: HTML <div class="floating-bar">, CSS .floating-bar
        Aparece (classe "floating-bar--ativo") depois de rolar 80% do hero.
     5) Menu ativo: marca com a classe "is-active" o link do menu da
        seção que está no topo da tela (o botão branco em "Início").
     --------------------------------------------------------------- */
  var fb = $(".floating-bar"), hero = $(".creative-hero");
  function onScroll() {
    // 4) liga/desliga a classe conforme a posição da rolagem (scrollY)
    if (fb && hero) fb.classList.toggle("floating-bar--ativo", window.scrollY > hero.offsetHeight * 0.8);

    // 5) descobre qual seção está visível e destaca o link correspondente
    var links = $$(".creative-pill a"), cur = links[0];
    links.forEach(function (a) {
      var id = (a.getAttribute("href") || "").slice(1),      // "#projects" -> "projects"
          el = id && document.getElementById(id);            // a seção com esse id
      // se o topo da seção já passou de 40% da altura da tela, ela é a atual
      if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) cur = a;
    });
    links.forEach(function (a) { a.classList.toggle("is-active", a === cur); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();   // roda uma vez já no começo

  /* ---------------------------------------------------------------
     6. SCROLL SUAVE
     Qualquer link <a href="#algo"> rola animado até o elemento id="algo".
     href="#" (sem nome) volta ao topo da página.
     --------------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    // closest: sobe a partir do que foi clicado até achar um link "#..."
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1),
        el = id ? document.getElementById(id) : document.body;
    if (el) {
      e.preventDefault();   // cancela o pulo seco padrão do navegador
      (id ? el : document.documentElement).scrollIntoView({ behavior: "smooth" });
      if (!id) window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  /* ---------------------------------------------------------------
     7. FAQ (perguntas frequentes)
     HTML: <article class="faq-row"> <button class="faq-question"> ...
     CSS:  .faq-row.is-open .faq-answer (mostra a resposta)
     Faz: ao clicar na pergunta, liga/desliga a classe "is-open" na linha
     (o CSS cuida de abrir a resposta e girar o "+") e atualiza
     aria-expanded (acessibilidade para leitores de tela).
     --------------------------------------------------------------- */
  $$(".faq-question").forEach(function (b) {
    b.addEventListener("click", function () {
      var row = b.closest(".faq-row"),
          open = row.classList.toggle("is-open");   // toggle = liga se estava desligada e vice-versa
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------------------------------------------------------------
     8. MENU HAMBÚRGUER
     HTML: <button class="creative-burger"> e <nav class="creative-pill">
     Faz: ao clicar, alterna aria-expanded (o CSS transforma as 2 linhas
     em um "X") e mostra/esconde a navegação (display flex / padrão).
     --------------------------------------------------------------- */
  var burger = $(".creative-burger"), pill = $(".creative-pill");
  if (burger && pill) burger.addEventListener("click", function () {
    var o = burger.getAttribute("aria-expanded") !== "true";   // vai abrir?
    burger.setAttribute("aria-expanded", o ? "true" : "false");
    pill.style.display = o ? "flex" : "";                      // "" = volta ao padrão do CSS
  });
})();
