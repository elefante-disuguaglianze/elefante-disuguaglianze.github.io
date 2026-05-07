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
const STR_X = 0.03;
const STR_Y = 0.06;

// Forze per i money nodes: più basse = movimento più lento/pigro
const MONEY_STR_X = 0.03;
const MONEY_STR_Y = 0.04;

// ─── Setup SVG ────────────────────────────────────────────────────────────
const container = document.getElementById("sticky-graphic")!;
const svg = d3.select<SVGSVGElement, unknown>("#chart-3");

let width  = container.clientWidth; 
let height = container.clientHeight;

let PAD = width < 500 ? 0.8 : 3; // padding per forza di collisione, più basso su schermi piccoli per evitare che si allontanino troppo

svg.attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g").attr("class", "root");

// ─── Helpers ──────────────────────────────────────────────────────────────
function targetX(): number {
  return width * 0.28;
}

function targetX_money(): number {
  return width * 0.72;
}

function targetY(d: SimNode): number {
  if (d.group === "super")  return height * 0.10;
  if (d.group === "top")    return currentStep >= 3 ? height * 0.50 : height * 0.27;
  if (d.group === "bottom") return currentStep >= 3 ? height * 0.80 : height * 0.73;
  return height * 0.35;
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

const moneyNodes: SimNode[] = d3.range(N).map(() => ({
  group: "center" as NodeGroup,
  x: width  * 0.75 + (Math.random() - 0.5) * 80,
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


const moneyCircles = g
  .selectAll<SVGTextElement, SimNode>("text.money-icon")
  .data(moneyNodes)
  .join("text")
  .attr("class",            "money-icon")
  .attr("font-size",        R * 3)
  .attr("text-anchor",      "middle")
  .attr("dominant-baseline","middle")
  .attr("role",             "img")
  .attr("aria-label",       "denaro")
  .text("💰");

// ─── Simulation ───────────────────────────────────────────────────────────
function makeForces() {
  return {
    x:       d3.forceX<SimNode>(() => targetX()).strength(STR_X),
    y:       d3.forceY<SimNode>((d) => targetY(d)).strength(STR_Y),
    collide: d3.forceCollide<SimNode>(R + PAD).strength(0.85),
  };
}

function makeMoneyForces() {
  return {
    x:       d3.forceX<SimNode>(() => targetX_money()).strength(MONEY_STR_X),
    y:       d3.forceY<SimNode>((d) => targetY(d)).strength(MONEY_STR_Y),
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

const moneySim = d3.forceSimulation<SimNode>(moneyNodes)
  .force("x",       makeMoneyForces().x)
  .force("y",       makeMoneyForces().y)
  .force("collide", makeMoneyForces().collide)
  .alphaDecay(0.012)
  .on("tick", () => {
    moneyCircles
      .attr("x", (d) => d.x!)
      .attr("y", (d) => d.y!);
  })
  .stop();

// Warmup per evitare overlap iniziale visibile
for (let i = 0; i < 80; i++) sim.tick();
circles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
sim.alpha(0.3).restart();

for (let i = 0; i < 80; i++) moneySim.tick();
moneyCircles.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
moneySim.alpha(0.3).restart();

// ─── States ───────────────────────────────────────────────────────────────
type StateArgs = { direction: "up" | "down" };

function restartSim() {
  const f = makeForces();
  sim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
}

function restartMoneySim() {
  const f = makeMoneyForces();
  moneySim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
}

function restartMoneySimDelayed(delay = 100) {
  setTimeout(() => {
    const f = makeMoneyForces();
    moneySim.force("x", f.x).force("y", f.y).alpha(0.6).restart();
  }, delay);
}

const states: Record<number, (args: StateArgs) => void> = {
  0() {
    currentStep = 0;
    nodes.forEach((n) => { n.group = "center"; });
    moneyNodes.forEach((n) => { n.group = "center"; });
    restartSim();
    restartMoneySimDelayed();
  },

  1() {
    currentStep = 1;
    nodes.forEach((n, i) => { n.group = i < (N/2) ? "top" : "bottom"; });
    moneyNodes.forEach((n, i) => { n.group = i < (N * 0.8) ? "top" : "bottom"; });
    restartSim();
    restartMoneySimDelayed();
  },

  2() {
    currentStep = 2;
    nodes.forEach((n, i) => {
      // 20 nodi si spostano dall'alto al basso → top: 30, bottom: 70
      if (i < 20)      n.group = "bottom";
      else if (i < 50) n.group = "top";
      else             n.group = "bottom";
    });
    moneyNodes.forEach((n, i) => { n.group = i < (N * 0.8 - 3) ? "top" : "bottom"; });
    restartSim();
    restartMoneySimDelayed();
  },

  3() {
    currentStep = 3;
    nodes.forEach((n, i) => {
      if (i < 20)      n.group = "bottom";
      else if (i < 25) n.group = "super";
      else if (i < 50) n.group = "top";
      else             n.group = "bottom";
    });
    moneyNodes.forEach((n, i) => {
      const topInState2 = Math.floor(N * 0.8 - 3); // 77 nodi "top" nello step 2
      const superCount  = Math.floor(topInState2 / 2) + 1; // maggioranza: 39
      // 50% +1 dei nodi "top" nello step 2 diventano "super", tutti i restanti "top" rimangono "top"
      // 10 nodi "bottom" dello step 2 diventano "super", tutti i restanti "bottom" rimangono "bottom"
      if (i < superCount)       n.group = "super";
      else if (i < topInState2) n.group = "top";
      else if (i < topInState2 + 10) n.group = "super";
      else                         n.group = "bottom";
    });
    restartSim();
    restartMoneySimDelayed();
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
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  PAD = width < 500 ? 0.8 : 3;

  const f = makeForces();
  sim.force("x", f.x).force("y", f.y).force("collide", f.collide).alpha(0.3).restart();

  const mf = makeMoneyForces();
  moneySim.force("x", mf.x).force("y", mf.y).force("collide", mf.collide).alpha(0.3).restart();

  scroller.resize();
});
