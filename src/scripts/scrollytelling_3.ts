import scrollama from "scrollama";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────
interface SimNode extends d3.SimulationNodeDatum {
  group?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────
const N       = 100;
const N_EXTRA = 80;
const R       = 6;
const STR_X   = 0.03;
const STR_Y   = 0.08;

// ─── Setup SVG ────────────────────────────────────────────────────────────
const container = document.getElementById("sticky-graphic")!;
const svg = d3.select<SVGSVGElement, unknown>("#chart-3");

let width  = container.clientWidth;
let height = container.clientHeight;

svg.attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("class", "root");

// ─── Man icons ────────────────────────────────────────────────────────────
const manSrc = (container as HTMLElement).dataset.manSrc ?? "";
const iconSize = Math.min(width, height) * 0.18;
const gap = iconSize * 0.25;

const manLeft = g.append("image")
  .attr("href", manSrc)
  .attr("width", iconSize)
  .attr("height", iconSize)
  .attr("x", width / 2 - gap / 2 - iconSize)
  .attr("y", height / 2 - iconSize / 2);

const manRight = g.append("image")
  .attr("href", manSrc)
  .attr("width", iconSize)
  .attr("height", iconSize)
  .attr("x", width / 2 + gap / 2)
  .attr("y", height / 2 - iconSize / 2);

// ─── Circles simulation ───────────────────────────────────────────────────
const nodes: SimNode[] = Array.from({ length: N }, () => ({
  x: width * 0.7 + (Math.random() - 0.5) * 8,
  y: height / 2 + (Math.random() - 0.5) * 8,
  group: "center",
}));

const circleGroup = g.append("g").attr("class", "circles-group");
const extraGroup  = g.append("g").attr("class", "extra-circles-group");

const circles = circleGroup
  .selectAll<SVGCircleElement, SimNode>("circle")
  .data(nodes)
  .enter()
  .append("circle")
  .attr("r", R)
  .attr("fill", "gold")
  .attr("cx", (d) => d.x!)
  .attr("cy", (d) => d.y!)
  .style("opacity", 0);

let extraNodes: SimNode[] = [];
let extraCircles: d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown> | null = null;
let phase2Timer: ReturnType<typeof setTimeout> | null = null;

const simulation = d3
  .forceSimulation<SimNode>(nodes)
  .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
  .force("y", d3.forceY<SimNode>(height / 2).strength(STR_Y))
  .force("collide", d3.forceCollide<SimNode>(R + 1))
  .on("tick", () => {
    circles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    if (extraCircles) {
      extraCircles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    }
  })
  .stop();

// ─── States ───────────────────────────────────────────────────────────────
type StateArgs = { direction: "up" | "down" };


const TRANSITION_MS = 700;
const easing = d3.easeCubicInOut;

var y_step1_left = height * 0.25;
var y_step1_right = height * 0.75;

function step1() {
    manLeft.transition().duration(TRANSITION_MS).ease(easing)
      .attr("y", y_step1_left - iconSize / 2)
      .attr("x", width * 0.3 - iconSize / 2);
    manRight.transition().duration(TRANSITION_MS).ease(easing)
      .attr("y", y_step1_right - iconSize / 2)
      .attr("x", width * 0.3 - iconSize / 2);
}

// ─── Extra nodes (step 3) ─────────────────────────────────────────────────
// Strategia: i nodi extra entrano/escono dinamicamente da `simulation.nodes()`.
// Quando non sono nello step 3, non esistono per la fisica → non disturbano
// la collide né le forze sui nodi base.
function spawnExtras() {
  if (extraNodes.length > 0) return;
  if (width === 0 || height === 0) return;

  // Cleanup sincrono di eventuali circle in fade-out da una uscita precedente,
  // così il data-join successivo non riusa quei DOM per indice.
  extraGroup.selectAll<SVGCircleElement, unknown>("circle.exiting")
    .interrupt()
    .remove();

  // Fase 1: i nodi extra appaiono al centro dell'SVG
  extraNodes = Array.from({ length: N_EXTRA }, () => ({
    x: width * 0.7 + (Math.random() - 0.5) * 30,
    y: height / 2 + (Math.random() - 0.5) * 30,
    group: "top",
  }));

  // Pre-assestamento invisibile al centro per evitare grumo esplosivo.
  const shadowSim = d3
    .forceSimulation<SimNode>(extraNodes)
    .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
    .force("y", d3.forceY<SimNode>(height / 2).strength(STR_Y))
    .force("collide", d3.forceCollide<SimNode>(R + 1))
    .stop();

  shadowSim.alpha(0.9);
  for (let i = 0; i < 100; i++) shadowSim.tick();
  // Azzero velocità e fisso i nodi al centro (fx/fy): la simulazione principale
  // non li sposta durante il fade-in. Fase 2 rilascerà i vincoli.
  extraNodes.forEach(n => {
    const nd = n as d3.SimulationNodeDatum;
    nd.vx = 0; nd.vy = 0;
    nd.fx = nd.x!;
    nd.fy = nd.y!;
  });

  // Aggancio gli extra alla simulazione: i nodi base mantengono x/y/vx/vy
  // perché l'identità degli oggetti SimNode è preservata.
  simulation.nodes([...nodes, ...extraNodes]);

  const entered = extraGroup
    .selectAll<SVGCircleElement, SimNode>("circle:not(.exiting)")
    .data(extraNodes)
    .enter()
    .append("circle")
    .attr("r", R)
    .attr("fill", "gold")
    .attr("cx", (d) => d.x!)
    .attr("cy", (d) => d.y!)
    .style("opacity", 0);

  entered.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
  extraCircles = entered;

  // I nodi extra sono fissi al centro via fx/fy: alpha 0.5 permette ai nodi
  // base di muoversi normalmente mentre gli extra aspettano il fade-in.
  simulation.alpha(0.5).restart();

  // Fase 2: al termine del fade-in rilascio fx/fy → forceY porta gli extra
  // verso y_step1_left (gruppo top), unendoli agli altri cerchi top.
  phase2Timer = setTimeout(() => {
    phase2Timer = null;
    if (extraNodes.length === 0) return;
    extraNodes.forEach(n => {
      const nd = n as d3.SimulationNodeDatum;
      nd.fx = null;
      nd.fy = null;
    });
    simulation.alpha(0.5).restart();
  }, TRANSITION_MS);
}

function removeExtras() {
  if (phase2Timer !== null) {
    clearTimeout(phase2Timer);
    phase2Timer = null;
  }
  if (extraNodes.length === 0 && !extraCircles) return;

  // Stacco subito gli extra dalla simulazione: smettono di influenzare
  // collide/force già da questo tick, prima ancora del fade.
  simulation.nodes(nodes);
  extraNodes = [];

  if (extraCircles) {
    extraCircles
      .interrupt()
      .classed("exiting", true);

    extraGroup.selectAll<SVGCircleElement, unknown>("circle.exiting")
      .transition().duration(TRANSITION_MS).ease(easing)
      .style("opacity", 0)
      .remove();

    extraCircles = null;
  }

  simulation.alpha(0.3).restart();
}


const states: Record<number, (args: StateArgs) => void> = {
  0(_args) {
    removeExtras();
    manLeft
      .attr("href", manSrc)
      .transition().duration(TRANSITION_MS).ease(easing)
      .attr("x", width / 2 - gap / 2 - iconSize)
      .attr("y", height / 2 - iconSize / 2);
    manRight
      .attr("href", manSrc)
      .transition().duration(TRANSITION_MS).ease(easing)
      .attr("x", width / 2 + gap / 2)
      .attr("y", height / 2 - iconSize / 2);
    simulation.stop();
    circles.transition().duration(TRANSITION_MS).style("opacity", 0);
    },

  1(_args) {
    removeExtras();
    step1();
    simulation
      .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
      .force("y", d3.forceY<SimNode>(height / 2).strength(STR_Y))
      .alpha(0.5)
      .restart();
    circles.transition().duration(TRANSITION_MS).style("opacity", 1);
  },

  2(_args) {
    removeExtras();
    nodes.forEach((n, i) => {
        if (i < 70) {
            n.group = "top";
        } else {
            n.group = "bottom";
        }
    });
    simulation
      .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
      .force("y", d3.forceY<SimNode>((d) => d.group === "top" ? y_step1_left : y_step1_right).strength(STR_Y))
      .alpha(0.5)
      .restart();
    circles.transition().duration(TRANSITION_MS).style("opacity", 1);
  },

  3(_args) {
    // Step 3 può essere raggiunto saltando step 2 (anchor diretti / scroll
    // veloce): garantisco split top/bottom e forze coerenti prima di spawnare.
    nodes.forEach((n, i) => {
      n.group = i < 70 ? "top" : "bottom";
    });
    step1();
    simulation
      .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
      .force("y", d3.forceY<SimNode>((d) => d.group === "top" ? y_step1_left : y_step1_right).strength(STR_Y));
    circles.transition().duration(TRANSITION_MS).style("opacity", 1);
    spawnExtras();
  },
};

function applyStep(step: number, direction: "up" | "down") {
  states[step]?.({ direction });
}

// ─── Scrollama ────────────────────────────────────────────────────────────
const scroller = scrollama();

scroller
  .setup({ step: "#steps .step", offset: 0.5 })
  .onStepEnter(({ element, direction }) => {
    const step = +(element as HTMLElement).dataset.step!;

    document.querySelectorAll("#steps .step").forEach((el) =>
      el.classList.remove("is-active")
    );
    element.classList.add("is-active");

    applyStep(step, direction);
  });

window.addEventListener("resize", () => {
  width  = container.clientWidth;
  height = container.clientHeight;
  y_step1_left  = height * 0.25;
  y_step1_right = height * 0.75;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const newSize = Math.min(width, height) * 0.18;
  const newGap  = newSize * 0.25;

  manLeft.attr("width", newSize).attr("height", newSize)
    .attr("x", width / 2 - newGap / 2 - newSize)
    .attr("y", height / 2 - newSize / 2);

  manRight.attr("width", newSize).attr("height", newSize)
    .attr("x", width / 2 + newGap / 2)
    .attr("y", height / 2 - newSize / 2);

  scroller.resize();
});
