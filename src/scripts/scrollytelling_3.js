/* L'amara storia dei redditi italiani — scrollytelling D3
   Port di src/scripts/scrollytelling_3.ts (repo L'elefante).
   Modifica chiave: i due elefanti sono entrambi gruppi <g> con un'etichetta
   <text> col nome sotto, così icona + nome si muovono insieme in ogni step. */
(function () {
  "use strict";

  // ─── Costanti ─────────────────────────────────────────────────────────────
  const N = 100;                     // 1 punto = 1% del reddito 1980 (≈189.772€)
  const N_EXTRA = 103;               // crescita verso il 2024 (≈386.249€)
  const SHARE_TOP_NODES = 84;        // quota del top 1% nel 1980
  const SHARE_TOP_EXTRA_NODES = 102; // quota della crescita andata in alto (2024)

  const R = 6;
  const STR_X = 0.03;
  const STR_Y = 0.08;

  const TRANSITION_MS = 700;
  const TRANSITION_TIME_TRAVEL = 2000;
  const easing = d3.easeCubicInOut;

  // ─── Setup SVG ─────────────────────────────────────────────────────────────
  const container = document.getElementById("sticky-graphic");
  const svg = d3.select("#chart-3");

  let width = container.clientWidth;
  let height = container.clientHeight;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const g = svg.append("g").attr("class", "root");

  // ─── Icone elefante (entrambe arancioni) + etichette nome ──────────────────
  const manSrcLeft = container.dataset.manSrcLeft || "";
  const manSrcRight = container.dataset.manSrcRight || "";
  const nameLeft = container.dataset.nameLeft || "";
  const nameRight = container.dataset.nameRight || "";

  const iconSize_calc = () =>
    width > 500 ? Math.min(width, height) * 0.18 : Math.min(width, height) * 0.26;
  let iconSize = iconSize_calc();
  let gap = iconSize * 0.4;

  const labelGap = () => Math.max(12, iconSize * 0.1);
  const labelFont = () => Math.max(13, Math.round(iconSize * 0.15));

  // Ogni elefante è un gruppo: <image> in (0,0) + <text> centrata sotto.
  // Posizione del gruppo via transform translate(x, y) dove (x,y) = angolo top-left dell'icona.
  function makeMan(src, name) {
    const grp = g.append("g").attr("class", "man");
    grp.append("image")
      .attr("class", "man-img")
      .attr("href", src)
      .attr("width", iconSize)
      .attr("height", iconSize)
      .attr("x", 0)
      .attr("y", 0);
    grp.append("text")
      .attr("class", "man-label")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "hanging")
      .attr("x", iconSize / 2)
      .attr("y", iconSize + labelGap())
      .attr("font-size", labelFont())
      .text(name);
    return grp;
  }

  const manLeft = makeMan(manSrcLeft, nameLeft);   // Andrea — il ricco (va in alto)
  const manRight = makeMan(manSrcRight, nameRight); // Alex — la via di mezzo (va in basso)

  function placeMan(grp, x, y) {
    grp.attr("transform", `translate(${x},${y})`);
  }
  function relayoutLabels() {
    g.selectAll(".man").each(function () {
      const sel = d3.select(this);
      sel.select(".man-img").attr("width", iconSize).attr("height", iconSize);
      sel.select(".man-label")
        .attr("x", iconSize / 2)
        .attr("y", iconSize + labelGap())
        .attr("font-size", labelFont());
    });
  }

  // Posizioni iniziali (step 0): affiancati al centro.
  placeMan(manLeft, width / 2 - gap / 2 - iconSize, height / 2 - iconSize / 2);
  placeMan(manRight, width / 2 + gap / 2, height / 2 - iconSize / 2);

  // ─── Etichetta anno ────────────────────────────────────────────────────────
  const yearLabelFontSize = () => Math.min(width, height) * 0.1;
  function yearYposition() {
    return width > 500 ? height / 2 + yearLabelFontSize() / 2 : yearLabelFontSize() + 30;
  }
  const yearLabel = g.append("text")
    .attr("class", "year-label")
    .attr("x", width - 24)
    .attr("y", yearYposition())
    .attr("text-anchor", "end")
    .attr("font-size", yearLabelFontSize())
    .attr("font-weight", "800")
    .style("opacity", 0)
    .text("1980");

  // ─── Simulazione cerchi (i "soldi") ────────────────────────────────────────
  const nodes = Array.from({ length: N }, () => ({
    x: width * 0.7 + (Math.random() - 0.5) * 8,
    y: height / 2 + (Math.random() - 0.5) * 8,
    group: "center",
  }));

  const circleGroup = g.append("g").attr("class", "circles-group");
  const extraGroup = g.append("g").attr("class", "extra-circles-group");

  const circles = circleGroup
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", "money")
    .attr("r", R)
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .style("opacity", 0);

  let extraNodes = [];
  let extraCircles = null;
  let extrasPhase = 0; // 0 = none, 1 = spawn al centro, 2 = rilasciati ai gruppi

  const simulation = d3
    .forceSimulation(nodes)
    .force("x", d3.forceX(width * 0.7).strength(STR_X))
    .force("y", d3.forceY(height / 2).strength(STR_Y))
    .force("collide", d3.forceCollide(R + 1))
    .on("tick", () => {
      circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      if (extraCircles) extraCircles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    })
    .stop();

  let y_step1_left = height * 0.25;
  let y_step1_right = height * 0.75;

  // step1: elefanti impilati a sinistra (ricco in alto, via-di-mezzo in basso)
  function step1() {
    manLeft.transition().duration(TRANSITION_MS).ease(easing)
      .attr("transform", `translate(${width * 0.3 - iconSize / 2},${y_step1_left - iconSize / 2})`);
    manRight.transition().duration(TRANSITION_MS).ease(easing)
      .attr("transform", `translate(${width * 0.3 - iconSize / 2},${y_step1_right - iconSize / 2})`);
  }

  // ─── Cerchi extra (crescita 2024) ──────────────────────────────────────────
  function spawnExtras() {
    if (extrasPhase === 1) return;
    if (extrasPhase === 2) removeExtras();
    if (width === 0 || height === 0) return;

    extraGroup.selectAll("circle.exiting").interrupt().remove();

    extraNodes = Array.from({ length: N_EXTRA }, () => ({
      x: width * 0.7 + (Math.random() - 0.5) * 30,
      y: height / 2 + (Math.random() - 0.5) * 30,
      group: "top",
    }));

    const shadowSim = d3.forceSimulation(extraNodes)
      .force("x", d3.forceX(width * 0.7).strength(STR_X))
      .force("y", d3.forceY(height / 2).strength(STR_Y))
      .force("collide", d3.forceCollide(R + 1))
      .stop();
    shadowSim.alpha(0.9);
    for (let i = 0; i < 100; i++) shadowSim.tick();

    extraNodes.forEach((n) => { n.vx = 0; n.vy = 0; n.fx = n.x; n.fy = n.y; });
    simulation.nodes([...nodes, ...extraNodes]);

    const entered = extraGroup
      .selectAll("circle:not(.exiting)")
      .data(extraNodes)
      .enter()
      .append("circle")
      .attr("class", "money")
      .attr("r", R)
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .style("opacity", 0);

    entered.transition().duration(TRANSITION_TIME_TRAVEL).ease(easing).style("opacity", 1);
    extraCircles = entered;

    simulation.alpha(0.5).restart();
    extrasPhase = 1;
  }

  function releaseExtras() {
    if (extrasPhase === 2) return;
    if (extrasPhase === 0) {
      spawnExtras();
      if (extraNodes.length === 0) return;
    }
    extraNodes.forEach((n, i) => { n.group = i < SHARE_TOP_EXTRA_NODES ? "top" : "bottom"; });
    extraNodes.forEach((n) => { n.fx = null; n.fy = null; });
    simulation.force("y", d3.forceY((d) => (d.group === "top" ? y_step1_left : y_step1_right)).strength(STR_Y - 0.03));
    simulation.alpha(0.5).restart();
    extrasPhase = 2;
  }

  function removeExtras() {
    if (extraNodes.length === 0 && !extraCircles) return;
    simulation.nodes(nodes);
    extraNodes = [];
    if (extraCircles) {
      extraCircles.interrupt().classed("exiting", true);
      extraGroup.selectAll("circle.exiting")
        .transition().duration(TRANSITION_MS).ease(easing)
        .style("opacity", 0).remove();
      extraCircles = null;
    }
    simulation.alpha(0.3).restart();
    extrasPhase = 0;
  }

  // ─── Stati ─────────────────────────────────────────────────────────────────
  const states = {
    0() {
      removeExtras();
      manLeft.transition().duration(TRANSITION_MS).ease(easing)
        .attr("transform", `translate(${width / 2 - gap / 2 - iconSize},${height / 2 - iconSize / 2})`);
      manRight.transition().duration(TRANSITION_MS).ease(easing)
        .attr("transform", `translate(${width / 2 + gap / 2},${height / 2 - iconSize / 2})`);
      simulation.stop();
      circles.transition().duration(TRANSITION_MS).style("opacity", 0);
      yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 0);
    },

    1() {
      removeExtras();
      step1();
      simulation
        .force("x", d3.forceX(width * 0.7).strength(STR_X))
        .force("y", d3.forceY(height / 2).strength(STR_Y))
        .alpha(0.5).restart();
      circles.transition().duration(TRANSITION_MS).style("opacity", 1);
      yearLabel.interrupt().text("1980");
      yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
    },

    2() {
      removeExtras();
      nodes.forEach((n, i) => { n.group = i < SHARE_TOP_NODES ? "top" : "bottom"; });
      simulation
        .force("x", d3.forceX(width * 0.7).strength(STR_X))
        .force("y", d3.forceY((d) => (d.group === "top" ? y_step1_left : y_step1_right)).strength(STR_Y))
        .alpha(0.5).restart();
      circles.transition().duration(TRANSITION_MS).style("opacity", 1);
      yearLabel.interrupt().text("1980");
      yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
    },

    3({ direction }) {
      nodes.forEach((n, i) => { n.group = i < SHARE_TOP_NODES ? "top" : "bottom"; });
      step1();
      simulation
        .force("x", d3.forceX(width * 0.7).strength(STR_X))
        .force("y", d3.forceY((d) => (d.group === "top" ? y_step1_left : y_step1_right)).strength(STR_Y));
      circles.transition().duration(TRANSITION_MS).style("opacity", 1);
      if (direction === "up") {
        removeExtras();
        yearLabel.interrupt().text("2024");
        yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
      } else {
        yearLabel.interrupt().text("1980");
        const labelNode = yearLabel.node();
        yearLabel.transition().duration(TRANSITION_TIME_TRAVEL).ease(easing)
          .style("opacity", 1)
          .tween("text", () => (t) => { labelNode.textContent = String(Math.round(1980 + 44 * t)); });
      }
    },

    4() {
      nodes.forEach((n, i) => { n.group = i < SHARE_TOP_NODES ? "top" : "bottom"; });
      step1();
      simulation
        .force("x", d3.forceX(width * 0.7).strength(STR_X))
        .force("y", d3.forceY((d) => (d.group === "top" ? y_step1_left : y_step1_right)).strength(STR_Y));
      circles.transition().duration(TRANSITION_MS).style("opacity", 1);
      yearLabel.interrupt().text("2024");
      yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
      spawnExtras();
    },

    5() {
      nodes.forEach((n, i) => { n.group = i < SHARE_TOP_NODES ? "top" : "bottom"; });
      step1();
      simulation
        .force("x", d3.forceX(width * 0.7).strength(STR_X))
        .force("y", d3.forceY((d) => (d.group === "top" ? y_step1_left : y_step1_right)).strength(STR_Y));
      circles.transition().duration(TRANSITION_MS).style("opacity", 1);
      yearLabel.interrupt().text("2024");
      yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
      releaseExtras();
    },
  };

  let currentStep = 0;
  function applyStep(step, direction) {
    currentStep = step;
    if (states[step]) states[step]({ direction });
  }

  // ─── Scrollama ─────────────────────────────────────────────────────────────
  const scroller = scrollama();
  scroller
    .setup({ step: "#steps .step", offset: 0.2 })
    .onStepEnter(({ element, direction }) => {
      const step = +element.dataset.step;
      document.querySelectorAll("#steps .step").forEach((el) => el.classList.remove("is-active"));
      element.classList.add("is-active");
      applyStep(step, direction);
    });

  // ─── Resize ────────────────────────────────────────────────────────────────
  window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;
    y_step1_left = height * 0.25;
    y_step1_right = height * 0.75;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    iconSize = iconSize_calc();
    gap = iconSize * 0.25;
    relayoutLabels();

    yearLabel.attr("x", width - 24).attr("y", yearYposition()).attr("font-size", yearLabelFontSize());

    if (currentStep === 0) {
      placeMan(manLeft, width / 2 - gap / 2 - iconSize, height / 2 - iconSize / 2);
      placeMan(manRight, width / 2 + gap / 2, height / 2 - iconSize / 2);
    } else {
      placeMan(manLeft, width * 0.3 - iconSize / 2, y_step1_left - iconSize / 2);
      placeMan(manRight, width * 0.3 - iconSize / 2, y_step1_right - iconSize / 2);
    }
    scroller.resize();
  });
})();
