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

  extraNodes = Array.from({ length: N_EXTRA }, () => ({
    x: width * 0.7 + (Math.random() - 0.5) * 30,
    y: y_step1_left + (Math.random() - 0.5) * 30,
    group: "top",
  }));

  // Fase di pre-assestamento invisibile: eseguiamo la simulazione sui soli
  // nodi extra (senza renderizzare) in modo che quando appaiono siano già
  // distribuiti nello spazio e non partano da un grumo esplosivo.
  const shadowSim = d3
    .forceSimulation<SimNode>(extraNodes)
    .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
    .force("y", d3.forceY<SimNode>(y_step1_left).strength(STR_Y))
    .force("collide", d3.forceCollide<SimNode>(R + 1))
    .stop();

  shadowSim.alpha(0.9);
  for (let i = 0; i < 100; i++) shadowSim.tick();
  // Azzero le velocità residue: i nodi appariranno fermi, poi la simulazione
  // principale gestirà le collisioni con i nodi base.
  extraNodes.forEach(n => { (n as d3.SimulationNodeDatum).vx = 0; (n as d3.SimulationNodeDatum).vy = 0; });

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

  // Alpha più basso: i nodi extra sono già pre-assestati, serve solo risolvere
  // le collisioni residue con i nodi base.
  simulation.alpha(0.3).restart();
}

function removeExtras() {
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
