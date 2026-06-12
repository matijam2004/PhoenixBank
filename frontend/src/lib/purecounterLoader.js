export default function loadPureCounter() {
  const { default: PureCounter } = require("@srexi/purecounterjs");

  new PureCounter({
    selector: ".counter",
    duration: 0.6,  
    once: true,     
  });
}