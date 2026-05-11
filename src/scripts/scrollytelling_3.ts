import scrollama from "scrollama";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────
interface SimNode extends d3.SimulationNodeDatum {
  group?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────
const N       = 100; //equivalent to 1980 annual salary of 189.772€
const N_EXTRA = 103; //shift to 2024 salary of 386.249€ in total
const SHARE_TOP_NODES = 84; // number of nodes in the top group at step 2 (1980 salary threshold)
const SHARE_TOP_EXTRA_NODES = 102; // number of extra nodes in the top group at step 4 (2024 salary threshold)

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
const manSrcLeft = (container as HTMLElement).dataset.manSrcLeft ?? "";
const manSrcRight = (container as HTMLElement).dataset.manSrcRight ?? "";

let iconSize = Math.min(width, height) * 0.18;
let gap = iconSize * 0.25;

const manLeft = g.append("image")
  .attr("href", manSrcLeft)
  .attr("width", iconSize)
  .attr("height", iconSize)
  .attr("x", width / 2 - gap / 2 - iconSize)
  .attr("y", height / 2 - iconSize / 2);

const manRight = g.append("image")
  .attr("href", manSrcRight)
  .attr("width", iconSize)
  .attr("height", iconSize)
  .attr("x", width / 2 + gap / 2)
  .attr("y", height / 2 - iconSize / 2);

// ─── Year label ───────────────────────────────────────────────────────────
const yearLabelFontSize = () => Math.min(width, height) * 0.1;

const yearLabel = g.append("text")
  .attr("class", "year-label")
  .attr("x", width - 24)
  .attr("y", yearLabelFontSize() + 20)
  .attr("text-anchor", "end")
  .attr("font-size", yearLabelFontSize())
  .attr("font-weight", "bold")
  .attr("fill", "currentColor")
  .style("opacity", 0)
  .text("1980");

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
// 0 = none, 1 = spawned and fixed at center, 2 = released to top group
let extrasPhase: 0 | 1 | 2 = 0;

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
const TRANSITION_TIME_TRAVEL = 2000;

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
  if (extrasPhase === 1) return; // already at center, nothing to do
  if (extrasPhase === 2) {
    // Returning to step 3 from step 4: remove released extras, re-spawn at center.
    // removeExtras() marks circles as "exiting"; the cleanup below removes them instantly.
    removeExtras();
  }
  if (width === 0 || height === 0) return;

  // Interrupt and remove any circles still fading out from a previous removeExtras().
  extraGroup.selectAll<SVGCircleElement, unknown>("circle.exiting")
    .interrupt()
    .remove();

  extraNodes = Array.from({ length: N_EXTRA }, () => ({
    x: width * 0.7 + (Math.random() - 0.5) * 30,
    y: height / 2 + (Math.random() - 0.5) * 30,
    group: "top",
  }));

  // Pre-settle invisibly at center to avoid an explosive cluster on first tick.
  const shadowSim = d3
    .forceSimulation<SimNode>(extraNodes)
    .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
    .force("y", d3.forceY<SimNode>(height / 2).strength(STR_Y))
    .force("collide", d3.forceCollide<SimNode>(R + 1))
    .stop();

  shadowSim.alpha(0.9);
  for (let i = 0; i < 100; i++) shadowSim.tick();

  // Pin extras at center via fx/fy so the main simulation won't move them
  // during fade-in. releaseExtras() removes the pins when step 4 fires.
  extraNodes.forEach(n => {
    const nd = n as d3.SimulationNodeDatum;
    nd.vx = 0; nd.vy = 0;
    nd.fx = nd.x!;
    nd.fy = nd.y!;
  });

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

  entered.transition().duration(TRANSITION_TIME_TRAVEL).ease(easing).style("opacity", 1);
  extraCircles = entered;

  simulation.alpha(0.5).restart();
  extrasPhase = 1;
}

function releaseExtras() {
  if (extrasPhase === 2) return; // already released

  if (extrasPhase === 0) {
    // Entering step 4 directly (no step 3 visited): spawn first, then release.
    // Extras will fade in while moving to the top group.
    spawnExtras();
    // spawnExtras() guards against width/height === 0; bail if nothing was created.
    if (extraNodes.length === 0) return;
  }

  extraNodes.forEach((n, i) => {
    n.group = i < SHARE_TOP_EXTRA_NODES ? "top" : "bottom";
  });

  extraNodes.forEach(n => {
    const nd = n as d3.SimulationNodeDatum;
    nd.fx = null;
    nd.fy = null;
  });

  // forceY caches target y-values per node in initialize(), called only when
  // simulation.nodes() or simulation.force() changes — not on restart().
  // Mutating n.group above is not enough: re-setting the force triggers
  // initialize() so yz[i] is recomputed with the updated group assignments.
  simulation.force("y", d3.forceY<SimNode>((d: SimNode) => d.group === "top" ? y_step1_left : y_step1_right).strength(STR_Y - 0.03)); // Slightly reduce strength 

  simulation.alpha(0.5).restart();
  extrasPhase = 2;
}

function removeExtras() {
  if (extraNodes.length === 0 && !extraCircles) return;

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
  extrasPhase = 0;
}


const states: Record<number, (args: StateArgs) => void> = {
  0(_args) {
    removeExtras();
    manLeft
      .transition().duration(TRANSITION_MS).ease(easing)
      .attr("x", width / 2 - gap / 2 - iconSize)
      .attr("y", height / 2 - iconSize / 2);
    manRight
      .transition().duration(TRANSITION_MS).ease(easing)
      .attr("x", width / 2 + gap / 2)
      .attr("y", height / 2 - iconSize / 2);
    simulation.stop();
    circles.transition().duration(TRANSITION_MS).style("opacity", 0);
    yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 0);
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
    yearLabel.interrupt().text("1980");
    yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
  },

  2(_args) {
    removeExtras();
    nodes.forEach((n, i) => {
        if (i < SHARE_TOP_NODES) { // 84 = 160k annual salary for top 1% in 1980
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
    yearLabel.interrupt().text("1980");
    yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
  },

  3(_args) {
    // Step 3 può essere raggiunto saltando step 2 (anchor diretti / scroll
    // veloce): garantisco split top/bottom e forze coerenti prima di spawnare.
    nodes.forEach((n, i) => {
      n.group = i < SHARE_TOP_NODES ? "top" : "bottom";
    });
    step1();
    simulation
      .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
      .force("y", d3.forceY<SimNode>((d) => d.group === "top" ? y_step1_left : y_step1_right).strength(STR_Y));
    circles.transition().duration(TRANSITION_MS).style("opacity", 1);
    yearLabel.interrupt().text("1980");
    const labelNode = yearLabel.node()!;
    yearLabel
      .transition().duration(TRANSITION_TIME_TRAVEL).ease(easing)
      .style("opacity", 1)
      .tween("text", () => (t: number) => {
        labelNode.textContent = String(Math.round(1980 + 44 * t));
      });
    spawnExtras();
  },

  4(_args) {
    nodes.forEach((n, i) => {
      n.group = i < SHARE_TOP_NODES ? "top" : "bottom";
    });
    step1();
    simulation
      .force("x", d3.forceX<SimNode>(width * 0.7).strength(STR_X))
      .force("y", d3.forceY<SimNode>((d: SimNode) => d.group === "top" ? y_step1_left : y_step1_right).strength(STR_Y));
    circles.transition().duration(TRANSITION_MS).style("opacity", 1);
    yearLabel.interrupt().text("2024");
    yearLabel.transition().duration(TRANSITION_MS).ease(easing).style("opacity", 1);
    releaseExtras();
  },
};

let currentStep = 0;

function applyStep(step: number, direction: "up" | "down") {
  currentStep = step;
  states[step]?.({ direction });
}

// ─── Scrollama ────────────────────────────────────────────────────────────
const scroller = scrollama();

scroller
  .setup({ step: "#steps .step", offset: 0.2 })
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

  iconSize = Math.min(width, height) * 0.18;
  gap = iconSize * 0.25;

  manLeft.attr("width", iconSize).attr("height", iconSize);
  manRight.attr("width", iconSize).attr("height", iconSize);

  yearLabel
    .attr("x", width - 24)
    .attr("y", yearLabelFontSize() + 20)
    .attr("font-size", yearLabelFontSize());

  // Riposiziona le icone in base allo step corrente invece di resettarle
  // sempre al centro: su mobile il browser triggera resize quando mostra/nasconde
  // la barra degli indirizzi durante lo scroll, causando un flash visivo.
  if (currentStep === 0) {
    manLeft
      .attr("x", width / 2 - gap / 2 - iconSize)
      .attr("y", height / 2 - iconSize / 2);
    manRight
      .attr("x", width / 2 + gap / 2)
      .attr("y", height / 2 - iconSize / 2);
  } else {
    manLeft
      .attr("x", width * 0.3 - iconSize / 2)
      .attr("y", y_step1_left - iconSize / 2);
    manRight
      .attr("x", width * 0.3 - iconSize / 2)
      .attr("y", y_step1_right - iconSize / 2);
  }

  scroller.resize();
});
