import scrollama from "scrollama";
import * as d3 from "d3";

// ─── Types ────────────────────────────────────────────────────────────────
type NodeGroup = "center" | "top" | "bottom" | "super";

interface SimNode extends d3.SimulationNodeDatum {
  group: NodeGroup;
}

// ─── Constants ────────────────────────────────────────────────────────────
let currentStep = 0;

const N     = 100;
const R     = 6;
const PAD   = 3;
const STR_X = 0.03;
const STR_Y = 0.06;

// ─── Setup SVG ────────────────────────────────────────────────────────────
const container = document.getElementById("sticky-graphic")!;
const svg = d3.select<SVGSVGElement, unknown>("#chart-3");

let width  = container.clientWidth;
let height = container.clientHeight;

svg.attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("class", "root");

// ─── Helpers ──────────────────────────────────────────────────────────────
function targetX(): number {
  return width / 2;
}

function targetY(d: SimNode): number {
  if (d.group === "super")  return height * 0.10;
  if (d.group === "top")    return currentStep >= 3 ? height * 0.50 : height * 0.27;
  if (d.group === "bottom") return currentStep >= 3 ? height * 0.80 : height * 0.73;
  return height / 2;
}

function fillOf(d: SimNode): string {
  if (d.group === "super")  return "var(--super-rich)";
  if (d.group === "bottom") return "transparent";
  return "var(--fg)";
}

// ─── Nodes ────────────────────────────────────────────────────────────────
const nodes: SimNode[] = d3.range(N).map(() => ({
  group: "center" as NodeGroup,
  x: width  / 2 + (Math.random() - 0.5) * 80,
  y: height / 2 + (Math.random() - 0.5) * 80,
  vx: 0,
  vy: 0,
}));

// ─── Circles ──────────────────────────────────────────────────────────────
const circles = g
  .selectAll<SVGCircleElement, SimNode>("circle")
  .data(nodes)
  .join("circle")
  .attr("r",            R)
  .attr("fill",         (d) => fillOf(d))
  .attr("stroke",       "var(--fg)")
  .attr("stroke-width", 1.5);

// ─── Simulation ───────────────────────────────────────────────────────────
function makeForces() {
  return {
    x:       d3.forceX<SimNode>(() => targetX()).strength(STR_X),
    y:       d3.forceY<SimNode>((d) => targetY(d)).strength(STR_Y),
    collide: d3.forceCollide<SimNode>(R + PAD).strength(0.85),
  };
}

const sim = d3.forceSimulation<SimNode>(nodes)
  .force("x",       makeForces().x)
  .force("y",       makeForces().y)
  .force("collide", makeForces().collide)
  .alphaDecay(0.012)
  .on("tick", () => {
    circles
      .attr("cx",   (d) => d.x!)
      .attr("cy",   (d) => d.y!)
      .attr("fill", (d) => fillOf(d));
  })
  .stop();

// Warmup per evitare overlap iniziale visibile
for (let i = 0; i < 80; i++) sim.tick();
circles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
sim.alpha(0.3).restart();

// ─── States ───────────────────────────────────────────────────────────────
type StateArgs = { direction: "up" | "down" };

const states: Record<number, (args: StateArgs) => void> = {
  0() {
    currentStep = 0;
    nodes.forEach((n) => { n.group = "center"; });
    const f = makeForces();
    sim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
  },

  1() {
    currentStep = 1;
    nodes.forEach((n, i) => { n.group = i < (N/2) ? "top" : "bottom"; });
    const f = makeForces();
    sim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
  },

  2() {
    currentStep = 2;
    nodes.forEach((n, i) => {
      // 20 nodi si spostano dall'alto al basso → top: 30, bottom: 70
      if (i < 20)      n.group = "bottom";
      else if (i < 50) n.group = "top";
      else             n.group = "bottom";
    });
    const f = makeForces();
    sim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
  },

  3() {
    currentStep = 3;
    nodes.forEach((n, i) => {
      if (i < 20)      n.group = "bottom";
      else if (i < 25) n.group = "super";
      else if (i < 50) n.group = "top";
      else             n.group = "bottom";
    });
    const f = makeForces();
    sim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
  },
};

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

    states[step]?.({ direction });
  });

window.addEventListener("resize", () => {
  width  = container.clientWidth;
  height = container.clientHeight;
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const f = makeForces();
  sim.force("x", f.x).force("y", f.y).alpha(0.3).restart();

  scroller.resize();
});
